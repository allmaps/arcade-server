FROM caddy:2.8.4-builder AS builder

RUN xcaddy build \
    --with github.com/protomaps/go-pmtiles/caddy@v1.22.1

FROM caddy:2.8.4

COPY --from=builder /usr/bin/caddy /usr/bin/caddy
