FROM node:20-alpine
WORKDIR /app
COPY package.json server.js index.html manifest.webmanifest sw.js ./
COPY .env.example ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm","start"]
