import { db } from "../config/firebaseConfig.js";
import { collection, doc, setDoc, getDoc, addDoc, getDocs, Timestamp } from "firebase/firestore";
import QRCode from "qrcode";
import { formatTime } from "./sessionController.js";
export const guestQR = async (req, res) => {
  try {
    const { title, date, location, description } = req.body;
    const eventId = Date.now().toString(); // Unique event ID
    const eventData = { eventId, title, date, location, description };

    // Store event in Firestore
    await setDoc(doc(db, "events", eventId), eventData);

    // Generate QR Code with event ID
    const qrCode = await QRCode.toDataURL(eventId);

    res.status(200).json({ message: "Event QR code generated", qrCode });
  } catch (error) {
    console.error("QR Code generation failed:", error);
    res.status(500).json({ error: "QR Code generation failed" });
  }
};

export const getEvent = async (req ,res) =>{
    try {
        const { eventId } = req.params;
        const eventRef = doc(db, "events", eventId);
        const eventSnap = await getDoc(eventRef);
    
        if (!eventSnap.exists()) {
          return res.status(404).json({ message: "Event not found" });
        }
    
        res.status(200).json(eventSnap.data());
      } catch (error) {
        console.error("Failed to retrieve event:", error);
        res.status(500).json({ error: "Failed to retrieve event" });
      }
}

export const getAllEvents = async (req, res) => {
    try {
        const eventsCollection = collection(db, "events");
        const eventsSnapshot = await getDocs(eventsCollection);
        const eventsList = eventsSnapshot.docs.map(doc => doc.data());

        res.status(200).json(eventsList);
    } catch (error) {
        console.error("Failed to retrieve events:", error);
        res.status(500).json({ error: "Failed to retrieve events" });
    }
}

export const guestCheckIn = async (req, res) => {
    try {
        const { eventId } = req.params;
        const guestInfo = req.body;
        const checkInTime = formatTime();
    
        // Verify event exists
        const eventDoc = await getDoc(doc(db, "events", eventId));
        if (!eventDoc.exists()) {
          return res.status(404).json({ error: "Event not found" });
        }
    
        // Create guest check-in record
        const guestRef = doc(collection(db, "eventGuests"));
        await setDoc(guestRef, {
          guestId: guestRef.id,
          eventId,
          checkInTime,
          checkInDate: new Date().toISOString().split('T')[0],
          ...guestInfo,
          timestamp: Timestamp.now()
        });
    
        res.status(200).json({
          message: "Guest check-in successful",
          guestId: guestRef.id,
          checkInTime
        });
      } catch (error) {
        console.error("Guest check-in error:", error);
        res.status(500).json({ error: "Failed to check in guest" });
      }
}
