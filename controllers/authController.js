import { auth, db, serverTimestamp } from "../config/firebaseConfig.js";
import {
  PhoneAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import generateToken from "../utilities/index.js";

async function getTraineeStats(traineeId) {
  if (!traineeId) {
    console.log("No traineeId provided to getTraineeStats");
    return null;
  }

  console.log(`Fetching reports for traineeId: ${traineeId}`);

  const traineeReportRef = doc(db, "reports", traineeId);
  const docSnap = await getDoc(traineeReportRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  } else {
    console.log("No report found for this trainee.");
    return null;
  }
}

// Function to generate a random 6-digit code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper function to determine user type and get their document
const getUserDocRef = async (uid) => {
  // Check if user is a trainee

  // Query trainees where uid field equals the auth uid
  const traineeQuery = query(
    collection(db, "trainees"),
    where("uid", "==", uid)
  );
  const traineeSnapshot = await getDocs(traineeQuery);

  if (!traineeSnapshot.empty) {
    const traineeDoc = traineeSnapshot.docs[0];
    return {
      docRef: traineeDoc.ref,
      userType: "trainee",
      data: traineeDoc.data(),
    };
  }

  // Check if user is a facilitator
  const facilitatorDocRef = doc(db, "facilitators", uid);
  const facilitatorDoc = await getDoc(facilitatorDocRef);

  if (facilitatorDoc.exists()) {
    return {
      docRef: facilitatorDocRef,
      userType: "facilitator",
      data: facilitatorDoc.data(),
    };
  }

  return null;
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // First authenticate with email/password
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Get the user document from either trainees or facilitators collection
    const userInfo = await getUserDocRef(user.uid);

    if (!userInfo) {
      return res.status(404).json({
        message: "User not found in trainees or facilitators collections",
      });
    }
    // console.log("User Info:", userInfo);
    // console.log("User Location:", userInfo.data.location);
    
    // Check if 2FA is enabled for this user
    if (userInfo.data.twoFactorEnabled === true) {
      // Generate a verification code
      const verificationCode = generateVerificationCode();

      // Store the verification code in Firestore with an expiration time
      const verificationRef = await addDoc(
        collection(db, "verificationCodes"),
        {
          userId: user.uid,
          userType: userInfo.userType,
          code: verificationCode,
          createdAt: serverTimestamp(),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiration
          used: false,
        }
      );

      return res.status(200).json({
        requires2FA: true,
        verificationId: verificationRef.id,
        verificationCode, // Fallback for testing
        message: "Unable to send SMS. Please use the code provided.",
      });
    }

    // 2FA not enabled, proceed with normal login
    // Fetch facilitator data if user is a facilitator
    let facilitatorData = null;
    if (userInfo.userType === "facilitator") {
      const facilitatorDocRef = doc(db, "facilitators", user.uid);
      const facilitatorDoc = await getDoc(facilitatorDocRef);
      if (facilitatorDoc.exists()) {
        facilitatorData = { id: facilitatorDoc.id, ...facilitatorDoc.data() };
      }
    }

    const token = generateToken({
      uid: user.uid,
      email: user.email,
      userType: userInfo.userType,
      location: userInfo.data.location
    });

    return res.status(200).json({
      token,
      user: user.email,
      userType: userInfo.userType,
      facilitator: facilitatorData,
    });
  } catch (error) {
    console.error("Login error:", error);

    // Handle errors
    return res.status(400).json({
      message: error.message,
      code: error.code,
    });
  }
};

//Trainee Login
export const login_Trainee = async (req, res) => {
  const { email, password } = req.body;

  try {
    // First authenticate with email/password
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;
    const uid = user.uid;

    console.log(`🔍 Searching for trainee with uid: ${uid}`);
    const traineesRef = collection(db, "trainees");
    const q = query(traineesRef, where("uid", "==", uid));
    const querySnapshot = await getDocs(q);

    let traineeData = null;

    if (!querySnapshot.empty) {
      querySnapshot.forEach((doc) => {
        traineeData = { id: doc.id, ...doc.data() };
      });
    } else {
      console.log("⚠️ No trainee found for this UID.");
      return res.status(404).json({ message: "Trainee not found" });
    }

    if (!traineeData.id) {
      console.log("❌ traineeData.id is undefined");
      return res.status(500).json({ message: "Invalid trainee data" });
    }

    // Check if 2FA is enabled for this trainee
    if (traineeData.twoFactorEnabled === true) {
      // Generate a verification code
      const verificationCode = generateVerificationCode();

      // Store the verification code in Firestore with an expiration time
      const verificationRef = await addDoc(
        collection(db, "verificationCodes"),
        {
          userId: uid,
          userType: "trainee",
          code: verificationCode,
          createdAt: serverTimestamp(),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiration
          used: false,
        }
      );

      return res.status(200).json({
        requires2FA: true,
        verificationId: verificationRef.id,
        verificationCode, // Only for testing!
        message: "Multi-factor authentication required.",
      });
    }

    // Fetch trainee report by document ID (traineeId)
    const reports = await getTraineeStats(traineeData.id);

    // 2FA not enabled, proceed with normal login
    const token = generateToken({
      uid: uid,
      email: user.email,
      userType: "trainee",
    });

    return res.status(200).json({
      token,
      user: user.email,
      userType: "trainee",
      trainee: traineeData,
      traineeReports: reports,
    });
  } catch (error) {
    console.error("❌ Error during login:", error.message);
    return res.status(500).json({
      message: error.message,
      code: error.code,
    });
  }
};

