/**
 * Real Location Service - ONLY REAL BROWSER GEOLOCATION API
 * Uses OpenStreetMap Nominatim API for real safe zone detection
 */

export class RealLocationService {
  constructor() {
    this.watchId = null;
    this.currentLocation = null;
    this.locationCallback = null;
    this.isTracking = false;
    
    // Cache for safe zones to avoid repeated API calls
    this.safeZoneCache = new Map();
    this.lastSafeZoneCheck = 0;
  }

  // Request REAL geolocation permission
  async requestPermission() {
    try {
      if (!navigator.geolocation) {
        console.error('Geolocation not supported by browser');
        return false;
      }

      // Test permission by getting current position
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          maximumAge: 60000,
          enableHighAccuracy: true
        });
      });
      
      return true;
    } catch (error) {
      console.error('Location permission error:', error);
      return false;
    }
  }

  // Start REAL continuous location tracking
  startTracking(callback) {
    if (this.isTracking) return;
    
    this.locationCallback = callback;
    this.isTracking = true;
    
    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000
    };
    
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handleRealLocationUpdate(position),
      (error) => this.handleLocationError(error),
      options
    );
    
    console.log('Real location tracking started - Geolocation API');
  }

  // Stop location tracking
  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    this.isTracking = false;
    this.locationCallback = null;
    this.currentLocation = null;
    
    console.log('Location tracking stopped');
  }

  // Handle REAL location updates from browser API
  async handleRealLocationUpdate(position) {
    const { latitude, longitude, accuracy, speed, heading, altitude, altitudeAccuracy } = position.coords;
    const timestamp = position.timestamp;
    
    // Store REAL location data
    this.currentLocation = {
      latitude: parseFloat(latitude.toFixed(6)),
      longitude: parseFloat(longitude.toFixed(6)),
      accuracy: Math.round(accuracy),
      speed: speed ? parseFloat(speed.toFixed(2)) : null,
      heading: heading ? Math.round(heading) : null,
      altitude: altitude ? Math.round(altitude) : null,
      altitudeAccuracy: altitudeAccuracy ? Math.round(altitudeAccuracy) : null,
      timestamp
    };
    
    // Get REAL safe zone data using OpenStreetMap
    const safeZones = await this.findRealNearbySafeZones(latitude, longitude);
    
    const locationData = {
      ...this.currentLocation,
      safeZones,
      dataSource: 'Geolocation API',
      note: 'Real GPS coordinates from device'
    };
    
    if (this.locationCallback) {
      this.locationCallback(locationData);
    }
  }

  // Handle location errors
  handleLocationError(error) {
    console.error('Geolocation error:', error);
    
    let errorMessage = 'Unknown location error';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location access denied by user';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out';
        break;
    }
    
    if (this.locationCallback) {
      this.locationCallback({
        error: errorMessage,
        timestamp: Date.now(),
        dataSource: 'Geolocation API Error'
      });
    }
  }

  // Find REAL nearby safe zones using OpenStreetMap Overpass API
  async findRealNearbySafeZones(latitude, longitude) {
    const now = Date.now();
    
    // Check cache first (update every 5 minutes)
    const cacheKey = `${Math.round(latitude * 1000)},${Math.round(longitude * 1000)}`;
    if (this.safeZoneCache.has(cacheKey) && now - this.lastSafeZoneCheck < 300000) {
      return this.safeZoneCache.get(cacheKey);
    }
    
    try {
      const radius = 5000; // 5km search radius
      
      // REAL Overpass API query for emergency services
      const query = `
        [out:json][timeout:15];
        (
          node["amenity"="hospital"](around:${radius},${latitude},${longitude});
          node["amenity"="police"](around:${radius},${latitude},${longitude});
          node["amenity"="fire_station"](around:${radius},${latitude},${longitude});
          way["amenity"="hospital"](around:${radius},${latitude},${longitude});
          way["amenity"="police"](around:${radius},${latitude},${longitude});
          way["amenity"="fire_station"](around:${radius},${latitude},${longitude});
        );
        out center;
      `;
      
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
        headers: {
          'Content-Type': 'text/plain'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Process REAL results from OpenStreetMap
      const hospitals = [];
      const police = [];
      const fireStations = [];
      
      data.elements.forEach(element => {
        const lat = element.lat || element.center?.lat;
        const lon = element.lon || element.center?.lon;
        
        if (!lat || !lon) return;
        
        // Calculate REAL distance using Haversine formula
        const distance = this.calculateRealDistance(latitude, longitude, lat, lon);
        const facility = {
          name: element.tags?.name || 'Unnamed Facility',
          distance: Math.round(distance),
          coordinates: { 
            latitude: parseFloat(lat.toFixed(6)), 
            longitude: parseFloat(lon.toFixed(6)) 
          },
          osmId: element.id,
          tags: element.tags
        };
        
        switch (element.tags?.amenity) {
          case 'hospital':
            hospitals.push(facility);
            break;
          case 'police':
            police.push(facility);
            break;
          case 'fire_station':
            fireStations.push(facility);
            break;
        }
      });
      
      // Sort by REAL distance
      hospitals.sort((a, b) => a.distance - b.distance);
      police.sort((a, b) => a.distance - b.distance);
      fireStations.sort((a, b) => a.distance - b.distance);
      
      const safeZones = {
        nearestHospital: hospitals[0] || null,
        nearestPolice: police[0] || null,
        nearestFireStation: fireStations[0] || null,
        dataSource: 'OpenStreetMap Overpass API',
        note: 'Real emergency services from OpenStreetMap',
        lastUpdated: now
      };
      
      // Cache the REAL result
      this.safeZoneCache.set(cacheKey, safeZones);
      this.lastSafeZoneCheck = now;
      
      return safeZones;
      
    } catch (error) {
      console.error('Safe zone lookup error:', error);
      return {
        nearestHospital: null,
        nearestPolice: null,
        nearestFireStation: null,
        error: error.message,
        dataSource: 'OpenStreetMap API Error',
        note: 'Unable to fetch real emergency services data'
      };
    }
  }

  // Calculate REAL distance using Haversine formula
  calculateRealDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters (REAL constant)
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  // Get REAL current location (one-time)
  async getRealCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported by browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy, speed, heading } = position.coords;
          const safeZones = await this.findRealNearbySafeZones(latitude, longitude);
          
          resolve({
            latitude: parseFloat(latitude.toFixed(6)),
            longitude: parseFloat(longitude.toFixed(6)),
            accuracy: Math.round(accuracy),
            speed: speed ? parseFloat(speed.toFixed(2)) : null,
            heading: heading ? Math.round(heading) : null,
            timestamp: position.timestamp,
            safeZones,
            dataSource: 'Geolocation API',
            note: 'Real GPS coordinates from device'
          });
        },
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000
        }
      );
    });
  }

  // Get status with REAL capabilities
  getStatus() {
    return {
      tracking: this.isTracking,
      supported: !!navigator.geolocation,
      currentLocation: this.currentLocation,
      api: 'Geolocation API',
      safeZoneApi: 'OpenStreetMap Overpass API'
    };
  }

  // Get REAL location capabilities (for transparency)
  getLocationCapabilities() {
    return {
      geolocation: {
        available: !!navigator.geolocation,
        requiresPermission: true,
        metrics: ['latitude', 'longitude', 'accuracy', 'speed', 'heading'],
        updateRate: 'Continuous (watchPosition)',
        note: 'Real GPS coordinates from device hardware'
      },
      safeZones: {
        available: true,
        api: 'OpenStreetMap Overpass API',
        metrics: ['nearestHospital', 'nearestPolice', 'nearestFireStation'],
        updateRate: 'Every 5 minutes (cached)',
        note: 'Real emergency services from OpenStreetMap database'
      }
    };
  }
}