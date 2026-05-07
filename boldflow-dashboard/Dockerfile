# ── Builder Stage ──
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Install ALL deps (vite needs dev deps)
RUN npm ci
COPY . .
# Declare ARGs and set ENVs for Vite build
ARG VITE_API_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_ADMIN_EMAIL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_ADMIN_EMAIL=$VITE_ADMIN_EMAIL
RUN npm run build

# ── Production Stage ──
FROM nginx:alpine
# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html
# Nginx config for SPA (fixes 404s)
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]