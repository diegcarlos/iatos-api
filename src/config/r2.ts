import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente
dotenv.config();

/**
 * Configuração do cliente R2 da Cloudflare usando o SDK S3
 * As credenciais são carregadas das variáveis de ambiente
 */
export const r2Client = new S3Client({
  region: 'auto', // R2 usa 'auto' como região
  endpoint: process.env.R2_ENDPOINT, // URL do endpoint R2
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
  },
  // Configurações específicas para compatibilidade com R2
  forcePathStyle: true,
});

/**
 * Nome do bucket R2 configurado nas variáveis de ambiente
 */
export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME as string;

/**
 * URL pública base para acessar arquivos no R2
 * Usado para construir URLs de acesso público aos arquivos
 */
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL as string;