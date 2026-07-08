FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps ./apps
COPY backend ./backend
COPY packages ./packages
COPY database ./database
RUN npm ci
RUN npm run prisma:generate
RUN npm run build --workspace=@miclub/api

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/api/dist ./backend/api/dist
COPY --from=build /app/database ./database
COPY --from=build /app/package*.json ./
COPY --from=build /app/backend/api/package.json ./backend/api/package.json
EXPOSE 3000
CMD ["sh","-c","npx prisma migrate deploy --schema=database/prisma/schema.prisma && node backend/api/dist/main.js"]
