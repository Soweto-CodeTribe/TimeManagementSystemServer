import { 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs,
    updateDoc,
    deleteDoc 
  } from 'firebase/firestore';
  import { db, serverTimestamp } from '../config/firebaseConfig.js';
  
  // Helper function to calculate distance between two points using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c * 1000; // Convert to meters
    return distance;
  };
  
  // POST - Add allowed location
  export const addAllowedLocation = async (req, res) => {
    try {
      const { 
        name,
        latitude,
        longitude,
        radius, // radius in meters
        description 
      } = req.body;
  
      if (!name || !latitude || !longitude || !radius) {
        return res.status(400).json({ error: "Missing required fields" });
      }
  
      const locationData = {
        name,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: parseFloat(radius),
        description: description || '',
        createdAt: serverTimestamp(),
        active: true
      };
  
      const docRef = doc(collection(db, "allowedLocations"));
      await setDoc(docRef, locationData);
  
      const savedDoc = await getDoc(docRef);
      const savedLocation = { id: docRef.id, ...savedDoc.data() };
  
      res.status(201).json(savedLocation);
    } catch (error) {
      console.error("Error adding allowed location:", error);
      res.status(500).json({ 
        error: "Failed to add allowed location", 
        details: error.message 
      });
    }
  };
  
  // GET - Get all allowed locations
  export const getAllowedLocations = async (req, res) => {
    try {
      const locationsRef = collection(db, "allowedLocations");
      const snapshot = await getDocs(locationsRef);
      const locations = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      res.status(200).json(locations);
    } catch (error) {
      console.error("Error fetching allowed locations:", error);
      res.status(500).json({ 
        error: "Failed to fetch allowed locations", 
        details: error.message 
      });
    }
  };
  
  // POST - Validate user location
  export const validateLocation = async (req, res) => {
    try {
      const { latitude, longitude, userId } = req.body;
  
      if (!latitude || !longitude || !userId) {
        return res.status(400).json({ error: "Missing required fields" });
      }
  
      const locationsRef = collection(db, "allowedLocations");
      const snapshot = await getDocs(locationsRef);
      const locations = snapshot.docs.map(doc => doc.data());
  
      let isWithinAllowedArea = false;
      let nearestLocation = null;
      let shortestDistance = Infinity;
  
      for (const location of locations) {
        if (!location.active) continue;
  
        const distance = calculateDistance(
          latitude,
          longitude,
          location.latitude,
          location.longitude
        );
  
        if (distance < shortestDistance) {
          shortestDistance = distance;
          nearestLocation = location;
        }
  
        if (distance <= location.radius) {
          isWithinAllowedArea = true;
          break;
        }
      }
  
      // Log the location check
      const locationLogRef = doc(collection(db, "locationLogs"));
      await setDoc(locationLogRef, {
        userId,
        latitude,
        longitude,
        timestamp: serverTimestamp(),
        isAllowed: isWithinAllowedArea,
        nearestLocationName: nearestLocation?.name,
        distanceToNearest: Math.round(shortestDistance)
      });
  
      if (!isWithinAllowedArea) {
        return res.status(403).json({
          allowed: false,
          message: "Location not within allowed area",
          nearestLocation: nearestLocation?.name,
          distance: Math.round(shortestDistance),
          requiredDistance: Math.round(nearestLocation?.radius)
        });
      }
  
      res.status(200).json({
        allowed: true,
        location: nearestLocation?.name,
        distance: Math.round(shortestDistance)
      });
    } catch (error) {
      console.error("Error validating location:", error);
      res.status(500).json({ 
        error: "Failed to validate location", 
        details: error.message 
      });
    }
  };
  
  // PUT - Update allowed location
  export const updateAllowedLocation = async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        name,
        latitude,
        longitude,
        radius,
        description,
        active 
      } = req.body;
  
      const locationRef = doc(db, "allowedLocations", id);
      const locationDoc = await getDoc(locationRef);
  
      if (!locationDoc.exists()) {
        return res.status(404).json({ error: "Location not found" });
      }
  
      const updateData = {
        ...(name && { name }),
        ...(latitude && { latitude: parseFloat(latitude) }),
        ...(longitude && { longitude: parseFloat(longitude) }),
        ...(radius && { radius: parseFloat(radius) }),
        ...(description && { description }),
        ...(active !== undefined && { active }),
        updatedAt: serverTimestamp()
      };
  
      await updateDoc(locationRef, updateData);
  
      const updatedDoc = await getDoc(locationRef);
      res.status(200).json({ 
        id, 
        ...updatedDoc.data() 
      });
    } catch (error) {
      console.error("Error updating allowed location:", error);
      res.status(500).json({ 
        error: "Failed to update allowed location", 
        details: error.message 
      });
    }
  };
  
  // DELETE - Delete allowed location
  export const deleteAllowedLocation = async (req, res) => {
    try {
      const { id } = req.params;
      const locationRef = doc(db, "allowedLocations", id);
      const locationDoc = await getDoc(locationRef);
  
      if (!locationDoc.exists()) {
        return res.status(404).json({ error: "Location not found" });
      }
  
      await deleteDoc(locationRef);
  
      res.status(200).json({
        message: "Location deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting allowed location:", error);
      res.status(500).json({ 
        error: "Failed to delete allowed location", 
        details: error.message 
      });
    }
  };
  
  // GET - Get location logs
  export const getLocationLogs = async (req, res) => {
    try {
      const logsRef = collection(db, "locationLogs");
      const snapshot = await getDocs(logsRef);
      const logs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      res.status(200).json(logs);
    } catch (error) {
      console.error("Error fetching location logs:", error);
      res.status(500).json({ 
        error: "Failed to fetch location logs", 
        details: error.message 
      });
    }
  };