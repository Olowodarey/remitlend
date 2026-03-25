import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError.js";
import {
  requireRole,
  requireScope,
  requireResourceOwnership,
  SCOPES,
} from "../middleware/accessControl.js";
import type { JwtPayload } from "../types/auth.js";

describe("Access Control Middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: undefined,
      params: {},
      body: {},
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  describe("requireRole", () => {
    it("should allow access for users with correct role", () => {
      mockReq.user = {
        publicKey: "GTEST",
        role: "admin",
        iat: Date.now(),
        exp: Date.now() + 3600,
      } as JwtPayload;

      const middleware = requireRole("admin");
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should allow access for users with higher role in hierarchy", () => {
      mockReq.user = {
        publicKey: "GTEST",
        role: "admin",
        iat: Date.now(),
        exp: Date.now() + 3600,
      } as JwtPayload;

      const middleware = requireRole("borrower");
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should deny access for users with insufficient role", () => {
      mockReq.user = {
        publicKey: "GTEST",
        role: "borrower",
        iat: Date.now(),
        exp: Date.now() + 3600,
      } as JwtPayload;

      const middleware = requireRole("admin");

      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(AppError);
    });

    it("should deny access for unauthenticated users", () => {
      const middleware = requireRole("borrower");

      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(AppError);
    });
  });

  describe("requireScope", () => {
    it("should allow access for users with correct scope", () => {
      mockReq.user = {
        publicKey: "GTEST",
        role: "admin",
        iat: Date.now(),
        exp: Date.now() + 3600,
      } as JwtPayload;

      const middleware = requireScope("write:scores");
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should deny access for users without required scope", () => {
      mockReq.user = {
        publicKey: "GTEST",
        role: "borrower",
        iat: Date.now(),
        exp: Date.now() + 3600,
      } as JwtPayload;

      const middleware = requireScope("write:scores");

      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(AppError);
    });

    it("should allow access if user has any of multiple required scopes", () => {
      mockReq.user = {
        publicKey: "GTEST",
        role: "lender",
        iat: Date.now(),
        exp: Date.now() + 3600,
      } as JwtPayload;

      const middleware = requireScope("read:loans:all", "write:scores");
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("requireResourceOwnership", () => {
    it("should allow access for resource owner", () => {
      mockReq.user = {
        publicKey: "GTEST123",
        role: "borrower",
        iat: Date.now(),
        exp: Date.now() + 3600,
      } as JwtPayload;
      mockReq.params = { userId: "GTEST123" };

      const middleware = requireResourceOwnership((req) => req.params.userId);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should allow access for elevated roles", () => {
      mockReq.user = {
        publicKey: "GADMIN",
        role: "admin",
        iat: Date.now(),
        exp: Date.now() + 3600,
      } as JwtPayload;
      mockReq.params = { userId: "GTEST123" };

      const middleware = requireResourceOwnership(
        (req) => req.params.userId,
        ["admin", "lender"],
      );
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should deny access for non-owner without elevated role", () => {
      mockReq.user = {
        publicKey: "GOTHER",
        role: "borrower",
        iat: Date.now(),
        exp: Date.now() + 3600,
      } as JwtPayload;
      mockReq.params = { userId: "GTEST123" };

      const middleware = requireResourceOwnership((req) => req.params.userId);

      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(AppError);
    });
  });

  describe("SCOPES configuration", () => {
    it("should have admin role in all admin scopes", () => {
      expect(SCOPES["admin:all"]).toContain("admin");
      expect(SCOPES["write:scores"]).toContain("admin");
    });

    it("should have lender role in webhook scopes", () => {
      expect(SCOPES["read:webhooks"]).toContain("lender");
      expect(SCOPES["write:webhooks"]).toContain("lender");
      expect(SCOPES["delete:webhooks"]).toContain("lender");
    });

    it("should have borrower role in basic read scopes", () => {
      expect(SCOPES["read:loans"]).toContain("borrower");
      expect(SCOPES["read:scores"]).toContain("borrower");
      expect(SCOPES["read:events"]).toContain("borrower");
    });
  });
});
