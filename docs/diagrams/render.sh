#!/usr/bin/env bash
# Regenerate diagram images from the .mmd sources.
# Usage: bash docs/diagrams/render.sh
cd "$(dirname "$0")"
for f in *.mmd; do
  base="${f%.mmd}"
  npx -y @mermaid-js/mermaid-cli@latest -i "$f" -o "$base.svg" -b white
  npx -y @mermaid-js/mermaid-cli@latest -i "$f" -o "$base.png" -b white -s 2
done
