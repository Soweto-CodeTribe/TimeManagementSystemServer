import jwt from "jsonwebtoken";
import secreteKey from "../config/jwtConfig.js";

const generateToken = (id) => {
  return jwt.sign({ id: id }, secreteKey, { expiresIn: "1h" });
};

export const verifyToken = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, secreteKey);

      next();
    } catch (error) {
      res.status(401).json({ error: "Token is not valid" });
    }
  }
};

export default generateToken;
