FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY app.js ./
RUN addgroup -S appgroup && adduser -S -u 10001 -G appgroup appuser
USER 10001
EXPOSE 3000
CMD ["node", "app.js"]
