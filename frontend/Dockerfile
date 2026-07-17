# Build stage
# Build context is the repo root (see docker-compose.yml) so tokens.css
# (imported by frontend/src/index.css as ../../tokens.css) is reachable.
FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY tokens.css /tokens.css
COPY frontend/. .
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# SPA routing fallback + reverse proxy for /api and /ws to the backend service.
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
