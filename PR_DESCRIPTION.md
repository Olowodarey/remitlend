# Role-Based Access Control (RBAC) Implementation

## Overview

This PR implements comprehensive role-based access control (RBAC) for the RemitLend backend API, distinguishing between Admin, Borrower, and Lender roles with strict authorization levels.

## Changes

### Database Schema

- Added `user_role` enum type with values: `admin`, `lender`, `borrower`
- Added `role` column to `user_profiles` table with default value `borrower`
- Created index on `role` column for query performance

### Type System

- Created `UserRole` type for type-safe role handling
- Extended `JwtPayload` interface to include user role
- Added `UserProfile` interface for database model

### Access Control Middleware

- **`requireRole(...roles)`**: Enforces role-based access with hierarchy support
- **`requireScope(...scopes)`**: Fine-grained permission control using scopes
- **`requireResourceOwnership(extractor, allowedRoles)`**: Ensures users can only access their own resources unless they have elevated permissions

### Scope System

Implemented comprehensive scope-based permissions:

- **Loan scopes**: `read:loans`, `read:loans:all`, `write:loans`, `approve:loans`
- **Score scopes**: `read:scores`, `read:scores:all`, `write:scores`
- **Event scopes**: `read:events`, `read:events:all`
- **Webhook scopes**: `read:webhooks`, `write:webhooks`, `delete:webhooks`
- **Simulation scopes**: `read:simulations`, `write:simulations`

### Role Hierarchy

- **Admin** (level 3): Full system access, can manage all resources
- **Lender** (level 2): Can view all loans/scores, approve loans, manage webhooks
- **Borrower** (level 1): Can only access own resources, request loans, make payments

Higher roles automatically inherit permissions from lower roles.

### Protected Routes

All API routes now require proper authentication and authorization:

#### Loan Routes

- `GET /loans/borrower/:borrower` - JWT + resource ownership
- `GET /loans/:loanId` - JWT + `read:loans` scope

#### Score Routes

- `GET /score/:userId` - JWT + resource ownership
- `POST /score/update` - API key (unchanged, for internal services)

#### Indexer Routes

- `GET /indexer/status` - JWT + `read:events` scope
- `GET /indexer/events/borrower/:borrower` - JWT + resource ownership
- `GET /indexer/events/loan/:loanId` - JWT + `read:events` scope
- `GET /indexer/events/recent` - JWT + `read:events:all` scope
- `GET /indexer/webhooks` - JWT + `read:webhooks` scope
- `POST /indexer/webhooks` - JWT + `write:webhooks` scope
- `DELETE /indexer/webhooks/:id` - JWT + `delete:webhooks` scope

#### Simulation Routes

- `GET /history/:userId` - JWT + resource ownership
- `POST /simulate` - JWT + `write:simulations` scope

### Auth Service Updates

- JWT tokens now include user role
- Auto-creates user profile with default `borrower` role on first login
- Role is fetched from database and cached in JWT for performance

### Testing

- Added comprehensive unit tests for all RBAC middleware functions
- Tests cover role hierarchy, scope validation, and resource ownership
- Verified proper error handling for unauthorized access

## Migration

Run the database migration:

```bash
cd backend
npm run migrate up
```

All existing users will default to `borrower` role. Update roles manually as needed:

```sql
UPDATE user_profiles SET role = 'admin' WHERE public_key = 'GXXXXXXX...';
UPDATE user_profiles SET role = 'lender' WHERE public_key = 'GYYYYYYYY...';
```

## Security Considerations

- JWT tokens include role information - ensure `JWT_SECRET` is properly secured
- Roles are fetched from database on login and cached in JWT
- Role changes require users to re-authenticate to get new token
- Resource ownership checks prevent horizontal privilege escalation
- API key authentication remains separate for internal service-to-service calls

## Documentation

- Added comprehensive `RBAC_README.md` with usage examples
- Updated Swagger documentation with security requirements
- Documented all scopes and their associated roles

## Breaking Changes

⚠️ **All previously public endpoints now require JWT authentication**

Clients must:

1. Obtain JWT token via `/auth/login` endpoint
2. Include token in `Authorization: Bearer <token>` header
3. Ensure user has appropriate role/scope for the endpoint

## Testing Checklist

- [x] Database migration runs successfully
- [x] JWT tokens include role information
- [x] Role hierarchy works correctly (admin > lender > borrower)
- [x] Resource ownership checks prevent unauthorized access
- [x] Scope-based permissions enforce correct access levels
- [x] Existing tests pass (pre-existing redis issues unrelated to RBAC)
- [x] New RBAC tests cover all middleware functions

## Related Issues

Closes #[issue-number] - Implement role-based access control

## Commits

- feat: add database migration for user roles
- feat: add TypeScript types for RBAC
- feat: implement access control middleware with RBAC
- feat: update auth service to support user roles
- feat: update auth controller and routes for async JWT generation
- refactor: remove deprecated role check middleware
- feat: add RBAC protection to loan routes
- feat: add RBAC protection to score routes
- feat: add RBAC protection to indexer routes
- feat: add RBAC protection to simulation routes
- test: add comprehensive tests for RBAC middleware
- docs: add comprehensive RBAC documentation
- chore: update package-lock.json after dependency installation
