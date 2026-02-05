/**
 * EmergencyDetector - Client-side emergency detection logic
 * Implements the same scoring algorithm as the server for real-time detection
 */

export class EmergencyDetector {
  constructor() {
    this.userThresholds = {
      motionSensitivity: 1.0,
      audioSensitivity: 1.0,
      contextWeight: 1.0
    };
    
    this.emergencyHistory = [];
    this.falsePositiveCount = 0;
  }

  // Main emergency scoring function
  calculateEmergencyScore(sensorData, contextData, location) {
    const breakdown = {
      sensorScore: 0,
      contextScore: 0,
      locationScore: 0,
      crowdScore: 0,
      totalScore: 0
    };

    // 1. SENSOR DATA ANALYSIS
    breakdown.sensorScore = this.analyzeSensorData(sensorData);

    // 2. CONTEXT ANALYSIS
    breakdown.contextScore = this.analyzeContextData(contextData);

    // 3. LOCATION ANALYSIS
    breakdown.locationScore = this.analyzeLocationData(location);

    // 4. CROWD VERIFICATION (placeholder for future implementation)
    breakdown.crowdScore = this.analyzeCrowdData([]);

    // 5. CALCULATE WEIGHTED TOTAL SCORE
    const weights = {
      sensor: 0.5,    // 50% - Primary indicator
      context: 0.2,   // 20% - Time/environment factors
      location: 0.2,  // 20% - Location-based risk
      crowd: 0.1      // 10% - Crowd verification boost
    };

    // Apply user-specific thresholds
    breakdown.totalScore = Math.min(100, 
      (breakdown.sensorScore * weights.sensor * this.userThresholds.motionSensitivity) +
      (breakdown.contextScore * weights.context * this.userThresholds.contextWeight) +
      (breakdown.locationScore * weights.location) +
      (breakdown.crowdScore * weights.crowd)
    );

    return breakdown;
  }

  // Analyze sensor data for emergency indicators
  analyzeSensorData(sensorData) {
    let score = 0;
    const factors = [];

    // MOTION ANALYSIS
    if (sensorData.motion) {
      const { magnitude, suddenImpact, variance, stillnessDuration } = sensorData.motion;
      
      // Sudden impact detection (falls, accidents)
      if (suddenImpact && suddenImpact.magnitude > 15) {
        const impactScore = Math.min(40, suddenImpact.magnitude * 2);
        score += impactScore;
        factors.push(`High impact: ${suddenImpact.magnitude.toFixed(1)}g`);
      }
      
      // Motion variance (irregular movement patterns)
      if (variance > 10) {
        const varianceScore = Math.min(25, variance * 2);
        score += varianceScore;
        factors.push(`Irregular motion detected`);
      }
      
      // Prolonged stillness after movement
      if (stillnessDuration > 300000) { // 5 minutes in milliseconds
        const stillnessScore = Math.min(20, stillnessDuration / 60000 * 2); // 2 points per minute
        score += stillnessScore;
        factors.push(`Prolonged stillness: ${Math.round(stillnessDuration/60000)}min`);
      }
      
      // Very high motion magnitude (violent shaking, impact)
      if (magnitude > 20) {
        score += 30;
        factors.push(`Extreme motion detected`);
      }
    }

    // AUDIO ANALYSIS
    if (sensorData.audio) {
      const { silenceDuration, breathingIrregularity, distressSound, amplitude } = sensorData.audio;
      
      // Prolonged silence (unconsciousness, isolation)
      if (silenceDuration > 600000) { // 10 minutes
        const silenceScore = Math.min(30, silenceDuration / 60000 * 2);
        score += silenceScore;
        factors.push(`Extended silence: ${Math.round(silenceDuration/60000)}min`);
      }
      
      // Breathing irregularity
      if (breathingIrregularity > 0.7) {
        score += 25;
        factors.push(`Breathing irregularity detected`);
      }
      
      // Distress sounds (screams, calls for help)
      if (distressSound && distressSound.confidence > 0.6) {
        const distressScore = distressSound.confidence * 35;
        score += distressScore;
        factors.push(`Distress sound detected (${Math.round(distressSound.confidence * 100)}%)`);
      }
      
      // Sudden amplitude changes (person collapsing)
      if (amplitude && amplitude.suddenDrop) {
        score += 15;
        factors.push(`Sudden audio change detected`);
      }
      
      // Very high amplitude (screaming, loud impact)
      if (amplitude && amplitude.current > 0.8) {
        score += 20;
        factors.push(`High amplitude sound detected`);
      }
    }

    // ACTIVITY ANALYSIS
    if (sensorData.activity) {
      const { inactivityDuration } = sensorData.activity;
      
      // Extended inactivity
      if (inactivityDuration > 1800000) { // 30 minutes
        const inactivityScore = Math.min(20, inactivityDuration / 60000 * 0.5);
        score += inactivityScore;
        factors.push(`Extended inactivity: ${Math.round(inactivityDuration/60000)}min`);
      }
    }

    return Math.min(100, score);
  }

