import { Request, Response } from "express";
import { UploadService } from "../services/uploadService.js";

export class UploadController {
  private uploadService: UploadService;

  constructor() {
    this.uploadService = new UploadService();
  }

  async uploadFiles(req: Request, res: Response): Promise<void> {
    try {
      const { headers } = req;
      const token = headers.authorization;
      if (!token || token !== `Bearer ${process.env.API_KEY}`) {
        throw new Error("Unauthorized");
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const result: any = await this.uploadService.processUpload(files);

      if (result.error.visible) {
        res.status(400).json({
          message: "Processamento concluído com avisos",
          error: result.error,
          files: result.originalFiles,
          processedFiles: result.processedFiles,
          result: result.result,
        });
      } else {
        res.json({
          message: "Processamento concluído com sucesso",
          files: result.originalFiles,
          processedFiles: result.processedFiles,
          result: result.result,
        });
      }
    } catch (error: any) {
      res.status(error.message === "Unauthorized" ? 401 : 400).json({
        error: error.message,
      });
    }
  }
}
