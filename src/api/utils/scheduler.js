import schedule from "node-schedule";
import { verifyNotDonePayments } from "../controllers/paymentController.js";
import moment from "moment-timezone";

// Set the timezone to Africa/Kigali (Rwanda)
const TIMEZONE = "Africa/Kigali";

export const checkBillings = () => {
  try {
    // Check payments every 2 minutes
    schedule.scheduleJob(
      { rule: "*/2 * * * *", tz: TIMEZONE },
      async () => {
        console.log(`[${moment().tz(TIMEZONE).format()}] Running payment verification job...`);
        try {
          await verifyNotDonePayments();
          console.log(`[${moment().tz(TIMEZONE).format()}] Payment verification job completed.`);
        } catch (err) {
          console.error(`[${moment().tz(TIMEZONE).format()}] Error in payment verification job:`, err);
        }
      }
    );

    console.log(`[${moment().tz(TIMEZONE).format()}] Scheduled jobs initialized successfully.`);
  } catch (error) {
    console.error(`[${moment().tz(TIMEZONE).format()}] Unable to initialize scheduled jobs:`, error);
  }
};