import axios from "axios";
import fs from "fs";
import { Readable } from "stream";

interface StabilityAIImageEditParams {
  imagePath: string | Buffer;
  maskPath: string | Buffer;
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

  constructor() {
    this.apiKey = process.env.STABILITY_AI_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("STABILITY_AI_API_KEY não configurada no ambiente");
    }
  }

  async editImageWithInpaint(params: StabilityAIImageEditParams): Promise<any> {
    try {
      // Criar streams baseados no tipo de entrada
      const imageStream = this.createStreamFromInput(params.imagePath);
      const maskStream = this.createStreamFromInput(params.maskPath);

      const data = {
        image: imageStream,
        mask: maskStream,
        prompt: params.prompt,
        negative_prompt: params.negativePrompt,
        grow_mask: params.growMask,
      };

      const response = await axios.postForm(this.baseUrl, data, {
        headers: {
          "stability-client-id": "my-awesome-app",
          "stability-client-user-id": "DiscordUser#9999",
          "stability-client-version": "1.2.1",
          authorization: this.apiKey,
          Accept: "application/json",
        },
        timeout: 60000, // 60 segundos de timeout
      });

      return response.data;
    } catch (error: any) {
      console.error("Erro na requisição para Stability AI:", error);

      if (error.response) {
        throw new Error(
          `Erro da API: ${error.response.status} - ${
            error.response.data?.message || error.response.statusText
          }`
        );
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
