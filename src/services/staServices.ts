import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import { Readable } from "stream";
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

      // Adicionar outros parâmetros
      formData.append("prompt", params.prompt);
      formData.append("negative_prompt", this.createDefaultNegativePrompt());
      formData.append("grow_mask", (params.growMask || 5).toString());
      formData.append("output_format", "webp");

      console.log("FormData criado com sucesso");

      const response = await axios.post(this.baseUrl, formData, {
        headers: {
          ...formData.getHeaders(),
          "stability-client-id": "my-awesome-app",
          "stability-client-user-id": "DiscordUser#9999",
          "stability-client-version": "1.2.1",
          authorization: this.apiKey,
          Accept: "application/json",
        },
        timeout: 60000, // 60 segundos de timeout
      });

      const imageResult = response.data;

      const imageKey = `${uuidv4()}.webp`;

      const original = await this.r2Client.uploadBuffer(
        Buffer.from(params.imagePath.buffer),
        imageKey,
        params.imagePath.mimetype,
        "stability/original"
      );

      const base64Data = imageResult.image;
      const imageBuffer = Buffer.from(base64Data, "base64");

      const image = await this.r2Client.uploadBuffer(
        imageBuffer,
        imageKey,
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

  private createStreamFromInput(input: string | Buffer): Readable {
    if (typeof input === "string") {
      return fs.createReadStream(input);
    } else {
      return Readable.from(input);
    }
  }

  // Método auxiliar para criar um prompt padrão para edição de cabelo
  createHairEditPrompt(): string {
    return "Edit this image to add realistic and natural hair onto the face mask area, matching the person's current hair style, color, and texture. The hair should be seamlessly integrated and evenly distributed across the entire mask, respecting the lighting and face contours to ensure a smooth and natural transition";
  }

  // Método auxiliar para criar um negative prompt padrão
  createDefaultNegativePrompt(): string {
    return "blurry, low resolution, unnatural colors, mismatched hair color, rough edges, unnatural hair texture, unrealistic shadows, distorted face, inconsistent lighting, partial hair, patchy areas, artificial appearance, extra limbs, deformed features, oversaturated colors";
  }
}
