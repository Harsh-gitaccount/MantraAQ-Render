import fetch from "node-fetch";

export async function sendMail({ to, subject, html }) {
  try {
    if (!process.env.BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY missing in environment');
    }

    console.log(`📤 Sending to: ${to}`);

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: 'MantraAQ Store',
          email: process.env.FROM_EMAIL || 'mantraaqsuperfoods@gmail.com'
        },
        to: [{ email: to }],
        subject,
        htmlContent: html
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || `Brevo error: ${response.status}`);
    }

    const result = await response.json();
    console.log(`✅ SENT: ${result.messageId}`);
    return result;

  } catch (error) {
    console.error(`❌ FAILED to ${to}:`, error.message);
    throw error;
  }
}

export async function sendOrderEmail({ to, name, summary }) {
  const inr = (paisa) => `₹${(paisa / 100).toFixed(2)} ${summary.currency}`;
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
          <tr>
            <td style="padding:8px 0; border-bottom:1px solid #eee;"><strong>Order ID:</strong></td>
            <td style="padding:8px 0; border-bottom:1px solid #eee;">${summary.orderId}</td>
          </tr>
          <tr>
            <td style="padding:8px 0; border-bottom:1px solid #eee;"><strong>Payment ID:</strong></td>
            <td style="padding:8px 0; border-bottom:1px solid #eee;">${summary.paymentId}</td>
          </tr>
          <tr>
            <td style="padding:8px 0; border-bottom:1px solid #eee;"><strong>Amount:</strong></td>
            <td style="padding:8px 0; border-bottom:1px solid #eee;">${inr(summary.amount)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0; border-bottom:1px solid #eee;"><strong>Payment Method:</strong></td>
            <td style="padding:8px 0; border-bottom:1px solid #eee;">${summary.method}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;"><strong>Status:</strong></td>
            <td style="padding:8px 0; color:#22c55e; font-weight:bold;">${summary.status}</td>
          </tr>
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
