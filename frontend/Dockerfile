FROM node:26-alpine AS build
WORKDIR /app
COPY SQLab/package*.json .
RUN npm ci
COPY SQLab/ .
RUN npm run build

FROM nginx:alpine3.23-slim
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf