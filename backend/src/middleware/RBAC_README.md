# Role-Based Access Control (RBAC) Implementation

## Overview

This implementation adds comprehensive role-based access control to the RemitLend backend API, distinguishing between Admin, Lender, and Borrower roles with strict authorization levels.

## User Roles

### 1. Borrower (Default)

- Can view their own loans, scores, and transaction history
- Can request loans and make repayments
- Can simulate payments
- Cannot access other users' data

### 2. Lender

- All Borrower permissions
- Can view all loans and scores (read-only access to all users)
- Can approve loans
- Can manage webhooks for loan events
- Can view all events in the indexer

### 3. Admin

- All Lender permissions
- Can manually update credit scores
- Full system access
- Can manage all resources

## Role Hierarchy

The system implements a role hierarchy where higher roles inherit permissions from lower roles:

- Admin (level 3) > Lender (level 2) > Borrower (level 1)

## Scopes

Fine-grained permissions are defined using scopes:

### Loan Scopes

- `read:loans` - View own loans (all roles)
- `read:loans:all` - View all loans (admin, lender)
- `write:loans` - Create/modify loans (admin, borrower)
- `approve:loans` - Approve loan requests (admin, lender)

### Score Scopes

- `read:scores` - View own score (all roles)
- `read:scores:all` - View all scores (admin, lender)
- `write:scores` - Manually update scores (admin only)

### Event/Indexer Scopes

- `read:events` - View own events (all roles)
- `read:events:all` - View all events (admin, lender)

### Webhook Scopes

- `read:webhooks` - List webhooks (admin, lender)
- `write:webhooks` - Create webhooks (admin, lender)
- `delete:webhooks` - Delete webhooks (admin, lender)

### Simulation Scopes

- `read:simulations` - View own simulation history (all roles)
- `write:simulations` - Run simulations (admin, borrower)

## Middleware Functions

### `requireRole(...roles)`

Requires user to have one of the specified roles (or higher in hierarchy).

```typescript
router.get("/admin-only", requireRole("admin"), handler);
router.get("/lender-or-admin", requireRole("lender"), handler);
```

### `requireScope(...scopes)`

Requires user to have at least one of the specified scopes.

```typescript
router.get("/loans", requireScope("read:loans"), handler);
router.post("/webhooks", requireScope("write:webhooks"), handler);
```

### `requireResourceOwnership(extractor, allowedRoles)`

Allows access if user owns the resource OR has an elevated role.

```typescript
router.get(
  "/loans/borrower/:borrower",
  requireResourceOwnership((req) => req.params.borrower, ["admin", "lender"]),
  handler,
);
```

## Protected Routes

All routes now require JWT authentication and appropriate role/scope:

### Auth Routes

- `POST /auth/challenge` - Public
- `POST /auth/login` - Public
- `GET /auth/verify` - Requires JWT

### Loan Routes

- `GET /loans/borrower/:borrower` - Requires JWT + resource ownership
- `GET /loans/:loanId` - Requires JWT + `read:loans` scope

### Score Routes

- `GET /score/:userId` - Requires JWT + resource ownership
- `POST /score/update` - Requires API key (internal service)

### Indexer Routes

- `GET /indexer/status` - Requires JWT + `read:events` scope
- `GET /indexer/events/borrower/:borrower` - Requires JWT + resource ownership
- `GET /indexer/events/loan/:loanId` - Requires JWT + `read:events` scope
- `GET /indexer/events/recent` - Requires JWT + `read:events:all` scope
- `GET /indexer/webhooks` - Requires JWT + `read:webhooks` scope
- `POST /indexer/webhooks` - Requires JWT + `write:webhooks` scope
- `DELETE /indexer/webhooks/:id` - Requires JWT + `delete:webhooks` scope

### Simulation Routes

- `GET /history/:userId` - Requires JWT + resource ownership
- `POST /simulate` - Requires JWT + `write:simulations` scope

## Database Schema

The `user_profiles` table includes a `role` column:

```sql
CREATE TYPE user_role AS ENUM ('admin', 'lender', 'borrower');

ALTER TABLE user_profiles ADD COLUMN role user_role NOT NULL DEFAULT 'borrower';
```

## JWT Token Structure

JWT tokens now include the user's role:

```json
{
  "publicKey": "GXXXXXXX...",
  "role": "borrower",
  "iat": 1234567890,
  "exp": 1234654290
}
```

## Usage Examples

### Checking User Role in Controllers

```typescript
export const someController = (req: Request, res: Response) => {
  const userRole = req.user?.role;

  if (userRole === "admin") {
    // Admin-specific logic
  }
};
```

### Protecting Routes

```typescript
import { requireJwtAuth } from "../middleware/jwtAuth.js";
import { requireScope, requireRole } from "../middleware/accessControl.js";

// Require specific role
router.post("/admin-action", requireJwtAuth, requireRole("admin"), handler);

// Require specific scope
router.get("/data", requireJwtAuth, requireScope("read:data"), handler);

// Require resource ownership with fallback to elevated roles
router.get(
  "/user/:userId/data",
  requireJwtAuth,
  requireResourceOwnership((req) => req.params.userId, ["admin"]),
  handler,
);
```

## Migration

Run the migration to add roles to existing users:

```bash
npm run migrate up
```

All existing users will default to the `borrower` role. Update roles manually in the database as needed:

```sql
UPDATE user_profiles SET role = 'admin' WHERE public_key = 'GXXXXXXX...';
UPDATE user_profiles SET role = 'lender' WHERE public_key = 'GYYYYYYYY...';
```

## Testing

Test the RBAC system by:

1. Creating users with different roles
2. Obtaining JWT tokens for each user
3. Testing access to protected endpoints
4. Verifying proper authorization errors (403 Forbidden)

## Security Considerations

- JWT tokens include role information - ensure JWT_SECRET is secure
- Roles are fetched from database on login and cached in JWT
- Role changes require users to re-authenticate
- API key authentication remains separate for internal services
- Resource ownership checks prevent horizontal privilege escalation
