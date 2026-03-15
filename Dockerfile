FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production=false

COPY . .

EXPOSE ${PORT:-8080}

CMD ["npx", "tsx", "src/demo.ts", "--web", "--idle", "--delay", "120"]
