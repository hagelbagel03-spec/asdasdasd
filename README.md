# 🚔 Stadtwache Schwelm - Mobile App

Eine professionelle mobile Anwendung für Sicherheitsbehörden und Polizeikräfte.

## 📱 Features

- **Vorfallmeldung**: Schnelle Erfassung und Verwaltung von Sicherheitsvorfällen
- **Team-Übersicht**: Echtzeit-Status aller Beamten und Teammitglieder
- **Nachrichten-System**: Sichere Kommunikation zwischen Einsatzkräften
- **Berichte & Archiv**: Digitale Berichtserstellung und Archivierung
- **Echtzeit-Updates**: Live-Synchronisation über Socket.IO
- **Mobile-First**: Optimiert für Smartphones und Tablets

## 🏗️ APK Build mit EAS

### Voraussetzungen
```bash
# EAS CLI installieren
npm install -g @expo/eas-cli

# Expo Account anmelden
eas login
```

### APK erstellen
```bash
# Einfacher Build
./build-apk.sh

# Oder manuell:
cd frontend
eas build --platform android --profile preview
```

## 🔧 Server-Konfiguration

### Backend-Server (212.227.57.238:8001)
```bash
# Backend starten
cd backend
pip install -r requirements.txt
python init_users.py  # Erstellt Standard-Benutzer
python server.py
```

### Standard-Anmeldedaten

#### 👮‍♂️ Standard-Beamte
- **E-Mail**: `beamter@stadtwache.de`
- **Passwort**: `stadtwache2024`

#### 🛡️ Administrator
- **E-Mail**: `admin@stadtwache.de`
- **Passwort**: `admin2024`

## 📊 Technische Details

### Frontend
- **Framework**: Expo Router (React Native)
- **Navigation**: File-based routing
- **State Management**: Zustand + React Context
- **UI Components**: Native Components mit Material Design
- **Real-time**: Socket.IO Client

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: JWT Tokens
- **Real-time**: Socket.IO Server
- **API**: RESTful + WebSocket

### Architektur
```
Mobile App (Expo)
       ↕ HTTP/WebSocket
Backend API (FastAPI)
       ↕
MongoDB Database
```

## 🚀 Deployment

### 1. Server Setup
```bash
# MongoDB starten
sudo systemctl start mongodb

# Backend starten
cd backend
python server.py

# Standard-Benutzer erstellen
python init_users.py
```

### 2. Mobile App Build
```bash
# APK für Android
eas build --platform android --profile preview

# AAB für Play Store
eas build --platform android --profile production
```

## 📋 Benutzerrollen

### 🛡️ Admin
- Vollzugriff auf alle Features
- Benutzerverwaltung
- System-Konfiguration
- Alle Berichte einsehen

### 👮‍♂️ Police/Beamte
- Vorfälle melden und bearbeiten
- Team-Status einsehen
- Nachrichten senden/empfangen
- Eigene Berichte erstellen

## 🔒 Sicherheit

- **JWT Authentication**: Sichere Token-basierte Anmeldung
- **Passwort Hashing**: BCrypt für alle Passwörter
- **HTTPS**: Verschlüsselte Datenübertragung
- **Role-based Access**: Zugriffskontrollen nach Benutzerrolle

## 📱 Mobile Features

- **Offline-Modus**: Grundfunktionen ohne Internet
- **Push-Notifications**: Sofortige Benachrichtigungen
- **Geolocation**: GPS-basierte Standorterfassung
- **Camera Integration**: Foto-Upload bei Vorfällen
- **Touch-optimiert**: Smartphone-freundliche Bedienung

## 🔧 Konfiguration

### Environment Variables (Backend)
```bash
MONGO_URL=mongodb://localhost:27017
DB_NAME=stadtwache_db
SECRET_KEY=your-secret-key
```

### Environment Variables (Frontend)
```bash
EXPO_PUBLIC_BACKEND_URL=http://212.227.57.238:8001
```

## 📞 Support

**Server**: 212.227.57.238:8001  
**Organisation**: Stadtwache Schwelm  
**Status**: Produktionsbereit ✅

## 🔄 Updates

Die App unterstützt automatische Updates über Expo Updates. Neue Versionen werden automatisch an alle Geräte verteilt.

---

**© 2024 Stadtwache Schwelm - Professionelle Sicherheitslösung**
