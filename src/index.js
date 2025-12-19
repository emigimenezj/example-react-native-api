// src/index.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { pool } from "./db.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// health check
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// listar users
app.get("/users", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, email, created_at FROM users ORDER BY id DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "db_error", detail: err.message });
  }
});

// crear user
app.post("/users", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "email_required" });

    const { rows } = await pool.query(
      "INSERT INTO users (email) VALUES ($1) RETURNING id, email, created_at",
      [email]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    // unique violation
    if (err.code === "23505") {
      return res.status(409).json({ error: "email_already_exists" });
    }
    res.status(500).json({ error: "db_error", detail: err.message });
  }
});

// listar silobags por user
app.get("/users/:userId/silobags", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId))
      return res.status(400).json({ error: "invalid_user_id" });

    const { rows } = await pool.query(
      `SELECT id, user_id, weight, size, species, bagging_date, created_at
       FROM silobags
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "db_error", detail: err.message });
  }
});

// crear silobag para un user
app.post("/users/:userId/silobags", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ error: "invalid_user_id" });
    }

    const { weight, size, species, bagging_date } = req.body;

    if (weight === undefined)
      return res.status(400).json({ error: "weight_required" });
    if (typeof weight !== "number" || weight <= 0)
      return res.status(400).json({ error: "invalid_weight" });
    if (!size) return res.status(400).json({ error: "size_required" });
    if (typeof size !== "string")
      return res.status(400).json({ error: "invalid_size" });
    if (!species) return res.status(400).json({ error: "species_required" });
    if (typeof species !== "string")
      return res.status(400).json({ error: "invalid_species" });
    if (!bagging_date)
      return res.status(400).json({ error: "bagging_date_required" });
    if (Number.isNaN(Date.parse(bagging_date)))
      return res.status(400).json({ error: "invalid_bagging_date" });

    const { rows } = await pool.query(
      `
      INSERT INTO silobags (user_id, weight, size, species, bagging_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, user_id, weight, size, species, bagging_date, created_at
      `,
      [userId, weight, size, species, bagging_date]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    // FK violation (user no existe)
    if (err.code === "23503") {
      return res.status(404).json({ error: "user_not_found" });
    }

    res.status(500).json({ error: "db_error", detail: err.message });
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
