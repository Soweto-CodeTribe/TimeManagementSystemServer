import crypto from "crypto";

const secreteKey = crypto.randomBytes(32).toString("hex");

export default secreteKey;