FROM node:22-bookworm-slim

WORKDIR /backend

ENV NODE_ENV=production

# Copy only manifest files first so this layer is cached
# and re-used whenever app source changes but deps don't.
COPY package*.json ./

# No compiler toolchain needed here: sharp and onnxruntime-node
# (via @huggingface/transformers) both ship prebuilt binaries for
# standard glibc Linux, which this Debian-based image provides.
# (node:*-alpine uses musl libc instead, which onnxruntime-node's
# prebuilt binary can't load at all — that's why we're not on alpine.)
RUN npm ci --omit=dev

COPY . .

# Don't run the app as root inside the container.
RUN groupadd -r app && useradd -r -g app app
USER app

EXPOSE 3000

CMD ["node", "index.js"]
