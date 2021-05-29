```js
const http = require('http');
const { makeHandler, paths } = require('mouser');

const routes = paths({
	'/api': () => "cool"
})

const server = http.createServer(makeHandler(routes))
server.listen(3000);
```