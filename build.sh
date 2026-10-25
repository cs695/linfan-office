#!/usr/bin/env bash
# Rebuild js/app.js (three.js r186 + addons bundled locally, no CDN). Needs: node + three + esbuild.
# Usage: THREE_NM=/path/to/node_modules ./build.sh
set -e
cd "$(dirname "$0")"
NM="${THREE_NM:-/workspace/t3/node_modules}"
ESB="${ESBUILD:-/workspace/linfan/node_modules/.bin/esbuild}"
NODE_PATH="$NM" "$ESB" src/main.js --bundle --minify --format=iife --target=es2020 --outfile=js/app.js --legal-comments=none
cp "$NM/three/LICENSE" js/LICENSE-three.txt
ls -la js/app.js
