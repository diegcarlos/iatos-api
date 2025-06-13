import { HairFastGANService } from "./hairFastGANService.js";
import { R2Service, UploadResult } from "./r2Service.js";
import RunwayML from '@runwayml/sdk';
import fs from 'fs';

// Inicializa o cliente RunwayML com a API key do ambiente
const client = new RunwayML({
  apiKey: process.env.RUNWAYML_API_SECRET
});

const fileToBase64 = (file: Express.Multer.File) => {
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
};

interface UploadedFiles {
  face: Express.Multer.File[];
  shape: Express.Multer.File[];
  color: Express.Multer.File[];
}

interface RunwayMLFiles {
  image: Express.Multer.File;
  prompt: string;
}

export class UploadService {
  private hairFastGANService: HairFastGANService;
  private r2Service: R2Service;

  constructor() {
    this.hairFastGANService = new HairFastGANService();
    this.r2Service = new R2Service();
  }

  async processUpload(files: Partial<UploadedFiles>) {
    if (!files.face || !files.shape || !files.color) {
      throw new Error(
        "Todos os arquivos (face, shape e color) são obrigatórios"
      );
    }

    const faceBuffer = files.face[0].buffer;
    const shapeBuffer = files.shape[0].buffer;
    const colorBuffer = files.color[0].buffer;

    // Upload das imagens originais para o R2
    const [faceUpload, shapeUpload, colorUpload] = await Promise.all([
      this.r2Service.uploadFile(files.face[0], 'hair-fast-generation/originals'),
      this.r2Service.uploadFile(files.shape[0], 'hair-fast-generation/originals'),
      this.r2Service.uploadFile(files.color[0], 'hair-fast-generation/originals')
    ]);

    // Processar as imagens com o HairFastGAN
    const result = await this.hairFastGANService.processImages(
      faceBuffer,
      shapeBuffer,
      colorBuffer
    );

    // Upload da imagem resultado para o R2
    let resultUpload: UploadResult | null = null;
    if (result.result && typeof result.result === 'string') {
      try {
        resultUpload = await this.r2Service.uploadFromUrl(
          result.result,
          `result-${Date.now()}.jpg`,
          'hair-fast-generation/results'
        );
      } catch (error) {
        console.error('Erro ao fazer upload do resultado:', error);
      }
    }

    return {
      originalFiles: {
        face: {
          name: files.face[0].originalname,
          url: faceUpload.url,
          key: faceUpload.key
        },
        shape: {
          name: files.shape[0].originalname,
          url: shapeUpload.url,
          key: shapeUpload.key
        },
        color: {
          name: files.color[0].originalname,
          url: colorUpload.url,
          key: colorUpload.key
        },
      },
      processedFiles: {
        face: result.processedFace,
        shape: result.processedShape,
        color: result.processedColor,
      },
      result: resultUpload ? resultUpload.url : result.result,
      error: result.error,
    };
  }

  /**
   * Processa upload para RunwayML com imagem e prompt de texto
   * @param image - Arquivo de imagem enviado
   */
  async processRunwayMLUpload(image: Express.Multer.File) {
    if (!image) {
      throw new Error("Arquivo de imagem é obrigatório");
    }

    // Upload da imagem original para o R2
    const originalUpload = await this.r2Service.uploadFile(image, 'runwayml-hair/originals');

    const imageBuffer = image.buffer;

    let task = await client.textToImage.create({
      model: 'gen4_image',
      ratio: '1920:1080',
      promptText: process.env.PROMPT_RUNWAYML as string,
      referenceImages: [
        {
          uri: fileToBase64(image),
        }
      ]
    });
  
    do {
      // Wait for 1 second before polling
      await new Promise(resolve => setTimeout(resolve, 1000));
  
      task = await client.tasks.retrieve(task.id);
      //@ts-ignore
    } while (!['SUCCEEDED', 'FAILED'].includes(task.status));

    // Upload da imagem resultado para o R2
    let resultUpload: UploadResult | null = null;
    //@ts-ignore
    if (task.status === 'SUCCEEDED' && task.output && task.output[0]) {
      try {
        //@ts-ignore
        resultUpload = await this.r2Service.uploadFromUrl(
          //@ts-ignore
          task.output[0],
          `runwayml-result-${Date.now()}.jpg`,
          'runwayml-hair/results'
        );
      } catch (error) {
        console.error('Erro ao fazer upload do resultado RunwayML:', error);
      }
    }

    const result = {
      success: true,
      taskId: task.id,
      //@ts-ignore
      status: task.status,
      //@ts-ignore
      output: resultUpload ? resultUpload.url : task.output,
      message: "Imagem e prompt processados com sucesso",
      processedAt: new Date().toISOString()
    };

    return {
      message: "Processamento RunwayML concluído com sucesso",
      image: {
        name: image.originalname,
        url: originalUpload.url,
        key: originalUpload.key
      },
      prompt: process.env.PROMPT_RUNWAYML,
      result: result
    };
  }

  async processBFL(image: Express.Multer.File) {
    try {
      if (!image) {
        throw new Error("Arquivo de imagem é obrigatório");
      }
  
      // Upload da imagem original para o R2
      const originalUpload = await this.r2Service.uploadFile(image, 'bfl-hair/originals');
  
  
      //GERA UM ARQUIVO TXT DE LOG DA IMAGEM COM FS
      fs.writeFileSync('log.txt', fileToBase64(image));
      
      const url = "https://api.us1.bfl.ai/v1/flux-kontext-max"
  
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-key': 'ffcfd387-5f08-4ec5-ab58-7f132aa62d47'
        },
        body: JSON.stringify({
          prompt: process.env.PROMPT_RUNWAYML,
          input_image: fileToBase64(image),
          seed: 42,
          // aspect_ratio: '',
          output_format: 'png',
          // webhook_url: '',
          // webhook_secret: '',
          prompt_upsampling: false,
          safety_tolerance: 2,
        })
      })

     
      if (response.status === 200) {
        /**
         * Função recursiva para fazer polling da API até que a imagem seja gerada
         * @param url - URL de polling fornecida pela API
         * @returns Dados da resposta quando o status for 'Ready'
         */
        async function loopFetch(url: string): Promise<any> {
          const resp = await fetch(url);
          const respStatus = await resp.json();
          
          if (respStatus.status === 'Ready') {
            return respStatus;
          } else {
            // Aguarda 1 segundo antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, 1000));
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
              'bfl-hair/results'
            );
          } catch (error) {
            console.error('Erro ao fazer upload do resultado BFL:', error);
          }
  
  
          return {
            message: "Processamento BFL concluído com sucesso",
            files: {
              name: image.originalname,
              url: originalUpload.url,
              key: originalUpload.key
            },
            result: resultUpload ? resultUpload.url : returnData.result.sample,
            statusCode: response.status,
            processedAt: new Date().toISOString()
          };
        } else {
          throw new Error('Erro ao processar imagem: dados inválidos retornados');
        }
      }
      // Se chegou aqui, houve erro na requisição inicial
      const errorResult = await response.json();
      throw new Error(`Erro na API BFL: ${response.status} - ${JSON.stringify(errorResult)}`);
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
    }
  }
}
