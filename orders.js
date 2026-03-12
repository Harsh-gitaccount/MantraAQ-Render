import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { getDb } from "./db.js";
import Razorpay from "razorpay";

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ Helper function to save shipping address
async function saveShippingAddress(connection, userId, addressData) {
  try {
    // Check if this exact address already exists for this user
    const [existingAddresses] = await connection.execute(`
      SELECT id FROM shipping_addresses 
      WHERE user_id = ? AND full_name = ? AND mobile = ? 
      AND flat_no = ? AND street = ? AND city = ? 
      AND state = ? AND pincode = ? AND is_active = 1
    `, [
      userId, 
      addressData.fullName || addressData.name, 
      addressData.mobile,
      addressData.flatNo || addressData.flat_no, 
      addressData.street, 
      addressData.city, 
      addressData.state, 
      addressData.pincode
    ]);
    
    let addressId;
    
    if (existingAddresses.length > 0) {
      // Address exists, use existing ID and update as current default
      addressId = existingAddresses[0].id;
      
      await connection.execute(`
        UPDATE shipping_addresses 
        SET updated_at = NOW(), is_default = 1 
        WHERE id = ? AND user_id = ?
      `, [addressId, userId]);
      
      console.log(`📍 Using existing address ID: ${addressId}`);
      
    } else {
      // Check if user has any addresses (for default setting)
      const [userAddresses] = await connection.execute(
        "SELECT COUNT(*) as count FROM shipping_addresses WHERE user_id = ? AND is_active = 1",
        [userId]
      );
      
      const isFirstAddress = userAddresses[0].count === 0;
      
      // Create new shipping address
      const [addressResult] = await connection.execute(`
        INSERT INTO shipping_addresses (
          user_id, full_name, mobile, alt_mobile, flat_no, street, 
          city, state, country, pincode, address_type, is_default, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `, [
        userId,
        addressData.fullName || addressData.name,
        addressData.mobile,
        addressData.altMobile || addressData.alt_mobile || null,
        addressData.flatNo || addressData.flat_no,
        addressData.street,
        addressData.city,
        addressData.state,
        addressData.country || 'India',
        addressData.pincode,
        addressData.addressType || addressData.address_type || 'Home',
        isFirstAddress ? 1 : 0  // Set as default if it's user's first address
      ]);
      
      addressId = addressResult.insertId;
      console.log(`📍 Created new address ID: ${addressId}`);
    }
    
    // If this is set as default, remove default from other addresses
    if (existingAddresses.length > 0 || addressId) {
      await connection.execute(`
        UPDATE shipping_addresses 
        SET is_default = 0 
        WHERE user_id = ? AND id != ? AND is_active = 1
      `, [userId, addressId]);
    }
    
    return addressId;
    
  } catch (error) {
    console.error('🔥 Error saving shipping address:', error);
    throw error;
  }
}

