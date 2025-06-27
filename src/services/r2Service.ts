import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import { Readable } from "stream";
import { v4 as uuidv4 } from "uuid";
import { R2_BUCKET_NAME, R2_PUBLIC_URL, r2Client } from "../config/r2.js";

export interface UploadResult {
  key: string;
  url: string;
  size: number;
}

export interface ImageData {
  body: Readable;
  contentType: string;
  contentLength: number;
  lastModified?: Date;
}

export class R2Service {
  /**
   * Faz upload de um buffer para o R2
   * @param buffer - Buffer do arquivo a ser enviado
   * @param originalName - Nome original do arquivo
   * @param contentType - Tipo MIME do arquivo
   * @param folder - Pasta onde o arquivo será armazenado (opcional)
   * @returns Informações do arquivo enviado
   */
  async uploadBuffer(
    buffer: Buffer | string,
    originalName: string,
    contentType: string,
    folder?: string
  ): Promise<UploadResult> {
    try {
      // Gera um nome único para o arquivo
      const fileExtension = originalName.split(".").pop() || "";
      const uniqueFileName = `${uuidv4()}.${fileExtension}`;
      const key = folder ? `${folder}/${uniqueFileName}` : uniqueFileName;

      // Comando para upload
      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        // Metadados opcionais
        Metadata: {
          originalName: originalName,
          uploadedAt: new Date().toISOString(),
        },
      });

      // Executa o upload
      await r2Client.send(command);

      // Constrói a URL pública
      const publicUrl = `${R2_PUBLIC_URL}/${key}`;

      return {
        key,
        url: publicUrl,
        size: buffer.length,
      };
    } catch (error) {
      console.error("Erro ao fazer upload para R2:", error);
      throw new Error(
        `Falha no upload para R2: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`
      );
    }
  }

  /**
   * Faz upload de um arquivo Multer para o R2
   * @param file - Arquivo do Multer
   * @param folder - Pasta onde o arquivo será armazenado (opcional)
   * @returns Informações do arquivo enviado
   */
  async uploadFile(
    file: Express.Multer.File,
    folder?: string
  ): Promise<UploadResult> {
    return this.uploadBuffer(
      file.buffer,
      file.originalname,
      file.mimetype,
      folder
    );
  }

  /**
   * Faz upload de uma imagem a partir de uma URL
   * @param imageUrl - URL da imagem a ser baixada e enviada
   * @param fileName - Nome do arquivo (opcional)
   * @param folder - Pasta onde o arquivo será armazenado (opcional)
   * @returns Informações do arquivo enviado
   */
  async uploadFromUrl(
    imageUrl: string,
    fileName?: string,
    folder?: string
  ): Promise<UploadResult> {
    try {
      // Baixa a imagem da URL
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Falha ao baixar imagem: ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get("content-type") || "image/jpeg";

      // Gera um nome se não fornecido
      const finalFileName = fileName || `image-${Date.now()}.jpg`;

      return this.uploadBuffer(buffer, finalFileName, contentType, folder);
    } catch (error) {
      console.error("Erro ao fazer upload da URL:", error);
      throw new Error(
        `Falha no upload da URL: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`
      );
    }
  }

  /**
   * Gera um hash MD5 para um buffer (útil para evitar duplicatas)
   * @param buffer - Buffer do arquivo
   * @returns Hash MD5 do arquivo
   */
  private generateFileHash(buffer: Buffer): string {
    return crypto.createHash("md5").update(buffer).digest("hex");
  }

  /**
   * Verifica se um arquivo existe no R2
   * @param key - Chave do arquivo no R2
   * @returns True se o arquivo existe, false caso contrário
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      });

      await r2Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Busca uma imagem no R2 pelo ID (key)
   * @param imageId - ID da imagem (key no R2)
   * @returns Dados da imagem ou null se não encontrada
   */
  async getImageById(imageId: string): Promise<ImageData | null> {
    try {
      // Tenta buscar em todas as possíveis localizações
      const possibleKeys = [
        imageId, // ID direto
        `hair-fast-generation/originals/${imageId}`,
        `hair-fast-generation/results/${imageId}`,
        `runwayml-hair/originals/${imageId}`,
        `runwayml-hair/results/${imageId}`,
        `bfl-hair/originals/${imageId}`,
        `bfl-hair/results/${imageId}`,
      ];

      for (const key of possibleKeys) {
        try {
          const command = new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
          });

          const response = await r2Client.send(command);

          if (response.Body) {
            return {
              body: response.Body as Readable,
              contentType: response.ContentType || "image/jpeg",
              contentLength: response.ContentLength || 0,
              lastModified: response.LastModified,
            };
          }
        } catch (error) {
          // Continua tentando outras keys
          continue;
        }
      }

      return null;
    } catch (error) {
      console.error("Erro ao buscar imagem por ID:", error);
      return null;
    }
  }
}
