import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { R2Service } from "./r2Service";

interface StabilityAIImageEditParams {
  imagePath: Express.Multer.File;
  maskPath: Express.Multer.File;
  prompt: string;
  negativePrompt?: string;
  growMask?: number;
  seed?: number;
  outputFormat?: string;
  stylePreset?: string;
}

export class StabilityAIService {
  private readonly apiKey: string;
  private readonly baseUrl: string =
    "https://api.stability.ai/v2beta/stable-image/edit/inpaint";
  private readonly r2Client = new R2Service();

  constructor() {
    this.apiKey = process.env.STABILITY_AI_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("STABILITY_AI_API_KEY não configurada no ambiente");
    }
  }

  async editImageWithInpaint(params: StabilityAIImageEditParams): Promise<any> {
    try {
      // Criar FormData manualmente
      const formData = new FormData();

      // Adicionar a imagem como buffer
      formData.append("image", params.imagePath.buffer, {
        filename: params.imagePath.originalname || "image.jpg",
        contentType: params.imagePath.mimetype,
      });

      // Adicionar a máscara como buffer
      formData.append("mask", params.maskPath.buffer, {
        filename: params.maskPath.originalname || "mask.jpg",
        contentType: params.maskPath.mimetype,
      });

      // Usar o prompt gerado pela IA (que já inclui os modificadores de idade e volume)
      let finalPrompt = params.prompt || this.buscaPrompt();

      // Adicionar outros parâmetros
      formData.append("prompt", finalPrompt);
      formData.append("negative_prompt", this.buscaNegativePrompt());
      formData.append("grow_mask", (params.growMask || 5).toString());
      formData.append("output_format", "webp");

      const response = await axios.post(this.baseUrl, formData, {
        headers: {
          ...formData.getHeaders(),
          authorization: this.apiKey,
          Accept: "application/json",
          grow_mask: 5,
        },
        timeout: 60000, // 60 segundos de timeout
      });

      const imageResult = response.data;

      const imageKey = `${uuidv4()}`;

      const original = await this.r2Client.uploadBuffer(
        Buffer.from(params.imagePath.buffer),
        `${imageKey}.jpg`,
        params.imagePath.mimetype,
        "stability/original"
      );

      const base64Data = imageResult.image;
      const imageBuffer = Buffer.from(base64Data, "base64");

      const image = await this.r2Client.uploadBuffer(
        imageBuffer,
        `${imageKey}.webp`,
        "image/webp",
        "stability/result"
      );

      // return `data:image/webp;base64,${imageResult.image}`;

      return {
        original: {
          url: original.url,
          key: original.key,
        },
        image: {
          url: image.url,
          key: image.key,
        },
      };
    } catch (error: any) {
      console.error("Erro na requisição para Stability AI:", error);

      if (error.response) {
        throw new Error(`Erro da API: ${JSON.stringify(error.response.data)}`);
      }

      throw new Error(`Erro na requisição: ${error.message}`);
    }
  }

  createUpdateStaPrompt = async (prompt: string) => {
    try {
      //cria ou atualiza um arquivo txt local onde estara salvo o prompt do bfl

      const filePath = path.join(__dirname, "..", "..", "sta-prompt.txt");
      if (fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, prompt);
      } else {
        fs.writeFileSync(filePath, prompt);
      }
    } catch (error) {
      console.log(error);
    }
  };

  createUpdateStaNegativePrompt = async (prompt: string) => {
    try {
      //cria ou atualiza um arquivo txt local onde estara salvo o prompt do bfl

      const filePath = path.join(
        __dirname,
        "..",
        "..",
        "/sta-negative-prompt.txt"
      );
      if (fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, prompt);
      } else {
        fs.writeFileSync(filePath, prompt);
      }
    } catch (error) {
      console.log(error);
    }
  };

  buscaPrompt(): string {
    const filePath = path.join(__dirname, "..", "..", "sta-prompt.txt");
    const prompt = fs.readFileSync(filePath, "utf8");
    return prompt;
  }

  buscaNegativePrompt(): string {
    const filePath = path.join(
      __dirname,
      "..",
      "..",
      "sta-negative-prompt.txt"
    );
    const prompt = fs.readFileSync(filePath, "utf8");
    return prompt;
  }
}
