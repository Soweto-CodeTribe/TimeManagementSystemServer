import crypto from "crypto";

// const secreteKey = crypto.randomBytes(32).toString("hex");
const secreteKey = process.env.JWT_SECRET

export default secreteKey;