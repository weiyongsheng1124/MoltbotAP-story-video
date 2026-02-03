# Story Video Generator - Dockerfile
# Installs FFmpeg, ImageMagick, and Python for video generation

FROM node:18-alpine

# Install FFmpeg, ImageMagick, Python, and other tools
RUN apk add --no-cache \
    ffmpeg \
    imagemagick \
    python3 \
    py3-pip \
    git \
    bash

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application
COPY . .

# Create output and video directories
RUN mkdir -p output video && chmod 777 output video

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start server
CMD ["node", "server.js"]
