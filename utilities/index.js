// import jwt from "jsonwebtoken";
// import secreteKey from "../config/jwtConfig.js";
// import { tokenBlacklist } from "./usedTokens.js";

// const generateToken = (userData) => {
//   return jwt.sign(userData, secreteKey, { expiresIn: "9h" });
// };

// // New token generator specifically for stakeholders that expires in 24 hours
// export const generateStakeholderToken = (userData) => {
//   return jwt.sign({ ...userData, role: "stakeholder" }, secreteKey, {
//     expiresIn: "24h",
//   });
// };

// export const verifyToken = async (req, res, next) => {
//   if (
//     !req.headers.authorization ||
//     !req.headers.authorization.startsWith("Bearer")
//   ) {
//     return res.status(401).json({ error: "No token provided" });
//   }

//   const token = req.headers.authorization.split(" ")[1];

//   if (tokenBlacklist.includes(token)) {
//     return res.status(401).json({ message: "Token has been revoked." });
//   }

//   try {
//     const decoded = jwt.verify(token, secreteKey);

//     // Set the complete decoded user information
//     req.user = decoded;

//     // Decrypt the location from the token and pass it down
//     if (decoded.location) {
//       req.location = decoded.location;
//     }
//     // console.log(decoded);

//     next();
//   } catch (error) {
//     return res.status(401).json({ error: "Token is not valid" });
//   }
// };

// // New middleware specifically for stakeholder token verification
// export const verifyStakeholderToken = async (req, res, next) => {
//   if (
//     !req.headers.authorization ||
//     !req.headers.authorization.startsWith("Bearer")
//   ) {
//     return res.status(401).json({ error: "No token provided" });
//   }

//   try {
//     const token = req.headers.authorization.split(" ")[1];
//     const decoded = jwt.verify(token, secreteKey);

//     // Verify this is a stakeholder token
//     if (decoded.role !== "stakeholder") {
//       return res.status(403).json({ error: "Not authorized as stakeholder" });
//     }

//     // Set the complete decoded user information
//     req.user = decoded;

//     next();
//   } catch (error) {
//     if (error.name === "TokenExpiredError") {
//       return res.status(401).json({
//         error: "Stakeholder token has expired. Please request a new token.",
//         expired: true,
//         requestNewToken: true,
//       });
//     }

//     return res.status(401).json({ error: "Invalid stakeholder token" });
//   }
// };

// // Middleware to enforce read-only access
// export const ensureReadOnly = (req, res, next) => {
//   if (req.method !== "GET") {
//     return res.status(403).json({
//       error:
//         "Stakeholders have read-only access. This operation is not permitted.",
//     });
//   }
//   next();
// };

// // Combined middleware for stakeholder access
// export const stakeholderAccess = [verifyStakeholderToken, ensureReadOnly];

// export default generateToken;

import jwt from 'jsonwebtoken';
import secretKey from '../config/jwtConfig.js';
import { tokenBlacklist } from './usedTokens.js';
import secreteKey from '../config/jwtConfig.js';

// Generate token that expires in 9 hours
const generateToken = (userData) => {
  return jwt.sign(userData, secreteKey, { expiresIn: "9h" });
};


// Generate stakeholder token that expires in 24 hours
export const generateStakeholderToken = (userData) => {
  return jwt.sign({ ...userData, role: "stakeholder" }, secretKey, {
    expiresIn: "24h",
  });
};

// Function to invalidate tokens (for logout)
const invalidateToken = (token) => {
  tokenBlacklist.push(token);
};

// Regular HTTP authentication middleware
export const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }
  try {
    const decoded = jwt.verify(token, secretKey);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// Socket.IO middleware for authentication
export const socketAuth = (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  try {
    const decoded = jwt.verify(token, secretKey);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
};

// Verify token for the API routes
export const verifyToken = async (req, res, next) => {
  if (
    !req.headers.authorization ||
    !req.headers.authorization.startsWith("Bearer")
  ) {
    return res.status(401).json({ error: "No token provided" });
  }
  const token = req.headers.authorization.split(" ")[1];
  if (tokenBlacklist.includes(token)) {
    return res.status(401).json({ message: "Token has been revoked." });
  }
  try {
    const decoded = jwt.verify(token, secretKey);
    // Set the complete decoded user information
    req.user = decoded;
    // Decrypt the location from the token and pass it down
    if (decoded.location) {
      req.location = decoded.location;
    }
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token is not valid" });
  }
};

// Verify stakeholder token
export const verifyStakeholderToken = async (req, res, next) => {
  if (
    !req.headers.authorization ||
    !req.headers.authorization.startsWith("Bearer")
  ) {
    return res.status(401).json({ error: "No token provided" });
  }
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, secretKey);
    // Verify this is a stakeholder token
    if (decoded.role !== "stakeholder") {
      return res.status(403).json({ error: "Not authorized as stakeholder" });
    }
    // Set the complete decoded user information
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Stakeholder token has expired. Please request a new token.",
        expired: true,
        requestNewToken: true,
      });
    }
    return res.status(401).json({ error: "Invalid stakeholder token" });
  }
};

// Middleware to enforce read-only access
export const ensureReadOnly = (req, res, next) => {
  if (req.method !== "GET") {
    return res.status(403).json({
      error:
        "Stakeholders have read-only access. This operation is not permitted.",
    });
  }
  next();
};

// Combined middleware for stakeholder access
export const stakeholderAccess = [verifyStakeholderToken, ensureReadOnly];


export default generateToken;
