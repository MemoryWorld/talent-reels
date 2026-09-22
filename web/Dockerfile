FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV API_ORIGIN=http://api:8790
RUN npm run build
EXPOSE 8789
CMD ["npm", "run", "start"]
