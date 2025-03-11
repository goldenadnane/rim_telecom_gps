const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/api/coordinates", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        date,
        latitude,
        longitude,
        speed,
        fuel,
        temp,
        ignition,
        rpm,
        odo,
        heading,
        SatInView,
        \`signal\`,
        state
      FROM arch_1004901
      WHERE latitude IS NOT NULL 
        AND longitude IS NOT NULL
      ORDER BY date
    `);

    const formatted = rows.map((row) => ({
      ...row,
      speed: Number(row.speed),
      fuel: Number(row.fuel),
      rpm: Number(row.rpm),
      odo: Number(row.odo),
      SatInView: Number(row.SatInView),
      signal: Number(row.signal),
      ignition: Boolean(row.ignition),
      state: Number(row.state),
      date: new Date(row.date).toISOString(),
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
