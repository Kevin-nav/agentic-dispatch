FROM node:24-alpine AS build

WORKDIR /app
RUN corepack enable

ARG VITE_CONVEX_URL
ARG VITE_T3_HOSTED_APP_BASE_URL
ENV VITE_CONVEX_URL=$VITE_CONVEX_URL
ENV VITE_T3_HOSTED_APP_BASE_URL=$VITE_T3_HOSTED_APP_BASE_URL

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile

COPY apps/web apps/web
RUN pnpm --filter @agentic-dispatch/web build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 8080
