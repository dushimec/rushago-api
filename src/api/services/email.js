import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendPaymentConfirmationEmail = async (to, userName, plan, amount) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: `RUSHAGO Payment Confirmation - ${plan} Plan`,
    text: `Dear ${userName},\n\nYour payment of ${amount} RWF for the ${plan} plan has been successfully processed.\n\nThank you for choosing RUSHAGO!\n\nBest regards,\nRUSHAGO Team`,
    html: `
      <h2>Payment Confirmation</h2>
      <p>Dear ${userName},</p>
      <p>Your payment of <strong>${amount} RWF</strong> for the <strong>${plan}</strong> plan has been successfully processed.</p>
      <p>Thank you for choosing RUSHAGO!</p>
      <p>Best regards,<br>RUSHAGO Team</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Payment confirmation email sent to ${to}`);
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    throw new Error(`Failed to send payment confirmation email: ${error.message}`);
  }
};