FROM node:22-alpine AS base
WORKDIR /app

COPY package.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm install

COPY . .
RUN npm run prisma:generate --workspace @running-ai/api
RUN npm run build --workspace @running-ai/api

EXPOSE 3000

CMD ["sh", "-c", "npm run prisma:deploy --workspace @running-ai/api && npm run start --workspace @running-ai/api"]
