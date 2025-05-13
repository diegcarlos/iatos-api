# Estágio de build
FROM node:20-alpine AS builder

# Instalar pnpm
RUN corepack enable && corepack prepare pnpm@10.5.2 --activate

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de configuração
COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json ./

# Instalar dependências
RUN pnpm install

# Copiar código fonte
COPY src/ ./src/

# Build do projeto
RUN pnpm build

# Estágio de produção
FROM node:20-alpine

WORKDIR /app

# Copiar arquivos necessários do estágio de build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./

# Instalar apenas dependências de produção
RUN corepack enable && corepack prepare pnpm@10.5.2 --activate && \
    pnpm install --prod

# Expor porta
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["node", "dist/server.js"] 