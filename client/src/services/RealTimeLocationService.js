/**
 * Real-Time Location Service
 * Captures live geolocation data and writes directly to Firestore
 * NO DEMO DATA - REAL SENSORS ONLY
 */

import { db } from '../config/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

class RealTimeLocationService {
  constructor() {
    this.watchId = null;
    this.isTracking = false;
    this.currentSOSId = null;
    this.userId = null;
    this.onLocationUpdate = null;
    this.onError = null;
  }

  /**
   * Start real-time location tracking
   * @param {string} userId - Firebase user ID
   * @param {string} sosId - SOS event ID
   * @param {Function} onLocationUpdate - Callback for location updates
   * @param {Function} onError - Callback for errors
   */
  startTracking(userId, sosId, onLocationUpdate, onError) {
    if (!navigator.geolocation) {
      const error = new Error('Geolocation is not supported by this browser');
      console.error('Geolocation not supported');
      if (onError) onError(error);
      return;
    }

    this.userId = userId;
    this.currentSOSId = sosId;
    this.onLocationUpdate = onLocationUpdate;
    this.onError = onError;

    console.log('Starting real-time location tracking for user:', userId, 'SOS:', sosId);

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handleLocationUpdate(position),
      (error) => this.handleLocationError(error),
      options
    );

    this.isTracking = true;
    console.log('Location tracking started with watchId:', this.watchId);
  }

  /**
   * Handle successful location update
   * @param {GeolocationPosition} position - Browser geolocation position
   */
  async handleLocationUpdate(position) {
    const { latitude, longitude, accuracy } = position.coords;
    const timestamp = new Date(position.timestamp);

    console.log('Real location update received:', {
      latitude,
      longitude,
      accuracy,
      timestamp: timestamp.toISOString()
    });

    // Validate coordinates are real (not default/demo values)
    if (latitude === 0 && longitude === 0) {
      console.error('Invalid coordinates received (0,0) - rejecting');
      return;
    }

    if (!this.userId || !this.currentSOSId) {
      console.error('Missing userId or sosId for location update');
      return;
    }

    try {
      // Write directly to Firestore - REAL DATA ONLY
      const sosEventRef = doc(db, 'sos_events', this.currentSOSId);
      
      const locationData = {
        userId: this.userId,
        latitude,
        longitude,
        accuracy,
        severity: 'normal', // Will be updated by emergency detection
        status: 'active',
        updatedAt: serverTimestamp(),
        deviceTimestamp: timestamp.toISOString()
      };

      await setDoc(sosEventRef, locationData, { merge: true });
      
      console.log('Location data written to Firestore:', {
        collection: 'sos_events',
        document: this.currentSOSId,
        data: locationData
      });

      // Notify callback with real data
      if (this.onLocationUpdate) {
        this.onLocationUpdate({
          latitude,
          longitude,
          accuracy,
          timestamp,
          sosId: this.currentSOSId
        });
      }

    } catch (firestoreError) {
      console.error('Failed to write location to Firestore:', firestoreError);
      if (this.onError) {
        this.onError(new Error(`Firestore write failed: ${firestoreError.message}`));
      }
    }
  }

  /**
   * Handle geolocation errors
   * @param {GeolocationPositionError} error - Geolocation error
   */
  handleLocationError(error) {
    let errorMessage = 'Unknown location error';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied by user';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out';
        break;
    }

    console.error('Geolocation error:', errorMessage, error);
    
    if (this.onError) {
      this.onError(new Error(errorMessage));
    }
  }

  /**
   * Stop location tracking
   */
  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      console.log('Location tracking stopped, watchId:', this.watchId);
      this.watchId = null;
    }

    this.isTracking = false;
    this.currentSOSId = null;
    this.userId = null;
    this.onLocationUpdate = null;
    this.onError = null;
  }

  /**
   * Get current tracking status
   */
  getTrackingStatus() {
    return {
      isTracking: this.isTracking,
      watchId: this.watchId,
      sosId: this.currentSOSId,
      userId: this.userId
    };
  }

  /**
   * Update SOS event severity (called by emergency detection)
   * @param {string} severity - 'normal' | 'suspicious' | 'emergency'
   */
  async updateSeverity(severity) {
    if (!this.currentSOSId) {
      console.error('Cannot update severity: no active SOS event');
      return;
    }

    try {
      const sosEventRef = doc(db, 'sos_events', this.currentSOSId);
      await setDoc(sosEventRef, {
        severity,
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log('SOS event severity updated:', severity);
    } catch (error) {
      console.error('Failed to update SOS severity:', error);
    }
  }

  /**
   * Resolve SOS event
   */
  async resolveSOS() {
    if (!this.currentSOSId) {
      console.error('Cannot resolve SOS: no active SOS event');
      return;
    }

    try {
      const sosEventRef = doc(db, 'sos_events', this.currentSOSId);
      await setDoc(sosEventRef, {
        status: 'resolved',
        resolvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log('SOS event resolved:', this.currentSOSId);
      this.stopTracking();
    } catch (error) {
      console.error('Failed to resolve SOS event:', error);
    }
  }
}

// Export singleton instance
export const realTimeLocationService = new RealTimeLocationService();
export default realTimeLocationService;