import jwt from "jsonwebtoken";
import { Keypair, StrKey } from "@stellar/stellar-sdk";
import crypto from "crypto";
import { query } from "../db/connection.js";
import type { JwtPayload, UserRole, UserProfile } from "../types/auth.js";

export type { JwtPayload, UserRole, UserProfile };

export interface ChallengeMessage {
  message: string;
  nonce: string;
  timestamp: number;
  expiresIn: number;
}

const JWT_EXPIRES_IN = "24h";
const CHALLENGE_EXPIRES_IN_MS = 5 * 60 * 1000;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return secret;
}

export function generateChallenge(publicKey: string): ChallengeMessage {
  if (!StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new Error("Invalid Stellar public key");
  }

  const nonce = crypto.randomBytes(32).toString("hex");
  const timestamp = Date.now();

  const message = `Sign this message to authenticate with RemitLend.\n\nNonce: ${nonce}\nTimestamp: ${timestamp}\n\nThis request will expire in 5 minutes.`;

  return {
    message,
    nonce,
    timestamp,
    expiresIn: CHALLENGE_EXPIRES_IN_MS,
  };
}

export function verifySignature(
  publicKey: string,
  message: string,
  signature: string,
): boolean {
  if (!StrKey.isValidEd25519PublicKey(publicKey)) {
    return false;
  }

  try {
    const signatureBytes = Buffer.from(signature, "base64");
    if (signatureBytes.length !== 64) {
      return false;
    }

    const messageBytes = Buffer.from(message, "utf-8");

    return Keypair.fromPublicKey(publicKey).verify(
      messageBytes,
      signatureBytes,
    );
  } catch {
    return false;
  }
}

export function verifyChallengeTimestamp(
  timestamp: number,
  maxAgeMs: number = CHALLENGE_EXPIRES_IN_MS,
): boolean {
  const now = Date.now();
  return now - timestamp <= maxAgeMs;
}

export async function getUserRole(publicKey: string): Promise<UserRole> {
  try {
    const result = await query<UserProfile>(
      "SELECT role FROM user_profiles WHERE public_key = $1",
      [publicKey],
    );

    if (result.rows.length > 0) {
      return result.rows[0]!.role;
    }

    // If user doesn't exist, create profile with default 'borrower' role
    await query(
      "INSERT INTO user_profiles (public_key, role) VALUES ($1, $2) ON CONFLICT (public_key) DO NOTHING",
      [publicKey, "borrower"],
    );

    return "borrower";
  } catch (error) {
    console.error("Error fetching user role:", error);
    // Default to borrower role on error
    return "borrower";
  }
}

export async function generateJwtToken(publicKey: string): Promise<string> {
  const secret = getJwtSecret();
  const role = await getUserRole(publicKey);

  const payload: Omit<JwtPayload, "iat" | "exp"> = {
    publicKey,
    role,
  };

  return jwt.sign(payload, secret, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: "HS256",
  });
}

export function verifyJwtToken(token: string): JwtPayload | null {
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    }) as JwtPayload;

    return decoded;
  } catch {
    return null;
  }
}

export function decodeJwtToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.decode(token) as JwtPayload | null;
    return decoded;
  } catch {
    return null;
  }
}

export function extractBearerToken(
  authHeader: string | undefined,
): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  return parts[1] ?? null;
}
