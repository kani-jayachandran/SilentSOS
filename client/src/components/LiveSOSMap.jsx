/**
 * Live SOS Map Component
 * Real-time Leaflet map with Firestore integration
 * NO DEMO DATA - REAL COORDINATES ONLY
 */

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import L from 'leaflet';
import { MapPin, Clock, Target, AlertTriangle, CheckCircle } from 'lucide-react';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom marker icons for different severities
const createCustomIcon = (severity) => {
  const colors = {
    normal: '#10b981', // green
    suspicious: '#f59e0b', // yellow
    emergency: '#ef4444' // red
  };

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${colors[severity] || colors.normal};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background-color: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

// Component to handle map centering
const MapController = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center && center.lat && center.lng) {
      map.setView([center.lat, center.lng], zoom);
    }
  }, [map, center, zoom]);
  
  return null;
};

const LiveSOSMap = ({ 
  userId = null, 
  showAllEvents = false, 
  height = '400px',
  className = '' 
}) => {
  const [sosEvents, setSosEvents] = useState([]);
  const [mapCenter, setMapCenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    console.log('LiveSOSMap initializing:', { userId, showAllEvents });
    
    if (!userId && !showAllEvents) {
      setError('User ID required for user-specific map');
      setLoading(false);
      return;
    }

    // Build Firestore query - REAL DATA ONLY
    let firestoreQuery;
    
    if (showAllEvents) {
      // Admin dashboard - show all active SOS events
      // Use simple query to avoid composite index requirement
      console.log('Setting up admin query for all active SOS events');
      firestoreQuery = query(
        collection(db, 'sos_events'),
        where('status', '==', 'active')
        // Remove orderBy to avoid composite index requirement
        // We'll sort in memory instead
      );
    } else {
      // User dashboard - show only current user's SOS events
      console.log('Setting up user query for userId:', userId);
      firestoreQuery = query(
        collection(db, 'sos_events'),
        where('userId', '==', userId),
        where('status', '==', 'active')
        // Remove orderBy to avoid composite index requirement
        // We'll sort in memory instead
      );
    }

    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(
      firestoreQuery,
      (snapshot) => {
        console.log('Firestore snapshot received:', snapshot.size, 'documents');
        
        const events = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Validate real coordinates - reject demo/default data
          if (!data.latitude || !data.longitude || 
              (data.latitude === 0 && data.longitude === 0)) {
            console.warn('Skipping invalid coordinates:', data);
            return;
          }

          events.push({
            id: doc.id,
            ...data,
            updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
          });
        });

        // Sort events by updatedAt in memory (most recent first)
        events.sort((a, b) => {
          const dateA = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt);
          const dateB = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt);
          return dateB - dateA;
        });

        console.log('Valid SOS events loaded:', events.length);
        setSosEvents(events);
        setLastUpdate(new Date());

        // Set map center to most recent event if available
        if (events.length > 0) {
          const mostRecent = events[0];
          setMapCenter({
            lat: mostRecent.latitude,
            lng: mostRecent.longitude
          });
          console.log('Map center set to:', mostRecent.latitude, mostRecent.longitude);
        }

        setLoading(false);
        setError(null);
      },
      (firestoreError) => {
        console.error('Firestore subscription error:', firestoreError);
        
        // Handle specific Firestore index errors
        if (firestoreError.code === 'failed-precondition') {
          setError('Firestore index required. Please create the required index in Firebase Console.');
        } else if (firestoreError.code === 'permission-denied') {
          setError('Permission denied. Please check Firestore security rules.');
        } else if (firestoreError.code === 'unavailable') {
          setError('Firestore service unavailable. Please try again later.');
        } else {
          setError(`Failed to load SOS events: ${firestoreError.message}`);
        }
        
        setLoading(false);
      }
    );

    unsubscribeRef.current = unsubscribe;

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribeRef.current) {
        console.log('Cleaning up Firestore subscription');
        unsubscribeRef.current();
      }
    };
  }, [userId, showAllEvents]);

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleString();
  };

  // Get severity icon
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'emergency':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'suspicious':
        return <Target className="h-4 w-4 text-yellow-600" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
  };

  // Error state
  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 text-red-800">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">Map Error</span>
        </div>
        <p className="text-red-700 mt-1">{error}</p>
        <p className="text-red-600 text-sm mt-2">
          Ensure location permissions are granted and Firestore is accessible.
        </p>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-8 ${className}`} style={{ height }}>
        <div className="flex flex-col items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading real-time location data...</p>
          <p className="text-gray-500 text-sm mt-1">Connecting to Firestore</p>
        </div>
      </div>
    );
  }

  // No data state
  if (sosEvents.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-8 ${className}`} style={{ height }}>
        <div className="flex flex-col items-center justify-center h-full">
          <MapPin className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Active SOS Events</h3>
          <p className="text-gray-600 text-center">
            {showAllEvents 
              ? 'No active SOS events from any users'
              : 'No active SOS events for this user'
            }
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Map will appear when real location data is available
          </p>
        </div>
      </div>
    );
  }

  // No valid map center (shouldn't happen if we have events)
  if (!mapCenter) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 text-yellow-800">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">Invalid Location Data</span>
        </div>
        <p className="text-yellow-700 mt-1">
          SOS events found but no valid coordinates available
        </p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Map Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-gray-900">
              {showAllEvents ? 'All Active SOS Events' : 'Your Location'}
            </span>
            <span className="text-sm text-gray-500">
              ({sosEvents.length} active)
            </span>
          </div>
          
          {lastUpdate && (
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>Updated {lastUpdate.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Leaflet Map */}
      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={15}
        style={{ height, width: '100%' }}
        className="rounded-b-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController center={mapCenter} zoom={15} />
        
        {sosEvents.map((event) => (
          <React.Fragment key={event.id}>
            {/* Location Marker */}
            <Marker
              position={[event.latitude, event.longitude]}
              icon={createCustomIcon(event.severity)}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <div className="flex items-center space-x-2 mb-2">
                    {getSeverityIcon(event.severity)}
                    <span className="font-semibold capitalize">
                      {event.severity} Event
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div>
                      <strong>User ID:</strong> {event.userId}
                    </div>
                    <div>
                      <strong>Coordinates:</strong><br />
                      Lat: {event.latitude.toFixed(6)}<br />
                      Lng: {event.longitude.toFixed(6)}
                    </div>
                    <div>
                      <strong>Accuracy:</strong> ±{event.accuracy}m
                    </div>
                    <div>
                      <strong>Last Updated:</strong><br />
                      {formatTimestamp(event.updatedAt)}
                    </div>
                    <div>
                      <strong>Status:</strong> 
                      <span className={`ml-1 px-2 py-1 rounded text-xs ${
                        event.status === 'active' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {event.status}
                      </span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
            
            {/* Accuracy Circle */}
            <Circle
              center={[event.latitude, event.longitude]}
              radius={event.accuracy}
              pathOptions={{
                color: event.severity === 'emergency' ? '#ef4444' : 
                       event.severity === 'suspicious' ? '#f59e0b' : '#10b981',
                fillColor: event.severity === 'emergency' ? '#ef4444' : 
                          event.severity === 'suspicious' ? '#f59e0b' : '#10b981',
                fillOpacity: 0.1,
                weight: 2
              }}
            />
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
};

export default LiveSOSMap;