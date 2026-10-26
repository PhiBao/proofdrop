FROM rust:1.97-bookworm AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/proofdrop-api /usr/local/bin/proofdrop-api
ENV PORT=8080
ENV DATABASE_URL=sqlite:///data/proofdrop.db
EXPOSE 8080
CMD ["proofdrop-api"]
