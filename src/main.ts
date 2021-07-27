const http = require('http');
const EventEmitter = require('events');
const eventEmitter = new EventEmitter()
http.createServer((req, res) => {
	// console.log('request ', req.url, req.method, /*req.headers*/);

	res.setHeader('Cache-Control', 'no-cache')
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST')
	res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
	res.setHeader('Access-Control-Max-Age', 2592000)
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

	if (req.method === 'OPTIONS') {
		res.writeHead(204);
		res.end();
	} else if (req.method === 'GET' && req.url?.startsWith('/e/')) {
		const eventName = req.url

		const listener = (data) => {
			// console.log('event', data)
			res.write('data: ' + JSON.stringify(data) + '\n\n')
		}

		eventEmitter.on(eventName, listener)

		/*res.on('error', (err) => {
			console.error('res error', err)
		})*/
		res.on('close', () => {
			eventEmitter.off(eventName, listener)
			//console.log('res close')
		})
		/*res.on('finish', () => {
			//console.log('res finish')
		})*/

		res.writeHead(200, {'Content-Type': 'text/event-stream'})
		res.write('data: ok\n\n')

	} else if (req.method === 'POST' && req.url?.startsWith('/e/') && eventEmitter.eventNames().includes(req.url)) {
		const eventName = req.url
		const rawData: Buffer[] = []
		req.on('data', (chunk: Buffer) => {
			if (Buffer.isBuffer(chunk)) {
				rawData.push(chunk)
			}
		})
		req.on('end', () => {
			try {
				const data = JSON.parse(Buffer.concat(rawData).toString('utf-8'))
				//console.log('req end', data)
				eventEmitter.emit(eventName, data)
				res.writeHead(201)
			} catch (e) {
				console.error(e)
				res.writeHead(400)
			} finally {
				res.end()
			}
		})
	} else {
		//console.warn('404', eventEmitter.eventNames())
		res.writeHead(404);
		res.end();
	}

}).listen(process.env.PORT ?? 8125, '0.0.0.0');
console.log('Server running at http://127.0.0.1:8125/');
