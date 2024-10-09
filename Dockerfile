FROM golang:1.23-alpine3.20
RUN mkdir app
WORKDIR /app
COPY go.mod go.sum main.go /app
EXPOSE 80
CMD ["go", "run", "main.go"]