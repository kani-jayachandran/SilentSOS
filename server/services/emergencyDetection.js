/**
 * Context-Aware Emergency Detection Engine
 * Calculates emergency confidence using sensor data and contextual factors
 */

const calculateEmergencyScore = (sensorData, contextData, location) => {
  const breakdown = {
    sensorScore: 0,
    contextScore: 0,
    locationScore: 0,
    crowdScore: 0,
    totalScore: 0
  };

  // 1. SENSOR DATA ANALYSIS
  const sensorScore = analyzeSensorData(sensorData);
  breakdown.sensorScore = sensorScore;

  // 2. CONTEXT ANALYSIS (Time, Environment)
  const contextScore = analyzeContextData(contextData);
  breakdown.contextScore = contextScore;

  // 3. LOCATION ANALYSIS (Isolation, Safe Zones)
  const locationScore = analyzeLocationData(location);
  breakdown.locationScore = locationScore;

  // 4. CROWD VERIFICATION (if available)
  const crowdScore = analyzeCrowdData(contextData.crowdSignals || []);
  breakdown.crowdScore = crowdScore;

  // 5. CALCULATE WEIGHTED TOTAL SCORE
  const weights = {
    sensor: 0.5,    // 50% - Primary indicator
    context: 0.2,   // 20% - Time/environment factors
    location: 0.2,  // 20% - Location-based risk
    crowd: 0.1      // 10% - Crowd verification boost
  };

  breakdown.totalScore = Math.min(100, 
    (sensorScore * weights.sensor) +
    (contextScore * weights.context) +
    (locationScore * weights.location) +
    (crowdScore * weights.crowd)
  );

  return breakdown;
};

const analyzeSensorData = (sensorData) => {
  let score = 0;
  const factors = [];

  // Motion Analysis
  if (sensorData.motion) {
    const { acceleration, rotationRate, suddenImpact } = sensorData.motion;
    
    // Sudden impact detection
    if (suddenImpact && suddenImpact.magnitude > 15) {
      score += 40;
      factors.push(`High impact detected: ${suddenImpact.magnitude.toFixed(1)}g`);
    }
    
    // Fall pattern detection
    if (acceleration && acceleration.variance > 10) {
      score += 25;
      factors.push(`Irregular motion pattern detected`);
    }
    
    // Prolonged stillness after movement
    if (sensorData.motion.stillnessDuration > 300) { // 5 minutes
      score += 20;
      factors.push(`Prolonged stillness: ${Math.round(sensorData.motion.stillnessDuration/60)}min`);
    }
  }

  // Audio Analysis
  if (sensorData.audio) {
    const { silenceDuration, breathingIrregularity, distressSound, amplitude } = sensorData.audio;
    
    // Prolonged silence
    if (silenceDuration > 600) { // 10 minutes
      score += 30;
      factors.push(`Extended silence: ${Math.round(silenceDuration/60)}min`);
    }
    
    // Breathing irregularity
    if (breathingIrregularity > 0.7) {
      score += 25;
      factors.push(`Breathing irregularity detected`);
    }
    
    // Distress sounds
    if (distressSound && distressSound.confidence > 0.6) {
      score += 35;
      factors.push(`Distress sound detected`);
    }
    
    // Sudden amplitude changes
    if (amplitude && amplitude.suddenDrop) {
      score += 15;
      factors.push(`Sudden audio change`);
    }
  }

  // Activity Analysis
  if (sensorData.activity) {
    const { inactivityDuration, lastMovement } = sensorData.activity;
    
    if (inactivityDuration > 1800) { // 30 minutes
      score += 20;
      factors.push(`Extended inactivity: ${Math.round(inactivityDuration/60)}min`);
    }
  }

  return Math.min(100, score);
};

const analyzeContextData = (contextData) => {
  let score = 0;
  const currentHour = new Date().getHours();
  
  // Time-based risk factors
  if (currentHour >= 22 || currentHour <= 6) {
    score += 15; // Late night/early morning higher risk
  }
  
  // Environmental factors
  if (contextData.environment) {
    const { noiseLevel, lightLevel, temperature } = contextData.environment;
    
    // Very quiet environment (isolation indicator)
    if (noiseLevel < 0.2) {
      score += 10;
    }
    
    // Very dark environment
    if (lightLevel < 0.1) {
      score += 8;
    }
    
    // Extreme temperatures
    if (temperature < 5 || temperature > 35) {
      score += 5;
    }
  }
  
  // User pattern deviation
  if (contextData.userPatterns) {
    const { usualActivityLevel, locationDeviation } = contextData.userPatterns;
    
    if (locationDeviation > 0.8) {
      score += 12; // User in unusual location
    }
    
    if (usualActivityLevel > 0.7 && contextData.currentActivity < 0.2) {
      score += 10; // Usually active user now inactive
    }
  }
  
  return Math.min(100, score);
};

const analyzeLocationData = (location) => {
  let score = 0;
  
  if (!location) return 0;
  
  // Isolation factors
  if (location.isolation) {
    const { nearbyPeople, publicPlace, cellTowerDistance } = location.isolation;
    
    if (nearbyPeople === 0) {
      score += 15; // No people nearby
    }
    
    if (!publicPlace) {
      score += 10; // Not in public area
    }
    
    if (cellTowerDistance > 5000) {
      score += 8; // Remote area
    }
  }
  
  // Safe zone proximity (reduces risk)
  if (location.safeZones) {
    const { nearestHospital, nearestPolice, nearestFireStation } = location.safeZones;
    
    const minDistance = Math.min(
      nearestHospital?.distance || Infinity,
      nearestPolice?.distance || Infinity,
      nearestFireStation?.distance || Infinity
    );
    
    if (minDistance < 1000) {
      score -= 10; // Near emergency services
    } else if (minDistance > 10000) {
      score += 15; // Far from help
    }
  }
  
  return Math.max(0, Math.min(100, score));
};

const analyzeCrowdData = (crowdSignals) => {
  let score = 0;
  
  if (!crowdSignals || crowdSignals.length === 0) {
    return 0;
  }
  
  // Check for correlated emergency signals from nearby users
  const nearbyEmergencies = crowdSignals.filter(signal => 
    signal.distance < 500 && // Within 500m
    signal.emergencyScore > 60 && // High emergency score
    signal.timestamp > Date.now() - 300000 // Within last 5 minutes
  );
  
  if (nearbyEmergencies.length > 0) {
    score += 20; // Boost confidence if others nearby also detecting emergency
  }
  
  // Check for mass incident indicators
  if (nearbyEmergencies.length >= 3) {
    score += 30; // Possible mass casualty event
  }
  
  return Math.min(100, score);
};

// Adaptive learning function
const updateUserThresholds = async (userId, sensorSnapshot, outcome) => {
  // This would update user-specific thresholds based on false positive feedback
  // Implementation would involve machine learning model updates
  console.log(`Updating thresholds for user ${userId} based on ${outcome}`);
};

module.exports = {
  calculateEmergencyScore,
  analyzeSensorData,
  analyzeContextData,
  analyzeLocationData,
  analyzeCrowdData,
  updateUserThresholds
};