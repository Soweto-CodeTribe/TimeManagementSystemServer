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
    res.status(200).json({ token: token, user: userCredential.user.email });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
