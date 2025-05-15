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
    origin: (origin, callback) => {
      if (!origin) {
        // Permite requisições sem origem (ex: curl, mobile)
        return callback(null, true);
      }
      // Aqui você pode customizar a lógica de bloqueio
      // Exemplo: bloquear tudo exceto um domínio
      // if (origin !== "https://meudominio.com") {
      //   console.log(`[CORS BLOQUEADO] Origem: ${origin}`);
      //   return callback(new Error("Not allowed by CORS"));
      // }
      // Permite tudo e loga
      console.log(`[CORS LOG] Origem permitida: ${origin}`);
      return callback(null, true);
    },
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
