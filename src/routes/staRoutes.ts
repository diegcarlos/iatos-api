import { Router } from "express";
import { upload } from "../config/multer";
import { StaController } from "../controllers/staController.ts";

const router = Router();
const staRoutes = new StaController();

// Configurar upload para múltiplos arquivos com nomes específicos
const uploadFields = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "mask", maxCount: 1 },
]);

router.post("/edit-image", uploadFields, (req, res) =>
  staRoutes.editImage(req, res)
);

router.get("/prompt-sta", (req, res) => staRoutes.getPrompt(req, res));

router.post("/prompt-sta", (req, res) => staRoutes.editPrompt(req, res));

router.get("/negative-prompt-sta", (req, res) =>
  staRoutes.getNegativePrompt(req, res)
);

router.post("/negative-prompt-sta", (req, res) =>
  staRoutes.editNegativePrompt(req, res)
);

export default router;
