import { auth, db, serverTimestamp } from "../config/firebaseConfig.js";
import { PhoneAuthProvider, signInWithCredential, signInWithEmailAndPassword } from "firebase/auth";
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
  deleteDoc 
} from "firebase/firestore";
import generateToken from "../utilities/index.js";


// Function to generate a random 6-digit code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper function to determine user type and get their document
const getUserDocRef = async (uid) => {
  // Check if user is a trainee
  
  // Query trainees where uid field equals the auth uid
  const traineeQuery = query(collection(db, "trainees"), where("uid", "==", uid));
  const traineeSnapshot = await getDocs(traineeQuery);
  
  if (!traineeSnapshot.empty) {
    const traineeDoc = traineeSnapshot.docs[0];
    return { docRef: traineeDoc.ref, userType: "trainee", data: traineeDoc.data() };
  }

  // Check if user is a facilitator
  const facilitatorDocRef = doc(db, "facilitators", uid);
  const facilitatorDoc = await getDoc(facilitatorDocRef);
  
  if (facilitatorDoc.exists()) {
    return { docRef: facilitatorDocRef, userType: "facilitator", data: facilitatorDoc.data() };
  }
  
  return null;
};



export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // First authenticate with email/password
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Get the user document from either trainees or facilitators collection
    const userInfo = await getUserDocRef(user.uid);
    
    if (!userInfo) {
      return res.status(404).json({
        message: "User not found in trainees or facilitators collections"
      });
    }
    
    // Check if 2FA is enabled for this user
    if (userInfo.data.twoFactorEnabled === true) {
      // Generate a verification code
      const verificationCode = generateVerificationCode();
      
      // Store the verification code in Firestore with an expiration time
      const verificationRef = await addDoc(collection(db, "verificationCodes"), {
        userId: user.uid,
        userType: userInfo.userType,
        code: verificationCode,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiration
        used: false
      });
      
    
   
    return res.status(200).json({
      requires2FA: true,
      verificationId: verificationRef.id,
      verificationCode, // Fallback for testing
      message: "Unable to send SMS. Please use the code provided."
    });
    }
    
    // 2FA not enabled, proceed with normal login
    const token = generateToken({
      uid: user.uid,
      email: user.email,
      userType: userInfo.userType
    });
    
    return res.status(200).json({
      token,
      user: user.email,
      userType: userInfo.userType
    });
    
  } catch (error) {
    console.error("Login error:", error);
    
    // Handle errors
    return res.status(400).json({
      message: error.message,
      code: error.code
    });
  }
};



export const login_Trainee = async (req, res) => {
  const { email, password } = req.body;

  try {
    // First authenticate with email/password
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Check if user is a trainee
    const traineeDocRef = doc(db, "trainees", user.uid);
    const traineeDoc = await getDoc(traineeDocRef);
    
    if (!traineeDoc.exists()) {
      return res.status(403).json({
        message: "This user is not registered as a trainee"
      });
    }
    
    // Check if 2FA is enabled for this trainee
    if (traineeDoc.data().twoFactorEnabled === true) {
      // Generate a verification code
      const verificationCode = generateVerificationCode();
      
      // Store the verification code in Firestore with an expiration time
      const verificationRef = await addDoc(collection(db, "verificationCodes"), {
        userId: user.uid,
        userType: "trainee",
        code: verificationCode,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiration
        used: false
      });
      
      return res.status(200).json({
        requires2FA: true,
        verificationId: verificationRef.id,
        verificationCode, // Only for testing!
        message: "Multi-factor authentication required."
      });
    }
    
    // 2FA not enabled, proceed with normal login
    const token = generateToken({
      uid: user.uid,
      email: user.email,
      userType: "trainee"
    });
    
    return res.status(200).json({
      token,
      user: user.email,
      userType: "trainee"
    });
    
  } catch (error) {
    console.error("Login Trainee error:", error);
    
    // Handle errors
    return res.status(400).json({
      message: error.message,
      code: error.code
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
    const recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', {
      size: 'invisible',
    }, auth);
    await recaptchaVerifier.render();

    // Send verification SMS
    const phoneProvider = new PhoneAuthProvider(auth);
    const verificationId = await phoneProvider.verifyPhoneNumber(phoneNumber, recaptchaVerifier);
    
    // Store the verification ID in Firestore for later verification
    const userInfo = await getUserDocRef(user.uid);
    await updateDoc(userInfo.docRef, {
      phoneNumber: phoneNumber,
      twoFactorEnabled: true,
      verificationId: verificationId,
      updatedAt: serverTimestamp()
    });

    return res.status(200).json({
      message: "2FA has been enabled successfully",
      verificationId: verificationId
    });
  } catch (error) {
    console.error("Enable 2FA error:", error);
    return res.status(500).json({
      message: error.message
    });
  }
};


export const verify2FA = async (req, res) => {
  const { verificationId, verificationCode } = req.body;
  
  if (!verificationId || !verificationCode) {
    return res.status(400).json({ message: "Verification ID and code are required" });
  }

  try {
    // Verify the code using the verification ID and code provided
    const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
    
    // Use signInWithCredential to authenticate the user with the SMS code
    const userCredential = await signInWithCredential(auth, credential);
    const user = userCredential.user;

    // Check if 2FA is enabled
    const userInfo = await getUserDocRef(user.uid);
    if (!userInfo || userInfo.data.twoFactorEnabled === false) {
      return res.status(400).json({ message: "2FA is not enabled for this user" });
    }

    // Generate a token and return user info
    const token = generateToken({
      uid: user.uid,
      email: user.email,
      userType: userInfo.userType
    });

    return res.status(200).json({
      token,
      user: user.email,
      userType: userInfo.userType,
      message: "2FA verification successful"
    });
  } catch (error) {
    console.error("Verify 2FA error:", error);
    return res.status(500).json({
      message: error.message
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
        message: "User not found in trainees or facilitators collections"
      });
    }
    
    // Update the document to disable 2FA
    await updateDoc(userInfo.docRef, {
      twoFactorEnabled: false,
      updatedAt: serverTimestamp()
    });
    
    return res.status(200).json({
      message: "2FA has been disabled successfully",
      userType: userInfo.userType
    });
  } catch (error) {
    console.error("Disable 2FA error:", error);
    return res.status(500).json({
      message: error.message
    });
  }
};