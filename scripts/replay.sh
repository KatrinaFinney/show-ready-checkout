#!/usr/bin/env bash
set -e
curl -s -X POST http://localhost:3000/admin/replay > /dev/null || true
echo "✨ Golden replay triggered."