// ✅ Process successful Razorpay payment with shipping address
export async function processSuccessfulPayment(paymentData, orderData) {
  try {
    const db = await getDb();
    const connection = await db.getConnection();
    
    try {
      await connection.query("START TRANSACTION");
      
      // Parse order data from Razorpay notes
      const userId = orderData.notes.user_id;
      const customerData = JSON.parse(orderData.notes.customer_data);
      const validatedItems = JSON.parse(orderData.notes.validated_items);
      const paymentMethod = orderData.notes.payment_method;
      
      // Parse all fee details from Razorpay notes
      const subtotal = parseInt(orderData.notes.subtotal || '0');
      const shippingFee = parseInt(orderData.notes.shipping_fee || '0');
      const codFee = parseInt(orderData.notes.cod_fee || '0');
      
      console.log('💰 Processing Razorpay payment with fees:', {
        subtotal: `₹${(subtotal/100).toFixed(2)}`,
        shippingFee: `₹${(shippingFee/100).toFixed(2)}`,
        codFee: `₹${(codFee/100).toFixed(2)}`,
        total: `₹${(orderData.amount/100).toFixed(2)}`
      });
      
      // Save shipping address first
      const shippingAddressId = await saveShippingAddress(connection, userId, customerData.address);
      
      // Decrement stock (only after successful payment)
      for (const item of validatedItems) {
        const [updateResult] = await connection.execute(
          "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?",
          [item.quantity, item.id, item.quantity]
        );
        
        if (updateResult.affectedRows === 0) {
          console.error(`❌ Stock depletion failed for ${item.name}`);
          // Note: At this point payment is already captured, so we log but continue
        }
      }
      
      // Save order with proper breakdown
      const receipt = orderData.receipt || `paid_${Date.now()}`;
      
      // Save Razorpay order (not COD) with proper breakdown
      try {
        await connection.execute(`
          INSERT INTO orders (
            id, user_id, razorpay_order_id, razorpay_payment_id,
            amount, subtotal, shipping_fee, cod_fee, currency, status, 
            payment_method, shipping_status, items, customer_details, 
            shipping_address, shipping_address_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, 'pending', ?, ?, ?, ?)
        `, [
          receipt,
          userId,
          orderData.id,              // Razorpay order ID
          paymentData.id,            // Razorpay payment ID
          orderData.amount,          // Total from Razorpay
          subtotal,                  // Products only
          shippingFee,              // Shipping charges
          codFee,                   // COD fee (0 for online payments)
          orderData.currency || 'INR',
          paymentMethod,             // Should be 'razorpay'
          JSON.stringify(validatedItems),
          JSON.stringify(customerData),
          JSON.stringify(customerData.address),
          shippingAddressId
        ]);
      } catch (columnError) {
        // Fallback without shipping_address_id if column doesn't exist
        console.log('⚠️ shipping_address_id column not found, saving without it');
        await connection.execute(`
          INSERT INTO orders (
            id, user_id, razorpay_order_id, razorpay_payment_id,
            amount, subtotal, shipping_fee, cod_fee, currency, status, 
            payment_method, shipping_status, items, customer_details, 
            shipping_address
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, 'pending', ?, ?, ?)
        `, [
          receipt,
          userId,
          orderData.id,
          paymentData.id,
          orderData.amount,
          subtotal,
          shippingFee,
          codFee,
          orderData.currency || 'INR',
          paymentMethod,
          JSON.stringify(validatedItems),
          JSON.stringify(customerData),
          JSON.stringify(customerData.address)
        ]);
      }
      
      // Save order items
      for (const item of validatedItems) {
        await connection.execute(`
          INSERT INTO order_items (
            order_id, product_id, product_name, quantity, unit_price, 
            total_price, product_weight, product_volume
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          receipt,
          item.product_id,
          item.name,
          item.quantity,
          item.price,
          item.total,
          item.weight,
          item.volume
        ]);
      }
      
      await connection.query("COMMIT");
      
      console.log(`✅ Razorpay payment processed: ${receipt}, address: ${shippingAddressId}`);
      
      return { success: true, orderId: receipt };
      
    } catch (error) {
      await connection.query("ROLLBACK");
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('🔥 Payment processing failed:', error);
    return { success: false, error: error.message };
  }
}

// ✅ Create order with shipping address handling
router.post("/create-order", async (req, res) => {
  try {
    console.log('🔍 Create order request received');
    
    // Authentication check
    const sid = req.cookies?.sid;
    if (!sid) {
      return res.status(401).json({ error: "Please log in to place an order" });
    }

    const db = await getDb();
    
    // Verify session
    const [sessions] = await db.execute(
      "SELECT user_id FROM sessions WHERE id = ? AND expires_at > NOW()", 
      [sid]
    );
    
    if (sessions.length === 0) {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }
    
    const userId = sessions[0].user_id;
    const { items, customer, paymentMethod = 'razorpay' } = req.body;
    
    console.log('🔍 Order data:', { userId, itemsCount: items?.length, paymentMethod });
    
    // Validate input
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }
    
    if (!customer?.name || !customer?.email) {
      return res.status(400).json({ error: "Customer details are required" });
    }
    
    // Validate shipping address
    if (!customer?.address) {
      return res.status(400).json({ error: "Shipping address is required" });
    }
    
    const address = customer.address;
    if (!address.fullName || !address.mobile || !address.city || !address.pincode) {
      return res.status(400).json({ error: "Complete shipping address is required" });
    }

    // Get product details and validate stock (but don't decrement yet for Razorpay)
    const productIds = items.map(item => item.id);
    const placeholders = productIds.map(() => '?').join(',');
    const [products] = await db.execute(
      `SELECT id, name, price, stock_quantity, weight, volume FROM products WHERE id IN (${placeholders}) AND active = TRUE`,
      productIds
    );
    
    const productMap = {};
    products.forEach(p => productMap[p.id] = p);
    
    let subtotal = 0;
    const validatedItems = [];
    
    // Validate each item and check stock availability
    for (const item of items) {
      const product = productMap[item.id];
      if (!product) {
        return res.status(400).json({ 
          error: `Product ${item.id} not found or unavailable` 
        });
      }
      
      const qty = Math.max(1, Math.min(10, parseInt(item.qty || item.quantity || 1, 10)));
      
      // CHECK STOCK AVAILABILITY (but don't decrement yet for Razorpay)
      if (product.stock_quantity < qty) {
        return res.status(400).json({ 
          error: `Insufficient stock for ${product.name}. Only ${product.stock_quantity} available, but ${qty} requested.` 
        });
      }
      
      const itemTotal = product.price * qty;
      subtotal += itemTotal;
      
      validatedItems.push({
        id: item.id,
        product_id: item.id,
        name: product.name,
        price: product.price,
        quantity: qty,
        total: itemTotal,
        weight: product.weight,
        volume: product.volume
      });
    }
    
    if (subtotal <= 0) {
      return res.status(400).json({ error: "Invalid cart total" });
    }
    
    // Calculate shipping and COD fees based on your new logic
   // ✅ FIXED: Calculate shipping and COD fees with correct logic
function calculateOrderTotal(subtotalPaise, paymentMethod) {
  const subtotalRupees = subtotalPaise / 100;
  const freeShippingThreshold = 499;
  
  let shippingFee = 0;
  let codFee = 0;
  
  // ✅ FIXED: Handle shipping based on order amount
  if (subtotalRupees <= freeShippingThreshold) {
    if (paymentMethod === 'cod') {
      shippingFee = 4900; // ₹49 in paise for COD orders < ₹499
    } else {
      shippingFee = 4900; // ₹49 in paise for online orders < ₹499
    }
  }
  // If subtotal > ₹499, shipping remains 0 (free shipping)
  
  // ✅ FIXED: COD fee applies to ALL COD orders regardless of amount
  if (paymentMethod === 'cod') {
    codFee = 999; // ₹9.99 in paise for ALL COD orders
  }
  
  return {
    subtotal: subtotalPaise,
    shippingFee,
    codFee,
    total: subtotalPaise + shippingFee + codFee
  };
}

const orderTotal = calculateOrderTotal(subtotal, paymentMethod);
const totalAmount = orderTotal.total;

console.log('💰 Order calculation:', {
  subtotal: `₹${(orderTotal.subtotal/100).toFixed(2)}`,
  shipping: `₹${(orderTotal.shippingFee/100).toFixed(2)}`,
  codFee: `₹${(orderTotal.codFee/100).toFixed(2)}`,
  total: `₹${(totalAmount/100).toFixed(2)}`,
  paymentMethod
});

const receipt = `order_${Date.now()}`;

// HANDLE COD vs RAZORPAY DIFFERENTLY
if (paymentMethod === 'cod') {
  // For COD: Decrement stock and save order immediately
  const connection = await db.getConnection();
  try {
    await connection.query("START TRANSACTION");
    
    // Save shipping address first
    const shippingAddressId = await saveShippingAddress(connection, userId, customer.address);
    
    // Decrement stock for COD orders
    for (const item of validatedItems) {
      const [updateResult] = await connection.execute(
        "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?",
        [item.quantity, item.id, item.quantity]
      );
      
      if (updateResult.affectedRows === 0) {
        await connection.query("ROLLBACK");
        return res.status(400).json({ 
          error: `Stock changed for ${item.name}. Please refresh and try again.` 
        });
      }
    }
    
    // Save COD order with ALL new columns
    try {
      await connection.execute(`
        INSERT INTO orders (
          id, user_id, razorpay_order_id, amount, subtotal, shipping_fee, 
          cod_fee, currency, status, payment_method, shipping_status, 
          items, customer_details, shipping_address, shipping_address_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'cod_confirmed', ?, 'pending', ?, ?, ?, ?)
      `, [
        receipt,
        userId,
        `cod_${receipt}`,
        orderTotal.total,          // ✅ Now includes COD fee: 52999 for ₹520 order
        orderTotal.subtotal,       // ✅ Products only: 52000
        orderTotal.shippingFee,    // ✅ Shipping: 0 (free for > ₹499)
        orderTotal.codFee,         // ✅ COD fee: 999 (₹9.99)
        'INR',
        paymentMethod,
        JSON.stringify(validatedItems),
        JSON.stringify(customer),
        JSON.stringify(customer.address),
        shippingAddressId
      ]);
    } catch (columnError) {
      // Fallback with new columns
      console.log('⚠️ New columns not found, using fallback');
      await connection.execute(`
        INSERT INTO orders (
          id, user_id, razorpay_order_id, amount, subtotal, shipping_fee, 
          cod_fee, currency, status, payment_method, shipping_status, 
          items, customer_details, shipping_address
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'cod_confirmed', ?, 'pending', ?, ?, ?)
      `, [
        receipt,
        userId,
        `cod_${receipt}`,
        orderTotal.total,          // ✅ Now includes COD fee
        orderTotal.subtotal,       // ✅ Products only
        orderTotal.shippingFee,    // ✅ Shipping fee
        orderTotal.codFee,         // ✅ COD fee
        'INR',
        paymentMethod,
        JSON.stringify(validatedItems),
        JSON.stringify(customer),
        JSON.stringify(customer.address)
      ]);
    }
    
    // Save order items for COD
    for (const item of validatedItems) {
      await connection.execute(`
        INSERT INTO order_items (
          order_id, product_id, product_name, quantity, unit_price, 
          total_price, product_weight, product_volume
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        receipt,
        item.product_id,
        item.name,
        item.quantity,
        item.price,
        item.total,
        item.weight,
        item.volume
      ]);
    }
    
    await connection.query("COMMIT");
    
    console.log(`✅ COD Order created: ${receipt}, amount: ₹${orderTotal.total/100}, address: ${shippingAddressId}`);
    
    res.json({
      orderId: `cod_${receipt}`,
      amount: orderTotal.total,      // ✅ Correct total with COD fee
      currency: 'INR',
      paymentMethod: paymentMethod,
      success: true,
      message: "COD order placed successfully"
    });
    
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release();
  }
  
} else {
  // For Razorpay: Create order but DON'T save to database yet
  const razorpayOrder = await razorpay.orders.create({
    amount: totalAmount,
    currency: "INR",
    receipt: receipt,
    notes: {
      user_id: userId.toString(),
      customer_name: customer.name,
      customer_email: customer.email,
      payment_method: paymentMethod,
      // Store all fee details for webhook
      subtotal: orderTotal.subtotal.toString(),
      shipping_fee: orderTotal.shippingFee.toString(),
      cod_fee: orderTotal.codFee.toString(),
      total_amount: totalAmount.toString(),
      customer_data: JSON.stringify(customer),
      validated_items: JSON.stringify(validatedItems)
    }
  });

  console.log(`✅ Razorpay order created with shipping:`, {
    receipt: receipt,
    orderId: razorpayOrder.id,
    subtotal: `₹${(orderTotal.subtotal/100).toFixed(2)}`,
    shipping: `₹${(orderTotal.shippingFee/100).toFixed(2)}`,
    codFee: `₹${(orderTotal.codFee/100).toFixed(2)}`,
    total: `₹${(totalAmount/100).toFixed(2)}`
  });
  
  // Return order details for payment (no DB save)
  res.json({
    orderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    key: process.env.RAZORPAY_KEY_ID,
    paymentMethod: paymentMethod
  });
}

} catch (error) {
console.error('🔥 Order creation failed:', error);
res.status(500).json({ error: "Failed to create order: " + error.message });
}
});


