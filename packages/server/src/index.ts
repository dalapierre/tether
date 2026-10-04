import cors from "cors";
import express from "express";

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "0.0.0.0";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "tether-server" });
});

// Command handling will be implemented here later.
app.post("/api/commands", (_req, res) => {
  res.status(501).json({ error: "Not implemented" });
});

app.listen(PORT, HOST, () => {
  console.log(`Tether server listening on http://${HOST}:${PORT}`);
});
