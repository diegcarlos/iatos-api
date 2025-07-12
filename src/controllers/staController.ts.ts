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

      // Verificar se o arquivo tem buffer (memória) ou path (disco)
      const imageFile = files["image"][0];
      if (!imageFile || (!imageFile.buffer && !imageFile.path)) {
        res.status(400).json({
          error: "Arquivo de imagem inválido - deve ter buffer ou path",
        });
        return;
      }

      // Verificar se o arquivo de máscara tem buffer ou path
      const maskFile = files["mask"][0];
      if (!maskFile || (!maskFile.buffer && !maskFile.path)) {
        res.status(400).json({
          error: "Arquivo de máscara inválido - deve ter buffer ou path",
        });
        return;
      }

      // Extrair parâmetros opcionais do FormData
      const age = req.body.age || null;
      const volume = req.body.volume || null;

      // Validar parâmetros de idade
      const validAges = ["elderly", "middle-aged", "young"];
      if (age && !validAges.includes(age)) {
        res.status(400).json({
          error:
            "Parâmetro 'age' deve ser um dos seguintes valores: 'elderly', 'middle-aged', 'young'",
        });
        return;
      }

      // Validar parâmetros de volume
      const validVolumes = ["more volume", "less volume", "natural"];
      if (volume && !validVolumes.includes(volume)) {
        res.status(400).json({
          error:
            "Parâmetro 'volume' deve ser um dos seguintes valores: 'more volume', 'less volume', 'natural'",
        });
        return;
      }

      const newPrompt = this.staService.buscaPrompt();
      const negativePrompt = this.staService.buscaNegativePrompt();

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
        prompt: newPrompt,
        negativePrompt: negativePrompt,
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
