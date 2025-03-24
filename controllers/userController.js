import {
  collection,
  doc,
  runTransaction,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy, 
  limit, 
  startAfter, 
  getCountFromServer 
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import crypto from "crypto";
import { db, auth, serverTimestamp } from "../config/firebaseConfig.js";
import { getAllTraineesProgramStats } from "./superAdminReportController.js";

// Function to generate a secure random password
const generatePassword = (length = 12) => {
  return crypto.randomBytes(length).toString("base64").slice(0, length);
};

//GET METHOD Trainee
export const get_Users = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const location = req.location;

    if (isNaN(pageNumber) || pageNumber < 1) {
      return res.status(400).json({ error: "Invalid page number" });
    }
    if (isNaN(limitNumber) || limitNumber < 1) {
      return res.status(400).json({ error: "Invalid limit number" });
    }

    const traineesRef = collection(db, "trainees");
    const snapshot = await getDocs(traineesRef);
    let trainees = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (location) {
      trainees = trainees.filter(trainee => 
        trainee.location === location
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      trainees = trainees.filter(trainee => 
        (trainee.name && trainee.name.toLowerCase().includes(searchLower)) ||
        (trainee.fullName && trainee.fullName.toLowerCase().includes(searchLower))
      );
    }

    const totalTrainees = trainees.length;

    const startIndex = (pageNumber - 1) * limitNumber;
    const endIndex = startIndex + limitNumber;
    const paginatedTrainees = trainees.slice(startIndex, endIndex);

    const response = {
      trainees: paginatedTrainees,
      pagination: {
        totalTrainees,
        currentPage: pageNumber,
        totalPages: Math.ceil(totalTrainees / limitNumber),
        limit: limitNumber
      },
      filters: {}
    };

    if (location) {
      response.filters.location = location;
    }
    
    if (search) {
      response.filters.search = search;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching trainees:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch trainees", details: error.message });
  }
};

//GET METHOD Trainee
// export const get_Users_By_Location = async (req, res) => {
//   try {
//     // Check if user exists and has uid
//     if (!req.user || !req.user.uid) {
//       return res.status(401).json({ error: "User not authenticated" });
//     }

//     // Get facilitator's details to check location
//     const facilitatorRef = doc(db, "facilitators", req.user.uid);
//     const facilitatorDoc = await getDoc(facilitatorRef);

//     if (!facilitatorDoc.exists()) {
//       return res.status(403).json({ error: "Unauthorized: Not a facilitator" });
//     }

//     const facilitatorLocation = facilitatorDoc.data().location;
//     console.log("facilitator location: ", facilitatorLocation);

//     if (!facilitatorLocation) {
//       return res.status(400).json({ error: "Facilitator location not set" });
//     }

//     // Query trainees collection with location filter
//     const traineesRef = collection(db, "trainees");
//     const locationQuery = query(
//       traineesRef,
//       where("location", "==", facilitatorLocation)
//     );
//     const snapshot = await getDocs(locationQuery);

//     const trainees = snapshot.docs.map((doc) => ({
//       id: doc.id,
//       ...doc.data(),
//     }));

//     // Convert any timestamp fields to ISO strings
//     const formattedTrainees = trainees.map((trainee) => {
//       const formatted = { ...trainee };
//       if (formatted.createdAt) {
//         formatted.createdAt = formatted.createdAt.toDate().toISOString();
//       }
//       if (formatted.updatedAt) {
//         formatted.updatedAt = formatted.updatedAt.toDate().toISOString();
//       }
//       return formatted;
//     });

//     res.status(200).json(formattedTrainees);
//   } catch (error) {
//     console.error("Error fetching trainees:", error);
//     res.status(500).json({
//       error: "Failed to fetch trainees",
//       details: error.message,
//     });
//   }
// };
export const get_Users_By_Location = async (req, res) => {
  try {
    // Check if user exists and has uid
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Get facilitator's details to check location
    const facilitatorRef = doc(db, "facilitators", req.user.uid);
    const facilitatorDoc = await getDoc(facilitatorRef);

    if (!facilitatorDoc.exists()) {
      return res.status(403).json({ error: "Unauthorized: Not a facilitator" });
    }

    const facilitatorLocation = facilitatorDoc.data().location;
    console.log("facilitator location: ", facilitatorLocation);

    if (!facilitatorLocation) {
      return res.status(400).json({ error: "Facilitator location not set" });
    }

    // Pagination parameters (still needed for pagination info)
    const pageSize = parseInt(req.query.limit) || 10;
    const pageNum = parseInt(req.query.page) || 1;
    
    // Query trainees collection with location filter
    const traineesRef = collection(db, "trainees");
    const locationQuery = query(
      traineesRef,
      where("location", "==", facilitatorLocation)
    );
    
    // Get all matching documents
    const snapshot = await getDocs(locationQuery);
    const totalTrainees = snapshot.docs.length;
    
    // Get all trainees data
    const allTrainees = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Format all trainees data
    const formattedTrainees = allTrainees.map((trainee) => {
      const formatted = { ...trainee };
      // Uncomment if you need timestamp conversion
      // if (formatted.createdAt) {
      //   formatted.createdAt = formatted.createdAt.toDate().toISOString();
      // }
      // if (formatted.updatedAt) {
      //   formatted.updatedAt = formatted.updatedAt.toDate().toISOString();
      // }
      return formatted;
    });

    // Calculate which trainees would be on the current page
    const startIndex = (pageNum - 1) * pageSize;
    const paginatedTrainees = formattedTrainees.slice(startIndex, startIndex + pageSize);

    res.status(200).json({
      // Send all trainees for frontend searching
      allTrainees: formattedTrainees,
      // Also send current page trainees for easy display
      currentPageTrainees: paginatedTrainees,
      pagination: {
        totalTrainees,
        totalPages: Math.ceil(totalTrainees / pageSize),
        currentPage: pageNum,
        pageSize,
        hasNextPage: startIndex + pageSize < totalTrainees
      }
    });
  } catch (error) {
    console.error("Error fetching trainees:", error);
    res.status(500).json({
      error: "Failed to fetch trainees",
      details: error.message,
    });
  }
};

// POST METHOD - Add a new trainee
export const create_user = async (req, res) => {
  try {
    // Check if user exists and has uid
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Check if user is a facilitator
    const facilitatorRef = doc(db, "facilitators", req.user.uid);
    const facilitatorDoc = await getDoc(facilitatorRef);

    if (!facilitatorDoc.exists()) {
      return res.status(403).json({ error: "Unauthorized: Not a facilitator" });
    }
    const {
      fullName,
      surname,
      age,
      gender,
      phoneNumber,
      idNumber,
      email,
      location,
      street,
      city,
      role,
      postalCode,
      messages,
      notifications,
    } = req.body;

    if (
      !fullName ||
      !surname ||
      !phoneNumber ||
      !idNumber ||
      !email ||
      !location
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Generate a secure password
    const generatedPassword = generatePassword();

    // Create authentication user with generated password
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      generatedPassword
    );
    const uid = userCredential.user.uid;

    // Send password reset email
    await sendPasswordResetEmail(auth, email);

    const counterRef = doc(db, "counters", "traineeCounter");
    let newTraineeId;

    await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      if (!counterDoc.exists()) {
        newTraineeId = 1;
        transaction.set(counterRef, { lastTraineeId: newTraineeId });
      } else {
        newTraineeId = counterDoc.data().lastTraineeId + 1;
        transaction.update(counterRef, { lastTraineeId: newTraineeId });
      }
    });

    const newTrainee = {
      traineeId: newTraineeId,
      uid,
      fullName,
      surname,
      ...(age && { age }),
      ...(gender && { gender }),
      phoneNumber,
      idNumber,
      email,
      ...(location && { location }),
      ...(street && { street }),
      ...(city && { city }),
      ...(role && { role }),
      ...(postalCode && { postalCode }),
      ...(messages && { messages }),
      ...(notifications && { notifications }),
      twoFactorEnabled: false, // Set two-factor authentication to enabled by default
      createdAt: serverTimestamp(),
    };

    const docRef = doc(db, "trainees", newTraineeId.toString());
    await setDoc(docRef, newTrainee);

    const newDoc = await getDoc(docRef);
    const savedTrainee = { id: newTraineeId, ...newDoc.data() };

    if (savedTrainee.createdAt) {
      savedTrainee.createdAt = savedTrainee.createdAt.toDate().toISOString();
    }

    res.status(201).json({
      user: savedTrainee,
      password: generatedPassword,
      message: `User created successfully. A password reset email has been sent to ${email}`,
    });
  } catch (error) {
    console.error("Error adding trainee:", error);
    res
      .status(500)
      .json({ error: "Failed to add trainee", details: error.message });
  }
};

