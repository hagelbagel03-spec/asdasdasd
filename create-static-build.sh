#!/bin/bash

echo "🏗️  Erstelle Static Web Build (ohne Expo Server)"
echo "=============================================="

cd /app/frontend

echo "🧹 Cache leeren..."
rm -rf dist/
rm -rf .metro-cache/
rm -rf node_modules/.cache/

echo "🔧 Environment setzen..."
export EXPO_PUBLIC_BACKEND_URL="http://212.227.57.238:8001"
export EXPO_PUBLIC_GOOGLE_MAPS_API_KEY="AIzaSyA8mG8Y1pcJy_-1yNOhlTZ9gpnuVBmc0cw"

echo "🚀 Static Build erstellen..."
npx expo export --platform web --output-dir dist

echo "✅ Static Build fertig!"
echo "📁 Dateien in: /app/frontend/dist/"
ls -la dist/

echo ""
echo "🌐 Server neu starten mit Static Files:"
echo "   cd /app/backend"
echo "   python -m uvicorn server:app --host 0.0.0.0 --port 8001"