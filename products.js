import express from "express";
import { getDb } from "./db.js";

const router = express.Router();

// GET /api/products - List all active products WITH WEIGHT AND VOLUME
router.get("/", async (req, res) => {
  try {
    const db = await getDb();
    const [products] = await db.execute(`
      SELECT id, name, description, price, image_url, stock_quantity, 
             weight, volume, created_at, updated_at 
      FROM products 
      WHERE active = TRUE 
      ORDER BY created_at DESC
    `);
    
    res.json(products);
  } catch (error) {
    console.error('Failed to fetch products:', error);
    res.status(500).json({ error: "Failed to load products" });
  }
});

// GET /api/products/:id - Get single product by ID WITH WEIGHT AND VOLUME
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const [products] = await db.execute(
      "SELECT * FROM products WHERE id = ? AND active = TRUE", 
      [id]
    );
    
    if (products.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    res.json(products[0]);
  } catch (error) {
    console.error('Failed to fetch product:', error);
    res.status(500).json({ error: "Failed to load product" });
  }
});

export default router;
