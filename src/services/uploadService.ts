import fs from "fs";
import { R2Service, UploadResult } from "./r2Service.js";
import { getPromptBfl } from "./servicesBfl";
// Inicializa o cliente RunwayML com a API key do ambiente

const fileToBase64 = (file: Express.Multer.File) => {
  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
};

export class UploadService {
  private r2Service: R2Service;

  constructor() {
    this.r2Service = new R2Service();
  }

  async processBFL(image: Express.Multer.File) {
    try {
      if (!image) {
        throw new Error("Arquivo de imagem é obrigatório");
      }

      // Upload da imagem original para o R2
      const originalUpload = await this.r2Service.uploadFile(
        image,
        "bfl-hair/originals"
      );

      //GERA UM ARQUIVO TXT DE LOG DA IMAGEM COM FS
      fs.writeFileSync("log.txt", fileToBase64(image));

      const url = "https://api.us1.bfl.ai/v1/flux-kontext-pro";

      const prompt = await getPromptBfl();

      console.log(prompt);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-key": "ffcfd387-5f08-4ec5-ab58-7f132aa62d47",
        },
        body: JSON.stringify({
          prompt,
          input_image: fileToBase64(image),
          seed: 42,
          // aspect_ratio: '',
          output_format: "png",
          // webhook_url: '',
          // webhook_secret: '',
          prompt_upsampling: false,
          safety_tolerance: 2,
        }),
      });

      if (response.status === 200) {
        /**
         * Função recursiva para fazer polling da API até que a imagem seja gerada
         * @param url - URL de polling fornecida pela API
         * @returns Dados da resposta quando o status for 'Ready'
         */
        async function loopFetch(url: string): Promise<any> {
          const resp = await fetch(url);
          const respStatus = await resp.json();

          if (respStatus.status === "Ready") {
            return respStatus;
          } else {
            // Aguarda 1 segundo antes de tentar novamente
            await new Promise((resolve) => setTimeout(resolve, 1000));
            // CORREÇÃO: Adicionar return na chamada recursiva
            return await loopFetch(url);
          }
        }

        const preFetchData = await response.json();
        const returnData = await loopFetch(preFetchData.polling_url);

        // CORREÇÃO: Verificar se returnData existe e tem a propriedade result
        if (returnData && returnData.result) {
          // Upload da imagem resultado para o R2
          let resultUpload: UploadResult | null = null;
          try {
            resultUpload = await this.r2Service.uploadFromUrl(
              returnData.result.sample,
              `bfl-result-${Date.now()}.png`,
              "bfl-hair/results"
            );
          } catch (error) {
            console.error("Erro ao fazer upload do resultado BFL:", error);
          }

          return {
            message: "Processamento BFL concluído com sucesso",
            files: {
              name: image.originalname,
              url: originalUpload.url,
              key: originalUpload.key,
            },
            result: resultUpload ? resultUpload.url : returnData.result.sample,
            statusCode: response.status,
            processedAt: new Date().toISOString(),
          };
        } else {
          throw new Error(
            "Erro ao processar imagem: dados inválidos retornados"
          );
        }
      }
      // Se chegou aqui, houve erro na requisição inicial
      const errorResult = await response.json();
      throw new Error(
        `Erro na API BFL: ${response.status} - ${JSON.stringify(errorResult)}`
      );
    } catch (error) {
      console.error("Erro ao processar imagem:", error);
    }
  }
}
