import { Router } from "express";
import { upload } from "../config/multer.js";
import { UploadController } from "../controllers/uploadController.js";

const router = Router();
const uploadController = new UploadController();

const uploadFields = upload.fields([{ name: "image", maxCount: 1 }]);

router.get("/prompt-bfl", (req, res) =>
  uploadController.getPromptBFL(req, res)
);

router.post("/bfl-hair", uploadFields, (req, res) =>
  uploadController.uploadFileBFL(req, res)
);

router.post("/prompt-bfl", (req, res) =>
  uploadController.createUpdatePromptBFL(req, res)
);

router.get("/result-image/:imageId", (req, res) =>
  uploadController.getImage(req, res)
);

export default router;
