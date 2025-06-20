# IATOS API

API para processamento de imagens com integração ao Cloudflare R2 para armazenamento.

## Funcionalidades

- **Hair Fast Generation**: Processamento de imagens usando HairFastGAN
- **RunwayML Hair**: Geração de imagens usando RunwayML
- **BFL Hair**: Processamento usando API BFL
- **Armazenamento R2**: Todas as imagens são automaticamente armazenadas no Cloudflare R2

## Configuração

### 1. Instalação das Dependências

```bash
pnpm install
```

### 2. Configuração das Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e configure as variáveis:

```bash
cp .env.example .env
```

#### Variáveis Obrigatórias:

**API Configuration:**

- `API_KEY`: Chave de autenticação da API
- `PORT`: Porta do servidor (padrão: 4444)

**Cloudflare R2:**

- `R2_ENDPOINT`: URL do endpoint R2 (formato: https://account-id.r2.cloudflarestorage.com)
- `R2_ACCESS_KEY_ID`: Access Key ID do R2
- `R2_SECRET_ACCESS_KEY`: Secret Access Key do R2
- `R2_BUCKET_NAME`: Nome do bucket R2
- `R2_PUBLIC_URL`: URL pública para acesso aos arquivos (seu domínio customizado)

### 3. Configuração do Cloudflare R2

1. **Criar um bucket R2** no painel da Cloudflare
2. **Gerar credenciais de API** com permissões de leitura/escrita
3. **Configurar domínio customizado** (opcional, mas recomendado)
4. **Configurar CORS** se necessário para acesso via browser

## Estrutura de Armazenamento no R2

Os arquivos são organizados automaticamente em pastas:

```
bucket/
├── hair-fast-generation/
│   ├── originals/          # Imagens originais (face, shape, color)
│   └── results/            # Resultados processados
├── runwayml-hair/
│   ├── originals/          # Imagens de entrada
│   └── results/            # Imagens geradas
└── bfl-hair/
    ├── originals/          # Imagens de entrada
    └── results/            # Imagens processadas
```

## Endpoints

### GET `/result-image/:imageId`

Retorna uma imagem armazenada no R2 pelo seu ID.

**Parâmetros:**

- `imageId`: ID da imagem (nome do arquivo ou key completa no R2)

**Exemplo:**

```
GET http://localhost:4444/result-image/uuid-da-imagem.jpg
```

**Resposta:**

- **200**: Retorna a imagem diretamente (Content-Type: image/\*)
- **400**: ID da imagem é obrigatório
- **404**: Imagem não encontrada
- **500**: Erro interno do servidor

**Funcionalidades:**

- Busca automática em todas as pastas do R2
- Cache público configurado (1 ano)
- Suporte a diferentes formatos de imagem
- Headers apropriados para exibição direta no browser

### POST `/hair-fast-generation`

Processa múltiplas imagens usando HairFastGAN.

**Headers:**

```
Authorization: Bearer {API_KEY}
Content-Type: multipart/form-data
```

**Body (form-data):**

- `face`: Arquivo de imagem (rosto)
- `shape`: Arquivo de imagem (formato do cabelo)
- `color`: Arquivo de imagem (cor do cabelo)

**Resposta:**

```json
{
  "message": "Processamento concluído com sucesso",
  "files": {
    "face": {
      "name": "face.jpg",
      "url": "https://your-domain.com/hair-fast-generation/originals/uuid.jpg",
      "key": "hair-fast-generation/originals/uuid.jpg"
    },
    "shape": {
      /* ... */
    },
    "color": {
      /* ... */
    }
  },
  "face": [
    /* dados processados */
  ],
  "shape": [
    /* dados processados */
  ],
  "color": [
    /* dados processados */
  ],
  "result": "https://your-domain.com/hair-fast-generation/results/result-timestamp.jpg"
}
```

### POST `/runwayml-hair`

Gera imagens usando RunwayML.

**Headers:**

```
Authorization: Bearer {API_KEY}
Content-Type: multipart/form-data
```

**Body (form-data):**

- `image`: Arquivo de imagem de referência

**Resposta:**

```json
{
  "message": "Processamento RunwayML concluído com sucesso",
  "image": {
    "name": "image.jpg",
    "url": "https://your-domain.com/runwayml-hair/originals/uuid.jpg",
    "key": "runwayml-hair/originals/uuid.jpg"
  },
  "prompt": "prompt usado",
  "result": {
    "success": true,
    "taskId": "task_id",
    "status": "SUCCEEDED",
    "output": "https://your-domain.com/runwayml-hair/results/result-timestamp.jpg",
    "message": "Imagem e prompt processados com sucesso",
    "processedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST `/bfl-hair`

Processa imagens usando API BFL.

**Headers:**

```
Authorization: Bearer {API_KEY}
Content-Type: multipart/form-data
```

**Body (form-data):**

- `image`: Arquivo de imagem

**Resposta:**

```json
{
  "message": "Processamento BFL concluído com sucesso",
  "files": {
    "name": "image.jpg",
    "url": "https://your-domain.com/bfl-hair/originals/uuid.jpg",
    "key": "bfl-hair/originals/uuid.jpg"
  },
  "result": "https://your-domain.com/bfl-hair/results/result-timestamp.png",
  "statusCode": 200,
  "processedAt": "2024-01-01T00:00:00.000Z"
}
```

## Desenvolvimento

### Executar em modo de desenvolvimento:

```bash
pnpm dev
```

### Build para produção:

```bash
pnpm build
pnpm start
```

## Arquitetura

### Serviços

- **UploadService**: Coordena o processamento e armazenamento
- **R2Service**: Gerencia uploads para Cloudflare R2
- **HairFastGANService**: Interface com a API HairFastGAN

### Configurações

- **multer.ts**: Configuração de upload de arquivos
- **r2.ts**: Configuração do cliente R2/S3

### Fluxo de Processamento

1. **Upload**: Arquivo recebido via multipart/form-data
2. **Armazenamento Original**: Imagem original salva no R2
3. **Processamento**: Imagem processada pela API específica
4. **Armazenamento Resultado**: Resultado salvo no R2
5. **Resposta**: URLs públicas retornadas ao cliente

## Segurança

- Todas as rotas requerem autenticação via Bearer token
- Arquivos são armazenados com nomes únicos (UUID)
- Credenciais sensíveis devem estar no arquivo `.env`
- Nunca commitar o arquivo `.env` no repositório

## Monitoramento

- Logs de erro são registrados no console
- Arquivo `log.txt` é gerado para debug (rota BFL)
- Status de processamento é retornado nas respostas
