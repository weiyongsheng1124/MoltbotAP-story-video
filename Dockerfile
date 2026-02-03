# Story Video Generator - Dockerfile
# FFmpeg + espeak-ng only (no Python/Canvas)

FROM node:18-alpine

# Install FFmpeg and espeak-ng
RUN apk add --no-cache \
    ffmpeg \
    espeak-ng \
    git \
    bash

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install npm dependencies
RUN npm ci

# Copy application
COPY . .

# Create directories
RUN mkdir -p output video && chmod 777 output video

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start server
CMD ["node", "server.js"]
