import { Router } from "express";
import {
  getIndexerStatus,
  getBorrowerEvents,
  getLoanEvents,
  getRecentEvents,
  listWebhookSubscriptions,
  createWebhookSubscription,
  deleteWebhookSubscription,
} from "../controllers/indexerController.js";
import { requireJwtAuth } from "../middleware/jwtAuth.js";
import {
  requireScope,
  requireResourceOwnership,
} from "../middleware/accessControl.js";

const router = Router();

/**
 * @swagger
 * /indexer/status:
 *   get:
 *     summary: Get indexer status
 *     description: Returns the current state of the event indexer including last indexed ledger and event counts
 *     tags: [Indexer]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Indexer status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     lastIndexedLedger:
 *                       type: integer
 *                     lastIndexedCursor:
 *                       type: string
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *                     totalEvents:
 *                       type: integer
 *                     eventsByType:
 *                       type: object
 */
router.get(
  "/status",
  requireJwtAuth,
  requireScope("read:events"),
  getIndexerStatus,
);

/**
 * @swagger
 * /indexer/events/borrower/{borrower}:
 *   get:
 *     summary: Get events for a specific borrower
 *     description: Returns all loan events associated with a borrower address
 *     tags: [Indexer]
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
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Events retrieved successfully
 */
router.get(
  "/events/borrower/:borrower",
  requireJwtAuth,
  requireResourceOwnership(
    (req) => req.params.borrower as string,
    ["admin", "lender"],
  ),
  getBorrowerEvents,
);

/**
 * @swagger
 * /indexer/events/loan/{loanId}:
 *   get:
 *     summary: Get events for a specific loan
 *     description: Returns all events associated with a loan ID
 *     tags: [Indexer]
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
 *         description: Events retrieved successfully
 */
router.get(
  "/events/loan/:loanId",
  requireJwtAuth,
  requireScope("read:events"),
  getLoanEvents,
);

/**
 * @swagger
 * /indexer/events/recent:
 *   get:
 *     summary: Get recent events
 *     description: Returns the most recent loan events, optionally filtered by event type
 *     tags: [Indexer]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *           enum: [LoanRequested, LoanApproved, LoanRepaid]
 *     responses:
 *       200:
 *         description: Events retrieved successfully
 */
router.get(
  "/events/recent",
  requireJwtAuth,
  requireScope("read:events:all"),
  getRecentEvents,
);

/**
 * @swagger
 * /indexer/webhooks:
 *   get:
 *     summary: List webhook subscriptions
 *     tags: [Indexer]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Webhook subscriptions retrieved successfully
 *   post:
 *     summary: Register a webhook subscription
 *     tags: [Indexer]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [callbackUrl, eventTypes]
 *             properties:
 *               callbackUrl:
 *                 type: string
 *               eventTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [LoanRequested, LoanApproved, LoanRepaid]
 *               secret:
 *                 type: string
 *     responses:
 *       201:
 *         description: Webhook subscription created successfully
 */
router.get(
  "/webhooks",
  requireJwtAuth,
  requireScope("read:webhooks"),
  listWebhookSubscriptions,
);
router.post(
  "/webhooks",
  requireJwtAuth,
  requireScope("write:webhooks"),
  createWebhookSubscription,
);

/**
 * @swagger
 * /indexer/webhooks/{subscriptionId}:
 *   delete:
 *     summary: Delete a webhook subscription
 *     tags: [Indexer]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Webhook subscription deleted successfully
 */
router.delete(
  "/webhooks/:subscriptionId",
  requireJwtAuth,
  requireScope("delete:webhooks"),
  deleteWebhookSubscription,
);

export default router;
