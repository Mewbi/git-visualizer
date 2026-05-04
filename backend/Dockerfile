FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o api .

FROM alpine:3.21
# git is required at runtime for clone/fetch operations
RUN apk add --no-cache git ca-certificates
WORKDIR /app
COPY --from=builder /app/api .
COPY --from=builder /app/config ./config
EXPOSE 8080
CMD ["./api"]
