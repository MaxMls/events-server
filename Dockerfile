FROM node:16-alpine

RUN apk add --no-cache bash

WORKDIR /app

EXPOSE 80

CMD [ "bash", "-c", "sleep infinity" ]
