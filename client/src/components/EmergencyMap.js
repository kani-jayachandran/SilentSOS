import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom marker icons for different emergency levels
const createCustomIcon = (color, status) => {
  const svgIcon = `
    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <path fill="${color}" stroke="#fff" stroke-width="2" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 12.5 12.5 28.5 12.5 28.5s12.5-16 12.5-28.5C25 5.6 19.4 0 12.5 0z"/>
      <circle fill="#fff" cx="12.5" cy="12.5" r="6"/>
      <text x="12.5" y="17" text-anchor="middle" font-size="10" font-weight="bold" fill="${color}">
        ${status === 'emergency' ? '!' : status === 'suspicious' ? '?' : '✓'}
      </text>
    </svg>
  `;
  
  return L.divIcon({
    html: svgIcon,
    className: 'custom-emergency-marker',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
};

// Emergency status colors
const getMarkerColor = (status, confidence) => {
  if (status === 'emergency' || confidence > 70) return '#dc2626'; // Red
  if (status === 'suspicious' || confidence > 40) return '#ea580c'; // Orange
  return '#16a34a'; // Green
};

// User location marker
const createUserLocationIcon = () => {
  const svgIcon = `
    <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <circle fill="#3b82f6" stroke="#fff" stroke-width="3" cx="10" cy="10" r="8"/>
      <circle fill="#fff" cx="10" cy="10" r="3"/>
    </svg>
  `;
  
  return L.divIcon({
    html: svgIcon,
    className: 'user-location-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

// Component to handle map centering and updates
const MapController = ({ center, emergencies, userLocation }) => {
  const map = useMap();
  const [hasInitialCenter, setHasInitialCenter] = useState(false);

  useEffect(() => {
    if (center && !hasInitialCenter) {
      map.setView(center, 13);
      setHasInitialCenter(true);
    }
  }, [center, map, hasInitialCenter]);

  // Auto-fit bounds when emergencies change
  useEffect(() => {
    if (emergencies.length > 0) {
      const bounds = L.latLngBounds();
      
      emergencies.forEach(emergency => {
        if (emergency.location) {
          bounds.extend([emergency.location.latitude, emergency.location.longitude]);
        }
      });
      
      // Include user location if available
      if (userLocation) {
        bounds.extend([userLocation.latitude, userLocation.longitude]);
      }
      
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [emergencies, userLocation, map]);

  return null;
};

// Component to handle map click events
const MapEventHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      if (onMapClick) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
};

const EmergencyMap = ({ 
  emergencies = [], 
  userLocation = null, 
  center = null, 
  height = '400px',
  onEmergencyClick = null,
  onMapClick = null,
  showUserLocation = true,
  className = ''
}) => {
  const [mapCenter, setMapCenter] = useState(center || [37.7749, -122.4194]); // Default to San Francisco
  const mapRef = useRef();

  // Update map center when user location is available
  useEffect(() => {
    if (userLocation && !center) {
      setMapCenter([userLocation.latitude, userLocation.longitude]);
    }
  }, [userLocation, center]);

  // Use provided center or user location or default
  const finalCenter = center || (userLocation ? [userLocation.latitude, userLocation.longitude] : mapCenter);

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${Math.floor(diffMins / 60)}h ago`;
  };

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <MapContainer
        ref={mapRef}
        center={finalCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        
        <MapController 
          center={finalCenter} 
          emergencies={emergencies}
          userLocation={userLocation}
        />
        
        <MapEventHandler onMapClick={onMapClick} />
        
        {/* User location marker */}
        {showUserLocation && userLocation && (
          <Marker
            position={[userLocation.latitude, userLocation.longitude]}
            icon={createUserLocationIcon()}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-blue-600 mb-2">Your Location</h3>
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Coordinates:</strong><br />
                  {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
                </p>
                {userLocation.accuracy && (
                  <p className="text-sm text-gray-600">
                    <strong>Accuracy:</strong> ±{Math.round(userLocation.accuracy)}m
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Updated: {new Date(userLocation.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Emergency markers */}
        {emergencies.map((emergency) => {
          if (!emergency.location) return null;
          
          const color = getMarkerColor(emergency.status, emergency.confidence);
          const icon = createCustomIcon(color, emergency.status);
          
          return (
            <Marker
              key={emergency.id}
              position={[emergency.location.latitude, emergency.location.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  if (onEmergencyClick) {
                    onEmergencyClick(emergency);
                  }
                }
              }}
            >
              <Popup>
                <div className="p-3 min-w-[250px]">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-red-600">
                      {emergency.status === 'emergency' ? '🚨 ACTIVE EMERGENCY' :
                       emergency.status === 'suspicious' ? '⚠️ SUSPICIOUS ACTIVITY' :
                       '✅ RESOLVED'}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      emergency.status === 'emergency' ? 'bg-red-100 text-red-800' :
                      emergency.status === 'suspicious' ? 'bg-orange-100 text-orange-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {Math.round(emergency.confidence)}%
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Time:</strong> {formatTimeAgo(emergency.timestamp)}
                    </div>
                    
                    <div>
                      <strong>Location:</strong><br />
                      {emergency.location.latitude.toFixed(6)}, {emergency.location.longitude.toFixed(6)}
                    </div>
                    
                    {emergency.breakdown && (
                      <div>
                        <strong>Detection Factors:</strong>
                        <ul className="text-xs mt-1 space-y-1">
                          <li>• Sensor: {Math.round(emergency.breakdown.sensorScore)}%</li>
                          <li>• Context: {Math.round(emergency.breakdown.contextScore)}%</li>
                          <li>• Location: {Math.round(emergency.breakdown.locationScore)}%</li>
                        </ul>
                      </div>
                    )}
                    
                    <div className="pt-2 border-t">
                      <strong>Emergency ID:</strong><br />
                      <code className="text-xs bg-gray-100 px-1 rounded">
                        {emergency.id.slice(0, 12)}...
                      </code>
                    </div>
                  </div>
                  
                  {onEmergencyClick && (
                    <button
                      onClick={() => onEmergencyClick(emergency)}
                      className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      View Details
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      {/* Map legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-[1000]">
        <h4 className="text-sm font-semibold mb-2">Emergency Levels</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Emergency (&gt;70%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span>Suspicious (40-70%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Normal (&lt;40%)</span>
          </div>
          {showUserLocation && (
            <div className="flex items-center space-x-2 pt-1 border-t">
              <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white"></div>
              <span>Your Location</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmergencyMap;