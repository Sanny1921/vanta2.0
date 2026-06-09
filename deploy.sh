#!/bin/bash
# Exit on error
set -e

echo "=== 1. Verifying deployment files ==="
files=(
  "frontend/vite.config.js"
  "frontend/public/404.html"
  ".github/workflows/deploy.yml"
  "frontend/.env.production"
  "frontend/.env.example"
)
for f in "${files[@]}"; do
  if [ -f "$f" ]; then
    echo "✅ $f is present"
  else
    echo "❌ $f is MISSING!"
    exit 1
  fi
done

echo "=== 2. Running final build verification ==="
cd frontend
npm run build
cd ..

echo "=== 3. Checking Git status ==="
git status

echo "=== 4. Staging and committing changes ==="
git add .
git commit -m "Deploy frontend to GitHub Pages"

echo "=== 5. Pushing changes to GitHub ==="
git push origin main

echo "=== Done! ==="
