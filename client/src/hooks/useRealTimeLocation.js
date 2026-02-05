import { useState, useEffect, useCallback } from 'react';

/**
 * Real-time location tracking hook using Geolocation API
 * Provides continuous location updates for map visualization
 */
export const useRealTimeLocation = (options = {}) => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [watchId, setWatchId] = useState(null);

  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 30000, // 30 seconds
    trackContinuously: true,
    ...options
  };

  const handleLocationUpdate = useCallback((position) => {
    const locationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp
    };
    
    setLocation(locationData);
    setError(null);
    setLoading(false);
  }, []);

  const handleLocationError = useCallback((error) => {
    let errorMessage = 'Unknown location error';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location access denied by user';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timeout';
        break;
      default:
        errorMessage = error.message || 'Unknown location error';
    }
    
    setError(errorMessage);
    setLoading(false);
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    if (defaultOptions.trackContinuously) {
      // Continuous tracking
      const id = navigator.geolocation.watchPosition(
        handleLocationUpdate,
        handleLocationError,
        {
          enableHighAccuracy: defaultOptions.enableHighAccuracy,
          timeout: defaultOptions.timeout,
          maximumAge: defaultOptions.maximumAge
        }
      );
      setWatchId(id);
    } else {
      // One-time location
      navigator.geolocation.getCurrentPosition(
        handleLocationUpdate,
        handleLocationError,
        {
          enableHighAccuracy: defaultOptions.enableHighAccuracy,
          timeout: defaultOptions.timeout,
          maximumAge: defaultOptions.maximumAge
        }
      );
    }
  }, [defaultOptions, handleLocationUpdate, handleLocationError]);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);

  const refreshLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      handleLocationUpdate,
      handleLocationError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0 // Force fresh location
      }
    );
  }, [handleLocationUpdate, handleLocationError]);

  // Start tracking on mount
  useEffect(() => {
    startTracking();
    
    // Cleanup on unmount
    return () => {
      stopTracking();
    };
  }, [startTracking, stopTracking]);

  // Check if location is recent (within last 2 minutes)
  const isLocationFresh = location && (Date.now() - location.timestamp < 120000);

  return {
    location,
    error,
    loading,
    isLocationFresh,
    startTracking,
    stopTracking,
    refreshLocation,
    isTracking: watchId !== null
  };
};