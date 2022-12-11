import http from "http";
import EventEmitter from "events";
import { readFileSync } from "fs";
import path from "path";

const eventEmitter = new EventEmitter();

const testPageHtml = readFileSync(path.resolve(__dirname, "assets/test.html"));

const server = http.createServer();

const host = process.env.HOST ?? "0.0.0.0";
const port = process.env.PORT ? +process.env.PORT : 80;
const timeout = process.env.TIMEOUT ? +process.env.TIMEOUT : 7000;

server.on("request", (request, response) => {
  request.on("error", (error) => {
    console.error("request error " + error);
  });
});

server.on("request", (request, response) => {
  // cors
  response.setHeader("Cache-Control", "no-cache");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST");
  response.setHeader(
    "Access-Control-Allow-Origin",
    request.headers.origin || "*"
  );
  response.setHeader("Access-Control-Max-Age", 2592000);
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
});

server.on("request", (request, response) => {
  if (!request.url) {
    response.writeHead(400);
    response.end();
    return;
  }

  const url = new URL(
    request.url,
    request.headers.origin || "http://localhost"
  );

  /** listener or emitter clientside id */
  const id = url.searchParams.get("id");
  // const clientPing = url.searchParams.get("clientPing");

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
  } else if (request.method === "GET" && url.pathname.startsWith("/e/") && id) {
    const eventName = url.pathname;

    const listener = (type, sourceId, data = undefined) => {
      if (sourceId === id) {
        resetTimeout();
      }
      if (data === "ping") {
        return;
      }

      response.write(
        `data: ${JSON.stringify({ type, id: sourceId, data })}\n\n`
      );
    };

    let timeoutId;

    const closeEvent = () => {
      clearTimeout(timeoutId);
      if (eventEmitter.listeners(eventName).includes(listener)) {
        request.destroy();
        eventEmitter.off(eventName, listener);
        eventEmitter.emit(eventName, "off", id);
      }
    };

    const resetTimeout = () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(closeEvent, timeout);
    };

    resetTimeout();

    request.on("error", (error) => {
      console.log("request error", eventName, id);
      closeEvent();
    });
    response.on("close", () => {
      console.log("close", eventName, id);
      closeEvent();
    });
    response.on("finish", () => {
      console.log("finish", eventName, id);
      closeEvent();
    });
    response.on("error", (error) => {
      console.error("response error", error);
    });

    response.writeHead(200, { "Content-Type": "text/event-stream" });
    listener("ok", id);
    eventEmitter.on(eventName, listener);
    eventEmitter.emit(eventName, "on", id);
  } else if (
    request.method === "POST" &&
    url.pathname.startsWith("/e/") &&
    eventEmitter.listenerCount(url.pathname) > 0 &&
    id
  ) {
    const eventName = url.pathname;
    const rawData: Buffer[] = [];
    request.on("data", (chunk: Buffer) => {
      if (Buffer.isBuffer(chunk)) rawData.push(chunk);
    });
    request.on("end", () => {
      try {
        const data = JSON.parse(Buffer.concat(rawData).toString("utf-8"));
        eventEmitter.emit(eventName, "data", id, data);
        response.writeHead(201);
      } catch (e) {
        console.warn(e);
        response.writeHead(400);
      } finally {
        response.end();
      }
    });
  } else if (request.method === "GET" && url.pathname === "/") {
    response.writeHead(200);
    response.write(testPageHtml);
    response.end();
  } else {
    response.writeHead(404);
    response.end();
  }
});

server.on("listening", (...args) => {
  console.log(`Server running at http://${host}:${port}`);
});
let connections = 0;

server.on("connection", (socket) => {
  connections++;
  console.log({ connections });

  //socket.destroy();
  socket.on("close", () => {
    console.log("socket close");
    connections--;
    console.log({ connections });
  });
  //   socket.on("ready", () => {
  //     console.log("socket ready");
  //   });
  //   socket.on("connect", () => {
  //     console.log("socket connect");
  //   });
  //   socket.on("drain", () => {
  //     console.log("socket drain");
  //   });
  //   console.log("connection");
});

// server.on("close", (socket) => {
//   //socket.destroy();
//   console.log("close");
// });

// server.keepAliveTimeout = 0;

server.listen(port, host);
