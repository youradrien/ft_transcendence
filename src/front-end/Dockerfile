# 1: build
FROM node:24 AS builder

WORKDIR /app

COPY . .

RUN npm install
RUN npm run build

# 2: serve with nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf


EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]