export const enable2FA = async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ message: "Phone number is required" });
  }

  try {
    const user = auth.currentUser;
    if (!user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Generate a reCAPTCHA token to verify the user
    const recaptchaVerifier = new RecaptchaVerifier(
      "recaptcha-container",
      {
        size: "invisible",
      },
      auth
    );
    await recaptchaVerifier.render();

    // Send verification SMS
    const phoneProvider = new PhoneAuthProvider(auth);
    const verificationId = await phoneProvider.verifyPhoneNumber(
      phoneNumber,
      recaptchaVerifier
    );

    // Store the verification ID in Firestore for later verification
    const userInfo = await getUserDocRef(user.uid);
    await updateDoc(userInfo.docRef, {
      phoneNumber: phoneNumber,
      twoFactorEnabled: true,
      verificationId: verificationId,
      updatedAt: serverTimestamp(),
    });

    return res.status(200).json({
      message: "2FA has been enabled successfully",
      verificationId: verificationId,
    });
  } catch (error) {
    console.error("Enable 2FA error:", error);
    return res.status(500).json({
      message: error.message,
    });
  }
};

export const verify2FA = async (req, res) => {
  const { verificationId, verificationCode } = req.body;

  if (!verificationId || !verificationCode) {
    return res
      .status(400)
      .json({ message: "Verification ID and code are required" });
  }

  try {
    // Retrieve the verification document from Firestore
    const verificationDocRef = doc(db, "verificationCodes", verificationId);
    const verificationDoc = await getDoc(verificationDocRef);

    if (!verificationDoc.exists()) {
      return res.status(404).json({ message: "Verification record not found" });
    }

    const verificationData = verificationDoc.data();

    // Check if the code is expired
    const now = new Date();
    if (verificationData.expiresAt.toDate() < now) {
      return res.status(400).json({ message: "Verification code has expired" });
    }

    // Check if the code has already been used
    if (verificationData.used) {
      return res
        .status(400)
        .json({ message: "Verification code has already been used" });
    }

    // Verify the code
    if (verificationData.code !== verificationCode) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    // Mark the code as used
    await updateDoc(verificationDocRef, {
      used: true,
      usedAt: serverTimestamp(),
    });

    // Get user information using the helper function
    const userId = verificationData.userId;
    const userInfo = await getUserDocRef(userId);

    if (!userInfo) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate a token
    const token = generateToken({
      uid: userId,
      email: userInfo.data.email,
      userType: verificationData.userType,
    });

    // Base response that will be returned for all user types
    const baseResponse = {
      token,
      user: userInfo.data.email,
      userType: verificationData.userType,
      message: "2FA verification successful",
    };

    // If the user is a trainee, fetch trainee reports and add to response
    if (verificationData.userType === "trainee") {
      // Get the trainee data that's already retrieved by getUserDocRef
      const traineeData = { id: userInfo.docRef.id, ...userInfo.data };

      // Fetch trainee reports
      const reports = await getTraineeStats(traineeData.id);

      return res.status(200).json({
        ...baseResponse,
        trainee: traineeData,
        traineeReports: reports,
      });
    }

    // For non-trainee users, return just the base response
    return res.status(200).json(baseResponse);
  } catch (error) {
    console.error("Verify 2FA error:", error);
    return res.status(500).json({
      message: error.message,
    });
  }
};

export const disable2FA = async (req, res) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Get the user document from either trainees or facilitators collection
    const userInfo = await getUserDocRef(user.uid);

    if (!userInfo) {
      return res.status(404).json({
        message: "User not found in trainees or facilitators collections",
      });
    }

    // Update the document to disable 2FA
    await updateDoc(userInfo.docRef, {
      twoFactorEnabled: false,
      updatedAt: serverTimestamp(),
    });

    return res.status(200).json({
      message: "2FA has been disabled successfully",
      userType: userInfo.userType,
    });
  } catch (error) {
    console.error("Disable 2FA error:", error);
    return res.status(500).json({
      message: error.message,
    });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  // const auth = getAuth();

  try {
    await sendPasswordResetEmail(auth, email);
    return res
      .status(200)
      .json({ message: "Password reset link sent successfully" });
  } catch (error) {
    console.error("Forgot Password Error:", error);

    // Handle specific Firebase error codes
    if (error.code === "auth/user-not-found") {
      return res.status(404).json({ message: "Email not registered" });
    }

    return res
      .status(500)
      .json({ message: "Something went wrong, please try again later" });
  }
};