// PUT METHOD - Update a trainee
export const update_User = async (req, res) => {
  const { id } = req.params;
  try {
    const traineeRef = doc(db, "trainees", id);
    const traineeDoc = await getDoc(traineeRef);

    if (!traineeDoc.exists()) {
      return res.status(404).json({ error: "Trainee not found" });
    }

    // Only include fields that are present in req.body
    const updateData = {
      ...Object.keys(req.body).reduce((acc, key) => {
        if (req.body[key] !== undefined) {
          acc[key] = req.body[key];
        }
        return acc;
      }, {}),
      updatedAt: serverTimestamp(),
    };

    await updateDoc(traineeRef, updateData);

    const updatedDoc = await getDoc(traineeRef);
    const updatedTrainee = { id, ...updatedDoc.data() };

    if (updatedTrainee.updatedAt) {
      updatedTrainee.updatedAt = updatedTrainee.updatedAt
        .toDate()
        .toISOString();
    }

    res.status(200).json(updatedTrainee);
  } catch (error) {
    console.error("Error updating trainee:", error);
    res
      .status(500)
      .json({ error: "Failed to update trainee", details: error.message });
  }
};

// DELETE METHOD - Delete a trainee
export const delete_User = async (req, res) => {
  const { id } = req.params;
  try {
    const traineeRef = doc(db, "trainees", id);
    const traineeDoc = await getDoc(traineeRef);

    if (!traineeDoc.exists()) {
      return res.status(404).json({ error: "Trainee not found" });
    }

    const traineeData = traineeDoc.data();

    const deletedTraineeRef = doc(db, "deletedTrainees", id);
    await setDoc(deletedTraineeRef, {
      ...traineeData,
      deletedAt: serverTimestamp(),
    });

    await deleteDoc(traineeRef);

    res.status(200).json({
      message: "Trainee deleted successfully and archived in deletedTrainees",
    });
  } catch (error) {
    console.error("Error deleting trainee:", error);
    res
      .status(500)
      .json({ error: "Failed to delete trainee", details: error.message });
  }
};

