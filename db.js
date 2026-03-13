import mysql from "mysql2/promise";

let pool = null;

export async function getDb() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || "4000", 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: true }
    });
    
    await initTables();
  }
  return pool;
}

async function initTables() {
  const connection = await pool.getConnection();
  try {
    // Users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Sessions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(36) PRIMARY KEY,
        user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Password resets table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS password_resets (
        token VARCHAR(64) PRIMARY KEY,
        user_id INT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Email verifications table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS email_verifications (
        token VARCHAR(64) PRIMARY KEY,
        user_id INT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Products table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price INT NOT NULL COMMENT 'Price in paise',
        image_url VARCHAR(500),
        stock_quantity INT NOT NULL DEFAULT 0 COMMENT 'Available inventory',
        weight VARCHAR(50) DEFAULT NULL COMMENT 'Product weight (e.g., 1 kg, 500 g)',
        volume VARCHAR(50) DEFAULT NULL COMMENT 'Product volume (e.g., 250 ml, 1 L)',
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_active (active),
        INDEX idx_stock (stock_quantity)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Orders table — FIXED: added subtotal, shipping_fee, shipping_address_id columns
    // and made razorpay_order_id nullable for COD orders
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(50) PRIMARY KEY,
        user_id INT,
        razorpay_order_id VARCHAR(50) DEFAULT NULL,
        razorpay_payment_id VARCHAR(50),
        amount INT NOT NULL COMMENT 'Total amount in paise',
        subtotal INT DEFAULT 0 COMMENT 'Products subtotal in paise',
        shipping_fee INT DEFAULT 0 COMMENT 'Shipping charges in paise',
        cod_fee INT DEFAULT 0 COMMENT 'COD fee in paise if applicable',
        currency VARCHAR(3) DEFAULT 'INR',
        status ENUM('created', 'paid', 'cod_confirmed', 'failed', 'cancelled', 'shipped', 'delivered') DEFAULT 'created',
        payment_method ENUM('razorpay', 'cod') DEFAULT 'razorpay',
        shipping_status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
        tracking_number VARCHAR(100) DEFAULT NULL,
        estimated_delivery DATE DEFAULT NULL,
        delivered_at TIMESTAMP NULL DEFAULT NULL,
        items JSON,
        customer_details JSON,
        shipping_address JSON DEFAULT NULL COMMENT 'Complete shipping address from checkout',
        shipping_address_id INT DEFAULT NULL COMMENT 'Reference to saved shipping address',
        notes TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_shipping_status (shipping_status),
        INDEX idx_payment_method (payment_method),
        INDEX idx_razorpay_order (razorpay_order_id),
        INDEX idx_tracking (tracking_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Shipping addresses table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS shipping_addresses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        mobile VARCHAR(15) NOT NULL,
        alt_mobile VARCHAR(15) DEFAULT NULL,
        flat_no VARCHAR(255) NOT NULL,
        street TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        country VARCHAR(100) DEFAULT 'India',
        pincode VARCHAR(10) NOT NULL,
        address_type ENUM('Home', 'Work', 'Other') DEFAULT 'Home',
        is_default BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_default (user_id, is_default),
        INDEX idx_pincode (pincode)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Order items table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL,
        product_id VARCHAR(50) DEFAULT NULL,
        product_name VARCHAR(255) NOT NULL COMMENT 'Snapshot of product name at time of order',
        quantity INT NOT NULL,
        unit_price INT NOT NULL COMMENT 'Price per unit in paise at time of order',
        total_price INT NOT NULL COMMENT 'Total for this item in paise',
        product_weight VARCHAR(50) DEFAULT NULL,
        product_volume VARCHAR(50) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
        INDEX idx_order_id (order_id),
        INDEX idx_product_id (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Cart items table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        product_id VARCHAR(50) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_product (user_id, product_id),
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Migration: Add missing columns to existing tables (safe on fresh + existing DBs)
    const migrations = [
      "ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal INT DEFAULT 0",
      "ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_fee INT DEFAULT 0",
      "ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address_id INT DEFAULT NULL",
      "ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method ENUM('razorpay', 'cod') DEFAULT 'razorpay'",
      "ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending'",
      "ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100) DEFAULT NULL",
      "ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery DATE DEFAULT NULL",
      "ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP NULL DEFAULT NULL",
      "ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address JSON DEFAULT NULL",
      "ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL",
      "ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod_fee INT DEFAULT 0",
      "ALTER TABLE orders MODIFY COLUMN razorpay_order_id VARCHAR(50) DEFAULT NULL",
      "ALTER TABLE orders MODIFY COLUMN status ENUM('created', 'paid', 'cod_confirmed', 'failed', 'cancelled', 'shipped', 'delivered') DEFAULT 'created'",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS weight VARCHAR(50) DEFAULT NULL",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS volume VARCHAR(50) DEFAULT NULL"
    ];

    for (const sql of migrations) {
      try {
        await connection.execute(sql);
      } catch (e) {
        // Column already exists or migration not needed — safe to ignore
      }
    }

    // Sample products (INSERT IGNORE = skip if already exists)
    await connection.execute(`
      INSERT IGNORE INTO products (id, name, description, price, image_url, stock_quantity, weight, volume) VALUES 
      ('fresh_raw_singhara', 'Fresh Raw Singhara', 'Fresh, premium water chestnuts packed with nutrients, fiber, and antioxidants. Perfect for healthy snacking and cooking.', 4500, 'assets/images/products/raw-singhara.jpg', 25, '1 kg', NULL),
      ('premium_singhara_flour', 'Premium Singhara Flour', 'Cold-processed, nutrient-rich flour perfect for healthy cooking and baking.', 6000, 'assets/images/products/singhara-flour.jpg', 15, '1 kg', NULL),
      ('singhara_snacks', 'Singhara Snacks', 'Delicious, guilt-free snacks perfect for health-conscious consumers.', 2500, 'assets/images/products/singhara-snacks.jpg', 30, '250 g', NULL),
      ('singhara_sweeteners', 'Singhara Sweeteners', 'Natural, diabetic-friendly sweeteners for everyday use.', 3000, 'assets/images/products/singhara-sweeteners.jpg', 20, NULL, '200 ml')
    `);

    console.log('✅ Database tables initialized successfully');

  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    connection.release();
  }
}
