import { auth, db, serverTimestamp } from "../config/firebaseConfig.js";
import {
  PhoneAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  RecaptchaVerifier,
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
import { generateStakeholderToken } from "../utilities/index.js";
import { sendVerificationCodeEmail } from "../services/emailService.js";
import { tokenBlacklist } from "../utilities/usedTokens.js";

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

  // Check if user is a stakeholder
  const stakeholderDocRef = doc(db, "stakeholders", uid);
  const stakeholderDoc = await getDoc(stakeholderDocRef);

  if (stakeholderDoc.exists()) {
    return {
      docRef: stakeholderDocRef,
      userType: "stakeholder",
      data: stakeholderDoc.data(),
    };
  }

  return null;
};

// export const login = async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     // First authenticate with email/password
//     const userCredential = await signInWithEmailAndPassword(
//       auth,
//       email,
//       password
//     );
//     const user = userCredential.user;

//     // Get the user document from either trainees or facilitators collection
//     const userInfo = await getUserDocRef(user.uid);

//     if (!userInfo) {
//       return res.status(404).json({
//         message: "User not found in trainees or facilitators collections",
//       });
//     }
//     // console.log("User Info:", userInfo);
//     // console.log("User Location:", userInfo.data.location);

//     // Check if 2FA is enabled for this user
//     if (userInfo.data.twoFactorEnabled === true) {
//       // Generate a verification code
//       const verificationCode = generateVerificationCode();

//       // Store the verification code in Firestore with an expiration time
//       const verificationRef = await addDoc(
//         collection(db, "verificationCodes"),
//         {
//           userId: user.uid,
//           userType: userInfo.userType,
//           code: verificationCode,
//           createdAt: serverTimestamp(),
//           expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiration
//           used: false,
//         }
//       );

//       return res.status(200).json({
//         requires2FA: true,
//         verificationId: verificationRef.id,
//         verificationCode, // Fallback for testing
//         message: "Unable to send SMS. Please use the code provided.",
//       });
//     }

//     // 2FA not enabled, proceed with normal login
//     // Fetch facilitator data if user is a facilitator
//     let facilitatorData = null;
//     if (userInfo.userType === "facilitator") {
//       const facilitatorDocRef = doc(db, "facilitators", user.uid);
//       const facilitatorDoc = await getDoc(facilitatorDocRef);
//       if (facilitatorDoc.exists()) {
//         facilitatorData = { id: facilitatorDoc.id, ...facilitatorDoc.data() };
//       }
//     }

//     const token = generateToken({
//       uid: user.uid,
//       email: user.email,
//       userType: userInfo.userType,
//       location: userInfo.data.location
//     });

//     return res.status(200).json({
//       token,
//       user: user.email,
//       userType: userInfo.userType,
//       facilitator: facilitatorData,
//     });
//   } catch (error) {
//     console.error("Login error:", error);

