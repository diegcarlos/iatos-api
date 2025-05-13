# API de Processamento de Imagens com HairFastGAN

API para processamento de imagens utilizando o modelo HairFastGAN para geração de estilos de cabelo.

## Requisitos

- Node.js
- pnpm

## Instalação

```bash
# Instalar dependências
pnpm install
```

## Desenvolvimento

```bash
# Iniciar servidor em modo desenvolvimento
pnpm dev
```

## Build e Produção

```bash
# Criar build do projeto
pnpm build

# Iniciar servidor em produção
pnpm start
```

## Uso da API

### Upload e Processamento de Imagens

**Endpoint:** `POST /hair-fast-generation`

**Content-Type:** `multipart/form-data`

**Campos:**
- `face`: Arquivo de imagem do rosto (obrigatório)
- `shape`: Arquivo de imagem com o estilo de cabelo desejado (obrigatório)
- `color`: Arquivo de imagem com a cor de cabelo desejada (obrigatório)

**Exemplo de uso com curl:**
```bash
curl -X POST -F "face=@face.jpg" -F "shape=@shape.jpg" -F "color=@color.jpg" http://localhost:3000/hair-fast-generation
```

**Resposta de sucesso:**
```json
{
  "message": "Processamento concluído com sucesso",
  "files": {
    "face": "1234567890-face.jpg",
    "shape": "1234567890-shape.jpg",
    "color": "1234567890-color.jpg"
  },
  "processedFiles": {
    "face": "processed-face.jpg",
    "shape": "processed-shape.jpg",
    "color": "processed-color.jpg"
  },
  "result": "result-image.jpg"
}
```

**Resposta com erro:**
```json
{
  "message": "Processamento concluído com avisos",
  "error": "Mensagem de erro do processamento",
  "files": {
    "face": "1234567890-face.jpg",
    "shape": "1234567890-shape.jpg",
    "color": "1234567890-color.jpg"
  },
  "processedFiles": {
    "face": "processed-face.jpg",
    "shape": "processed-shape.jpg",
    "color": "processed-color.jpg"
  },
  "result": "result-image.jpg"
}
```

## Processamento

A API utiliza o modelo HairFastGAN para processar as imagens. O processo inclui:

1. Redimensionamento e alinhamento das imagens
2. Processamento do estilo de cabelo
3. Aplicação da cor desejada
4. Geração do resultado final

Os arquivos são salvos no diretório `uploads/` com nomes únicos baseados no timestamp.
