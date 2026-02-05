/**
 * LocationService - Real-time location tracking and safe zone detection
 */

export class LocationService {
  constructor() {
    this.watchId = null;
    this.currentLocation = null;
    this.locationCallback = null;
    this.isTracking = false;
    
    // Cache for safe zones to avoid repeated API calls
    this.safeZoneCache = new Map();
    this.lastSafeZoneCheck = 0;
  }

  // Request geolocation permission
  async requestPermission() {
    try {
      if (!navigator.geolocation) {
        console.error('Geolocation not supported');
        return false;
      }

      // Test permission by getting current position
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          maximumAge: 60000
        });
      });
      
      return true;
    } catch (error) {
      console.error('Location permission error:', error);
      return false;
    }
  }

  // Start continuous location tracking
  startTracking(callback) {
    if (this.isTracking) return;
    
    this.locationCallback = callback;
    this.isTracking = true;
    
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000 // 30 seconds
    };
    
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handleLocationUpdate(position),
      (error) => this.handleLocationError(error),
      options
    );
    
    console.log('Location tracking started');
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

  // Handle location updates
  async handleLocationUpdate(position) {
    const { latitude, longitude, accuracy, speed, heading } = position.coords;
    const timestamp = position.timestamp;
    
    this.currentLocation = {
      latitude,
      longitude,
      accuracy,
      speed: speed || 0,
      heading: heading || 0,
      timestamp
    };
    
    // Analyze location context
    const locationContext = await this.analyzeLocationContext(latitude, longitude);
    
    const locationData = {
      ...this.currentLocation,
      ...locationContext
    };
    
    if (this.locationCallback) {
      this.locationCallback(locationData);
    }
  }

  // Handle location errors
  handleLocationError(error) {
    console.error('Location error:', error);
    
    let errorMessage = 'Unknown location error';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location access denied';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location unavailable';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timeout';
        break;
    }
    
    if (this.locationCallback) {
      this.locationCallback({
        error: errorMessage,
        timestamp: Date.now()
      });
    }
  }

  // Analyze location context for emergency detection
  async analyzeLocationContext(latitude, longitude) {
    const now = Date.now();
    
    // Check cache first (update every 5 minutes)
    const cacheKey = `${Math.round(latitude * 1000)},${Math.round(longitude * 1000)}`;
    if (this.safeZoneCache.has(cacheKey) && now - this.lastSafeZoneCheck < 300000) {
      return this.safeZoneCache.get(cacheKey);
    }
    
    try {
      // Find nearby safe zones (hospitals, police, fire stations)
      const safeZones = await this.findNearbySafeZones(latitude, longitude);
      
      // Determine isolation factors
      const isolation = await this.analyzeIsolation(latitude, longitude);
      
      // Determine location type
      const locationType = await this.determineLocationType(latitude, longitude);
      
      const context = {
        safeZones,
        isolation,
        type: locationType,
        coordinates: { latitude, longitude }
      };
      
      // Cache the result
      this.safeZoneCache.set(cacheKey, context);
      this.lastSafeZoneCheck = now;
      
      return context;
      
    } catch (error) {
      console.error('Location context analysis error:', error);
      return {
        safeZones: {},
        isolation: {},
        type: 'unknown',
        coordinates: { latitude, longitude }
      };
    }
  }

  // Find nearby emergency services using Overpass API (OpenStreetMap)
  async findNearbySafeZones(latitude, longitude) {
    try {
      const radius = 10000; // 10km search radius
      
      // Overpass API query for emergency services
      const query = `
        [out:json][timeout:25];
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
        throw new Error('Overpass API request failed');
      }
      
      const data = await response.json();
      
      // Process results
      const hospitals = [];
      const police = [];
      const fireStations = [];
      
      data.elements.forEach(element => {
        const lat = element.lat || element.center?.lat;
        const lon = element.lon || element.center?.lon;
        
        if (!lat || !lon) return;
        
        const distance = this.calculateDistance(latitude, longitude, lat, lon);
        const facility = {
          name: element.tags?.name || 'Unknown',
          distance: Math.round(distance),
          coordinates: { latitude: lat, longitude: lon }
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
      
      // Sort by distance and take closest
      hospitals.sort((a, b) => a.distance - b.distance);
      police.sort((a, b) => a.distance - b.distance);
      fireStations.sort((a, b) => a.distance - b.distance);
      
      return {
        nearestHospital: hospitals[0] || null,
        nearestPolice: police[0] || null,
        nearestFireStation: fireStations[0] || null,
        allHospitals: hospitals.slice(0, 3),
        allPolice: police.slice(0, 3),
        allFireStations: fireStations.slice(0, 3)
      };
      
    } catch (error) {
      console.error('Safe zone lookup error:', error);
      return {
        nearestHospital: null,
        nearestPolice: null,
        nearestFireStation: null,
        allHospitals: [],
        allPolice: [],
        allFireStations: []
      };
    }
  }

  // Analyze isolation factors
  async analyzeIsolation(latitude, longitude) {
    try {
      // This is a simplified implementation
      // In a real app, you'd use more sophisticated APIs
      
      // Check population density (rough estimate based on location)
      const populationDensity = await this.estimatePopulationDensity(latitude, longitude);
      
      return {
        nearbyPeople: populationDensity > 100 ? Math.floor(populationDensity / 100) : 0,
        publicPlace: populationDensity > 50,
        cellTowerDistance: this.estimateCellTowerDistance(latitude, longitude),
        populationDensity
      };
      
    } catch (error) {
      console.error('Isolation analysis error:', error);
      return {
        nearbyPeople: 0,
        publicPlace: false,
        cellTowerDistance: 5000,
        populationDensity: 0
      };
    }
  }

  // Estimate population density (simplified)
  async estimatePopulationDensity(latitude, longitude) {
    // This is a very rough estimation
    // In production, you'd use proper demographic APIs
    
    // Urban areas typically have higher population density
    // This is just a placeholder implementation
    
    // Check if in major city (rough coordinates)
    const majorCities = [
      { name: 'New York', lat: 40.7128, lon: -74.0060, density: 1000 },
      { name: 'Los Angeles', lat: 34.0522, lon: -118.2437, density: 800 },
      { name: 'Chicago', lat: 41.8781, lon: -87.6298, density: 700 },
      // Add more cities as needed
    ];
    
    for (const city of majorCities) {
      const distance = this.calculateDistance(latitude, longitude, city.lat, city.lon);
      if (distance < 50000) { // Within 50km of city center
        return Math.max(0, city.density - (distance / 1000) * 10);
      }
    }
    
    // Default rural/suburban estimate
    return 20;
  }

  // Estimate cell tower distance (simplified)
  estimateCellTowerDistance(latitude, longitude) {
    // This is a rough estimation
    // Urban areas have closer cell towers
    const populationDensity = 50; // Placeholder
    
    if (populationDensity > 500) return 500;   // Urban
    if (populationDensity > 100) return 2000;  // Suburban
    return 8000; // Rural
  }

  // Determine location type
  async determineLocationType(latitude, longitude) {
    try {
      // Use reverse geocoding to determine location type
      // This is a simplified implementation
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }
      
      const data = await response.json();
      
      // Determine type based on address components
      if (data.address) {
        if (data.address.hospital) return 'hospital';
        if (data.address.police) return 'police_station';
        if (data.address.amenity === 'hospital') return 'hospital';
        if (data.address.amenity === 'police') return 'police_station';
        if (data.address.highway) return 'highway';
        if (data.address.industrial) return 'industrial';
        if (data.address.construction) return 'construction';
        if (data.address.shop || data.address.commercial) return 'commercial';
        if (data.address.house_number) return 'residential';
      }
      
      return 'unknown';
      
    } catch (error) {
      console.error('Location type determination error:', error);
      return 'unknown';
    }
  }

  // Calculate distance between two coordinates (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
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

  // Get current location (one-time)
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const context = await this.analyzeLocationContext(latitude, longitude);
          
          resolve({
            latitude,
            longitude,
            accuracy,
            timestamp: position.timestamp,
            ...context
          });
        },
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }

  // Check if location indicates emergency services nearby
  isNearEmergencyServices(location) {
    if (!location.safeZones) return false;
    
    const { nearestHospital, nearestPolice, nearestFireStation } = location.safeZones;
    
    const minDistance = Math.min(
      nearestHospital?.distance || Infinity,
      nearestPolice?.distance || Infinity,
      nearestFireStation?.distance || Infinity
    );
    
    return minDistance < 1000; // Within 1km
  }

  // Get status
  getStatus() {
    return {
      tracking: this.isTracking,
      supported: !!navigator.geolocation,
      currentLocation: this.currentLocation
    };
  }
}