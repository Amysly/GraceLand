const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const Payment = require("../models/paymentModel");
const {
  initializeTransaction,
  verifyTransaction,
} = require("../utils/paystackService");

// @desc    Start a payment (fees, admission, other)
// @route   POST /api/payments/initialize
// @access  Private
const startPayment = asyncHandler(async (req, res) => {
  const { purpose, description, amount, relatedTo, relatedModel } = req.body;

  if (!purpose || !amount) {
    res.status(400);
    throw new Error("Please provide purpose and amount");
  }

  const amountInKobo = Math.round(Number(amount) * 100);

  // Our own unique reference — Paystack requires uniqueness per transaction
  const reference = `GL-${req.user._id}-${Date.now()}`;

  const payment = await Payment.create({
    user: req.user._id,
    purpose,
    description,
    amountInKobo,
    reference,
    relatedTo: relatedTo || undefined,
    relatedModel: relatedModel || undefined,
  });

  const paystackResponse = await initializeTransaction({
    email: req.user.email,
    amountInKobo,
    reference,
    callbackUrl: process.env.PAYSTACK_CALLBACK_URL,
    metadata: {
      purpose,
      userId: req.user._id.toString(),
      paymentId: payment._id.toString(),
    },
  });

  res.status(200).json({
    authorizationUrl: paystackResponse.authorization_url,
    reference,
  });
});

// @desc    Verify a payment by reference (called after frontend callback redirect)
// @route   GET /api/payments/verify/:reference
// @access  Private
const verifyPayment = asyncHandler(async (req, res) => {
  const { reference } = req.params;

  const payment = await Payment.findOne({ reference });
  if (!payment) {
    res.status(404);
    throw new Error("Payment record not found");
  }

  // Don't just trust the redirect — check with Paystack directly
  const paystackData = await verifyTransaction(reference);

  if (paystackData.status === "success" && payment.status !== "success") {
    payment.status = "success";
    payment.paystackData = paystackData;
    await payment.save();

    // TODO: mark the related record (e.g. Admission) as paid here
  } else if (paystackData.status !== "success") {
    payment.status =
      paystackData.status === "abandoned" ? "abandoned" : "failed";
    payment.paystackData = paystackData;
    await payment.save();
  }

  res.status(200).json({ status: payment.status, payment });
});

// @desc    Paystack webhook — the real source of truth for payment status
// @route   POST /api/payments/webhook
// @access  Public (but verified via signature)
const paystackWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["x-paystack-signature"];

  const expectedSignature = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(req.rawBody) // raw request body, see server.js note below
    .digest("hex");

  if (signature !== expectedSignature) {
    return res.status(401).send("Invalid signature");
  }

  const event = req.body;

  if (event.event === "charge.success") {
    const { reference } = event.data;

    const payment = await Payment.findOne({ reference });
    if (payment && payment.status !== "success") {
      // Re-verify server-to-server rather than trusting webhook payload alone
      const paystackData = await verifyTransaction(reference);

      if (paystackData.status === "success") {
        payment.status = "success";
        payment.paystackData = paystackData;
        await payment.save();

        // TODO: mark the related record (e.g. Admission) as paid here
      }
    }
  }

  // Always respond 200 quickly so Paystack doesn't retry unnecessarily
  res.sendStatus(200);
});

module.exports = {
  startPayment,
  verifyPayment,
  paystackWebhook,
};
