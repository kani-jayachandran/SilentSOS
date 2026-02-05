import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { SensorManager } from '../services/SensorManager';
import { EmergencyDetector } from '../services/EmergencyDetector';
import { LocationService } from '../services/LocationService';
import { apiService } from '../services/apiService';

const SensorContext = createContext();

export const useSensor = () => {
  const context = useContext(SensorContext);
  if (!context) {
    throw new Error('useSensor must be used within a SensorProvider');
  }
  return context;
};

export const SensorProvider = ({ children }) => {
  const { user } = useAuth();
  
  // Sensor data states
  const [sensorData, setSensorData] = useState({
    motion: null,
    audio: null,
    location: null,
    activity: null
  });
  
  // Monitoring states
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [permissions, setPermissions] = useState({
    motion: false,
    audio: false,
    location: false
  });
  
  // Emergency states
  const [emergencyScore, setEmergencyScore] = useState(0);
  const [emergencyStatus, setEmergencyStatus] = useState('safe'); // safe, suspicious, emergency
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [sosCountdown, setSosCountdown] = useState(null);
  
  // Services
  const [sensorManager] = useState(() => new SensorManager());
  const [emergencyDetector] = useState(() => new EmergencyDetector());
  const [locationService] = useState(() => new LocationService());

  // Initialize sensors and permissions
  useEffect(() => {
    const initializeSensors = async () => {
      try {
        // Check and request permissions
        const motionPermission = await sensorManager.requestMotionPermission();
        const audioPermission = await sensorManager.requestAudioPermission();
        const locationPermission = await locationService.requestPermission();
        
        setPermissions({
          motion: motionPermission,
          audio: audioPermission,
          location: locationPermission
        });
        
        console.log('Sensor permissions:', { motionPermission, audioPermission, locationPermission });
        
      } catch (error) {
        console.error('Sensor initialization error:', error);
      }
    };

    initializeSensors();
  }, [sensorManager, locationService]);

  // Start monitoring
  const startMonitoring = useCallback(async () => {
    if (!user) {
      console.error('User not authenticated');
      return false;
    }

    try {
      setIsMonitoring(true);
      
      // Start sensor data collection
      if (permissions.motion) {
        sensorManager.startMotionMonitoring((motionData) => {
          setSensorData(prev => ({ ...prev, motion: motionData }));
        });
      }
      
      if (permissions.audio) {
        await sensorManager.startAudioMonitoring((audioData) => {
          setSensorData(prev => ({ ...prev, audio: audioData }));
        });
      }
      
      if (permissions.location) {
        locationService.startTracking((locationData) => {
          setSensorData(prev => ({ ...prev, location: locationData }));
        });
      }
      
      console.log('Monitoring started successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      setIsMonitoring(false);
      return false;
    }
  }, [user, permissions, sensorManager, locationService]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    sensorManager.stopMotionMonitoring();
    sensorManager.stopAudioMonitoring();
    locationService.stopTracking();
    
    setSensorData({
      motion: null,
      audio: null,
      location: null,
      activity: null
    });
    
    console.log('Monitoring stopped');
  }, [sensorManager, locationService]);

  // Process sensor data for emergency detection
  useEffect(() => {
    if (!isMonitoring || !sensorData.motion || !sensorData.audio) {
      return;
    }

    const processSensorData = async () => {
      try {
        // Get context data
        const contextData = {
          timestamp: Date.now(),
          timeOfDay: new Date().getHours(),
          environment: {
            noiseLevel: sensorData.audio?.averageAmplitude || 0,
            lightLevel: 0.5, // Would need ambient light sensor
            temperature: 20 // Would need temperature sensor
          },
          userPatterns: {
            usualActivityLevel: 0.7, // Would be learned over time
            locationDeviation: 0.3,
            currentActivity: sensorData.activity?.level || 0
          }
        };

        // Calculate emergency score
        const score = emergencyDetector.calculateEmergencyScore(
          sensorData,
          contextData,
          sensorData.location
        );
        
        setEmergencyScore(score.totalScore);
        
        // Determine status
        let status = 'safe';
        if (score.totalScore > 70) {
          status = 'emergency';
        } else if (score.totalScore > 40) {
          status = 'suspicious';
        }
        
        setEmergencyStatus(status);
        
        // Trigger emergency if threshold exceeded
        if (status === 'emergency' && !activeEmergency && !sosCountdown) {
          await triggerEmergency(score, sensorData, contextData);
        }
        
      } catch (error) {
        console.error('Sensor data processing error:', error);
      }
    };

    // Process data every 2 seconds
    const interval = setInterval(processSensorData, 2000);
    return () => clearInterval(interval);
    
  }, [isMonitoring, sensorData, activeEmergency, sosCountdown, emergencyDetector]);

  // Trigger emergency with countdown
  const triggerEmergency = async (emergencyScore, sensorData, contextData) => {
    console.log('Emergency detected! Starting countdown...');
    
    // Start 5-second countdown
    setSosCountdown(5);
    
    const countdownInterval = setInterval(() => {
      setSosCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          // Send emergency alert
          sendEmergencyAlert(emergencyScore, sensorData, contextData);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Store countdown interval for potential cancellation
    window.emergencyCountdownInterval = countdownInterval;
  };

  // Cancel emergency countdown
  const cancelEmergency = useCallback(async () => {
    if (window.emergencyCountdownInterval) {
      clearInterval(window.emergencyCountdownInterval);
      window.emergencyCountdownInterval = null;
    }
    
    setSosCountdown(null);
    
    // Store cancellation data for learning
    if (user && sensorData) {
      try {
        await apiService.storeUserLearning(user.uid, {
          sensorSnapshot: sensorData,
          outcome: 'false_positive',
          timestamp: Date.now()
        });
        console.log('False positive feedback stored');
      } catch (error) {
        console.error('Failed to store learning data:', error);
      }
    }
  }, [user, sensorData]);

  // Send emergency alert
  const sendEmergencyAlert = async (emergencyScore, sensorData, contextData) => {
    if (!user) return;
    
    try {
      const response = await apiService.reportEmergency({
        sensorData,
        location: sensorData.location,
        contextData,
        timestamp: new Date().toISOString(),
        confidence: emergencyScore.totalScore
      });
      
      if (response.success) {
        setActiveEmergency({
          id: response.emergencyId,
          score: response.score,
          breakdown: response.breakdown,
          timestamp: new Date().toISOString()
        });
        
        console.log('Emergency alert sent successfully');
      }
      
    } catch (error) {
      console.error('Failed to send emergency alert:', error);
    }
  };

  // Manual emergency trigger (for testing)
  const triggerManualEmergency = useCallback(async () => {
    if (!user || !sensorData) return;
    
    const mockScore = {
      totalScore: 85,
      breakdown: {
        sensorScore: 60,
        contextScore: 15,
        locationScore: 10,
        crowdScore: 0
      }
    };
    
    const contextData = {
      timestamp: Date.now(),
      timeOfDay: new Date().getHours(),
      environment: { noiseLevel: 0.3, lightLevel: 0.5, temperature: 20 },
      userPatterns: { usualActivityLevel: 0.7, locationDeviation: 0.3, currentActivity: 0.1 }
    };
    
    await triggerEmergency(mockScore, sensorData, contextData);
  }, [user, sensorData]);

  const value = {
    // Sensor data
    sensorData,
    isMonitoring,
    permissions,
    
    // Emergency detection
    emergencyScore,
    emergencyStatus,
    activeEmergency,
    sosCountdown,
    
    // Controls
    startMonitoring,
    stopMonitoring,
    cancelEmergency,
    triggerManualEmergency,
    
    // Services (for debugging/transparency)
    sensorManager,
    emergencyDetector,
    locationService
  };

  return (
    <SensorContext.Provider value={value}>
      {children}
    </SensorContext.Provider>
  );
};