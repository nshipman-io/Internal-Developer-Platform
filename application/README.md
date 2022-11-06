# Pet App

## Build

```
$ tsc
```

## Start

```
$ tsc
$ node dist/index.js
```

## Docker

```
$ docker build -t petapp:latest .
$ docker run --rm --name petapp --env PORT=3456 --publish 3456:3456 petapp:latest
```
