const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const Payment = require("../models/paymentModel");
const Admission = require("../models/Admission/AdmissionModel");
const {
  initializeTransaction,
  verifyTransaction,
} = require("../utils/paystackService");
const { getFeeAmount, FEE_TYPES } = require("../config/feeSchedule");

// @desc    Start a payment (applicationFee, acceptanceFee, semesterFee, other)
// @route   POST /api/payments/initialize
// @access  Private
const startPayment = asyncHandler(async (req, res) => {
  const { purpose, admissionId, session, semester, description, amount } =
    req.body;

  if (!purpose) {
    res.status(400);
    throw new Error("Please provide a payment purpose");
  }

  let amountInNaira;
  let programLevel;

  if (FEE_TYPES.includes(purpose)) {
    // Fee amount is ALWAYS computed server-side from the fee schedule —
    // never trust a client-supplied amount for real fees.
    if (!admissionId) {
      res.status(400);
      throw new Error("admissionId is required for fee payments");
    }

    const admission = await Admission.findById(admissionId);
    if (!admission) {
      res.status(404);
      throw new Error("Admission record not found");
    }

    programLevel = admission.enrollmentInfo.programLevel;
    amountInNaira = getFeeAmount(programLevel, purpose);

    if (purpose === "semesterFee" && (!session || !semester)) {
      res.status(400);
      throw new Error(
        "session and semester are required for semester fee payments",
      );
    }
  } else if (purpose === "other") {
    // "Other" charges are the one legitimate case for a client-supplied amount
    // (e.g. hostel fee, misc charge not on the standard fee schedule)
    if (!amount) {
      res.status(400);
      throw new Error("Please provide an amount for this charge");
    }
    amountInNaira = Number(amount);
  } else {
    res.status(400);
    throw new Error("Invalid payment purpose");
  }

  const amountInKobo = Math.round(amountInNaira * 100);
  const reference = `GL-${req.user._id}-${Date.now()}`;

  const payment = await Payment.create({
    user: req.user._id,
    purpose,
    programLevel,
    session: purpose === "semesterFee" ? session : undefined,
    semester: purpose === "semesterFee" ? semester : undefined,
    description,
    amountInKobo,
    reference,
    relatedTo: admissionId || undefined,
    relatedModel: admissionId ? "Admission" : undefined,
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
    amount: amountInNaira,
  });
});

/**
 * Applies the effect of a confirmed successful payment to the related
 * Admission record. Shared by both the /verify endpoint and the webhook
 * so the two paths can never disagree on what "success" means.
 */
const applyPaymentToAdmission = async (payment) => {
  if (payment.relatedModel !== "Admission" || !payment.relatedTo) return;

  const admission = await Admission.findById(payment.relatedTo);
  if (!admission) return;

  if (payment.purpose === "applicationFee") {
    admission.applicationFeePaid = true;
    admission.applicationFeePaidAt = new Date();
  } else if (payment.purpose === "acceptanceFee") {
    admission.acceptanceFeePaid = true;
    admission.acceptanceFeePaidAt = new Date();
  } else if (payment.purpose === "semesterFee") {
    admission.semesterPayments.push({
      session: payment.session,
      semester: payment.semester,
      amountPaid: payment.amountInKobo / 100,
      reference: payment.reference,
      paidAt: new Date(),
    });
  }

  await admission.save();
};

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

  // Never trust status alone — confirm the amount actually paid matches
  // what we requested, so a tampered/short payment can't be marked as paid.
  const amountMatches = paystackData.amount === payment.amountInKobo;

  if (
    paystackData.status === "success" &&
    amountMatches &&
    payment.status !== "success"
  ) {
    payment.status = "success";
    payment.paystackData = paystackData;
    await payment.save();
    await applyPaymentToAdmission(payment);
  } else if (paystackData.status === "success" && !amountMatches) {
    payment.status = "failed";
    payment.paystackData = paystackData;
    await payment.save();
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
  console.log("🔔 Webhook hit:", req.body?.event);

  const signature = req.headers["x-paystack-signature"];

  const expectedSignature = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(req.rawBody) // raw request body, see server.js note below
    .digest("hex");

  if (signature !== expectedSignature) {
    console.log(" Webhook signature mismatch");
    return res.status(401).send("Invalid signature");
  }

  console.log(" Webhook signature verified");

  const event = req.body;

  if (event.event === "charge.success") {
    const { reference } = event.data;

    const payment = await Payment.findOne({ reference });
    if (payment && payment.status !== "success") {
      // Re-verify server-to-server rather than trusting webhook payload alone
      const paystackData = await verifyTransaction(reference);
      const amountMatches = paystackData.amount === payment.amountInKobo;

      if (paystackData.status === "success" && amountMatches) {
        payment.status = "success";
        payment.paystackData = paystackData;
        await payment.save();
        await applyPaymentToAdmission(payment);
      } else if (paystackData.status === "success" && !amountMatches) {
        payment.status = "failed";
        payment.paystackData = paystackData;
        await payment.save();
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