// Get user's saved shipping addresses
router.get("/shipping-addresses", async (req, res) => {
  try {
    const sid = req.cookies?.sid;
    if (!sid) {
      return res.status(401).json({ error: "Please log in to view addresses" });
    }

    const db = await getDb();
    const [sessions] = await db.execute(
      "SELECT user_id FROM sessions WHERE id = ? AND expires_at > NOW()", 
      [sid]
    );
    
    if (sessions.length === 0) {
      return res.status(401).json({ error: "Session expired" });
    }
    
    const userId = sessions[0].user_id;
    
    // Get user's shipping addresses
    const [addresses] = await db.execute(`
      SELECT 
        id, full_name, mobile, alt_mobile, flat_no, street, 
        city, state, country, pincode, address_type, is_default,
        created_at, updated_at
      FROM shipping_addresses 
      WHERE user_id = ? AND is_active = 1 
      ORDER BY is_default DESC, updated_at DESC
    `, [userId]);
    
    console.log(`📍 Found ${addresses.length} addresses for user ${userId}`);
    res.json(addresses);
  } catch (error) {
    console.error('Failed to fetch shipping addresses:', error);
    res.status(500).json({ error: "Failed to load addresses" });
  }
});

// GET /api/orders - Get user's orders
router.get("/orders", async (req, res) => {
  try {
    const sid = req.cookies?.sid;
    if (!sid) {
      return res.status(401).json({ error: "Please log in to view orders" });
    }

    const db = await getDb();
    const [sessions] = await db.execute(
      "SELECT user_id FROM sessions WHERE id = ? AND expires_at > NOW()", 
      [sid]
    );
    
    if (sessions.length === 0) {
      return res.status(401).json({ error: "Session expired" });
    }
    
    const userId = sessions[0].user_id;
    
    // Get orders (with optional shipping address details if column exists)
    const [orders] = await db.execute(`
      SELECT 
        id, razorpay_order_id, razorpay_payment_id, amount, currency, 
        status, payment_method, shipping_status, tracking_number,
        items, customer_details, shipping_address, cod_fee,
        created_at, updated_at
      FROM orders 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `, [userId]);
    
    res.json(orders);
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    res.status(500).json({ error: "Failed to load orders" });
  }
});

