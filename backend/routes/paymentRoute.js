const express = require("express");
const router = express.Router();
const {
  startPayment,
  verifyPayment,
  paystackWebhook,
} = require("../controller/paymentController");
const { protect } = require("../middleware/authMiddleWare");

// Webhook must NOT be behind auth — Paystack calls this directly, not a logged-in user
router.post("/webhook", paystackWebhook);

router.post("/initialize", protect, startPayment);
router.get("/verify/:reference", protect, verifyPayment);

module.exports = router;
