# Ferny

> STILL IN DESIGN!! I don't recommend you use it for anything yet.

Minimal http routing

```js
const http = require('http');
const { makeHandler, paths, respond } = require('ferny');

const routes = paths({
	'/hello': methods({
		'GET': () => respond("Hello, World");
	});
})

const server = http.createServer(makeHandler(routes))
server.listen(3000);
```
