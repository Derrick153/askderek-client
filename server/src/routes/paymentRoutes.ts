import express                from "express";
import {
  initializePayment,
  verifyPayment,
  getPaymentsByLease,
  getTransactionsByTenant,
  getEarningsByManager,
  getPaymentStatus,
} from "../controllers/paymentControllers";
import { authMiddleware } from "../middleware/authMiddleware";
import { getReceipt, getTenantReceipts, getManagerReceipts, getReceiptPdf } from "../controllers/receiptControllers";

const router = express.Router();

// ── INITIALIZE PAYMENT 
router.post("/initialize", authMiddleware(), initializePayment);

// ── VERIFY PAYMENT ────────────────────────────────────────
router.get("/verify/:reference", authMiddleware(), verifyPayment);

// ── GET PAYMENT STATUS ────────────────────────────────────
router.get("/status/:reference", authMiddleware(), getPaymentStatus);

// ── GET PAYMENTS BY LEASE ─────────────────────────────────
router.get("/lease/:leaseId", authMiddleware(), getPaymentsByLease);

// ── GET TRANSACTIONS BY TENANT ────────────────────────────
router.get("/transactions/:tenantClerkId", authMiddleware(), getTransactionsByTenant);

// ── GET EARNINGS BY MANAGER ───────────────────────────────
router.get("/earnings/:managerClerkId", authMiddleware(), getEarningsByManager);

// -- GET RECEIPT BY PAYMENT REFERENCE ----------------------
router.get("/receipt/:reference", authMiddleware(), getReceipt);

// -- GET ALL RECEIPTS FOR A TENANT --------------------------
router.get("/receipts/:tenantClerkId", authMiddleware(), getTenantReceipts);

// -- GET ALL RECEIPTS FOR A MANAGER --------------------------
router.get("/manager-receipts/:managerClerkId", authMiddleware(), getManagerReceipts);

// -- GET RECEIPT AS A DOWNLOADABLE PDF -----------------------
router.get("/receipt/:reference/pdf", authMiddleware(), getReceiptPdf);

export default router;