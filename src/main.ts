const http = require('http');
const EventEmitter = require('events');
const eventEmitter = new EventEmitter()
/*
const events = new Map<string, { history: string[] }>()
const createEvent = (eventName) => {
	events.set(eventName, {history: []})
}
const destroyEvent = (eventName) => {
	events.delete(eventName)
}*/


const server = http.createServer({}, (req, res) => {
	res.shouldKeepAlive = false
	const url = new URL(req.url, req.headers.origin || 'http://localhost');
	const id = url.searchParams.get('id')
	res.setHeader('Cache-Control', 'no-cache')
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST')
	res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
	res.setHeader('Access-Control-Max-Age', 2592000)
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
	res.setHeader('Connection', 'close')

	if (req.method === 'OPTIONS') {
		res.writeHead(204);
		res.end();
	} else if (req.method === 'GET' && url.pathname.startsWith('/e/') && id) {
		const eventName = url.pathname

		const listener = (type, id, data = undefined) => {
			res.write(`data: ${JSON.stringify({type, id, data})}\n\n`)
		}
		const closeEvent = () => {
			if (eventEmitter.listeners(eventName).includes(listener)) {
				eventEmitter.off(eventName, listener)
				eventEmitter.emit(eventName, 'off', id)
			}
		}

		res.on('close', () => {
			console.log('close', eventName, id)
			closeEvent()
		})
		res.on('finish', () => {
			console.log('finish', eventName, id)
			closeEvent()
		})
		res.on('error', (err) => {
			console.error('res error', err)
		})

		res.writeHead(200, {'Content-Type': 'text/event-stream'})
		listener('ok', id)
		eventEmitter.on(eventName, listener)
		eventEmitter.emit(eventName, 'on', id)
	} else if (req.method === 'POST' && url.pathname.startsWith('/e/') && eventEmitter.listenerCount(url.pathname) > 0 && id) {
		const eventName = url.pathname
		const rawData: Buffer[] = []
		req.on('data', (chunk: Buffer) => {
			if (Buffer.isBuffer(chunk)) rawData.push(chunk)
		})
		req.on('end', () => {
			try {
				const data = JSON.parse(Buffer.concat(rawData).toString('utf-8'))
				eventEmitter.emit(eventName, 'data', id, data)
				res.writeHead(201)
			} catch (e) {
				console.error(e)
				res.writeHead(400)
			} finally {
				res.end()
			}
		})
	} else {
		res.writeHead(404);
		res.end();
	}
}).listen(process.env.PORT ?? 8125, '0.0.0.0');

server.keepAliveTimeout = 0
console.log('Server running at http://127.0.0.1:8125/');
