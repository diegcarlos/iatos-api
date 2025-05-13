import { HairFastGANService } from "./hairFastGANService.js";

interface UploadedFiles {
  face: Express.Multer.File[];
  shape: Express.Multer.File[];
  color: Express.Multer.File[];
}

export class UploadService {
  private hairFastGANService: HairFastGANService;

  constructor() {
    this.hairFastGANService = new HairFastGANService();
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

    // Processar as imagens com o HairFastGAN
    const result = await this.hairFastGANService.processImages(
      faceBuffer,
      shapeBuffer,
      colorBuffer
    );

    return {
      originalFiles: {
        face: files.face[0].originalname,
        shape: files.shape[0].originalname,
        color: files.color[0].originalname,
      },
      processedFiles: {
        face: result?.face,
        shape: result?.shape,
        color: result?.color,
      },
      result: result.result,
    };
  }
}
