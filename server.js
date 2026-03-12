import dotenv from "dotenv";
dotenv.config();

import express from "express";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import cors from "cors";
import bodyParser from "body-parser";
import crypto from "crypto";
import Razorpay from "razorpay";
import productsRouter from "./products.js";
import ordersRouter, { processSuccessfulPayment } from "./orders.js"; // ✅ Import payment processor

// ✅ Import for fetching external APIs
import fetch from 'node-fetch';

import path from "path";
import { fileURLToPath } from "url";
import { getDb } from "./db.js";
import { sendOrderEmail } from "./utils/mailer.js";
import authRouter from "./auth.js";

app.set('trust proxy', 1);
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ FIXED: Security middleware with Razorpay CSP permissions
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://checkout-static-next.razorpay.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://checkout-static-next.razorpay.com"
      ],
      scriptSrc: [
        "'self'",
        "https://checkout.razorpay.com",
        "'unsafe-inline'"
      ],
      connectSrc: [
        "'self'",
        "https://api.razorpay.com",
        "https://lumberjack.razorpay.com",
        "https://checkout.razorpay.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "https://checkout-static-next.razorpay.com"
      ],
      frameSrc: [
        "https://api.razorpay.com",
        "https://checkout.razorpay.com"
      ],
      childSrc: [
        "https://api.razorpay.com",
        "https://checkout.razorpay.com"
      ]
    }
  }
}));

app.use(compression());
app.use(morgan("combined"));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.APP_BASE_URL : true,
  credentials: true
}));

// Raw body for webhook signature verification
app.use("/webhooks/razorpay", bodyParser.raw({ type: "*/*" }));
// JSON for regular APIs
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser(process.env.SESSION_SECRET));

// Static files
app.use(express.static(path.join(__dirname)));

// Razorpay client
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ✅ CORRECTED: Use routers (orders.js handles /api/create-order now)
app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api", ordersRouter);

// ✅ Address Autocomplete Proxy Endpoints
const addressCache = new Map();

app.get("/api/address-search", async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Query parameter "q" is required and must be at least 2 characters' });
    }

    const cacheKey = `addr_${query.trim().toLowerCase()}`;

    if (addressCache.has(cacheKey)) {
      return res.json(addressCache.get(cacheKey));
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=3&countrycodes=in&q=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MantraAQ/1.0 (mantraaqsuperfoods@gmail.com)'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API returned ${response.status}`);
    }

    const data = await response.json();
    addressCache.set(cacheKey, data);
    setTimeout(() => addressCache.delete(cacheKey), 3600000);

    res.json(data);
  } catch (error) {
    console.error('Address search error:', error);
    res.status(500).json({ error: 'Address search failed' });
  }
});

app.get("/api/pincode/:pin", async (req, res) => {
  try {
    const pin = req.params.pin;

    if (!/^\d{6}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN code must be exactly 6 digits' });
    }

    const cacheKey = `pin_${pin}`;

    if (addressCache.has(cacheKey)) {
      return res.json(addressCache.get(cacheKey));
    }

    const url = `https://api.postalpincode.in/pincode/${pin}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Pincode API returned ${response.status}`);
    }

    const data = await response.json();
    addressCache.set(cacheKey, data);
    setTimeout(() => addressCache.delete(cacheKey), 86400000);

    res.json(data);
  } catch (error) {
    console.error('PIN code lookup error:', error);
    res.status(500).json({ error: 'PIN code lookup failed' });
  }
});

app.delete("/api/address-cache", (req, res) => {
  if (process.env.NODE_ENV === 'development') {
    addressCache.clear();
    res.json({ message: 'Address cache cleared' });
  } else {
    res.status(403).json({ error: 'Not allowed in production' });
  }
});

// ✅ KEPT: Get products (can be moved to products.js later)
app.get("/api/products", async (req, res) => {
  try {
    const db = await getDb();
    const [products] = await db.execute(
      "SELECT id, name, description, price, image_url, weight, volume, stock_quantity FROM products WHERE active = TRUE"
    );
    res.json(products);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// ✅ CORRECTED: Webhook endpoint that processes successful payments
// ✅ CORRECTED: Webhook endpoint with proper body handling
app.post("/webhooks/razorpay", async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error('❌ RAZORPAY_WEBHOOK_SECRET not configured');
      return res.status(500).send("Webhook secret not configured");
    }

    const signature = req.header("x-razorpay-signature");
    const body = req.body; // This is raw buffer from bodyParser.raw()

    // ✅ FIXED: Use raw body directly for signature verification
    const expected = crypto
      .createHmac("sha256", secret)
      .update(body) // ✅ Use raw body, not JSON.stringify()
      .digest("hex");

    if (expected !== signature) {
      console.warn("❌ Invalid webhook signature");
      console.log('Expected:', expected);
      console.log('Received:', signature);
      return res.status(400).send("Invalid signature");
    }

    // ✅ FIXED: Parse raw body to get event data
    const event = JSON.parse(body.toString());
    console.log(`📧 Webhook received: ${event.event}`);

    if (event.event === "payment.captured" || event.event === "order.paid") {
      const payload = event.payload;
      const payment = payload?.payment?.entity;
      const order = payload?.order?.entity;

      if (!payment || !order) {
        console.error('❌ Missing payment or order data in webhook');
        return res.status(400).send("Missing payment/order data");
      }

      console.log(`🔍 Processing payment: ${payment.id} for order: ${order.id}`);

      // ✅ This should work now with proper body parsing
      const result = await processSuccessfulPayment(payment, order);

      if (result.success) {
        console.log(`✅ Order processed successfully: ${result.orderId}`);

        // Send confirmation email
        const customerEmail = order?.notes?.customer_email;
        const customerName = order?.notes?.customer_name || "Customer";

        if (customerEmail) {
          try {
            await sendOrderEmail({
              to: customerEmail,
              name: customerName,
              summary: {
                orderId: result.orderId,
                paymentId: payment.id,
                amount: order.amount,
                currency: order.currency || "INR",
                method: payment.method,
                status: payment.status
              }
            });
            console.log(`📧 Order confirmation email sent to ${customerEmail}`);
          } catch (emailError) {
            console.error('📧 Email sending failed:', emailError);
          }
        }

      } else {
        console.error(`❌ Order processing failed: ${result.error}`);
      }
    }

    res.status(200).send("ok");
  } catch (e) {
    console.error('🔥 Webhook error:', e);
    console.log('Raw body:', req.body.toString());
    res.status(500).send("Webhook error");
  }
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('🔥 Unhandled server error:', err.message);
  console.error('Stack:', err.stack);

  const isDev = process.env.NODE_ENV === 'development';

  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: isDev ? err.message : 'Something went wrong on the server'
    });
  }
});

// Fallback to index.html for SPA routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📧 Email configured: ${process.env.SMTP_USER || 'Not configured'}`);
  console.log(`💳 Razorpay mode: ${process.env.RAZORPAY_KEY_ID?.includes('test') ? 'TEST' : 'LIVE'}`);
  console.log(`🔒 Webhook secret configured: ${process.env.RAZORPAY_WEBHOOK_SECRET ? 'YES' : 'NO'}`);
  console.log(`🗺️  Address autocomplete: /api/address-search & /api/pincode/:pin`);
  console.log(`💰 COD fee: ₹49 for cash on delivery orders`);
  console.log(`🔒 CSP configured for Razorpay payment gateway`);
  console.log(`✅ Order flow: COD=immediate save, Razorpay=webhook-based`);
});

