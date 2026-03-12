import nodemailer from "nodemailer";

// Lazy-init transporter so that env vars are loaded first
let transporter = null;

function getTransporter() {
  if (!transporter) {
    console.log('📧 Creating SMTP transporter:', process.env.SMTP_HOST, process.env.SMTP_USER);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "465", 10),
      secure: process.env.SMTP_PORT == "465" || !process.env.SMTP_PORT, // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      // Timeout settings to prevent hanging
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });
  }
  return transporter;
}

export async function sendMail({ to, subject, html }) {
  try {
    const t = getTransporter();
    const result = await t.sendMail({
      from: process.env.FROM_EMAIL,
      to,
      subject,
      html
    });
    console.log('✅ Email sent successfully to:', to, 'MessageId:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Email sending failed to:', to);
    console.error('   Error:', error.message);
    console.error('   SMTP Host:', process.env.SMTP_HOST);
    console.error('   SMTP User:', process.env.SMTP_USER);
    throw error;
  }
}

export async function sendOrderEmail({ to, name, summary }) {
  const inr = (paisa) => `₹${(paisa/100).toFixed(2)} ${summary.currency}`;
  const html = `
    <div style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto; padding:20px;">
      <div style="background:#f8f9fa; padding:20px; border-radius:8px; margin-bottom:20px;">
        <h2 style="color:#333; margin:0;">Order Confirmation</h2>
      </div>
      
      <p>Hi <strong>${name}</strong>,</p>
      <p>Thank you for your purchase! Your payment has been confirmed.</p>
      
      <div style="background:#fff; border:1px solid #ddd; border-radius:8px; padding:20px; margin:20px 0;">
        <h3 style="margin-top:0; color:#333;">Order Details</h3>
        <table style="width:100%; border-collapse:collapse;">
          <tr><td style="padding:8px 0; border-bottom:1px solid #eee;"><strong>Order ID:</strong></td><td style="padding:8px 0; border-bottom:1px solid #eee;">${summary.orderId}</td></tr>
          <tr><td style="padding:8px 0; border-bottom:1px solid #eee;"><strong>Payment ID:</strong></td><td style="padding:8px 0; border-bottom:1px solid #eee;">${summary.paymentId}</td></tr>
          <tr><td style="padding:8px 0; border-bottom:1px solid #eee;"><strong>Amount:</strong></td><td style="padding:8px 0; border-bottom:1px solid #eee;">${inr(summary.amount)}</td></tr>
          <tr><td style="padding:8px 0; border-bottom:1px solid #eee;"><strong>Payment Method:</strong></td><td style="padding:8px 0; border-bottom:1px solid #eee;">${summary.method}</td></tr>
          <tr><td style="padding:8px 0;"><strong>Status:</strong></td><td style="padding:8px 0; color:#22c55e; font-weight:bold;">${summary.status}</td></tr>
        </table>
      </div>
      
      <p>We'll notify you when your order ships. Thank you for choosing MantraAQ!</p>
      
      <div style="border-top:1px solid #ddd; padding-top:20px; margin-top:30px; text-align:center; color:#666; font-size:14px;">
        <p>MantraAQ Team<br>
        If you have questions, reply to this email or contact support.</p>
      </div>
    </div>
  `;
  
  await sendMail({
    to,
    subject: `Order Confirmed: ${summary.orderId}`,
    html
  });
}