// GET deleted trainees
export const deleted_Users = async (req, res) => {
  try {
    const deletedTraineesRef = collection(db, "deletedTrainees");
    const snapshot = await getDocs(deletedTraineesRef);
    const deletedTrainees = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.status(200).json(deletedTrainees);
  } catch (error) {
    console.error("Error fetching deleted trainees:", error);
    res.status(500).json({
      error: "Failed to fetch deleted trainees",
      details: error.message,
    });
  }
};

export const traineeManagementOverview = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const { page = 1, limit = 10, search } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (isNaN(pageNumber) || pageNumber < 1) {
      return res.status(400).json({ error: "Invalid page number" });
    }
    if (isNaN(limitNumber) || limitNumber < 1) {
      return res.status(400).json({ error: "Invalid limit number" });
    }

    const location = req.location;

    const mockReq = {
      query: {
        startDate: "2024-06-11",
        endDate: today,
      },
    };

    let responseData;

    const mockRes = {
      json: (data) => {
        responseData = data;
      },
      status: (code) => ({
        json: (data) => {
          console.log(`Status ${code}:`);
          responseData = data;
        },
      }),
    };

    await getAllTraineesProgramStats(mockReq, mockRes);

    if (!responseData) {
      throw new Error("No data returned from getAllTraineesProgramStats");
    }

    const calculateWorkingDays = (startDate, endDate) => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      let workingDays = 0;

      const current = new Date(start);
      while (current <= end) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          workingDays++;
        }
        current.setDate(current.getDate() + 1);
      }

      return workingDays;
    };

    const categorizeAttendance = (percentage) => {
      if (percentage < 30) return "Poor";
      if (percentage < 60) return "Below Average";
      if (percentage < 80) return "Average";
      if (percentage < 90) return "Good";
      return "Excellent";
    };

    const startDate = responseData.startDate;

    const sixMonthsLater = new Date(startDate);
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
    const sixMonthEndDate = sixMonthsLater.toISOString().split("T")[0];

    // Calculate total working days
    const totalWorkingDays = calculateWorkingDays(startDate, sixMonthEndDate);

    let filteredProgramStats = responseData.programStats;

    // Apply location filter directly to the response data if location is specified
    if (location) {
      filteredProgramStats = responseData.programStats.filter(
        (trainee) => trainee.traineeLocation === location
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredProgramStats = filteredProgramStats.filter((trainee) => 
        (trainee.traineeName && trainee.traineeName.toLowerCase().includes(searchLower)) ||
        (trainee.fullName && trainee.fullName.toLowerCase().includes(searchLower))
      );
    }

    // Add attendance percentage and level to each trainee
    const enhancedStats = filteredProgramStats.map((trainee) => {
      const attendancePercentage =
        (trainee.attendedDays / totalWorkingDays) * 100;
      return {
        ...trainee,
        attendancePercentage: attendancePercentage.toFixed(2) + "%",
        attendanceLevel: categorizeAttendance(attendancePercentage),
      };
    });

    // Apply pagination
    const startIndex = (pageNumber - 1) * limitNumber;
    const endIndex = startIndex + limitNumber;
    const paginatedStats = enhancedStats.slice(startIndex, endIndex);

    // Prepare response object with pagination info
    const result = {
      ...responseData,
      totalWorkingDays,
      totalTrainees: enhancedStats.length,
      currentPage: pageNumber,
      totalPages: Math.ceil(enhancedStats.length / limitNumber),
      programStats: paginatedStats,
    };

    // Add filter information if applied
    if (location) {
      result.filteredByLocation = location;
    }
    
    if (search) {
      result.searchQuery = search;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Error calculating attendance:", error.message);
    return res
      .status(500)
      .json({ error: "Error calculating attendance", message: error.message });
  }
};
