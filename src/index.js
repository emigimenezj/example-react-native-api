// src/index.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { pool } from "./db.js";

dotenv.config();

const app = express();
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);
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
      `SELECT id, user_id, weight, size, species, bagging_date, created_at, name
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

    const { weight, size, species, bagging_date, name } = req.body;

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
    if (name && typeof name !== "string")
      return res.status(400).json({ error: "invalid_name" });

    const { rows } = await pool.query(
      `
      INSERT INTO silobags (user_id, weight, size, species, bagging_date, name)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, user_id, weight, size, species, bagging_date, created_at, name
      `,
      [userId, weight, size, species, bagging_date, name]
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

app.post("/ingest", async (req, res) => {
  const { mutations } = req.body;

  if (!Array.isArray(mutations) || mutations.length === 0) {
    return res.status(400).json({ error: "mutations_required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const m of mutations) {
      // formato esperado:
      // { op: 'insert'|'update'|'delete', table: 'silobags', data: {...}, key?: number }
      if (!m || typeof m !== "object") {
        return res.status(400).json({ error: "invalid_mutation" });
      }

      const { op, table } = m;

      if (table !== "silobags") {
        return res.status(400).json({ error: "unsupported_table" });
      }

      if (op === "insert") {
        const { data } = m;
        if (!data) return res.status(400).json({ error: "data_required" });

        // OJO: tu tabla hoy genera id autoincremental, así que NO lo insertamos.
        // Si querés IDs del cliente, hay que cambiar el esquema.
        const { user_id, weight, size, species, bagging_date, name } = data;

        await client.query(
          `
          INSERT INTO silobags (user_id, weight, size, species, bagging_date, name)
          VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [user_id, weight, size, species, bagging_date, name]
        );
      } else if (op === "update") {
        const { key, data } = m;
        if (typeof key !== "number") {
          return res.status(400).json({ error: "key_required" });
        }
        if (!data || typeof data !== "object") {
          return res.status(400).json({ error: "data_required" });
        }

        // update parcial permitido en columnas conocidas
        const fields = [];
        const values = [];
        let i = 1;

        const allowed = ["name", "weight", "size", "species", "bagging_date"];

        for (const k of allowed) {
          if (k in data) {
            fields.push(`${k} = $${i++}`);
            values.push(data[k]);
          }
        }

        if (fields.length === 0) {
          return res.status(400).json({ error: "no_updatable_fields" });
        }

        values.push(key);
        await client.query(
          `UPDATE silobags SET ${fields.join(", ")} WHERE id = $${i}`,
          values
        );
      } else if (op === "delete") {
        const { key } = m;
        if (typeof key !== "number") {
          return res.status(400).json({ error: "key_required" });
        }
        await client.query(`DELETE FROM silobags WHERE id = $1`, [key]);
      } else {
        return res.status(400).json({ error: "unsupported_op" });
      }
    }

    // txid REAL de esta transacción
    const { rows } = await client.query("SELECT txid_current() AS txid");
    await client.query("COMMIT");

    return res.json({ txid: rows[0].txid });
  } catch (err) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "db_error", detail: err.message });
  } finally {
    client.release();
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
