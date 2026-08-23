FROM node:lts-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all files
COPY . .

ARG VITE_API_BASE_URL
ARG VITE_MEDIA_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_MEDIA_BASE_URL=$VITE_MEDIA_BASE_URL

RUN npm run build

# Expose port
EXPOSE 3000

# Serve the immutable production build.
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3000"]
