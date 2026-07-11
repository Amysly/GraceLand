const axios = require("axios");

const PAYSTACK_BASE_URL = "https://api.paystack.co";

const paystackAxios = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
});

/**
 * Initialize a transaction with Paystack.
 * Returns { authorization_url, access_code, reference }
 */
const initializeTransaction = async ({
  email,
  amountInKobo,
  reference,
  callbackUrl,
  metadata,
}) => {
  const response = await paystackAxios.post("/transaction/initialize", {
    email,
    amount: amountInKobo,
    reference,
    callback_url: callbackUrl,
    metadata,
  });

  return response.data.data; // { authorization_url, access_code, reference }
};

/**
 * Verify a transaction directly with Paystack using the reference.
 */
const verifyTransaction = async (reference) => {
  const response = await paystackAxios.get(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );
  return response.data.data; // contains status, amount, currency, customer, etc.
};

module.exports = {
  initializeTransaction,
  verifyTransaction,
};
