import { auth, db } from "../config/firebaseConfig.js";
import { signInWithEmailAndPassword } from "firebase/auth";
import generateToken from "../utilities/index.js";
import { collection, query, where, getDocs } from "firebase/firestore";

import { doc, getDoc } from "firebase/firestore";

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

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Include both uid and email in the token payload
    const token = generateToken({
      uid: userCredential.user.uid,
      email: userCredential.user.email,
    });

    res.status(200).json({
      token: token,
      user: userCredential.user.email,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//Trainee Login
export const login_Trainee = async (req, res) => {
  const { email, password } = req.body;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    console.log(`🔍 Searching for trainee with uid: ${uid}`);

    const traineesRef = collection(db, "trainees");
    const q = query(traineesRef, where("uid", "==", uid));
    const querySnapshot = await getDocs(q);

    let traineeData = null;

    if (!querySnapshot.empty) {
      querySnapshot.forEach((doc) => {
        // console.log("Trainee found:", doc.id, doc.data());
        traineeData = { id: doc.id, ...doc.data() };
      });
    } else {
      // console.log("⚠️ No trainee found for this UID.");
      return res.status(404).json({ message: "Trainee not found" });
    }

    if (!traineeData.id) {
      console.log("❌ traineeData.id is undefined");
      return res.status(500).json({ message: "Invalid trainee data" });
    }

    // Fetch trainee report by document ID (traineeId)
    const reports = await getTraineeStats(traineeData.id);

    // Generate a token
    const token = generateToken({ uid, email: userCredential.user.email });

    // console.log("🚀 Sending response with trainee data and reports");

    res.status(200).json({
      token,
      user: userCredential.user.email,
      trainee: traineeData,
      traineeReports: reports,
    });
  } catch (error) {
    console.error("❌ Error during login:", error.message);
    res.status(500).json({ message: error.message });
  }
};
