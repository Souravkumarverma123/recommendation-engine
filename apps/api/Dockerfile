# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter=@repo/api build

# Resolves the full production dependency graph across the workspace (e.g. pg/openai,
# pulled in only via @repo/database) into a self-contained node_modules — a plain
# node_modules copy would miss deps that aren't in apps/api/package.json directly.
RUN pnpm deploy --filter=@repo/api --prod /out/api

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=prod

COPY --from=build /out/api/node_modules ./node_modules
COPY --from=build /out/api/package.json ./package.json
# dist is gitignored, so it never lands in pnpm deploy's output — copy it explicitly.
COPY --from=build /repo/apps/api/dist ./dist

EXPOSE 8000
CMD ["node", "dist/index.js"]
