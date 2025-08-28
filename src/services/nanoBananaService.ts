import { response } from "express";
import fs from "fs";
import Replicate from "replicate";
import { v4 as uuidv4 } from "uuid";
import { gerarPromptComImagem } from "./openiIa";
import { R2Service, UploadResult } from "./r2Service.js";
import { getPromptBfl } from "./servicesBfl";
// Inicializa o cliente RunwayML com a API key do ambiente

const fileToBase64 = (file: Express.Multer.File) => {
  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
};

export class UploadServiceNanoBanana {
  private r2Service: R2Service;
  private replicate: Replicate;

  constructor() {
    this.r2Service = new R2Service();
    this.replicate = new Replicate({
      auth: process.env.REPLICATE_API_KEY,
    });
  }

  async processNanoBanana(
    image: Express.Multer.File,
    age?: string,
    volume?: string
  ) {
    if (!image) {
      throw new Error("Arquivo de imagem é obrigatório");
    }

    const imageKey = `${uuidv4()}`;

    // Upload da imagem original para o R2
    const originalUpload = await this.r2Service.uploadBuffer(
      image.buffer,
      `${imageKey}.jpg`,
      image.mimetype,
      "nano-banana/originals"
    );

    //GERA UM ARQUIVO TXT DE LOG DA IMAGEM COM FS
    fs.writeFileSync("log.txt", fileToBase64(image));

    const prompt = await getPromptBfl();

    const ageParam = age || undefined;
    const volumeParam = volume || undefined;
    const generatedPrompt = await gerarPromptComImagem(
      image,
      ageParam,
      volumeParam,
      prompt
    );

    console.log(originalUpload.url);
    const input = {
      image_input: [originalUpload.url],
      prompt: generatedPrompt,
    };

    const output: any = await this.replicate.run("google/nano-banana", {
      input,
    });

    const urlOutput = output?.url();

    if (urlOutput) {
      // /**
      //  * Função recursiva para fazer polling da API até que a imagem seja gerada
      //  * @param url - URL de polling fornecida pela API
      //  * @returns Dados da resposta quando o status for 'Ready'
      //  */
      // async function loopFetch(url: string): Promise<any> {
      //   const resp = await fetch(url);
      //   const respStatus = await resp.json();

      //   if (respStatus.status === "Ready") {
      //     return respStatus;
      //   } else {
      //     // Aguarda 1 segundo antes de tentar novamente
      //     await new Promise((resolve) => setTimeout(resolve, 1000));
      //     // CORREÇÃO: Adicionar return na chamada recursiva
      //     return await loopFetch(url);
      //   }
      // }

      // const preFetchData = await response.json();
      // const returnData = await loopFetch(preFetchData.polling_url);

      // CORREÇÃO: Verificar se returnData existe e tem a propriedade result

      // Upload da imagem resultado para o R2
      let resultUpload: UploadResult | null = null;
      try {
        resultUpload = await this.r2Service.uploadFromUrl(
          urlOutput,
          `${imageKey}.png`,
          "nano-banana/results"
        );
      } catch (error) {
        console.error("Erro ao fazer upload do resultado BFL:", error);
      }

      return {
        message: "Processamento Nano Banana concluído com sucesso",
        files: {
          name: image.originalname,
          url: originalUpload.url,
          key: originalUpload.key,
        },
        result: resultUpload ? resultUpload.url : urlOutput,
        statusCode: response.status,
        processedAt: new Date().toISOString(),
      };
    } else {
      // Se chegou aqui, houve erro na requisição inicial
      return {
        message: "Erro ao processar imagem",
        statusCode: 500,
        processedAt: new Date().toISOString(),
      };
    }
  }
}
