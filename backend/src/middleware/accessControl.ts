import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError.js";
import type { UserRole } from "../types/auth.js";

/**
 * Role hierarchy for access control
 * Admin has all permissions, Lender has borrower permissions, Borrower has basic permissions
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  lender: 2,
  borrower: 1,
};

/**
 * Scope definitions for fine-grained access control
 */
export const SCOPES = {
  // Loan scopes
  "read:loans": ["admin", "lender", "borrower"] as UserRole[],
  "read:loans:all": ["admin", "lender"] as UserRole[],
  "write:loans": ["admin", "borrower"] as UserRole[],
  "approve:loans": ["admin", "lender"] as UserRole[],

  // Repayment scopes
  "read:repayments": ["admin", "lender", "borrower"] as UserRole[],
  "write:repayments": ["admin", "borrower"] as UserRole[],

  // Score scopes
  "read:scores": ["admin", "lender", "borrower"] as UserRole[],
  "read:scores:all": ["admin", "lender"] as UserRole[],
  "write:scores": ["admin"] as UserRole[], // Only admin can manually update scores

  // User profile scopes
  "read:profiles": ["admin", "lender", "borrower"] as UserRole[],
  "read:profiles:all": ["admin"] as UserRole[],
  "write:profiles": ["admin", "lender", "borrower"] as UserRole[],

  // Indexer scopes
  "read:events": ["admin", "lender", "borrower"] as UserRole[],
  "read:events:all": ["admin", "lender"] as UserRole[],

  // Webhook scopes
  "read:webhooks": ["admin", "lender"] as UserRole[],
  "write:webhooks": ["admin", "lender"] as UserRole[],
  "delete:webhooks": ["admin", "lender"] as UserRole[],

  // Simulation scopes
  "read:simulations": ["admin", "lender", "borrower"] as UserRole[],
  "write:simulations": ["admin", "borrower"] as UserRole[],

  // Admin scopes
  "admin:all": ["admin"] as UserRole[],
} as const;

export type Scope = keyof typeof SCOPES;

/**
 * Middleware to require specific role(s)
 * Supports role hierarchy - higher roles automatically have lower role permissions
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw AppError.unauthorized("Authentication required");
    }

    const userRole = req.user.role;
    if (!userRole) {
      throw AppError.forbidden("User role not assigned");
    }

    // Check if user's role is in allowed roles or has higher hierarchy
    const userRoleLevel = ROLE_HIERARCHY[userRole as UserRole];
    const hasPermission = allowedRoles.some(
      (role) => userRoleLevel >= ROLE_HIERARCHY[role],
    );

    if (!hasPermission) {
      throw AppError.forbidden(
        `Access denied. Required role: ${allowedRoles.join(" or ")}`,
      );
    }

    next();
  };
};

/**
 * Middleware to require specific scope(s)
 * User must have at least one of the specified scopes
 */
export const requireScope = (...requiredScopes: Scope[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw AppError.unauthorized("Authentication required");
    }

    const userRole = req.user.role;
    if (!userRole) {
      throw AppError.forbidden("User role not assigned");
    }

    // Check if user's role has any of the required scopes
    const hasScope = requiredScopes.some((scope) => {
      const allowedRoles = SCOPES[scope];
      return allowedRoles.includes(userRole);
    });

    if (!hasScope) {
      throw AppError.forbidden(
        `Access denied. Required scope: ${requiredScopes.join(" or ")}`,
      );
    }

    next();
  };
};

/**
 * Middleware to require admin role
 */
export const requireAdmin = requireRole("admin");

/**
 * Middleware to require lender role or higher
 */
export const requireLenderOrAdmin = requireRole("lender");

/**
 * Middleware to require borrower role or higher (essentially any authenticated user)
 */
export const requireBorrowerOrHigher = requireRole("borrower");

/**
 * Middleware to check if user can access specific resource
 * Allows access if user owns the resource OR has elevated permissions
 */
export const requireResourceOwnership = (
  resourceOwnerExtractor: (req: Request) => string,
  allowedRoles: UserRole[] = ["admin", "lender"],
) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw AppError.unauthorized("Authentication required");
    }

    const userPublicKey = req.user.publicKey;
    const userRole = req.user.role;
    const resourceOwner = resourceOwnerExtractor(req);

    // Allow if user owns the resource
    if (userPublicKey === resourceOwner) {
      return next();
    }

    // Allow if user has elevated role
    if (userRole && allowedRoles.includes(userRole)) {
      return next();
    }

    throw AppError.forbidden("You are not authorized to access this resource");
  };
};
