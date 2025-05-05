# Dockerfile
FROM node:18-slim


# --- add this block ---
    RUN apt-get update \
    && apt-get install -y --no-install-recommends iproute2 \
    && rm -rf /var/lib/apt/lists/*
   # ----------------------

# 1. create non‑root user for security
RUN useradd -m app
WORKDIR /home/app/app

# 2. copy package manifests and install prod deps
COPY package*.json ./
RUN npm ci --omit=dev

# 3. copy the remaining source
COPY . .

RUN chown -R app:app /home/app/app
USER app

# 4. default command does nothing; each service overrides it
CMD ["node", "-e", "console.log('Specify command in docker-compose.yml')"]
