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
      const { date } = req.query;
      const reportDate = date || new Date().toISOString().split("T")[0];
  
      // Check if it's a working day
      const workingDay = await isWorkingDay(reportDate);
  
      // Get all trainees
      const traineesQuery = query(collection(db, "trainees"));
      const traineesSnapshot = await getDocs(traineesQuery);
  
      const reports = [];
      const promises = [];
  
      traineesSnapshot.forEach((traineeDoc) => {
        const trainee = { id: traineeDoc.id, ...traineeDoc.data() };
  
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
  
      const weeklyStats = [];
      const promises = [];
  
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
  
      res.status(200).json({
        startDate: startDateStr,
        endDate: endDateStr,
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
      programStart.setMonth(programStart.getMonth() - 9); // Default to last 9 months
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