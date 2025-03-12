import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
  } from "firebase/firestore";
  import { db } from "../config/firebaseConfig.js";
  import { isWorkingDay } from "./sessionController.js";
  
  // Get facilitator's trainees daily report
  export const getFacilitatorTraineesDailyReport = async (req, res) => {
    try {
      const { date } = req.query;
      const reportDate = date || new Date().toISOString().split("T")[0];
  
      // Check if it's a working day
      const workingDay = await isWorkingDay(reportDate);
  
      // Get filtered trainees from middleware
      const trainees = req.trainees || [];
  
      if (!trainees.length) {
        return res.status(200).json({
          summary: {
            date: reportDate,
            isWorkingDay: workingDay,
            totalTrainees: 0,
            presentCount: 0,
            absentCount: 0,
            lateCount: 0,
            totalHoursWorked: "0.00",
            averageHoursWorked: "0.00",
          },
          reports: [],
        });
      }
  
      const reports = [];
      const promises = [];
  
      trainees.forEach((trainee) => {
        // For each trainee, get their report for the specified date
        const checkPromise = (async () => {
          const reportRef = doc(db, `reports/${trainee.id}`);
          const reportDoc = await getDoc(reportRef);
  
          if (reportDoc.exists() && reportDoc.data()?.[reportDate]) {
            reports.push({
              traineeId: trainee.id,
              name: trainee.name,
              ...reportDoc.data()[reportDate],
            });
          } else if (workingDay) {
            // If it's a working day but no report, consider absent
            reports.push({
              traineeId: trainee.id,
              name: trainee.name,
              date: reportDate,
              status: "Absent",
              isWorkingDay: true,
              totalHoursWorked: 0,
              totalLunchMinutes: 0,
            });
          }
        })();
  
        promises.push(checkPromise);
      });
  
      await Promise.all(promises);
  
      // Summary statistics
      const summary = {
        date: reportDate,
        isWorkingDay: workingDay,
        totalTrainees: reports.length,
        presentCount: reports.filter((r) => r.checkInTime).length,
        absentCount: reports.filter((r) => !r.checkInTime).length,
        lateCount: reports.filter((r) => r.status === "Late").length,
        totalHoursWorked: reports
          .reduce((sum, r) => sum + (r.totalHoursWorked || 0), 0)
          .toFixed(2),
        averageHoursWorked: (
          reports.reduce((sum, r) => sum + (r.totalHoursWorked || 0), 0) /
          Math.max(1, reports.filter((r) => r.checkInTime).length)
        ).toFixed(2),
      };
  
      res.status(200).json({
        summary,
        reports,
      });
    } catch (error) {
      console.error("Daily report error:", error);
      res.status(500).json({ error: "Failed to generate daily report" });
    }
  };
  
  // Get facilitator's trainees weekly statistics
  // Get facilitator's trainees weekly statistics
