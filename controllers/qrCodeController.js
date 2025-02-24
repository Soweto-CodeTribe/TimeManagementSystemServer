import { db } from "../config/firebaseConfig.js";
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import QRCode from "qrcode";

// Function to generate and store QR Code
export const generateQRCode = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of the day
    const docId = today.toISOString().split("T")[0]; // Format YYYY-MM-DD

    // Check if previous day's QR exists
    const docRef = doc(db, "qrCodes", "dailyQR");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log("Previous QR code found, deleting...");
      await deleteDoc(docRef); // Remove previous QR code
    }

    // Generate new QR ID
    const qrId = Date.now().toString();
    const expiration = new Date();
    expiration.setHours(16, 59, 59, 999); // Expire at end of the day

    const qrData = {
      id: qrId,
      validUntil: expiration.getTime(),
      createdAt: today.getTime(),
    };

    // Generate QR Code image (optional)
    const qrImage = await QRCode.toDataURL(qrId);

    // Store new QR Code in Firestore
    await setDoc(doc(db, "qrCodes", "dailyQR"), qrData);

    console.log("✅ New QR Code generated successfully:", qrId);
  } catch (error) {
    console.error("❌ QR Code generation failed:", error);
  }
};

// Function to fetch the current day's QR Code
export const getQRcode = async (req, res) => {
  try {
    const docRef = doc(db, "qrCodes", "dailyQR");
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return res.status(404).json({ message: "QR Code not found" });
    }

    const qrData = docSnap.data();
    res.status(200).json(qrData);
  } catch (error) {
    console.error("Error fetching QR Code:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const verifyQRCode = async (req, res) => {
  const { qrId } = req.body;
  try {
    const docRef = doc(db, "qrCodes", "dailyQR");
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { success: false, message: "QR Code not found" };
    }

    const storedQR = docSnap.data();
    const currentTime = Date.now();

    // Check if QR is valid and not expired
    if (qrId === storedQR.id && currentTime <= storedQR.validUntil) {
      res.status(200).json({ success: true, message: "Valid QR Code" });
    } else {
      res
        .status(404)
        .json({ success: false, message: "Invalid or expired QR Code" });
    }
  } catch (error) {
    console.error("QR verification failed:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Automatically generate QR Code every day at 1 AM
export function scheduleQRCodeGeneration() {
  const now = new Date();
  const next1AM = new Date(now);

  next1AM.setHours(1, 0, 0, 0); // Set time to 1:00 AM
  if (next1AM < now) {
    next1AM.setDate(next1AM.getDate() + 1); // Move to next day if it's past 1 AM
  }

  const timeUntilNext1AM = next1AM - now;
  console.log(
    `🕐 Scheduling next QR Code generation at: ${next1AM.toLocaleString()}`
  );

  setTimeout(() => {
    generateQRCode();
    setInterval(generateQRCode, 24 * 60 * 60 * 1000); // Run every 24 hours
  }, timeUntilNext1AM);
}

