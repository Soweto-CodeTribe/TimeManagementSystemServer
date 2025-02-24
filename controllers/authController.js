import { auth, db } from "../config/firebaseConfig.js";
import { signInWithEmailAndPassword } from "firebase/auth";
import generateToken from "../utilities/index.js";
import { collection, query, where, getDocs } from "firebase/firestore";

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
      email: userCredential.user.email
    });


    res.status(200).json({ 
      token: token, 
      user: userCredential.user.email 
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

    const traineesRef = collection(db, "trainees");
    const q = query(traineesRef, where("uid", "==", uid));
    const querySnapshot = await getDocs(q);

    let traineeData = null;

    if (!querySnapshot.empty) {
      querySnapshot.forEach((doc) => {
        traineeData = { id: doc.id, ...doc.data() };
      });
    }

    // Generate a token with both uid and email
    const token = generateToken({ uid, email: userCredential.user.email });

    res.status(200).json({ 
      token, 
      user: userCredential.user.email, 
      trainee: traineeData 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};