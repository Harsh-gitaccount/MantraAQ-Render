import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function hashPassword(pw) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pw, salt);
}

export async function verifyPassword(pw, hash) {
  return bcrypt.compare(pw, hash);
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

