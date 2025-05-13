import multer from "multer";

const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Tipo de arquivo não suportado. Apenas imagens são permitidas.")
    );
  }
};

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
});
