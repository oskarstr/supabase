# syntax=docker/dockerfile:1.7

ARG GO_VERSION=1.24.9

FROM golang:${GO_VERSION} AS builder
WORKDIR /src

COPY apps/runtime-agent/ .
RUN go mod download

ARG TARGETOS
ARG TARGETARCH
RUN CGO_ENABLED=0 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH:-amd64} go build -o /runtime-agent ./cmd/runtime-agent

FROM gcr.io/distroless/base-debian12
COPY --from=builder /runtime-agent /usr/local/bin/runtime-agent

EXPOSE 8085
ENTRYPOINT ["/usr/local/bin/runtime-agent"]
