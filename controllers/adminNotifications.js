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
import axios from "axios";

// Fetch all activities from the Realtime Database
export const getLiveActivities = async (req, res) => {
    try {
      // Reference the liveTracking node in the Realtime Database
      const activitiesRef = ref(rtdb, "liveTracking");
      const snapshot = await get(activitiesRef);
  
      // Check if there are any activities
      const activities = snapshot.val();
      if (!activities) {
        return res.status(200).json({ message: "No activities found" });
      }
  
      // Return the activities as an array
      const activityList = Object.keys(activities).map((key) => ({
        traineeId: key,
        ...activities[key],
      }));
  
      res.status(200).json({
        message: "Live activities retrieved successfully",
        activities: activityList,
      });
    } catch (error) {
      console.error("Error fetching live activities:", error);
      res.status(500).json({ error: "Failed to fetch live activities" });
    }
  };

  export const getLiveActivitiesByLocation = async (req, res) => {
    try {
      const { location } = req.query;
  
      // Reference the liveTracking node in the Realtime Database
      const activitiesRef = ref(rtdb, "liveTracking");
      const snapshot = await get(activitiesRef);
  
      // Check if there are any activities
      const activities = snapshot.val();
      if (!activities) {
        return res.status(200).json({ message: "No activities found" });
      }
  
      // Filter activities by location if provided
      const filteredActivities = location
        ? Object.keys(activities)
            .map((key) => ({ traineeId: key, ...activities[key] }))
            .filter((activity) => activity.location === location)
        : Object.keys(activities).map((key) => ({
            traineeId: key,
            ...activities[key],
          }));
  
      if (filteredActivities.length === 0) {
        return res.status(200).json({ message: "No activities found for the specified location" });
      }
  
      res.status(200).json({
        message: "Live activities retrieved successfully",
        activities: filteredActivities,
      });
    } catch (error) {
      console.error("Error fetching live activities by location:", error);
      res.status(500).json({ error: "Failed to fetch live activities" });
    }
  };