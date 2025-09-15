#!/bin/bash

echo "🏗️  Frontend für Server-Integration bauen"
echo "========================================"

cd /app/frontend

echo "📦 Frontend exportieren..."
npx expo export --platform web

echo "📁 Dist-Ordner prüfen..."
if [ -d "dist" ]; then
    echo "✅ Frontend erfolgreich gebaut!"
    echo "📂 Dateien in dist/:"
    ls -la dist/
else
    echo "❌ Dist-Ordner nicht gefunden!"
    exit 1
fi

echo ""
echo "🚀 Jetzt den Server neu starten:"
echo "   cd backend"
echo "   python -m uvicorn server:app --host 0.0.0.0 --port 3000"
echo ""
echo "🌐 Dann öffnen: http://212.227.57.238:3000/"