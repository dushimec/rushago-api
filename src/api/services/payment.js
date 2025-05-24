import axios from "axios";
import "dotenv";
import crypto from "crypto"; // For encryption
import httpStatus from "http-status"; // For HTTP status codes

// Load environment variables
const token = process.env.FLW_SECURITY_KEY;
const url = process.env.FLW_BASE_URL;
const secretKey = process.env.FLWSECK_TEST;

// Axios configuration
let config = {
  maxBodyLength: Infinity,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
};

/**
 * Encrypts the payload using 3DES encryption.
 * @param {Object} payload - The payload to encrypt.
 * @param {string} encryptionKey - A 24-character encryption key.
 * @returns {string} - Encrypted payload in base64 format.
 */
function encryptPayload(payload, encryptionKey) {
  if (encryptionKey.length !== 24) {
    throw new Error("Encryption key must be 24 characters long for 3DES.");
  }
  const cipher = crypto.createCipheriv("des-ede3", encryptionKey, null);
  let encrypted = cipher.update(JSON.stringify(payload), "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
}

/**
 * Processes a payment request (MoMo or Card).
 * @param {Object} data - Payment details (amount, phone, method, etc.).
 * @returns {Object|boolean} - Response data or `false` if an error occurs.
 */
export const makePayment = async (data) => {
  try {
    let _data;
    let urlPath;

    if (data.payment_method === "momo") {
      _data = {
        amount: data.amount,
        currency: data.currency || "RWF",
        phone_number: data.account_no,
        email: "dushimec515@gmail.com",
        tx_ref: data.transactionId,
      };
      urlPath = "/charges?type=mobile_money_rwanda";
    } else if (data.payment_method === "card") {
      const expiryDate = data.expiry_date;
      if (!expiryDate || !/^\d{2}\/\d{2}$/.test(expiryDate)) {
        throw new Error("Invalid expiry date format. Expected MM/YY.");
      }
      const [expirymonth, expiryyear] = expiryDate.split("/");
      const fullExpiryYear = "20" + expiryyear;

      _data = {
        card_number: data.card_number,
        cvv: data.cvv,
        expiry_month: expirymonth,
        expiry_year: fullExpiryYear,
        phone_number: data.phone,
        user: data.user,
        amount: data.amount,
        currency: data.currency || "RWF",
        description: "RUSHAGO Card Payment",
        tx_ref: data.transactionId,
        email: "dushimec515@gmail.com",
        billing_zip: data.billing_zip || "250",
        billing_address: data.billing_address || "Kigali, Kicukiro",
        avs: true,
      };
      urlPath = "/charges?type=card";
    } else {
      return false;
    }

    const encryptionKey = secretKey.slice(0, 24);
    const encryptedPayload = encryptPayload(_data, encryptionKey);

    const myConfig = {
      ...config,
      method: "post",
      url: url + urlPath,
      data: { client: encryptedPayload },
    };

    const res = await axios.request(myConfig);

    const customizedResponse = {
      status: res.status,
      message: res?.data?.message,
      data: {
        ...res?.data?.data,
        authorization: res?.data?.meta?.authorization || {},
        amount: data.amount,
        charges: 0,
        momoRef: res?.data?.data?.momoRef || "No momo reference",
        statusDesc: res?.status === httpStatus.OK ? "PENDING" : "FAILED",
        transactionId: data.transactionId,
      },
      statusCode: res.status,
    };

    console.log("Response from Payment Gateway:", JSON.stringify(customizedResponse, null, 2));
    return customizedResponse;

  } catch (err) {
    console.error("Error Response:", err.response ? err.response.data : err.message);
    return false;
  }
};

/**
 * Initiates a card payment with redirect URL.
 * @param {Object} data - Payment details (tx_ref, amount, currency, redirect_url, customer, customizations).
 * @returns {Object|boolean} - Response data or `false` if an error occurs.
 */
export const initiateCardPayment = async (data) => {
  try {
    const payload = {
      tx_ref: data.tx_ref,
      amount: data.amount,
      currency: data.currency || "RWF",
      redirect_url: data.redirect_url,
      customer: {
        email: data.customer.email,
        phonenumber: data.customer.phonenumber,
        name: data.customer.name,
      },
      customizations: {
        title: data.customizations.title || "RUSHAGO Payment",
        description: data.customizations.description || "Payment for RUSHAGO services",
        logo: data.customizations.logo || "https://your-logo-url.com/logo.png",
      },
    };

    const myConfig = {
      ...config,
      method: "post",
      url: `${url}/payments`,
      data: payload,
    };

    const res = await axios.request(myConfig);

    const customizedResponse = {
      status: res.data.status,
      message: res.data.message,
      data: {
        link: res.data.data.link,
        transactionId: data.tx_ref,
      },
    };

    console.log("Card Payment Response:", JSON.stringify(customizedResponse, null, 2));
    return customizedResponse;

  } catch (err) {
    console.error("Error initiating card payment:", err.response ? err.response.data : err.message);
    return false;
  }
};

/**
 * Checks the status of a payment.
 * @param {string|Object} data - Transaction ID or object with external_transaction_id.
 * @returns {Array<Object>} - Payment status details.
 */
export const checkPaymentStatus = async (data) => {
  try {
    let tx_ref;
    if (typeof data === "string") {
      tx_ref = data;
    } else if (data?.external_transaction_id) {
      tx_ref = data.external_transaction_id[0];
    } else {
      throw new Error("Invalid transaction ID format");
    }

    const urlPath = `/transactions/verify_by_reference?tx_ref=${tx_ref}`;
    const myConfig = {
      ...config,
      method: "get",
      url: url + urlPath,
    };

    const res = await axios.request(myConfig);

    const avsStatus = res?.data?.data?.meta?.avs || "No AVS Data";
    const statusDesc = avsStatus === "avs_noauth" ? "Pending AVS Authorization" : res?.data?.data?.status;

    const transactionId = res?.data?.data?.tx_ref || tx_ref;

    return [
      {
        amount: res?.data?.data?.amount,
        currency: res?.data?.data?.currency,
        momoRef: res?.data?.data?.account_id,
        paymentType: data.payment_method === "momo" ? "momo" : "card",
        status: avsStatus === "avs_noauth" ? httpStatus.ACCEPTED :
          res?.data?.data?.status === "successful" ? httpStatus.OK :
          res?.data?.data?.status === "failed" ? httpStatus.BAD_REQUEST : httpStatus.CREATED,
        statusDesc,
        time: res?.data?.data?.created_at,
        transactionId,
        transactionType: "DEBIT",
        flwData: res?.data,
      },
    ];

  } catch (err) {
    console.error("Error checking payment status:", err.response ? err.response.data : err.message);
    return [
      {
        transactionId: typeof data === "string" ? data : data?.external_transaction_id[0],
        status: httpStatus.CREATED,
        flwData: err?.response?.data,
      },
    ];
  }
};