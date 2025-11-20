# ./src/back-end/Dockerfile

FROM node:18

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json (if exists)
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the app
COPY . .

# Expose port and start
EXPOSE 3010
CMD ["node", "server.js"]