// Get facilitator's trainees weekly statistics
export const getFacilitatorTraineesWeeklyStats = async (req, res) => {
  try {
    const { weekStart, weekNumber, year } = req.query;

    // Define date range for the specified week
    let startDate, endDate;

    if (weekStart) {
      startDate = new Date(weekStart);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
    } else if (weekNumber && year) {
      const parsedYear = parseInt(year);
      const parsedWeek = parseInt(weekNumber);

      const jan4th = new Date(parsedYear, 0, 4);
      const firstMonday = new Date(jan4th);
      const dayOfWeek = jan4th.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      firstMonday.setDate(jan4th.getDate() + diff);

      startDate = new Date(firstMonday);
      startDate.setDate(firstMonday.getDate() + (parsedWeek - 1) * 7);

      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    } else {
      const currentDate = new Date();
      startDate = new Date(currentDate);
      const day = startDate.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      startDate.setDate(startDate.getDate() + diff);

      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    }

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    // Get filtered trainees from middleware
    const trainees = req.trainees || [];
    const totalTraineeCount = trainees.length;

    // Array of day names
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Initialize daily attendance tracking
    const dailyAttendance = {};
    // Generate dates for the entire week
    const weekDates = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const dayOfWeek = currentDate.getDay();
      weekDates.push(dateStr);
      dailyAttendance[dateStr] = {
        date: dateStr,
        dayOfWeek: dayNames[dayOfWeek],
        dayNumber: dayOfWeek,
        isWorkingDay: false, // Will be updated later
        totalTrainees: totalTraineeCount,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        attendanceRate: "0.00"
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const weeklyStats = [];
    const promises = [];

    // First check which days are working days
    const workingDayPromises = weekDates.map(async (date) => {
      const isWorkDay = await isWorkingDay(date);
      dailyAttendance[date].isWorkingDay = isWorkDay;
      return { date, isWorkingDay: isWorkDay };
    });
    
    await Promise.all(workingDayPromises);

    trainees.forEach((trainee) => {
      const checkPromise = (async () => {
        const reportRef = doc(db, `reports/${trainee.id}`);
        const reportDoc = await getDoc(reportRef);

        if (reportDoc.exists()) {
          const reportData = reportDoc.data();
          const weeklyData = [];

          // Filter and collect reports within date range
          for (const [date, data] of Object.entries(reportData)) {
            if (date >= startDateStr && date <= endDateStr) {
              weeklyData.push({
                date,
                ...data,
              });
              
              // Update daily attendance data
              if (data.isWorkingDay) {
                if (data.checkInTime) {
                  dailyAttendance[date].presentCount++;
                  if (data.status === "Late") {
                    dailyAttendance[date].lateCount++;
                  }
                } else {
                  dailyAttendance[date].absentCount++;
                }
              }
            }
          }

          // For working days with no report, mark as absent
          weekDates.forEach(date => {
            if (dailyAttendance[date].isWorkingDay && !weeklyData.some(data => data.date === date)) {
              dailyAttendance[date].absentCount++;
            }
          });

          // Calculate summary statistics
          const attendedDays = weeklyData.filter(
            (day) => day.checkInTime && day.isWorkingDay
          );
          const totalWorkingHours = attendedDays.reduce(
            (sum, day) => sum + (parseFloat(day.totalHoursWorked) || 0),
            0
          );
          const totalLunchMinutes = attendedDays.reduce(
            (sum, day) => sum + (parseInt(day.totalLunchMinutes) || 0),
            0
          );

          // Get day of week for each daily status
          const dailyStatus = weekDates.map(date => {
            const dayData = weeklyData.find(d => d.date === date);
            const dateObj = new Date(date);
            const dayOfWeek = dateObj.getDay();
            
            return {
              date,
              dayOfWeek: dayNames[dayOfWeek],
              status: dayData?.status || (dailyAttendance[date].isWorkingDay ? "Absent" : "Not Working Day"),
              checkInTime: dayData?.checkInTime || null,
              checkOutTime: dayData?.checkOutTime || null,
              hoursWorked: dayData?.totalHoursWorked || 0,
            };
          });

          weeklyStats.push({
            traineeId: trainee.id,
            traineeName: trainee.name,
            attendedDays: attendedDays.length,
            totalWorkingHours: totalWorkingHours.toFixed(2),
            totalLunchMinutes,
            totalLunchHours: (totalLunchMinutes / 60).toFixed(2),
            dailyStatus
          });
        }
      })();

      promises.push(checkPromise);
    });

    await Promise.all(promises);

    // Calculate attendance rates for each day
    for (const date in dailyAttendance) {
      if (dailyAttendance[date].isWorkingDay && totalTraineeCount > 0) {
        dailyAttendance[date].attendanceRate = (
          (dailyAttendance[date].presentCount / totalTraineeCount) * 100
        ).toFixed(2);
      } else {
        dailyAttendance[date].attendanceRate = "0.00";
      }

      // Ensure absent count is correct
      if (dailyAttendance[date].isWorkingDay) {
        dailyAttendance[date].absentCount = totalTraineeCount - dailyAttendance[date].presentCount;
      }
    }

    // Calculate weekly summary statistics
    const workingDaysInWeek = Object.values(dailyAttendance).filter(
      day => day.isWorkingDay
    ).length;
    
    const totalPresent = Object.values(dailyAttendance).reduce(
      (sum, day) => sum + day.presentCount, 0
    );
    
    const totalPossibleAttendance = workingDaysInWeek * totalTraineeCount;
    
    const weeklyAttendanceRate = totalPossibleAttendance > 0 
      ? ((totalPresent / totalPossibleAttendance) * 100).toFixed(2) 
      : "0.00";

    const totalHoursWorked = weeklyStats.reduce(
      (sum, trainee) => sum + parseFloat(trainee.totalWorkingHours), 
      0
    ).toFixed(2);
    
    const averageHoursWorked = (totalPresent > 0)
      ? (parseFloat(totalHoursWorked) / totalPresent).toFixed(2)
      : "0.00";

    // Sort dailyAttendance by day number (to ensure Monday comes first, etc.)
    const sortedDailyAttendance = Object.values(dailyAttendance)
      .sort((a, b) => a.dayNumber - b.dayNumber);

    res.status(200).json({
      startDate: startDateStr,
      endDate: endDateStr,
      summary: {
        totalTrainees: totalTraineeCount,
        workingDays: workingDaysInWeek,
        weeklyAttendanceRate,
        totalHoursWorked,
        averageHoursWorked
      },
      dailyAttendance: sortedDailyAttendance,
      weeklyStats,
    });
  } catch (error) {
    console.error("Weekly stats error:", error);
    res.status(500).json({ error: "Failed to retrieve weekly statistics" });
  }
};
  
  // Get facilitator's trainees monthly statistics
  export const getFacilitatorTraineesMonthlyStats = async (req, res) => {
    try {
      const { month, year } = req.query;
  
      const targetYear = year ? parseInt(year) : new Date().getFullYear();
      const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();
  
      const firstDay = new Date(targetYear, targetMonth, 1);
      const lastDay = new Date(targetYear, targetMonth + 1, 0);
  
      const firstDayStr = firstDay.toISOString().split("T")[0];
      const lastDayStr = lastDay.toISOString().split("T")[0];
  
      // Get filtered trainees from middleware
      const trainees = req.trainees || [];
  
      const monthlyStats = [];
      const promises = [];
  
      trainees.forEach((trainee) => {
        const checkPromise = (async () => {
          const reportRef = doc(db, `reports/${trainee.id}`);
          const reportDoc = await getDoc(reportRef);
  
          const traineeStats = {
            traineeId: trainee.id,
            traineeName: trainee.name,
            attendedDays: 0,
            totalWorkingHours: 0,
            totalLunchMinutes: 0,
            totalLunchHours: 0,
          };
  
          if (reportDoc.exists()) {
            const reportData = reportDoc.data();
            const monthlyData = [];
  
            // Filter and collect reports within date range
            for (const [date, data] of Object.entries(reportData)) {
              if (date >= firstDayStr && date <= lastDayStr) {
                monthlyData.push({
                  date,
                  ...data,
                });
              }
            }
  
            // Calculate summary statistics
            const attendedDays = monthlyData.filter(
              (day) => day.checkInTime && day.isWorkingDay
            );
            const totalWorkingHours = attendedDays.reduce(
              (sum, day) => sum + (parseFloat(day.totalHoursWorked) || 0),
              0
            );
            const totalLunchMinutes = attendedDays.reduce(
              (sum, day) => sum + (parseInt(day.totalLunchMinutes) || 0),
              0
            );
  
            traineeStats.attendedDays = attendedDays.length;
            traineeStats.totalWorkingHours = totalWorkingHours.toFixed(2);
            traineeStats.totalLunchMinutes = totalLunchMinutes;
            traineeStats.totalLunchHours = (totalLunchMinutes / 60).toFixed(2);
          }
  
          monthlyStats.push(traineeStats);
        })();
  
        promises.push(checkPromise);
      });
  
      await Promise.all(promises);
  
      res.status(200).json({
        month: targetMonth + 1,
        year: targetYear,
        monthlyStats,
      });
    } catch (error) {
      console.error("Monthly stats error:", error);
      res.status(500).json({ error: "Failed to retrieve monthly statistics" });
    }
  };
  
  // Get facilitator's trainees program statistics
  export const getFacilitatorTraineesProgramStats = async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
  
      const programStart = startDate ? new Date(startDate) : new Date();
      programStart.setMonth(programStart.getMonth() - 9); // Default to last 9 months
      const programEnd = endDate ? new Date(endDate) : new Date();
  
      const startDateStr = programStart.toISOString().split("T")[0];
      const endDateStr = programEnd.toISOString().split("T")[0];
  
      // Get filtered trainees from middleware
      const trainees = req.trainees || [];
  
      const programStats = [];
      const promises = [];
  
      trainees.forEach((trainee) => {
        const checkPromise = (async () => {
          const reportRef = doc(db, `reports/${trainee.id}`);
          const reportDoc = await getDoc(reportRef);
  
          if (reportDoc.exists()) {
            const reportData = reportDoc.data();
            const programData = [];
  
            // Filter and collect reports within date range
            for (const [date, data] of Object.entries(reportData)) {
              if (date >= startDateStr && date <= endDateStr) {
                programData.push({
                  date,
                  ...data,
                });
              }
            }
  
            // Calculate summary statistics
            const attendedDays = programData.filter(
              (day) => day.checkInTime && day.isWorkingDay
            );
            const totalWorkingHours = attendedDays.reduce(
              (sum, day) => sum + (parseFloat(day.totalHoursWorked) || 0),
              0
            );
            const totalLunchMinutes = attendedDays.reduce(
              (sum, day) => sum + (parseInt(day.totalLunchMinutes) || 0),
              0
            );
  
            programStats.push({
              traineeId: trainee.id,
              traineeName: trainee.name,
              attendedDays: attendedDays.length,
              totalWorkingHours: totalWorkingHours.toFixed(2),
              totalLunchMinutes,
              totalLunchHours: (totalLunchMinutes / 60).toFixed(2),
            });
          }
        })();
  
        promises.push(checkPromise);
      });
  
      await Promise.all(promises);
  
      res.status(200).json({
        startDate: startDateStr,
        endDate: endDateStr,
        programStats,
      });
    } catch (error) {
      console.error("Program stats error:", error);
      res.status(500).json({ error: "Failed to retrieve program statistics" });
    }
  };