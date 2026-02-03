# Story Video Generator - Dockerfile
# Installs FFmpeg, espeak-ng, and canvas for PNG generation

FROM node:18-alpine

# Install all required tools
RUN apk add --no-cache \
    ffmpeg \
    espeak-ng \
    git \
    bash \
    python3 \
    py3-pip \
    # Canvas dependencies
    cairo \
    pango \
    jpeg \
    giflib \
    libpng \
    tiff \
    zlib-dev \
    g++ \
    make

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
