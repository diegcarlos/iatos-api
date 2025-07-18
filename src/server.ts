import cors from "cors";
import "dotenv/config";
import express from "express";
import staRoutes from "./routes/staRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

const app = express();
const port = process.env.PORT || 4444;

// Middleware CORS
app.use(
  cors({
    origin: "*",
    allowedHeaders: "*",
  })
);

// Middleware para processar JSON e form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.use("/", uploadRoutes);

app.use("/sta", staRoutes);

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
