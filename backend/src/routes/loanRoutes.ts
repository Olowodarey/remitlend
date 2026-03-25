import { Router } from "express";
import {
  getBorrowerLoans,
  getLoanDetails,
} from "../controllers/loanController.js";
import { requireJwtAuth } from "../middleware/jwtAuth.js";
import {
  requireScope,
  requireResourceOwnership,
} from "../middleware/accessControl.js";

const router = Router();

/**
 * @swagger
 * /loans/borrower/{borrower}:
 *   get:
 *     summary: Get loans for a specific borrower
 *     description: Returns all loans associated with a borrower address
 *     tags: [Loans]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: borrower
 *         required: true
 *         schema:
 *           type: string
 *         description: Borrower's Stellar address
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, repaid, all]
 *           default: active
 *     responses:
 *       200:
 *         description: Loans retrieved successfully
 */
router.get(
  "/borrower/:borrower",
  requireJwtAuth,
  requireResourceOwnership((req) => req.params.borrower, ["admin", "lender"]),
  getBorrowerLoans,
);

/**
 * @swagger
 * /loans/{loanId}:
 *   get:
 *     summary: Get loan details
 *     description: Returns detailed information about a specific loan
 *     tags: [Loans]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: loanId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Loan ID
 *     responses:
 *       200:
 *         description: Loan details retrieved successfully
 */
router.get(
  "/:loanId",
  requireJwtAuth,
  requireScope("read:loans"),
  getLoanDetails,
);

export default router;
