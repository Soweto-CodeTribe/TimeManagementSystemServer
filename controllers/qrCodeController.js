import { db } from "../config/firebaseConfig.js";
import { collection, doc, setDoc, getDoc } from "firebase/firestore";
import QRCode from "qrcode";

// Function to generate and store QR Code
export const generateQRCode = async (req, res) => {
  try {
    const qrId = Date.now().toString(); // Unique ID based on timestamp
    const expiration = new Date();
    expiration.setHours(23, 59, 59, 999); // Expire at end of the day

    const qrData = {
      id: qrId,
      validUntil: expiration.getTime(), // Store expiration timestamp
    };

    // Generate QR Code image
    const qrImage = await QRCode.toDataURL(JSON.stringify(qrData));

    // Store in Firestore
    await setDoc(doc(db, "qrCodes", "dailyQR"), qrData);

    // console.log("code", qrImage);
    res.status(200).json({ message: "QR code", qrImage, date: qrImage.validUntil});

    return qrImage;
  } catch (error) {
    console.error("QR Code generation failed:", error);
    res.status(500).json({ error: "QR Code generation failed:", error });

    throw error;
  }
};

export const verifyQRCode = async (scannedQR) => {
  try {
    const docRef = doc(db, "qrCodes", "dailyQR");
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { success: false, message: "QR Code not found" };
    }

    const storedQR = docSnap.data();
    const currentTime = Date.now();

    // Check if QR is valid and not expired
    if (scannedQR.id === storedQR.id && currentTime <= storedQR.validUntil) {
      return { success: true, message: "Valid QR Code" };
    } else {
      return { success: false, message: "Invalid or expired QR Code" };
    }
  } catch (error) {
    console.error("QR verification failed:", error);
    return { success: false, message: "Internal Server Error" };
  }
};
