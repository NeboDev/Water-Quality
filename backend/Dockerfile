FROM node:22-alpine

WORKDIR /app

ENV CI=true

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --prod --frozen-lockfile

RUN apk add --no-cache mosquitto mosquitto-clients

COPY src ./src

EXPOSE 3000

CMD ["node", "src/index.js"]