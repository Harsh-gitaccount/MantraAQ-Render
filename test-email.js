import dotenv from "dotenv";
dotenv.config();

import { sendMail } from "./utils/mailer.js";

async function testMail() {
  console.log("Testing email with:");
  console.log("SMTP_HOST:", process.env.SMTP_HOST);
  console.log("SMTP_PORT:", process.env.SMTP_PORT);
  console.log("SMTP_USER:", process.env.SMTP_USER);
  console.log("FROM_EMAIL:", process.env.FROM_EMAIL);

  try {
    await sendMail({
      to: process.env.SMTP_USER, // sending to self
      subject: "Test Email from MantraAQ",
      html: "<p>This is a test email.</p>"
    });
    console.log("Test email sent successfully!");
  } catch (err) {
    console.error("Test email failed:", err);
  }
}

testMail();
