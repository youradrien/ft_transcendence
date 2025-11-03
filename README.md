<h1>
ft_transcendence
</h1>


#back-end
-- back-end:
- framework: fastify
- langage: typescript (javascript with types)
- db: sqlite(sqlite3)
- auth: just use jwt(cookies)
- packages? : nodemon(to restart serv when you modify itt)


#front-end: vanilla js, + typescript
-- front-end
- lang: ts
- webpacker: vite
- framework: none (vanilla)
- 




# misc
-- [cmd used for back && front creation]
- back : npx tsc --init && npm install fastify sqlite sqlite3 typescript ts-node
- front : npm create vite@latest . -- --template vanilla-ts


# how to start && use
<h3> start:</h3>
make (or npm install, npm run dev)
<h3> debug:</h3>
<p> docker-compose logs ft_transcendence-frontend </p>
<p> docker-compose logs ft_transcendence-backend </p>
<h3> ports:</h3>
<p> back: http://127.0.0.1:3000</p>
<p> front: http://127.0.0.1:5173</p>