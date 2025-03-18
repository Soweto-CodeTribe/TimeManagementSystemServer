import { db } from "../config/firebaseConfig.js";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  getDocs,
  Timestamp,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import QRCode from "qrcode";
import { formatTime } from "./sessionController.js";
import { sendGuestEmail } from "../services/guestEmailServices.js";

export const getEventQRcode = async (req, res) => {
  try {
    const docRef = doc(db, "qrCodes", "guestForm");
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return res.status(404).json({ message: "Guest QR Code not found" });
    }

    const qrGuest = docSnap.data();
    res.status(200).json(qrGuest);
  } catch (error) {
    console.error("Error fetching QR Code:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
export const guestQR = async (req, res) => {
  try {
    const { title, date, location, description } = req.body;
    const eventId = Date.now().toString(); // Unique event ID
    const eventData = { eventId, title, date, location, description };

    await setDoc(doc(db, "events", eventId), eventData);

    // Generate QR Code with event ID
    const qrCode = await QRCode.toDataURL(eventId);

    res.status(200).json({ message: "Event QR code generated", qrCode });
  } catch (error) {
    console.error("QR Code generation failed:", error);
    res.status(500).json({ error: "QR Code generation failed" });
  }
};

export const getEvent = async (req, res) => {
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
};

export const getAllEvents = async (req, res) => {
  try {
    const eventsCollection = collection(db, "events");
    const eventsSnapshot = await getDocs(eventsCollection);
    const eventsList = eventsSnapshot.docs.map((doc) => doc.data());

    res.status(200).json(eventsList);
  } catch (error) {
    console.error("Failed to retrieve events:", error);
    res.status(500).json({ error: "Failed to retrieve events" });
  }
};

export const guestCheckIn = async (req, res) => {
  try {
    const guestInfo = req.body;
    const checkInTime = formatTime();
    const currentDate = new Date().toISOString().split("T")[0];

    // Check if this is a returning guest
    if (guestInfo.isReturning && guestInfo.guestId) {
      // This is a returning guest, update the existing document
      const guestRef = doc(db, "eventGuests", guestInfo.guestId);
      
      // Get the current document to preserve existing data
      const guestDoc = await getDoc(guestRef);
      
      if (!guestDoc.exists()) {
        return res.status(404).json({ error: "Guest record not found" });
      }
      
      await updateDoc(guestRef, {
        checkInTime,
        checkInDate: currentDate,
        lastVisit: guestDoc.data().checkInDate, 
        returnVisit: true,
        timestamp: Timestamp.now(),
      });
      
      res.status(200).json({
        message: "Returning guest check-in successful",
        guestId: guestInfo.guestId,
        checkInTime,
        returnVisit: true
      });
    } else {
      const guestRef = doc(collection(db, "eventGuests"));
      await setDoc(guestRef, {
        guestId: guestRef.id,
        checkInTime,
        checkInDate: currentDate,
        returnVisit: false,
        ...guestInfo,
        timestamp: Timestamp.now(),
      });

      await sendGuestEmail(guestInfo.email);

      res.status(200).json({
        message: "New guest check-in successful",
        guestId: guestRef.id,
        checkInTime,
        returnVisit: false
      });
    }
  } catch (error) {
    console.error("Guest check-in error:", error);
    res.status(500).json({ error: "Failed to check in guest" });
  }
};

export const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const guestsCollection = collection(db, "eventGuests");

    const q = query(guestsCollection, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return res.status(404).json({ error: "Guest not found" });
    }

    let guestData;
    querySnapshot.forEach((doc) => {
      guestData = { guestId: doc.id, ...doc.data() };
    });

    res.status(200).json(guestData);
  } catch (error) {
    console.error("Guest email check error:", error);
    res.status(500).json({ error: "Error checking guest email" });
  }
};
