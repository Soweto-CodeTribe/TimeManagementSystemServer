// import jwt from "jsonwebtoken";
// import secreteKey from "../config/jwtConfig.js";

// const generateToken = (id) => {
//   return jwt.sign({ id: id }, secreteKey, { expiresIn: "1h" });
// };

// export const verifyToken = async (req, res, next) => {
//   let token;
//   if (
//     req.headers.authorization &&
//     req.headers.authorization.startsWith("Bearer")
//   ) {
//     try {
//       token = req.headers.authorization.split(" ")[1];
//       jwt.verify(token, secreteKey);
//       req.user = decoded;

//       next();
//     } catch (error) {
//       res.status(401).json({ error: "Token is not valid" });
//     }
//   }
// };

// export default generateToken;


import jwt from "jsonwebtoken";
import secreteKey from "../config/jwtConfig.js";

const generateToken = (userData) => {
  return jwt.sign(userData, secreteKey, { expiresIn: "1h" });
};

export const verifyToken = async (req, res, next) => {
  if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer")) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, secreteKey);
    
    // Set the complete decoded user information
    req.user = decoded;
    
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token is not valid" });
  }
};

export default generateToken;