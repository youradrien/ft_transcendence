# ./src/back-end/Dockerfile

FROM node:18

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json (if exists)
COPY package*.json ./

# Install app dependencies
RUN npm install
RUN mkdir -p /app/certs

# Copy the rest of the app
COPY . .
# Copy backend code
COPY src/back-end /app

# Copy certificate
COPY vault/vault-config/certs/vault.crt /app/certs/vault.crt


# Expose port and start
EXPOSE 3010
CMD ["node", "server.js"]