  // Analyze contextual factors
  analyzeContextData(contextData) {
    let score = 0;
    const currentHour = new Date().getHours();
    
    // TIME-BASED RISK FACTORS
    if (currentHour >= 22 || currentHour <= 6) {
      score += 15; // Late night/early morning = higher risk
    }
    
    if (currentHour >= 2 && currentHour <= 5) {
      score += 5; // Peak danger hours
    }
    
    // ENVIRONMENTAL FACTORS
    if (contextData.environment) {
      const { noiseLevel, lightLevel, temperature } = contextData.environment;
      
      // Very quiet environment (isolation indicator)
      if (noiseLevel < 0.2) {
        score += 10;
      }
      
      // Very dark environment (vulnerability factor)
      if (lightLevel < 0.1) {
        score += 8;
      }
      
      // Extreme temperatures (environmental hazard)
      if (temperature < 5 || temperature > 35) {
        score += 5;
      }
    }
    
    // USER PATTERN DEVIATION
    if (contextData.userPatterns) {
      const { usualActivityLevel, locationDeviation, currentActivity } = contextData.userPatterns;
      
      // User in unusual location
      if (locationDeviation > 0.8) {
        score += 12;
      }
      
      // Usually active user now inactive
      if (usualActivityLevel > 0.7 && currentActivity < 0.2) {
        score += 10;
      }
    }
    
    return Math.min(100, score);
  }

  // Analyze location-based risk factors
  analyzeLocationData(location) {
    let score = 0;
    
    if (!location) return 0;
    
    // ISOLATION FACTORS
    if (location.isolation) {
      const { nearbyPeople, publicPlace, cellTowerDistance } = location.isolation;
      
      if (nearbyPeople === 0) {
        score += 15; // No people nearby
      }
      
      if (!publicPlace) {
        score += 10; // Not in public area
      }
      
      if (cellTowerDistance > 5000) {
        score += 8; // Remote area with poor cell coverage
      }
    }
    
    // SAFE ZONE PROXIMITY (reduces risk)
    if (location.safeZones) {
      const { nearestHospital, nearestPolice, nearestFireStation } = location.safeZones;
      
      const distances = [
        nearestHospital?.distance || Infinity,
        nearestPolice?.distance || Infinity,
        nearestFireStation?.distance || Infinity
      ];
      
      const minDistance = Math.min(...distances);
      
      if (minDistance < 1000) {
        score -= 10; // Near emergency services (reduces risk)
      } else if (minDistance > 10000) {
        score += 15; // Far from help
      }
    }
    
    // LOCATION TYPE RISK
    if (location.type) {
      const riskFactors = {
        'highway': 10,
        'construction': 8,
        'industrial': 6,
        'residential': 2,
        'commercial': 1,
        'hospital': -5,
        'police_station': -5
      };
      
      score += riskFactors[location.type] || 0;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  // Analyze crowd signals (future implementation)
  analyzeCrowdData(crowdSignals) {
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
  }

  // Update user-specific thresholds based on feedback
  updateThresholds(outcome, sensorSnapshot) {
    if (outcome === 'false_positive') {
      this.falsePositiveCount++;
      
      // Reduce sensitivity to prevent similar false positives
      this.userThresholds.motionSensitivity *= 0.95;
      this.userThresholds.audioSensitivity *= 0.95;
      
      // If too many false positives, reduce context weight
      if (this.falsePositiveCount > 5) {
        this.userThresholds.contextWeight *= 0.9;
      }
      
    } else if (outcome === 'missed_emergency') {
      // Increase sensitivity to catch similar emergencies
      this.userThresholds.motionSensitivity *= 1.05;
      this.userThresholds.audioSensitivity *= 1.05;
      this.userThresholds.contextWeight *= 1.02;
    }
    
    // Keep thresholds within reasonable bounds
    this.userThresholds.motionSensitivity = Math.max(0.3, Math.min(2.0, this.userThresholds.motionSensitivity));
    this.userThresholds.audioSensitivity = Math.max(0.3, Math.min(2.0, this.userThresholds.audioSensitivity));
    this.userThresholds.contextWeight = Math.max(0.5, Math.min(1.5, this.userThresholds.contextWeight));
    
    console.log('Updated thresholds:', this.userThresholds);
  }

  // Get emergency classification based on score
  classifyEmergency(score) {
    if (score >= 70) {
      return {
        level: 'emergency',
        color: 'red',
        action: 'immediate_alert',
        description: 'High confidence emergency detected'
      };
    } else if (score >= 40) {
      return {
        level: 'suspicious',
        color: 'orange',
        action: 'monitor_closely',
        description: 'Suspicious activity detected'
      };
    } else {
      return {
        level: 'safe',
        color: 'green',
        action: 'continue_monitoring',
        description: 'Normal activity'
      };
    }
  }

  // Get human-readable explanation of emergency score
  explainScore(breakdown, sensorData) {
    const explanations = [];
    
    if (breakdown.sensorScore > 20) {
      explanations.push(`Sensor anomalies detected (${Math.round(breakdown.sensorScore)}% confidence)`);
    }
    
    if (breakdown.contextScore > 10) {
      explanations.push(`High-risk context factors (${Math.round(breakdown.contextScore)}% risk)`);
    }
    
    if (breakdown.locationScore > 10) {
      explanations.push(`Location-based risk factors (${Math.round(breakdown.locationScore)}% risk)`);
    }
    
    if (breakdown.crowdScore > 0) {
      explanations.push(`Correlated signals from nearby users`);
    }
    
    // Add specific sensor details
    if (sensorData.motion?.suddenImpact) {
      explanations.push(`Sudden impact: ${sensorData.motion.suddenImpact.magnitude.toFixed(1)}g`);
    }
    
    if (sensorData.audio?.silenceDuration > 600000) {
      explanations.push(`Prolonged silence: ${Math.round(sensorData.audio.silenceDuration/60000)} minutes`);
    }
    
    if (sensorData.audio?.distressSound) {
      explanations.push(`Distress sound detected (${Math.round(sensorData.audio.distressSound.confidence * 100)}%)`);
    }
    
    return explanations.length > 0 ? explanations : ['Multiple emergency indicators detected'];
  }
}