import {
    collection,
    doc,
    setDoc,
    getDoc,
    query,
    where,
    getDocs,
    updateDoc,
    addDoc,
  } from "firebase/firestore";
  import { ref, set, get, update } from "firebase/database";
  import { db, rtdb } from "../config/firebaseConfig.js";

  export const setProgramStartDate = async (req, res) => {
    try {
      const { traineeId, programStartDate, programEndDate } = req.body;
      
      if (!traineeId || !programStartDate) {
        return res.status(400).json({ error: "Trainee ID and program start date are required" });
      }
      
      // Validate the trainee exists
      const traineeRef = doc(db, `trainees/${traineeId}`);
      const traineeDoc = await getDoc(traineeRef);
      
      if (!traineeDoc.exists()) {
        return res.status(404).json({ error: "Trainee not found" });
      }
      
      // Update the trainee with program dates
      const updateData = {
        programStartDate,
        updatedAt: Date.now()
      };
      
      // Add end date if provided
      if (programEndDate) {
        updateData.programEndDate = programEndDate;
      }
      
      await updateDoc(traineeRef, updateData);
      
      res.status(200).json({
        message: "Program dates updated successfully",
        traineeId,
        programStartDate,
        programEndDate: programEndDate || null
      });
    } catch (error) {
      console.error("Set program start date error:", error);
      res.status(500).json({ error: "Failed to set program start date" });
    }
  };

  export const setBulkProgramStartDate = async (req, res) => {
    try {
      const { programStartDate, programEndDate, traineeIds } = req.body;
      
      if (!programStartDate) {
        return res.status(400).json({ error: "Program start date is required" });
      }
      
      // If specific trainee IDs are provided, update only those trainees
      // Otherwise, update all trainees
      const promises = [];
      const updatedTrainees = [];
      
      if (traineeIds && Array.isArray(traineeIds) && traineeIds.length > 0) {
        // Update specific trainees
        for (const traineeId of traineeIds) {
          const traineeRef = doc(db, `trainees/${traineeId}`);
          
          const updateData = {
            programStartDate,
            updatedAt: Date.now()
          };
          
          if (programEndDate) {
            updateData.programEndDate = programEndDate;
          }
          
          const promise = updateDoc(traineeRef, updateData)
            .then(() => {
              updatedTrainees.push(traineeId);
            })
            .catch(error => {
              console.error(`Error updating trainee ${traineeId}:`, error);
            });
          
          promises.push(promise);
        }
      } else {
        // Update all trainees
        const traineesQuery = query(collection(db, "trainees"));
        const traineesSnapshot = await getDocs(traineesQuery);
        
        traineesSnapshot.forEach((traineeDoc) => {
          const traineeId = traineeDoc.id;
          const traineeRef = doc(db, `trainees/${traineeId}`);
          
          const updateData = {
            programStartDate,
            updatedAt: Date.now()
          };
          
          if (programEndDate) {
            updateData.programEndDate = programEndDate;
          }
          
          const promise = updateDoc(traineeRef, updateData)
            .then(() => {
              updatedTrainees.push(traineeId);
            })
            .catch(error => {
              console.error(`Error updating trainee ${traineeId}:`, error);
            });
          
          promises.push(promise);
        });
      }
      
      await Promise.all(promises);
      
      res.status(200).json({
        message: "Program dates updated successfully",
        programStartDate,
        programEndDate: programEndDate || null,
        updatedTrainees,
        totalUpdated: updatedTrainees.length
      });
    } catch (error) {
      console.error("Bulk set program start date error:", error);
      res.status(500).json({ error: "Failed to set program start dates" });
    }
  };

  export const getTraineeProgramInfo = async (req, res) => {
    try {
      const { traineeId } = req.params;
      
      if (!traineeId) {
        return res.status(400).json({ error: "Trainee ID is required" });
      }
      
      // Get trainee info
      const traineeRef = doc(db, `trainees/${traineeId}`);
      const traineeDoc = await getDoc(traineeRef);
      
      if (!traineeDoc.exists()) {
        return res.status(404).json({ error: "Trainee not found" });
      }
      
      const traineeData = traineeDoc.data();
      
      res.status(200).json({
        traineeId,
        name: traineeData.name,
        programStartDate: traineeData.programStartDate || null,
        programEndDate: traineeData.programEndDate || null,
        // Include other program-related info here if needed
      });
    } catch (error) {
      console.error("Get trainee program info error:", error);
      res.status(500).json({ error: "Failed to retrieve trainee program information" });
    }
  };