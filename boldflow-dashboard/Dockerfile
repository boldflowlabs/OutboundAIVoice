FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/boldflow-dashboard/dist /usr/share/nginx/html
# Single-page app: all routes fall back to index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
