# syntax=docker/dockerfile:1

FROM node:26.8.1-slim AS build

WORKDIR /app

# Copy manifests first so dependency installation remains cacheable.
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json

RUN npm ci

COPY . .
RUN npm run build

FROM node:26.8.1-slim AS runtime

ENV NODE_ENV=production \
    PORT=8080

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json

RUN npm ci --omit=dev --workspace=@doc2do/api --workspace=@doc2do/contracts --include-workspace-root \
    && npm cache clean --force

COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /app/prompts ./prompts
COPY --from=build /app/tests/fixtures ./tests/fixtures

USER node
EXPOSE 8080

CMD ["npm", "start"]
