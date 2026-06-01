FROM golang:1.22 AS build
WORKDIR /src
COPY go.mod ./
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /docsense ./cmd/server

FROM gcr.io/distroless/static-debian12
COPY --from=build /docsense /docsense
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/docsense"]
