import cors from "cors";
import "dotenv/config";
import express from "express";
import uploadRoutes from "./routes/uploadRoutes.js";

const app = express();
const port = process.env.PORT || 4444;

// Middleware para processar JSON
app.use(express.json());
app.use(
  cors({
    origin: "*",
    allowedHeaders: "*",
  })
);

// Rotas
app.use("/", uploadRoutes);

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
