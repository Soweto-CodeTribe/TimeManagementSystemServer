import { db } from "../config/firebaseConfig.js";
import { collection, doc, setDoc, getDoc, addDoc } from "firebase/firestore";
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
