import { db } from "../config/firebaseConfig.js";
import { collection, doc, setDoc, getDoc, addDoc, getDocs } from "firebase/firestore";
import QRCode from "qrcode";
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
