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
  arrayUnion,
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
    const eventId = Date.now().toString();
    const eventData = { eventId, title, date, location, description };

    await setDoc(doc(db, "events", eventId), eventData);

    // Generate QR Code with event ID
    // const qrCode = await QRCode.toDataURL(eventId);

    res.status(200).json({ message: "Event added" });
  } catch (error) {
    console.error("Event generation failed:", error);
    res.status(500).json({ error: "Event generation failed" });
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

    // console.log("Received guest info:", guestInfo);

    if (guestInfo.guestId) {
      const guestRef = doc(db, "eventGuests", guestInfo.guestId);
      const guestDoc = await getDoc(guestRef);

      // console.log("Checking Firestore for guest:", guestInfo.guestId);
      // console.log("Guest document exists:", guestDoc.exists());

      if (guestDoc.exists()) {
        // Returning guest - Update the existing document
        await updateDoc(guestRef, {
          checkInTime,
          checkInDate: currentDate,
          lastVisit: guestDoc.data().checkInDate || null,
          returnVisit: true,
          timestamp: Timestamp.now(),
        });

        // console.log("Returning guest updated successfully:", guestInfo.guestId);

        return res.status(200).json({
          message: "Returning guest check-in successful",
          guestId: guestInfo.guestId,
          checkInTime,
          returnVisit: true,
        });
      }
    }

    // Prevent creating a new guest if email already exists
    const existingGuestQuery = query(
      collection(db, "eventGuests"),
      where("email", "==", guestInfo.email)
    );
    const existingGuestSnapshot = await getDocs(existingGuestQuery);

    if (!existingGuestSnapshot.empty) {
      console.log("Duplicate guest detected. Preventing duplicate entry.");
      return;
    }

    // console.log("No existing guest found. Creating a new guest record.");

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

    const eventRef = doc(db, "events", guestInfo.eventId);
    await updateDoc(eventRef, {
      guests: arrayUnion(guestInfo.email),
    });

    // console.log("New guest check-in successful:", guestRef.id);

    return res.status(200).json({
      message: "New guest check-in successful",
      guestId: guestRef.id,
      checkInTime,
      returnVisit: false,
    });
  } catch (error) {
    console.error("Guest check-in error:", error);
    return res.status(500).json({ error: "Failed to check in guest" });
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

export const getGuests = async (req, res) => {
  try {
    const eventsCollection = collection(db, "events");
    const eventsSnapshot = await getDocs(eventsCollection);

    const eventsWithGuests = [];

    for (const eventDoc of eventsSnapshot.docs) {
      const eventData = eventDoc.data();

      if (!eventData.guests || eventData.guests.length === 0) {
        eventsWithGuests.push({
          ...eventData,
          guestDetails: [],
        });
        continue;
      }

      const guestDetails = [];
      for (const email of eventData.guests) {
        const guestsQuery = query(
          collection(db, "eventGuests"),
          where("email", "==", email)
        );

        const guestSnapshot = await getDocs(guestsQuery);

        if (!guestSnapshot.empty) {
          guestSnapshot.docs.forEach((guestDoc) => {
            guestDetails.push({
              id: guestDoc.id,
              ...guestDoc.data(),
            });
          });
        } else {
          guestDetails.push({ email });
        }
      }

      eventsWithGuests.push({
        ...eventData,
        guestDetails,
      });
    }

    return res.status(200).json({
      eventsWithGuests,
    });

    // console.log(eventsWithGuests)
  } catch (error) {
    console.error("Error fetching guests:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
