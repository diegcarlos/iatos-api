import { Request, Response } from "express";
import { R2Service } from "../services/r2Service.js";
import { createUpdateBfl, getPromptBfl } from "../services/servicesBfl";
import { UploadService } from "../services/uploadService";

export class UploadController {
  private uploadService: UploadService;
  private r2Service: R2Service;

  constructor() {
    this.uploadService = new UploadService();
    this.r2Service = new R2Service();
  }

  //get prompt bfl
  async getPromptBFL(req: Request, res: Response): Promise<void> {
    const { headers } = req;
    const token = headers.authorization;
    if (!token || token !== `Bearer ${process.env.API_KEY}`) {
      res.status(401).json({
        error: "Unauthorized",
      });
      return;
    }
    const prompt = await getPromptBfl();
    res.json({ prompt });
  }

  async uploadFileBFL(req: Request, res: Response): Promise<void> {
    try {
      const { headers } = req;
      const token = headers.authorization;
      if (!token || token !== `Bearer ${process.env.API_KEY}`) {
        throw new Error("Unauthorized");
      }

      const files = req.file;
      if (!files) {
        throw new Error("No file uploaded");
      }
      const result: any = await this.uploadService.processBFL(files);

      if (result.statusCode !== 200) {
        throw result;
      }
      res.json(result);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        ...error,
      });
    }
  }

  async createUpdatePromptBFL(req: Request, res: Response): Promise<void> {
    try {
      const { prompt } = req.body;
      await createUpdateBfl(prompt);
      res.json({
        message: "Prompt atualizado com sucesso",
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        ...error,
      });
    }
  }

  /**
   * Busca e retorna uma imagem do R2 pelo ID
   * @param req - Request com o parâmetro imageId
   * @param res - Response para retornar a imagem
   */
  async getImage(req: Request, res: Response): Promise<void> {
    try {
      const { imageId } = req.params;
      const { headers } = req;
      const token = headers.authorization;
      if (!token || token !== `Bearer ${process.env.API_KEY}`) {
        res.status(401).json({
          error: "Unauthorized",
        });
        return;
      }

      if (!imageId) {
        res.status(400).json({
          error: "ID da imagem é obrigatório",
        });
        return;
      }

      // Busca a imagem no R2 usando o imageId como key
      const imageData = await this.r2Service.getImageById(imageId);

      if (!imageData) {
        res.status(404).json({
          error: "Imagem não encontrada",
        });
        return;
      }

      // Define o content-type baseado na extensão do arquivo
      const contentType = imageData.contentType || "image/jpeg";

      // Configura os headers para exibir a imagem
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache por 1 ano
      res.setHeader("Content-Length", imageData.contentLength);

      // Retorna o stream da imagem
      imageData.body.pipe(res);
    } catch (error: any) {
      console.error("Erro ao buscar imagem:", error);
      res.status(500).json({
        error: "Erro interno do servidor ao buscar imagem",
      });
    }
  }
}
