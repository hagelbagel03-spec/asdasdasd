import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';

// Web-spezifische Google Maps Integration
const GoogleMapsView = ({ incident, user, token }) => {
  const [map, setMap] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [officers, setOfficers] = useState([]);

  const API_URL = "http://212.227.57.238:8001";
  const GOOGLE_MAPS_API_KEY = "AIzaSyA8mG8Y1pcJy_-1yNOhlTZ9gpnuVBmc0cw";

  // Load Google Maps Script
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => setIsLoaded(true);
      document.head.appendChild(script);
    } else if (window.google) {
      setIsLoaded(true);
    }
  }, []);

  // Load officer positions
  const loadOfficerPositions = useCallback(async () => {
    try {
      const config = token ? {
        headers: { Authorization: `Bearer ${token}` }
      } : {};
      
      const response = await fetch(`${API_URL}/api/locations/live`, config);
      if (response.ok) {
        const locations = await response.json();
        setOfficers(locations);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Beamten-Positionen:', error);
    }
  }, [token]);

  // Initialize map when Google Maps is loaded
  useEffect(() => {
    if (isLoaded && incident && typeof window !== 'undefined') {
      initializeMap();
      loadOfficerPositions();
      
      // Update officer positions every 30 seconds
      const interval = setInterval(loadOfficerPositions, 30000);
      return () => clearInterval(interval);
    }
  }, [isLoaded, incident, loadOfficerPositions]);

  const initializeMap = () => {
    const mapElement = document.getElementById('google-map');
    if (!mapElement || !window.google) return;

    const incidentLocation = {
      lat: incident.location.lat,
      lng: incident.location.lng
    };

    const mapOptions = {
      center: incidentLocation,
      zoom: 15,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    };

    const newMap = new window.google.maps.Map(mapElement, mapOptions);
    setMap(newMap);

    // Add incident marker
    const incidentMarker = new window.google.maps.Marker({
      position: incidentLocation,
      map: newMap,
      title: incident.title,
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="#FF4444" stroke="#FFFFFF" stroke-width="3"/>
            <text x="16" y="22" text-anchor="middle" fill="white" font-size="16" font-weight="bold">!</text>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(32, 32)
      }
    });

    // Incident info window
    const incidentInfoWindow = new window.google.maps.InfoWindow({
      content: `
        <div style="padding: 10px; max-width: 250px;">
          <h3 style="margin: 0 0 8px 0; color: #FF4444;">🚨 ${incident.title}</h3>
          <p style="margin: 0 0 8px 0;"><strong>Beschreibung:</strong> ${incident.description}</p>
          <p style="margin: 0 0 8px 0;"><strong>Priorität:</strong> ${incident.priority}</p>
          <p style="margin: 0 0 8px 0;"><strong>Adresse:</strong> ${incident.address}</p>
          <p style="margin: 0; font-size: 12px; color: #666;">
            Koordinaten: ${incident.location.lat.toFixed(6)}, ${incident.location.lng.toFixed(6)}
          </p>
        </div>
      `
    });

    incidentMarker.addListener('click', () => {
      incidentInfoWindow.open(newMap, incidentMarker);
    });

    // Add officer markers
    addOfficerMarkers(newMap);
  };

  const addOfficerMarkers = (mapInstance) => {
    if (!mapInstance || !window.google) return;

    officers.forEach((officer, index) => {
      if (officer.location && officer.location.lat && officer.location.lng) {
        const officerMarker = new window.google.maps.Marker({
          position: {
            lat: officer.location.lat,
            lng: officer.location.lng
          },
          map: mapInstance,
          title: `Beamter ${index + 1}`,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
                <circle cx="14" cy="14" r="12" fill="#2196F3" stroke="#FFFFFF" stroke-width="3"/>
                <text x="14" y="19" text-anchor="middle" fill="white" font-size="12" font-weight="bold">👮</text>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(28, 28)
          }
        });

        // Calculate distance to incident
        const incidentLatLng = new window.google.maps.LatLng(incident.location.lat, incident.location.lng);
        const officerLatLng = new window.google.maps.LatLng(officer.location.lat, officer.location.lng);
        const distance = window.google.maps.geometry.spherical.computeDistanceBetween(incidentLatLng, officerLatLng);
        const distanceKm = (distance / 1000).toFixed(1);

        const officerInfoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 10px; max-width: 200px;">
              <h3 style="margin: 0 0 8px 0; color: #2196F3;">👮‍♂️ Beamter ${index + 1}</h3>
              <p style="margin: 0 0 4px 0;"><strong>Status:</strong> Im Dienst</p>
              <p style="margin: 0 0 4px 0;"><strong>Entfernung zum Vorfall:</strong> ${distanceKm} km</p>
              <p style="margin: 0; font-size: 12px; color: #666;">
                Zuletzt aktualisiert: ${new Date(officer.timestamp).toLocaleTimeString('de-DE')}
              </p>
            </div>
          `
        });

        officerMarker.addListener('click', () => {
          officerInfoWindow.open(mapInstance, officerMarker);
        });
      }
    });
  };

  // Update officer markers when positions change
  useEffect(() => {
    if (map && officers.length > 0) {
      addOfficerMarkers(map);
    }
  }, [officers, map]);

  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>🗺️ Lade Google Maps...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapHeader}>
        <Text style={styles.mapTitle}>🗺️ Live-Karte</Text>
        <Text style={styles.mapSubtitle}>
          📍 Vorfall-Position • 👮‍♂️ {officers.length} Beamte im Dienst
        </Text>
      </View>
      <div 
        id="google-map" 
        style={{ 
          width: '100%', 
          height: 300,
          borderRadius: 12,
          border: '2px solid #e0e0e0'
        }}
      />
      <View style={styles.mapLegend}>
        <Text style={styles.legendItem}>🔴 Vorfall-Position</Text>
        <Text style={styles.legendItem}>🔵 Beamten-Positionen</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  mapHeader: {
    marginBottom: 12,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  mapSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    padding: 40,
    color: '#666',
  },
  mapLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  legendItem: {
    fontSize: 12,
    color: '#666',
  },
});

export default GoogleMapsView;