// ✅ UPDATED: Get specific order details with product images
router.get("/orders/:orderId", async (req, res) => {
  try {
    const sid = req.cookies?.sid;
    if (!sid) {
      return res.status(401).json({ error: "Please log in to view order details" });
    }

    const db = await getDb();
    const [sessions] = await db.execute(
      "SELECT user_id FROM sessions WHERE id = ? AND expires_at > NOW()", 
      [sid]
    );
    
    if (sessions.length === 0) {
      return res.status(401).json({ error: "Session expired" });
    }
    
    const userId = sessions[0].user_id;
    const orderId = req.params.orderId;
    
    // Get order details
    const [orders] = await db.execute(`
      SELECT * FROM orders 
      WHERE (id = ? OR razorpay_order_id = ?) AND user_id = ?
    `, [orderId, orderId, userId]);
    
    if (orders.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    // ✅ ENHANCED: Get order items WITH product images
    const [orderItems] = await db.execute(`
      SELECT 
        oi.*,
        p.image_url as product_image_url,
        p.name as current_product_name,
        p.description as product_description
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [orders[0].id]);
    
    // ✅ NEW: Enrich order items with image URLs
    const enrichedItems = orderItems.map(item => ({
      ...item,
      // Add image_url field for frontend compatibility
      image_url: item.product_image_url,
      // Keep current product name if available
      product_name: item.current_product_name || item.product_name,
    }));
    
    res.json({
      order: orders[0],
      items: enrichedItems
    });
  } catch (error) {
    console.error('Failed to fetch order details:', error);
    res.status(500).json({ error: "Failed to load order details" });
  }
});

// ✅ UPDATED: Get all orders with enriched product data
router.get("/orders", async (req, res) => {
  try {
    const sid = req.cookies?.sid;
    if (!sid) {
      return res.status(401).json({ error: "Please log in to view orders" });
    }

    const db = await getDb();
    const [sessions] = await db.execute(
      "SELECT user_id FROM sessions WHERE id = ? AND expires_at > NOW()", 
      [sid]
    );
    
    if (sessions.length === 0) {
      return res.status(401).json({ error: "Session expired" });
    }
    
    const userId = sessions[0].user_id;
    
    // Get orders
    const [orders] = await db.execute(`
      SELECT 
        id, razorpay_order_id, razorpay_payment_id, amount, subtotal, shipping_fee, 
        cod_fee, currency, status, payment_method, shipping_status, tracking_number,
        items, customer_details, shipping_address, created_at, updated_at
      FROM orders 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `, [userId]);
    
    // ✅ NEW: Enrich orders with current product images
    const enrichedOrders = await Promise.all(orders.map(async (order) => {
      let items = [];
      try {
        items = JSON.parse(order.items || '[]');
      } catch (e) {
        console.warn('Error parsing order items:', e);
        return order; // Return original order if parsing fails
      }
      
      // Get current product data for each item
      const enrichedItems = await Promise.all(items.map(async (item) => {
        const productId = item.product_id || item.id;
        if (productId) {
          try {
            const [productData] = await db.execute(
              'SELECT image_url, name, description FROM products WHERE id = ? AND active = TRUE',
              [productId]
            );
            
            if (productData.length > 0) {
              return {
                ...item,
                // Add current product data
                image_url: productData[0].image_url,
                current_product_name: productData[0].name,
                product_description: productData[0].description,
                // Keep original name as fallback
                product_name: item.product_name || productData[0].name
              };
            }
          } catch (error) {
            console.warn('Error fetching product data for product ID:', productId, error);
          }
        }
        return item; // Return original item if no product data found
      }));
      
      return {
        ...order,
        items: JSON.stringify(enrichedItems)
      };
    }));
    
    console.log(`📦 Returning ${enrichedOrders.length} orders with enriched product data`);
    res.json(enrichedOrders);
    
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    res.status(500).json({ error: "Failed to load orders" });
  }
});

// ✅ REMOVED: Cancel order function (as requested)
// Note: Cancel order functionality has been removed


export default router;
