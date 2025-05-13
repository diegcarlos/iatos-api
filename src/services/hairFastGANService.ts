import { Client } from "@gradio/client";

interface PredictResult {
  data: [string, string]; // [result, error]
}

export class HairFastGANService {
  private client: Client | null = null;

  private async getClient(): Promise<Client> {
    if (!this.client) {
      this.client = await Client.connect("AIRI-Institute/HairFastGAN");
    }
    return this.client;
  }

  async processImages(
    faceBuffer: Buffer,
    shapeBuffer: Buffer,
    colorBuffer: Buffer
  ) {
    try {
      const client = await this.getClient();

      // Processar face
      const faceResult = await client.predict("/resize_inner", {
        img: faceBuffer,
        align: ["Face"],
      });

      // Processar shape
      const shapeResult = await client.predict("/resize_inner_1", {
        img: shapeBuffer,
        align: ["Face"],
      });

      // Processar color
      const colorResult = await client.predict("/resize_inner_2", {
        img: colorBuffer,
        align: ["Face"],
      });

      const faceBlob = await fetch(faceResult.data[0].url).then((r) =>
        r.blob()
      );
      const shapeBlob = await fetch(shapeResult.data[0].url).then((r) =>
        r.blob()
      );
      const colorBlob = await fetch(colorResult.data[0].url).then((r) =>
        r.blob()
      );

      // Realizar a troca de cabelo
      const swapResult = (await client.predict("/swap_hair", {
        face: faceBlob,
        shape: shapeBlob,
        color: colorBlob,
        blending: "Article",
        poisson_iters: 0,
        poisson_erosion: 1,
      })) as PredictResult;

      return {
        face: faceResult.data[0],
        shape: shapeResult.data[0],
        color: colorResult.data[0],
        result: swapResult.data[0],
      };
    } catch (error) {
      console.log(error);
      throw new Error(
        `Erro ao processar imagens: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`
      );
    }
  }
}
