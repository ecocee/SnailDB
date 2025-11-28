FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY dist ./dist
COPY data ./data

# Expose port
EXPOSE 12222

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('net').connect({host: 'localhost', port: 12222}, () => process.exit(0))"

# Start server
CMD ["node", "dist/cmd/server/index.js"]
