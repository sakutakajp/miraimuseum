FROM node:24-bookworm

# Chromium is also available on arm64, so the existing Playwright tests work
# on Apple Silicon as well as x86 hosts without a second browser download.
RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium fonts-noto-cjk sudo \
    && rm -rf /var/lib/apt/lists/* \
    && printf 'node ALL=(root) NOPASSWD:ALL\n' > /etc/sudoers.d/node \
    && chmod 0440 /etc/sudoers.d/node

USER node
