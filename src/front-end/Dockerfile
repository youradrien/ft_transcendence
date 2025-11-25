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

#temporarire, a terme  il faudra stocker dans vault 
COPY ./ssl_certs/transssl.crt /etc/nginx/ssl/transssl.crt
COPY ./ssl_certs/transssl.key /etc/nginx/ssl/transssl.key

EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]