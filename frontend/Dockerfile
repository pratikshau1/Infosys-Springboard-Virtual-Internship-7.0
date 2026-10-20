# Stage 1: Build static assets
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests and install dependencies
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Build production bundle
RUN npm run build

# Stage 2: Serve static assets with Nginx
FROM nginx:alpine

# Copy built distribution from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
