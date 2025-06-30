import { Request, Response } from "express";
import { StabilityAIService } from "../services/staServices";

export class StaController {
  private staService: StabilityAIService;

  constructor() {
    this.staService = new StabilityAIService();
  }

  //edit image
  async editImage(req: Request, res: Response): Promise<void> {
    try {
      const { headers } = req;
      const token = headers.authorization;
      if (!token || token !== `Bearer ${process.env.API_KEY}`) {
        res.status(401).json({
          error: "Unauthorized",
        });
        return;
      }

      // Verificar se os arquivos foram enviados
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files || !files["image"] || !files["mask"]) {
        res.status(400).json({
          error: "Arquivos 'image' e 'mask' são obrigatórios",
        });
        return;
      }

      const imageFile = files["image"][0];
      const maskFile = files["mask"][0];
      const prompt = this.staService.buscaPrompt();

      if (!prompt) {
        res.status(400).json({
          error: "Campo 'prompt' é obrigatório",
        });
        return;
      }

      const result = await this.staService.editImageWithInpaint({
        imagePath: imageFile,
        maskPath: maskFile,
        prompt,
      });

      res.json(result);
    } catch (error: any) {
      console.error("Erro no controller:", error);
      res.status(error.statusCode || 500).json({
        error: error.message || "Erro interno do servidor",
      });
    }
  }

  async getPrompt(req: Request, res: Response): Promise<void> {
    const prompt = this.staService.buscaPrompt();
    res.json({ prompt });
  }

  async editPrompt(req: Request, res: Response): Promise<void> {
    try {
      const { headers } = req;
      const token = headers.authorization;
      if (!token || token !== `Bearer ${process.env.API_KEY}`) {
        res.status(401).json({
          error: "Unauthorized",
        });
        return;
      }

      const { prompt } = req.body;
      const result = await this.staService.createUpdateStaPrompt(prompt);
      res.json({
        message: "Prompt atualizado com sucesso",
      });
    } catch (error: any) {
      console.error("Erro no controller:", error);
      res.status(error.statusCode || 500).json({
        error: error.message || "Erro interno do servidor",
      });
    }
  }

  async getNegativePrompt(req: Request, res: Response): Promise<void> {
    const { headers } = req;
    const token = headers.authorization;
    if (!token || token !== `Bearer ${process.env.API_KEY}`) {
      res.status(401).json({
        error: "Unauthorized",
      });
      return;
    }
    const negativePrompt = this.staService.buscaNegativePrompt();
    res.json({ negativePrompt });
  }

  async editNegativePrompt(req: Request, res: Response): Promise<void> {
    const { headers } = req;
    const token = headers.authorization;
    if (!token || token !== `Bearer ${process.env.API_KEY}`) {
      res.status(401).json({
        error: "Unauthorized",
      });
      return;
    }
    const { negativePrompt } = req.body;
    const result = await this.staService.createUpdateStaNegativePrompt(
      negativePrompt
    );
    res.json({
      message: "Negative Prompt atualizado com sucesso",
    });
  }
}
