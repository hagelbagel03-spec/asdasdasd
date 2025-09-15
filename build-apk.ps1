# Stadtwache APK Builder - PowerShell Version
Write-Host ""
Write-Host "🏗️  Stadtwache APK Builder (PowerShell)" -ForegroundColor Blue
Write-Host "====================================" -ForegroundColor Blue
Write-Host ""

# Prüfe ob EAS CLI installiert ist
$easExists = Get-Command eas -ErrorAction SilentlyContinue
if (-not $easExists) {
    Write-Host "❌ EAS CLI nicht gefunden. Installiere mit: npm install -g @expo/eas-cli" -ForegroundColor Red
    Read-Host "Drücke Enter zum Beenden"
    exit 1
}

# Wechsle ins Frontend-Verzeichnis
if (-not (Test-Path "frontend")) {
    Write-Host "❌ Frontend-Ordner nicht gefunden!" -ForegroundColor Red
    Write-Host "   Stelle sicher, dass du im Projektordner bist." -ForegroundColor Yellow
    Read-Host "Drücke Enter zum Beenden"
    exit 1
}

Set-Location frontend

Write-Host "📋 Aktuelle Konfiguration:" -ForegroundColor Green
Write-Host "   App Name: Stadtwache Schwelm"
Write-Host "   Server: 212.227.57.238:8001"
Write-Host "   Build: APK (Preview)"
Write-Host ""

# Überprüfe die Konfiguration
if (-not (Test-Path "app.json")) {
    Write-Host "❌ app.json nicht gefunden!" -ForegroundColor Red
    Read-Host "Drücke Enter zum Beenden"
    exit 1
}

if (-not (Test-Path "../eas.json")) {
    Write-Host "❌ eas.json nicht gefunden!" -ForegroundColor Red
    Read-Host "Drücke Enter zum Beenden"
    exit 1
}

Write-Host "✅ Konfiguration überprüft" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Starte APK Build..." -ForegroundColor Yellow
Write-Host "   Dies kann 10-15 Minuten dauern..." -ForegroundColor Yellow
Write-Host ""

# Führe den Build aus
try {
    & eas build --platform android --profile preview --non-interactive
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 APK Build erfolgreich!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📱 Die APK kann jetzt heruntergeladen und installiert werden."
        Write-Host "🔗 Server: 212.227.57.238:8001"
        Write-Host ""
        Write-Host "👥 Anmeldedaten für Beamte:" -ForegroundColor Cyan
        Write-Host "   E-Mail: beamter@stadtwache.de"
        Write-Host "   Passwort: stadtwache2024"
        Write-Host ""
        Write-Host "🛡️  Admin-Anmeldung:" -ForegroundColor Magenta
        Write-Host "   E-Mail: admin@stadtwache.de"
        Write-Host "   Passwort: admin2024"
    } else {
        Write-Host ""
        Write-Host "❌ APK Build fehlgeschlagen!" -ForegroundColor Red
        Write-Host "💡 Tipps:" -ForegroundColor Yellow
        Write-Host "   1. eas login - Melde dich bei Expo an"
        Write-Host "   2. eas build:configure - Konfiguriere das Projekt"
        Write-Host "   3. Stelle sicher, dass alle Abhängigkeiten installiert sind"
    }
} catch {
    Write-Host "❌ Fehler beim Ausführen des Builds: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Read-Host "Drücke Enter zum Beenden"