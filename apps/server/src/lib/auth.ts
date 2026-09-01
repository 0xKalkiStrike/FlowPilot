import jwt from "jsonwebtoken";
import { env } from "../env.js";

export interface SessionPayload {
  userId: string;
  workspaceId: string;
  email: string;
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "7d" });
}

export function verifySession(token: string): SessionPayload {
  return jwt.verify(token, env.jwtSecret) as SessionPayload;
}
