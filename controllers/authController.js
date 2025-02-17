import { auth } from "../config/firebaseConfig.js";
import { signInWithEmailAndPassword } from "firebase/auth";
import generateToken from "../utilities/index.js";

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const token = generateToken(userCredential.user.uid);
    console.log("token", token);

    const firebase_tokens = await userCredential.user.getIdToken();
    console.log("firebase token", firebase_tokens);

    res.status(200).json({ token: token, firebase_tokens: firebase_tokens,  user: userCredential.user.email });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
