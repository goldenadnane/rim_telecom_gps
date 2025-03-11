const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const app = express();

app.use(cors());

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "root",
  database: "gps_data",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

app.get("/api/coordinates", (req, res) => {
  const query = `
    SELECT 
      latitude AS lat,
      longitude AS lng,
      date AS timestamp,
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
  `;

  pool.query(query, (err, results) => {
    if (err) {
      console.error("MySQL error:", err);
      return res
        .status(500)
        .json({ error: "Database error", details: err.message });
    }

    const formatted = results.map((row) => ({
      ...row,
      speed: Number(row.speed),
      fuel: Number(row.fuel),
      temp: Number(row.temp),
    }));

    res.json(formatted);
  });
});

const PORT = 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
