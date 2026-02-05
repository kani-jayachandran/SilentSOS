/**
 * Real Sensor Context - ONLY REAL BROWSER API DATA
 * Removes all fake/simulated metrics and impossible calculations
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { RealSensorManager } from '../services/RealSensorManager';
import { RealLocationService } from '../services/RealLocationService';
import { realTimeLocationService } from '../services/RealTimeLocationService';
import { apiService } from '../services/apiService';

const RealSensorContext = createContext();

export const useRealSensor = () => {
  const context = useContext(RealSensorContext);
  if (!context) {
    throw new Error('useRealSensor must be used within a RealSensorProvider');
  }
  return context;
};

export const RealSensorProvider = ({ children }) => {
  const { user } = useAuth();
  
  // REAL sensor data states - NO FAKE METRICS
  const [sensorData, setSensorData] = useState({
    motion: null,
    audio: null,
    location: null
  });
  
  // Monitoring states
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [permissions, setPermissions] = useState({
    motion: false,
    audio: false,
    location: false
  });
  
  // Emergency states - simplified, no fake scoring
  const [emergencyScore, setEmergencyScore] = useState(0);
  const [emergencyStatus, setEmergencyStatus] = useState('safe');
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [sosCountdown, setSosCountdown] = useState(null);
  
  // Location tracking states
  const [locationTracking, setLocationTracking] = useState(false);
  const [currentSOSId, setCurrentSOSId] = useState(null);
  
  // REAL services - NO FAKE DATA
  const [sensorManager] = useState(() => new RealSensorManager());
  const [locationService] = useState(() => new RealLocationService());

  // Initialize REAL sensors and permissions
  useEffect(() => {
    const initializeRealSensors = async () => {
      try {
        console.log('Initializing REAL sensors...');
        
        // Check REAL permissions
        const motionPermission = await sensorManager.requestMotionPermission();
        const audioPermission = await sensorManager.requestAudioPermission();
        const locationPermission = await locationService.requestPermission();
        
        setPermissions({
          motion: motionPermission,
          audio: audioPermission,
          location: locationPermission
        });
        
        console.log('Real sensor permissions:', { motionPermission, audioPermission, locationPermission });
        
      } catch (error) {
        console.error('Real sensor initialization error:', error);
      }
    };

    initializeRealSensors();
  }, [sensorManager, locationService]);

  // Start REAL monitoring
  const startMonitoring = useCallback(async () => {
    if (!user) {
      console.error('User not authenticated');
      return false;
    }

    try {
      setIsMonitoring(true);
      console.log('Starting REAL sensor monitoring...');
      
      // Start REAL motion monitoring
      if (permissions.motion) {
        sensorManager.startMotionMonitoring((realMotionData) => {
          setSensorData(prev => ({ ...prev, motion: realMotionData }));
        });
        console.log('Real motion monitoring started');
      } else {
        console.warn('Motion permission denied - no motion data available');
      }
      
      // Start REAL audio monitoring
      if (permissions.audio) {
        try {
          await sensorManager.startAudioMonitoring((realAudioData) => {
            setSensorData(prev => ({ ...prev, audio: realAudioData }));
          });
          console.log('Real audio monitoring started');
        } catch (audioError) {
          console.error('Failed to start audio monitoring:', audioError);
        }
      } else {
        console.warn('Audio permission denied - no audio data available');
      }
      
      // Start REAL location tracking
      if (permissions.location) {
        locationService.startTracking((realLocationData) => {
          setSensorData(prev => ({ ...prev, location: realLocationData }));
        });
        
        // Start real-time location service for Firestore
        startLocationTracking();
        console.log('Real location monitoring started');
      } else {
        console.warn('Location permission denied - no location data available');
      }
      
      console.log('Real monitoring started successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to start real monitoring:', error);
      setIsMonitoring(false);
      return false;
    }
  }, [user, permissions, sensorManager, locationService]);

  // Start real-time location tracking for Firestore
  const startLocationTracking = useCallback(() => {
    if (!user) return;

    const sosId = `sos_${user.uid}_${Date.now()}`;
    setCurrentSOSId(sosId);

    realTimeLocationService.startTracking(
      user.uid,
      sosId,
      (locationData) => {
        setLocationTracking(true);
      },
      (error) => {
        console.error('Real-time location tracking error:', error);
        setLocationTracking(false);
      }
    );
  }, [user]);

  // Stop REAL monitoring
  const stopMonitoring = useCallback(() => {
    console.log('Stopping REAL sensor monitoring...');
    
    setIsMonitoring(false);
    sensorManager.stopMotionMonitoring();
    sensorManager.stopAudioMonitoring();
    locationService.stopTracking();
    
    // Stop real-time location service
    realTimeLocationService.stopTracking();
    setLocationTracking(false);
    setCurrentSOSId(null);
    
    setSensorData({
      motion: null,
      audio: null,
      location: null
    });
    
    console.log('Real monitoring stopped');
  }, [sensorManager, locationService]);

  // SIMPLIFIED emergency detection - NO FAKE SCORING
  useEffect(() => {
    if (!isMonitoring || !sensorData.motion) {
      setEmergencyScore(0);
      setEmergencyStatus('safe');
      return;
    }

    // SIMPLE REAL-DATA-BASED EMERGENCY DETECTION
    const processRealSensorData = () => {
      let score = 0;
      let status = 'safe';
      
      // Check for REAL high motion magnitude (potential fall/impact)
      if (sensorData.motion.magnitude > 20) {
        score += 40;
      }
      
      // Check for REAL high motion variance (erratic movement)
      if (sensorData.motion.variance > 10) {
        score += 30;
      }
      
      // Check for REAL prolonged inactivity (potential unconsciousness)
      if (sensorData.motion.inactivityDuration > 30000) { // 30 seconds
        score += 30;
      }
      
      // Determine status based on REAL metrics
      if (score > 70) {
        status = 'emergency';
      } else if (score > 40) {
        status = 'suspicious';
      }
      
      setEmergencyScore(score);
      setEmergencyStatus(status);
      
      // Trigger emergency if threshold exceeded
      if (status === 'emergency' && !activeEmergency && !sosCountdown) {
        triggerRealEmergency(score);
      }
    };

    // Process REAL data every 2 seconds
    const interval = setInterval(processRealSensorData, 2000);
    return () => clearInterval(interval);
    
  }, [isMonitoring, sensorData.motion, activeEmergency, sosCountdown]);

  // Update SOS severity when emergency status changes
  useEffect(() => {
    if (locationTracking && emergencyStatus) {
      const severity = emergencyStatus === 'emergency' ? 'emergency' : 
                      emergencyStatus === 'suspicious' ? 'suspicious' : 'normal';
      
      realTimeLocationService.updateSeverity(severity);
    }
  }, [emergencyStatus, locationTracking]);

  // Trigger emergency with REAL data
  const triggerRealEmergency = async (score) => {
    console.log('REAL emergency detected! Score:', score);
    
    // Start 5-second countdown
    setSosCountdown(5);
    
    const countdownInterval = setInterval(() => {
      setSosCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          sendRealEmergencyAlert(score);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    
    window.emergencyCountdownInterval = countdownInterval;
  };

  // Cancel emergency countdown
  const cancelEmergency = useCallback(async () => {
    if (window.emergencyCountdownInterval) {
      clearInterval(window.emergencyCountdownInterval);
      window.emergencyCountdownInterval = null;
    }
    
    setSosCountdown(null);
    
    // Store REAL cancellation data for learning
    if (user && sensorData) {
      try {
        await apiService.storeUserLearning(user.uid, {
          sensorSnapshot: sensorData,
          outcome: 'false_positive',
          timestamp: Date.now(),
          note: 'Real sensor data - user cancelled'
        });
        console.log('Real false positive feedback stored');
      } catch (error) {
        console.error('Failed to store learning data:', error);
      }
    }
  }, [user, sensorData]);

  // Send emergency alert with REAL data
  const sendRealEmergencyAlert = async (score) => {
    if (!user) return;
    
    try {
      const response = await apiService.reportEmergency({
        sensorData,
        location: sensorData.location,
        contextData: {
          timestamp: Date.now(),
          timeOfDay: new Date().getHours(),
          note: 'Real sensor data only'
        },
        timestamp: new Date().toISOString(),
        confidence: score
      });
      
      if (response.success) {
        setActiveEmergency({
          id: response.emergencyId,
          score: response.score,
          breakdown: response.breakdown,
          timestamp: new Date().toISOString()
        });
        
        console.log('Real emergency alert sent successfully');
      }
      
    } catch (error) {
      console.error('Failed to send real emergency alert:', error);
    }
  };

  // Get REAL sensor capabilities for transparency
  const getSensorCapabilities = useCallback(() => {
    return {
      motion: sensorManager.getSensorCapabilities().motion,
      audio: sensorManager.getSensorCapabilities().audio,
      location: locationService.getLocationCapabilities().geolocation,
      safeZones: locationService.getLocationCapabilities().safeZones
    };
  }, [sensorManager, locationService]);

  const value = {
    // REAL sensor data only
    sensorData,
    isMonitoring,
    permissions,
    
    // Simplified emergency detection
    emergencyScore,
    emergencyStatus,
    activeEmergency,
    sosCountdown,
    
    // Location tracking
    locationTracking,
    currentSOSId,
    
    // Controls
    startMonitoring,
    stopMonitoring,
    cancelEmergency,
    
    // Transparency
    getSensorCapabilities,
    
    // Services (for debugging)
    sensorManager,
    locationService
  };

  return (
    <RealSensorContext.Provider value={value}>
      {children}
    </RealSensorContext.Provider>
  );
};