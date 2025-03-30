import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp
  } from "firebase/firestore";
  import { db } from "../config/firebaseConfig.js";
  
  // Create a new absenteeism proof upload
  export const createUpload = async (req, res) => {
    try {
      // Check if user exists and has uid
      if (!req.user || !req.user.uid) {
        return res.status(401).json({ error: "User not authenticated" });
      }
  
      const { traineeId, documentUrl, reason, date } = req.body;
  
      if (!traineeId || !documentUrl || !reason || !date) {
        return res.status(400).json({ error: "Missing required fields" });
      }
  
      // Verify trainee exists
      const traineeRef = doc(db, "trainees", traineeId.toString());
      const traineeDoc = await getDoc(traineeRef);
  
      if (!traineeDoc.exists()) {
        return res.status(404).json({ error: "Trainee not found" });
      }
  
      // Create new upload document
      const uploadData = {
        traineeId,
        documentUrl,
        reason,
        date,
        status: "pending", // Default status (pending, approved, rejected)
        submittedBy: req.user.uid,
        createdAt: serverTimestamp(),
      };
  
      const uploadsCollection = collection(db, "uploads");
      const docRef = await addDoc(uploadsCollection, uploadData);
  
      // Get the created document
      const uploadDoc = await getDoc(docRef);
      const upload = { id: docRef.id, ...uploadDoc.data() };
  
      // Format timestamp for response
      if (upload.createdAt) {
        upload.createdAt = upload.createdAt.toDate().toISOString();
      }
  
      res.status(201).json({
        message: "Proof uploaded successfully",
        upload
      });
    } catch (error) {
      console.error("Error uploading proof:", error);
      res.status(500).json({ 
        error: "Failed to upload proof", 
        details: error.message 
      });
    }
  };
  
  // Get all uploads for a specific trainee
  export const getTraineeUploads = async (req, res) => {
    try {
      const { traineeId } = req.params;
  
      if (!traineeId) {
        return res.status(400).json({ error: "Trainee ID is required" });
      }
  
      // Verify trainee exists
      const traineeRef = doc(db, "trainees", traineeId.toString());
      const traineeDoc = await getDoc(traineeRef);
  
      if (!traineeDoc.exists()) {
        return res.status(404).json({ error: "Trainee not found" });
      }
  
      // Query uploads for this trainee
      const uploadsCollection = collection(db, "uploads");
      const q = query(
        uploadsCollection,
        where("traineeId", "==", traineeId),
        orderBy("createdAt", "desc")
      );
  
      const snapshot = await getDocs(q);
      
      const uploads = snapshot.docs.map(doc => {
        const data = doc.data();
        const formattedData = { ...data, id: doc.id };
        
        // Convert timestamps to ISO strings
        if (formattedData.createdAt) {
          formattedData.createdAt = formattedData.createdAt.toDate().toISOString();
        }
        
        return formattedData;
      });
  
      res.status(200).json(uploads);
    } catch (error) {
      console.error("Error fetching trainee uploads:", error);
      res.status(500).json({ 
        error: "Failed to fetch trainee uploads", 
        details: error.message 
      });
    }
  };
  
  // Get all uploads (with optional filtering)
  export const getAllUploads = async (req, res) => {
    try {
      // Check if user is authorized (admin or facilitator)
      if (!req.user || !req.user.uid) {
        return res.status(401).json({ error: "User not authenticated" });
      }
  
      const { status, startDate, endDate, page = 1, limit = 10 } = req.query;
      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10);
  
      if (isNaN(pageNumber) || pageNumber < 1) {
        return res.status(400).json({ error: "Invalid page number" });
      }
      if (isNaN(limitNumber) || limitNumber < 1) {
        return res.status(400).json({ error: "Invalid limit number" });
      }
  
      const uploadsCollection = collection(db, "uploads");
      let q = query(uploadsCollection, orderBy("createdAt", "desc"));
  
      // Apply status filter if provided
      if (status) {
        q = query(q, where("status", "==", status));
      }
      
      // Apply date filters if provided (we need to query all and filter in memory due to Firestore limitations)
      const snapshot = await getDocs(q);
      
      let uploads = snapshot.docs.map(doc => {
        const data = doc.data();
        const formattedData = { ...data, id: doc.id };
        
        // Convert timestamps to ISO strings
        if (formattedData.createdAt) {
          formattedData.createdAt = formattedData.createdAt.toDate().toISOString();
        }
        
        return formattedData;
      });
  
      // Apply date filtering if needed
      if (startDate) {
        uploads = uploads.filter(upload => upload.date >= startDate);
      }
      
      if (endDate) {
        uploads = uploads.filter(upload => upload.date <= endDate);
      }
  
      // Get total count
      const totalUploads = uploads.length;
  
      // Apply pagination
      const startIndex = (pageNumber - 1) * limitNumber;
      const endIndex = startIndex + limitNumber;
      const paginatedUploads = uploads.slice(startIndex, endIndex);
  
      res.status(200).json({
        uploads: paginatedUploads,
        pagination: {
          totalUploads,
          currentPage: pageNumber,
          totalPages: Math.ceil(totalUploads / limitNumber),
          limit: limitNumber
        }
      });
    } catch (error) {
      console.error("Error fetching uploads:", error);
      res.status(500).json({ 
        error: "Failed to fetch uploads", 
        details: error.message 
      });
    }
  };
  
  // Update upload status (approve/reject)
  export const updateUploadStatus = async (req, res) => {
    try {
      const { id } = req.params;
      const { status, reviewNotes } = req.body;
  
      if (!status || !["approved", "rejected", "pending"].includes(status)) {
        return res.status(400).json({ error: "Valid status is required" });
      }
  
      // Check if upload exists
      const uploadRef = doc(db, "uploads", id);
      const uploadDoc = await getDoc(uploadRef);
  
      if (!uploadDoc.exists()) {
        return res.status(404).json({ error: "Upload not found" });
      }
  
      // Update the upload status
      const updateData = {
        status,
        reviewedBy: req.user.uid,
        reviewedAt: serverTimestamp(),
        ...(reviewNotes && { reviewNotes }),
      };
  
      await updateDoc(uploadRef, updateData);
  
      // Get the updated document
      const updatedDoc = await getDoc(uploadRef);
      const updatedUpload = { id, ...updatedDoc.data() };
  
      // Format timestamps for response
      if (updatedUpload.createdAt) {
        updatedUpload.createdAt = updatedUpload.createdAt.toDate().toISOString();
      }
      if (updatedUpload.reviewedAt) {
        updatedUpload.reviewedAt = updatedUpload.reviewedAt.toDate().toISOString();
      }
  
      res.status(200).json({
        message: `Upload ${status} successfully`,
        upload: updatedUpload
      });
    } catch (error) {
      console.error("Error updating upload status:", error);
      res.status(500).json({ 
        error: "Failed to update upload status", 
        details: error.message 
      });
    }
  };
  
  // Delete an upload
  export const deleteUpload = async (req, res) => {
    try {
      const { id } = req.params;
  
      // Check if upload exists
      const uploadRef = doc(db, "uploads", id);
      const uploadDoc = await getDoc(uploadRef);
  
      if (!uploadDoc.exists()) {
        return res.status(404).json({ error: "Upload not found" });
      }
  
      // Store the upload in deletedUploads collection before deletion
      const uploadData = uploadDoc.data();
      const deletedUploadRef = doc(db, "deletedUploads", id);
      await setDoc(deletedUploadRef, {
        ...uploadData,
        deletedAt: serverTimestamp(),
        deletedBy: req.user.uid
      });
  
      // Delete the upload
      await deleteDoc(uploadRef);
  
      res.status(200).json({
        message: "Upload deleted successfully and archived in deletedUploads",
      });
    } catch (error) {
      console.error("Error deleting upload:", error);
      res.status(500).json({ 
        error: "Failed to delete upload", 
        details: error.message 
      });
    }
  };
  
  // Get uploads by date range (for reporting)
  export const getUploadsByDateRange = async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Start date and end date are required" });
      }
  
      const uploadsCollection = collection(db, "uploads");
      const snapshot = await getDocs(uploadsCollection);
      
      // Filter by date range in memory
      const uploads = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return { id: doc.id, ...data };
        })
        .filter(upload => upload.date >= startDate && upload.date <= endDate);
  
      // Format timestamps for response
      uploads.forEach(upload => {
        if (upload.createdAt) {
          upload.createdAt = upload.createdAt.toDate().toISOString();
        }
        if (upload.reviewedAt) {
          upload.reviewedAt = upload.reviewedAt.toDate().toISOString();
        }
      });
  
      // Group by status for summary
      const summary = {
        total: uploads.length,
        approved: uploads.filter(upload => upload.status === "approved").length,
        rejected: uploads.filter(upload => upload.status === "rejected").length,
        pending: uploads.filter(upload => upload.status === "pending").length
      };
  
      res.status(200).json({
        uploads,
        summary
      });
    } catch (error) {
      console.error("Error fetching uploads by date range:", error);
      res.status(500).json({ 
        error: "Failed to fetch uploads by date range", 
        details: error.message 
      });
    }
  };