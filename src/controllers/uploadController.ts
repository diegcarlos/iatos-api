import { Request, Response } from "express";
import { UploadService } from "../services/uploadService.js";
import { R2Service } from "../services/r2Service.js";

export class UploadController {
  private uploadService: UploadService;
  private r2Service: R2Service;

  constructor() {
    this.uploadService = new UploadService();
    this.r2Service = new R2Service();
  }

  /**
   * Processa upload de arquivos e dados de texto
   * Suporta tanto múltiplos arquivos (hair-fast-generation) quanto arquivo único + texto (runwayml-hair)
   */
  async uploadFiles(req: Request, res: Response): Promise<void> {
    try {
      const { headers, body } = req;
      const token = headers.authorization;
      if (!token || token !== `Bearer ${process.env.API_KEY}`) {
        throw new Error("Unauthorized");
      }

      // Verifica se é a rota runwayml-hair (arquivo único + prompt)
      if (req.file && req.url === "/runwayml-hair") {
        const result: any = await this.uploadService.processRunwayMLUpload(req.file);
        
        res.json(result);
      } else {
        // Rota hair-fast-generation (múltiplos arquivos)
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const result: any = await this.uploadService.processUpload(files);

        if (result.error.visible) {
          res.status(400).json({
            message: "Processamento concluído com avisos",
            error: result.error,
            files: result.originalFiles,
            processedFiles: result.processedFiles,
            result: result.result,
          });
        } else {
          res.json({
            message: "Processamento concluído com sucesso",
            files: result.originalFiles,
            face: result.processedFiles.face[0],
            shape: result.processedFiles.shape[0],
            color: result.processedFiles.color[0],
            result: result.result,
          });
        }
      }
    } catch (error: any) {
      res.status(error.message === "Unauthorized" ? 401 : 400).json({
        error: error.message,
      });
    }
  }

  async uploadFileBFL(req: Request, res: Response): Promise<void> {
    try {
      
      const { headers } = req;
      const token = headers.authorization;
      if (!token || token!== `Bearer ${process.env.API_KEY}`) {
        throw new Error("Unauthorized");
      }

      const files = req.file;
      if (!files) {
        throw new Error("No file uploaded");
      }
      const result: any = await this.uploadService.processBFL(files);

      if (result.statusCode !== 200) {
        throw result;
      }
      res.json(result)
      
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        ...error,
      });
    }
  }

  /**
   * Busca e retorna uma imagem do R2 pelo ID
   * @param req - Request com o parâmetro imageId
   * @param res - Response para retornar a imagem
   */
  async getImage(req: Request, res: Response): Promise<void> {
    try {
      const { imageId } = req.params;
      
      if (!imageId) {
        res.status(400).json({
          error: "ID da imagem é obrigatório"
        });
        return;
      }

      // Busca a imagem no R2 usando o imageId como key
      const imageData = await this.r2Service.getImageById(imageId);
      
      if (!imageData) {
        res.status(404).json({
          error: "Imagem não encontrada"
        });
        return;
      }

      // Define o content-type baseado na extensão do arquivo
      const contentType = imageData.contentType || 'image/jpeg';
      
      // Configura os headers para exibir a imagem
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache por 1 ano
      res.setHeader('Content-Length', imageData.contentLength);
      
      // Retorna o stream da imagem
      imageData.body.pipe(res);
      
    } catch (error: any) {
      console.error('Erro ao buscar imagem:', error);
      res.status(500).json({
        error: "Erro interno do servidor ao buscar imagem"
      });
    }
  }
}
