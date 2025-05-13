import { Router } from "express";
import { upload } from "../config/multer.js";
import { UploadController } from "../controllers/uploadController.js";

const router = Router();
const uploadController = new UploadController();

router.post(
  "/hair-fast-generation",
  upload.fields([
    { name: "face", maxCount: 1 },
    { name: "shape", maxCount: 1 },
    { name: "color", maxCount: 1 },
  ]),
  (req, res) => uploadController.uploadFiles(req, res)
);

export default router;
