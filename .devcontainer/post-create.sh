#!/usr/bin/env bash
set -euo pipefail

# The dependency volume is initially owned by root. Only the volume's contents
# need an ownership change; leave the host checkout and its Git metadata alone.
sudo chown -R "$(id -u):$(id -g)" node_modules
npm ci --no-audit --no-fund
