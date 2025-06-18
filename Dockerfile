# Use an official lightweight Node.js image
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
# Copy package.json and package-lock.json (if you have it)
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY . .

# Expose the port your server listens on (adjust if not 8080)
EXPOSE 8080

# Start the WebSocket server
CMD ["node", "ws-server.js"]
