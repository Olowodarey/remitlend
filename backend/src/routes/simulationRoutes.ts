import { Router } from "express";
import {
  getRemittanceHistory,
  simulatePayment,
} from "../controllers/simulationController.js";
import { validate } from "../middleware/validation.js";
import {
  getRemittanceHistorySchema,
  simulatePaymentSchema,
} from "../schemas/simulationSchemas.js";
import { strictRateLimiter } from "../middleware/rateLimiter.js";
import { requireJwtAuth } from "../middleware/jwtAuth.js";
import {
  requireScope,
  requireResourceOwnership,
} from "../middleware/accessControl.js";

const router = Router();

/**
 * @swagger
 * /history/{userId}:
 *   get:
 *     summary: Get remittance history for a user
 *     description: Retrieve the remittance history for a specific user by their ID.
 *     tags: [Simulation]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved remittance history.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RemittanceHistory'
 *       404:
 *         description: User not found or no remittance history available.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

router.get(
  "/history/:userId",
  requireJwtAuth,
  requireResourceOwnership(
    (req) => req.params.userId as string,
    ["admin", "lender"],
  ),
  validate(getRemittanceHistorySchema),
  getRemittanceHistory,
);

/**
 * @swagger
 * /simulate:
 *   post:
 *     summary: Simulate a remittance payment
 *     description: Simulate a remittance payment and return the updated user score.
 *     tags: [Simulation]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user.
 *               amount:
 *                 type: number
 *                 description: Amount to simulate remittance for.
 *             required:
 *               - userId
 *               - amount
 *     responses:
 *       200:
 *         description: Simulation successful.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserScore'
 *       400:
 *         description: Invalid input data.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/simulate",
  requireJwtAuth,
  requireScope("write:simulations"),
  strictRateLimiter,
  validate(simulatePaymentSchema),
  simulatePayment,
);

export default router;
