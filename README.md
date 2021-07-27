# events-server
Server side event emitter. Based on Server-sent events

How to use:


```javascript

const url = 'https://[SERVER_DOMAIN:SERVER_PORT]/e/'
const event = 'ping/pong'


// Listen events:
const source = new EventSource(url + event, {
    withCredentials: false
})

source.onmessage = (e) => {
    if (e.data === 'ok') {
        console.log('start listen')
    } else {
        const res = JSON.parse(e.data)
        console.log('new event:', res) // new event: some info
    }
}

source.onerror = (e) => {
    console.error(e)
}


// Emit event:
const data = 'some info'
const res = await fetch(url + event, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
})

if (!res.ok) console.error(res.statusText)

```
