/**
 * User roles in the system
 */
export type UserRole = "admin" | "lender" | "borrower";

/**
 * Extended JWT payload with role information
 */
export interface JwtPayload {
  publicKey: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/**
 * User profile from database
 */
export interface UserProfile {
  id: number;
  public_key: string;
  display_name?: string;
  email?: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
  metadata?: Record<string, unknown>;
}