//     // Handle errors
//     return res.status(400).json({
//       message: error.message,
//       code: error.code,
//     });
//   }
// };

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
          email: user.email,
          code: verificationCode,
          createdAt: serverTimestamp(),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiration
          used: false,
        }
      );

      // Send verification code via Brevo email
      const emailSent = await sendVerificationCodeEmail(
        user.email,
        verificationCode
      );

      return res.status(200).json({
        requires2FA: true,
        verificationCode: verificationCode,
        verificationId: verificationRef.id,
        // Only include code in response for testing or if email fails
        ...((!emailSent || process.env.NODE_ENV === "development") && {
          verificationCode,
        }),
        message: emailSent
          ? "Verification code sent to your email"
          : "Unable to send email. Please use the code provided.",
      });
    }

    // Rest of your login logic remains the same...
    const token = generateToken({
      uid: user.uid,
      email: user.email,
      role: userInfo.role,
      location: userInfo.data.location,
      
    });

    return res.status(200).json({
      token,
      user: user.email,
      role: userInfo.data.role,
      location: userInfo.data.location,
      // userType: userInfo.userType,
      facilitator: userInfo.data,
    });
  } catch (error) {
    console.error("Login error:", error);
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
          email: user.email,
          code: verificationCode,
          createdAt: serverTimestamp(),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiration
          used: false,
        }
      );

      // return res.status(200).json({
      //   requires2FA: true,
      //   verificationId: verificationRef.id,
      //   verificationCode, // Only for testing!
      //   message: "Multi-factor authentication required.",
      // });

      // Send verification code via Brevo email
      const emailSent = await sendVerificationCodeEmail(
        user.email,
        verificationCode
      );

      return res.status(200).json({
        requires2FA: true,
        verificationCode: verificationCode, 
        verificationId: verificationRef.id,
        ...((!emailSent || process.env.NODE_ENV === "development") && {
          verificationCode,
        }),
        message: emailSent
          ? "Verification code sent to your email"
          : "Unable to send email. Please use the code provided.",
      });
    }

    // Fetch trainee report by document ID (traineeId)
    const reports = await getTraineeStats(traineeData.id);

    // 2FA not enabled, proceed with normal login
    const token = generateToken({
      uid: uid,
      email: user.email,
      location: traineeData.location,
    });

    return res.status(200).json({
      token,
      user: user.email,
      location: traineeData.location,
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

export const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // Add token to blacklist
    tokenBlacklist.push(token);

    await auth.signOut();

    res.status(200).json({ message: "User logged out successfully" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while trying to log out: ${error}`,
    });
  }
};

export const stakeholderLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // First, authenticate with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Get the user document
    const userInfo = await getUserDocRef(user.uid);

    if (!userInfo || userInfo.userType !== "stakeholder") {
      return res.status(403).json({
        error: "Account is not a registered stakeholder",
        requiresTokenRequest: true,
      });
    }

    const stakeholderData = userInfo.data;

    // Check token status - they need to request a token
    if (stakeholderData.tokenStatus !== "active") {
      return res.status(403).json({
        error: "You need to request access from a super admin",
        stakeholderId: user.uid,
        email: stakeholderData.email,
        requiresTokenRequest: true,
      });
    }

    // Check if 2FA is enabled for this stakeholder
    if (stakeholderData.twoFactorEnabled === true) {
      // Use the existing 2FA flow
      const verificationCode = generateVerificationCode();

      // Store the verification code in Firestore with an expiration time
      const verificationRef = await addDoc(
        collection(db, "verificationCodes"),
        {
          userId: user.uid,
          userType: "stakeholder",
          code: verificationCode,
          createdAt: serverTimestamp(),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiration
          used: false,
        }
      );

      // return res.status(200).json({
      //   requires2FA: true,
      //   verificationId: verificationRef.id,
      //   verificationCode, // For testing only - remove in production
      //   message: "Multi-factor authentication required.",
      // });

      // Send verification code via Brevo email
      const emailSent = await sendVerificationCodeEmail(
        user.email,
        verificationCode
      );

      return res.status(200).json({
        requires2FA: true,
        verificationId: verificationRef.id,
        ...((!emailSent || process.env.NODE_ENV === "development") && {
          verificationCode,
        }),
        message: emailSent
          ? "Verification code sent to your email"
          : "Unable to send email. Please use the code provided.",
      });
    }

    // 2FA not enabled, proceed with normal login
    // Update token timestamp
    await updateDoc(userInfo.docRef, {
      tokenLastUpdated: serverTimestamp(),
    });

    // Generate a 24-hour access token
    const token = generateStakeholderToken({
      uid: user.uid,
      email: stakeholderData.email,
      name: stakeholderData.name,
    });

    res.json({
      uid: user.uid,
      email: stakeholderData.email,
      name: stakeholderData.name,
      role: "stakeholder",
      accessToken: token,
      expiresIn: "24 hours",
    });
  } catch (error) {
    console.error("Stakeholder login error:", error);
    res.status(401).json({ error: "Invalid credentials" });
  }
};

// export const enable2FA = async (req, res) => {
//   const { phoneNumber } = req.body;

//   if (!phoneNumber) {
//     return res.status(400).json({ message: "Phone number is required" });
//   }

//   try {
//     const user = auth.currentUser;
//     if (!user) {
//       return res.status(401).json({ message: "User not authenticated" });
//     }

//     // Get the user's information
//     const userInfo = await getUserDocRef(user.uid);
//     if (!userInfo) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Generate a 6-digit verification code
//     const verificationCode = generateVerificationCode();

//     // Store the verification code in Firestore with an expiration time
//     const verificationRef = await addDoc(
//       collection(db, "verificationCodes"),
//       {
//         userId: user.uid,
//         userType: userInfo.userType,
//         phoneNumber: phoneNumber,
//         code: verificationCode,
//         createdAt: serverTimestamp(),
//         expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiration
//         used: false,
//       }
//     );

//     // Update user document to prepare for 2FA
//     await updateDoc(userInfo.docRef, {
//       phoneNumber: phoneNumber,
//       twoFactorEnabled: true,
//       verificationId: verificationRef.id,
//       updatedAt: serverTimestamp(),
//     });

//     return res.status(200).json({
//       message: "Verification code generated",
//       verificationId: verificationRef.id,
//       phoneNumber: phoneNumber,
//       // In production, DO NOT send the actual code back
//       // This is just for testing purposes
//       verificationCode: verificationCode
//     });
//   } catch (error) {
//     console.error("Enable 2FA error:", error);
//     return res.status(500).json({
//       message: error.message,
//     });
//   }
// };

export const enable2FA = async (req, res) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Get the user's information
    const userInfo = await getUserDocRef(user.uid);
    if (!userInfo) {
      return res.status(404).json({ message: "User not found" });
    }

    const email = userInfo.data.email || user.email;

    // Generate a 6-digit verification code
    const verificationCode = generateVerificationCode();

    // Store the verification code in Firestore with an expiration time
    const verificationRef = await addDoc(collection(db, "verificationCodes"), {
      userId: user.uid,
      userType: userInfo.userType,
      email: email,
      code: verificationCode,
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiration
      used: false,
    });

    // Send verification code via Brevo email
    const emailSent = await sendVerificationCodeEmail(email, verificationCode);

    // Update user document to enable 2FA
    await updateDoc(userInfo.docRef, {
      twoFactorEnabled: true,
      verificationId: verificationRef.id,
      updatedAt: serverTimestamp(),
    });

    return res.status(200).json({
      message: emailSent
        ? "Verification code sent to your email"
        : "Unable to send email. Please try again later.",
      verificationId: verificationRef.id,
      email: email,
      // In production, only return the verification code if email failed
      // and only for testing purposes
      ...((!emailSent || process.env.NODE_ENV === "development") && {
        verificationCode,
      }),
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
      location: userInfo.data.location,
      role: userInfo.data.role,
    });

    // Base response that will be returned for all user types
    const baseResponse = {
      token,
      user: userInfo.data.email,
      message: "2FA verification successful",
      location: userInfo.data.location,
      role: userInfo.data.role,
    };


    // If the user is a Facilitator, fetch trainee reports and add to response
    if (verificationData.userType === "facilitator") {
      // Get the trainee data that's already retrieved by getUserDocRef
      const facilitatorData = { id: userInfo.docRef.id, ...userInfo.data };

      

      return res.status(200).json({
        ...baseResponse,
        facilitator: facilitatorData,
      });
    }


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

    // If verification successful and user is a stakeholder
    if (verificationData.userType === "stakeholder") {
      // Get stakeholder data that's already retrieved
      const stakeholderData = { id: userInfo.docRef.id, ...userInfo.data };

      // Check token status
      if (stakeholderData.tokenStatus !== "active") {
        return res.status(403).json({
          error: "Your access token is not active",
          requiresTokenRequest: true,
        });
      }

      // Update token timestamp
      await updateDoc(userInfo.docRef, {
        tokenLastUpdated: serverTimestamp(),
      });

      // Generate stakeholder token
      const token = generateStakeholderToken({
        uid: userId,
        email: stakeholderData.email,
        name: stakeholderData.name,
      });

      return res.status(200).json({
        ...baseResponse,
        role: "stakeholder",
        accessToken: token,
        expiresIn: "24 hours",
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


export const resendVerificationCode = async (req, res) => {
  const { verificationId, email } = req.body;

  if (!verificationId || !email) {
    return res.status(400).json({ 
      message: "Verification ID and email are required" 
    });
  }

  try {
    // First, check if the verification record exists
    const verificationDocRef = doc(db, "verificationCodes", verificationId);
    const verificationDoc = await getDoc(verificationDocRef);

    if (!verificationDoc.exists()) {
      return res.status(404).json({ 
        message: "Verification record not found" 
      });
    }

    const verificationData = verificationDoc.data();
    const userId = verificationData.userId;
    const userType = verificationData.userType;

    // Check if the email matches the one in the verification record
    if (verificationData.email !== email) {
      return res.status(400).json({ 
        message: "Email does not match the verification record" 
      });
    }

    // Generate a new verification code
    const newVerificationCode = generateVerificationCode();

    // Create a new verification record in Firestore
    const newVerificationRef = await addDoc(
      collection(db, "verificationCodes"),
      {
        userId: userId,
        userType: userType,
        email: email,
        code: newVerificationCode,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiration
        used: false,
      }
    );

    // Send the new verification code via email
    const emailSent = await sendVerificationCodeEmail(email, newVerificationCode);

    // Return the new verification ID and code
    return res.status(200).json({
      message: emailSent 
        ? "New verification code sent to your email" 
        : "Unable to send email. Please try again later.",
      verificationId: newVerificationRef.id,
      ...((!emailSent || process.env.NODE_ENV === 'development') && { verificationCode: newVerificationCode }),
    });
  } catch (error) {
    console.error("Resend verification code error:", error);
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



// Function to delete old verification codes
export const cleanupVerificationCodes = async () => {
  try {
    const verificationCodesRef = collection(db, "verificationCodes");
    const now = new Date();
    
    // Get all verification codes that are:
    // 1. Already used OR
    // 2. Expired (older than their expiration date)
    const usedCodesQuery = query(
      verificationCodesRef,
      where("used", "==", true)
    );
    
    const expiredCodesQuery = query(
      verificationCodesRef,
      where("expiresAt", "<", now)
    );
    
    // Execute both queries
    const usedCodesSnapshot = await getDocs(usedCodesQuery);
    const expiredCodesSnapshot = await getDocs(expiredCodesQuery);
    
    // Count deleted documents
    let deletedCount = 0;
    
    // Delete used codes
    const usedCodesDeletions = usedCodesSnapshot.docs.map(async (doc) => {
      await deleteDoc(doc.ref);
      deletedCount++;
    });
    
    // Delete expired codes
    const expiredCodesDeletions = expiredCodesSnapshot.docs.map(async (doc) => {
      // Skip if already counted in used codes
      if (!usedCodesSnapshot.docs.some(usedDoc => usedDoc.id === doc.id)) {
        await deleteDoc(doc.ref);
        deletedCount++;
      }
    });
    
    // Wait for all deletions to complete
    await Promise.all([...usedCodesDeletions, ...expiredCodesDeletions]);
    
    console.log(`Cleaned up ${deletedCount} verification codes`);
    return { success: true, deletedCount };
  } catch (error) {
    console.error("Error cleaning up verification codes:", error);
    return { success: false, error: error.message };
  }
};