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
  
  // Get all trainees' daily reports
  export const getAllTraineesDailyReport = async (req, res) => {
    try {
      const { date, page = 1, limit = 5, search } = req.query;
      const reportDate = date || new Date().toISOString().split("T")[0];
      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10);
  
      // Validate pagination parameters
      if (isNaN(pageNumber) || pageNumber < 1) {
        return res.status(400).json({ error: "Invalid page number" });
      }
      if (isNaN(limitNumber) || limitNumber < 1) {
        return res.status(400).json({ error: "Invalid limit number" });
      }
  
      // Check if it's a working day
      const workingDay = await isWorkingDay(reportDate);
  
      // Get all trainees with optional location filter
      let traineesQuery = query(collection(db, "trainees"));
      
      // Add location filter if req.location is defined
      if (req.location) {
        traineesQuery = query(
          collection(db, "trainees"),
          where("location", "==", req.location)
        );
      }
      
      const traineesSnapshot = await getDocs(traineesQuery);
  
      const reports = [];
      const promises = [];
  
      traineesSnapshot.forEach((traineeDoc) => {
        const trainee = { id: traineeDoc.id, ...traineeDoc.data() };
        
        if (search && 
            !(trainee.name?.toLowerCase().includes(search.toLowerCase()) || 
              trainee.fullName?.toLowerCase().includes(search.toLowerCase()))) {
          return;
        }
  
        // For each trainee, get their report for the specified date
        const checkPromise = (async () => {
          const reportRef = doc(db, `reports/${trainee.id}`);
          const reportDoc = await getDoc(reportRef);
  
          if (reportDoc.exists() && reportDoc.data()?.[reportDate]) {
            reports.push({
              traineeId: trainee.id,
              name: trainee.name || trainee.fullName,
              ...reportDoc.data()[reportDate],
            });
          } else if (workingDay) {
            // If it's a working day but no report, consider absent
            reports.push({
              traineeId: trainee.id,
              name: trainee.name || trainee.fullName,
              date: reportDate,
              status: "Absent",
              location: trainee.location,
              isWorkingDay: true,
              totalHoursWorked: 0,
              totalLunchMinutes: 0,
            });
          }
        })();
  
        promises.push(checkPromise);
      });
  
      await Promise.all(promises);
  
      // Pagination
      const startIndex = (pageNumber - 1) * limitNumber;
      const endIndex = startIndex + limitNumber;
      const paginatedReports = reports.slice(startIndex, endIndex);
  
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
  
      if (req.location) {
        summary.location = req.location;
      }
  
      if (search) {
        summary.search = search;
      }
  
      res.status(200).json({
        summary,
        reports: paginatedReports,
        currentPage: pageNumber,
        totalPages: Math.ceil(reports.length / limitNumber),
        totalResults: reports.length,
      });
    } catch (error) {
      console.error("Daily report error:", error);
      res.status(500).json({ error: "Failed to generate daily report" });
    }
  };
  
  
  // Get all trainees' weekly statistics
  export const getAllTraineesWeeklyStats = async (req, res) => {
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
  
      // Get all trainees
      const traineesQuery = query(collection(db, "trainees"));
      const traineesSnapshot = await getDocs(traineesQuery);
  
      const totalTrainees = traineesSnapshot.size;
  
      const weeklyStats = [];
      const promises = [];
      
      // Array of day names
      const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      
      // Generate dates array for the work week (Monday to Friday)
      const workWeekDates = [];
      for (let i = 0; i < 5; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        workWeekDates.push(date.toISOString().split("T")[0]);
      }
      
      // Initialize daily attendance tracking
      const dailyAttendance = {};
      for (let i = 0; i < workWeekDates.length; i++) {
        const date = workWeekDates[i];
        const dayOfWeek = dayNames[i];
        dailyAttendance[date] = {
          date,
          dayOfWeek,
          isWorkingDay: false,
          presentCount: 0,
          attendanceRate: 0
        };
      }
  
      traineesSnapshot.forEach((traineeDoc) => {
        const trainee = { id: traineeDoc.id, ...traineeDoc.data() };
  
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
  
                
                // Update daily attendance counters for work week days (Monday-Friday)
                if (workWeekDates.includes(date) && data.isWorkingDay && data.checkInTime) {
                  dailyAttendance[date].isWorkingDay = true;
                  dailyAttendance[date].presentCount++;
                }
              }
            }
  
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
  
            weeklyStats.push({
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
  
      
      // Calculate attendance rates as percentages
      const dailyAttendanceRates = Object.values(dailyAttendance).map(day => {
        if (day.isWorkingDay) {
          day.attendanceRate = ((day.presentCount / totalTrainees) * 100).toFixed(2);
        }
        return day;
      });
  
      res.status(200).json({
        startDate: startDateStr,
        endDate: endDateStr,
        dailyAttendanceRates,
        weeklyStats,
      });
    } catch (error) {
      console.error("Weekly stats error:", error);
      res.status(500).json({ error: "Failed to retrieve weekly statistics" });
    }
  };
  // Get all trainees' monthly statistics
  export const getAllTraineesMonthlyStats = async (req, res) => {
    try {
      const { month, year } = req.query;
  
      const targetYear = year ? parseInt(year) : new Date().getFullYear();
      const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();
  
      const firstDay = new Date(targetYear, targetMonth, 1);
      const lastDay = new Date(targetYear, targetMonth + 1, 0);
  
      const firstDayStr = firstDay.toISOString().split("T")[0];
      const lastDayStr = lastDay.toISOString().split("T")[0];
  
      // Get all trainees
      const traineesQuery = query(collection(db, "trainees"));
      const traineesSnapshot = await getDocs(traineesQuery);
  
      const monthlyStats = [];
      const promises = [];
  
      traineesSnapshot.forEach((traineeDoc) => {
        const trainee = { id: traineeDoc.id, ...traineeDoc.data() };
  
        const checkPromise = (async () => {
          const reportRef = doc(db, `reports/${trainee.id}`);
          const reportDoc = await getDoc(reportRef);
  
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
  
            monthlyStats.push({
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
        month: targetMonth + 1,
        year: targetYear,
        monthlyStats,
      });
    } catch (error) {
      console.error("Monthly stats error:", error);
      res.status(500).json({ error: "Failed to retrieve monthly statistics" });
    }
  };

// Get all trainees' program statistics
export const getAllTraineesProgramStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const programStart = startDate ? new Date(startDate) : new Date();
    programStart.setMonth(programStart.getMonth() - 9); 
    const programEnd = endDate ? new Date(endDate) : new Date();

    const startDateStr = programStart.toISOString().split("T")[0];
    const endDateStr = programEnd.toISOString().split("T")[0];

    // Get all trainees
    const traineesQuery = query(collection(db, "trainees"));
    const traineesSnapshot = await getDocs(traineesQuery);

    const programStats = [];
    const promises = [];

    traineesSnapshot.forEach((traineeDoc) => {
      const trainee = { id: traineeDoc.id, ...traineeDoc.data() };

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
            traineeName: `${trainee.name || trainee.fullName} ${
              trainee.surname || ""
            }`,
            traineeEmail: trainee.email,
            traineePhoneNumber: trainee.phoneNumber,
            traineeLocation: trainee.location,
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
