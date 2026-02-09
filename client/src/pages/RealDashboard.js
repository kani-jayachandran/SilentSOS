/**
 * Real Dashboard - DISPLAYS ONLY REAL SENSOR DATA
 * Removes all fake metrics and impossible calculations
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, CheckCircle, XCircle, Play, Square, Shield, Info, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRealSensor } from '../contexts/RealSensorContext';
import LiveSOSMap from '../components/LiveSOSMap';

const RealDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    sensorData,
    isMonitoring,
    permissions,
    emergencyScore,
    emergencyStatus,
    sosCountdown,
    locationTracking,
    currentSOSId,
    startMonitoring,
    stopMonitoring,
    cancelEmergency,
    getSensorCapabilities
  } = useRealSensor();

  const [showPermissionHelp, setShowPermissionHelp] = useState(false);
  const [showTransparencyInfo, setShowTransparencyInfo] = useState(false);
  const [sendingManualAlert, setSendingManualAlert] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleToggleMonitoring = async () => {
    if (isMonitoring) {
      stopMonitoring();
    } else {
      const success = await startMonitoring();
      if (!success) {
        setShowPermissionHelp(true);
      }
    }
  };

  const sendManualAlert = async () => {
    if (!user || sendingManualAlert) return;
    
    try {
      setSendingManualAlert(true);
      
      console.log('=== MANUAL ALERT DEBUG START ===');
      console.log('User:', user?.uid, user?.email);
      console.log('Current sensor data:', sensorData);
      
      // Import apiService dynamically to avoid circular dependencies
      const { apiService } = await import('../services/apiService');
      
      // Create proper data structure for emergency detection service
      const emergencyData = {
        sensorData: {
          motion: sensorData.motion || {
            acceleration: { x: 0, y: 0, z: 0 },
            rotationRate: { alpha: 0, beta: 0, gamma: 0 },
            magnitude: 0,
            variance: 0,
            inactivityDuration: 0,
            suddenImpact: null,
            stillnessDuration: 0
          },
          audio: sensorData.audio || {
            silenceDuration: 0,
            breathingIrregularity: 0,
            distressSound: null,
            amplitude: { averageAmplitude: 0, suddenDrop: false },
            rmsAmplitude: 0
          },
          activity: {
            inactivityDuration: 0,
            lastMovement: Date.now(),
            level: 0
          }
        },
        location: sensorData.location || {
          latitude: null,
          longitude: null,
          accuracy: null,
          safeZones: null,
          isolation: null
        },
        contextData: {
          timestamp: Date.now(),
          timeOfDay: new Date().getHours(),
          environment: {
            noiseLevel: 0.5,
            lightLevel: 0.5,
            temperature: 20
          },
          userPatterns: {
            usualActivityLevel: 0.7,
            locationDeviation: 0.3,
            currentActivity: 0
          },
          crowdSignals: [],
          note: 'Manual emergency alert triggered by user from dashboard'
        },
        timestamp: new Date().toISOString(),
        confidence: 100,
        manual: true
      };
      
      console.log('Emergency data to send:', JSON.stringify(emergencyData, null, 2));
      console.log('API Base URL:', apiService.baseURL);
      
      const response = await apiService.reportEmergency(emergencyData);
      
      console.log('API Response:', response);
      console.log('=== MANUAL ALERT DEBUG END ===');
      
      if (response && response.success) {
        alert('✅ Manual emergency alert sent successfully!\n\nEmergency contacts have been notified with your current location.');
      } else {
        // Show backend error details if available
        const errorMsg = response?.details || response?.error || 'Unknown error';
        const hint = response?.hint || '';
        alert(`❌ Failed to send manual alert.\n\nError: ${errorMsg}\n${hint ? '\nHint: ' + hint : ''}\n\nCheck browser console for details.`);
      }
      
    } catch (error) {
      console.error('=== MANUAL ALERT ERROR ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Full error:', error);
      
      // More specific error messages
      if (error.message.includes('Backend server unavailable')) {
        alert('🔌 Server Connection Failed\n\nThe backend server is not responding. Please ensure:\n1. Server is running on http://localhost:5000\n2. Check your network connection\n3. Try refreshing the page');
      } else if (error.message.includes('Authentication')) {
        alert('🔐 Authentication Error\n\nYour session may have expired. Please:\n1. Sign out\n2. Sign in again\n3. Try sending the alert again');
      } else if (error.message.includes('Failed to fetch')) {
        alert('🌐 Network Error\n\nCannot connect to the server. Please:\n1. Check your internet connection\n2. Verify the server is running\n3. Check browser console for details');
      } else {
        alert(`❌ Error Sending Manual Alert\n\n${error.message}\n\nCheck browser console for details.`);
      }
    } finally {
      setSendingManualAlert(false);
    }
  };

  const getStatusColor = () => {
    switch (emergencyStatus) {
      case 'emergency': return 'bg-red-500';
      case 'suspicious': return 'bg-orange-500';
      case 'safe': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (emergencyStatus) {
      case 'emergency': return 'EMERGENCY DETECTED';
      case 'suspicious': return 'Suspicious Activity';
      case 'safe': return 'All Clear';
      default: return 'Not Monitoring';
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Real Sensor Dashboard</h1>
              <p className="text-gray-600">Live monitoring using only real device sensors</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Manual Alert Button */}
              <button
                onClick={sendManualAlert}
                disabled={sendingManualAlert || !user}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  sendingManualAlert 
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                <Send className="h-4 w-4" />
                <span>{sendingManualAlert ? 'Sending...' : 'Manual Alert'}</span>
              </button>
              
              <button
                onClick={() => setShowTransparencyInfo(!showTransparencyInfo)}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                <Info className="h-4 w-4" />
                <span>Sensor Info</span>
              </button>
            </div>
          </div>
        </div>

        {/* Transparency Info */}
        {showTransparencyInfo && (
          <div className="card mb-6 bg-blue-50 border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">🔍 Sensor Transparency</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-blue-800 mb-2">Motion Sensor</h4>
                <p className="text-blue-700">
                  <strong>API:</strong> DeviceMotionEvent<br />
                  <strong>Data:</strong> Real accelerometer<br />
                  <strong>Update:</strong> 250ms intervals<br />
                  <strong>Note:</strong> Derived from real device sensors
                </p>
              </div>
              <div>
                <h4 className="font-medium text-blue-800 mb-2">Audio Sensor</h4>
                <p className="text-blue-700">
                  <strong>API:</strong> Web Audio API<br />
                  <strong>Data:</strong> Real microphone RMS<br />
                  <strong>Update:</strong> 250ms intervals<br />
                  <strong>Note:</strong> Browser-limited inference
                </p>
              </div>
              <div>
                <h4 className="font-medium text-blue-800 mb-2">Location</h4>
                <p className="text-blue-700">
                  <strong>API:</strong> Geolocation API<br />
                  <strong>Data:</strong> Real GPS coordinates<br />
                  <strong>Update:</strong> Continuous tracking<br />
                  <strong>Note:</strong> Real device GPS hardware
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SOS Countdown Alert */}
        {sosCountdown !== null && (
          <div className="mb-6 bg-red-600 text-white rounded-lg p-6 shadow-lg emergency-pulse">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">🚨 REAL EMERGENCY DETECTED</h2>
                <p className="text-lg">
                  Sending alert in <span className="text-3xl font-bold">{sosCountdown}</span> seconds...
                </p>
                <p className="text-sm mt-2 opacity-90">
                  Based on real sensor data - Cancel if false alarm
                </p>
              </div>
              <button
                onClick={cancelEmergency}
                className="bg-white text-red-600 hover:bg-gray-100 px-6 py-3 rounded-lg font-semibold text-lg transition-colors"
              >
                CANCEL
              </button>
            </div>
          </div>
        )}

        {/* Main Status Card */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className={`${getStatusColor()} rounded-full p-4`}>
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{getStatusText()}</h2>
                <p className="text-gray-600">
                  {isMonitoring ? 'Real-time sensor monitoring active' : 'Monitoring paused'}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleToggleMonitoring}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                isMonitoring
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isMonitoring ? (
                <>
                  <Square className="h-5 w-5" />
                  <span>Stop Monitoring</span>
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  <span>Start Monitoring</span>
                </>
              )}
            </button>
          </div>

          {/* Emergency Score - Simplified */}
          {isMonitoring && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Emergency Risk Level</span>
                <span className="text-sm font-bold text-gray-900">{Math.round(emergencyScore)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className={`h-4 rounded-full transition-all duration-500 ${
                    emergencyScore > 70 ? 'bg-red-500' :
                    emergencyScore > 40 ? 'bg-orange-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, emergencyScore)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Based on real motion sensor data only</p>
            </div>
          )}
        </div>

        {/* Permissions Status */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Motion Sensor</h3>
                <p className="text-xs text-gray-500">DeviceMotionEvent API</p>
              </div>
              {permissions.motion ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <XCircle className="h-6 w-6 text-red-500" />
              )}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Audio Sensor</h3>
                <p className="text-xs text-gray-500">Web Audio API</p>
              </div>
              {permissions.audio ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <XCircle className="h-6 w-6 text-red-500" />
              )}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Location</h3>
                <p className="text-xs text-gray-500">Geolocation API</p>
              </div>
              {permissions.location ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <XCircle className="h-6 w-6 text-red-500" />
              )}
            </div>
          </div>
        </div>

        {/* Permission Help */}
        {showPermissionHelp && (
          <div className="card mb-6 bg-yellow-50 border-yellow-200">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">Real Sensor Permissions Required</h3>
                <p className="text-yellow-800 mb-4">
                  SilentSOS needs access to your device's real sensors. Please grant permissions:
                </p>
                <ul className="list-disc list-inside space-y-1 text-yellow-800 text-sm">
                  {!permissions.motion && <li>Motion & Orientation (real accelerometer data)</li>}
                  {!permissions.audio && <li>Microphone (real audio amplitude analysis)</li>}
                  {!permissions.location && <li>Location (real GPS coordinates)</li>}
                </ul>
                <p className="text-yellow-800 text-sm mt-4">
                  <strong>Note:</strong> All data comes from real device sensors. No simulated or fake data is used.
                </p>
                <button
                  onClick={() => setShowPermissionHelp(false)}
                  className="mt-4 text-yellow-900 underline text-sm"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REAL Sensor Data Display */}
        {isMonitoring && sensorData && (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* REAL Motion Data */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-blue-600" />
                Real Motion Sensor
              </h3>
              
              {sensorData.motion ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Magnitude</span>
                    <span className="text-sm font-medium text-gray-900">
                      {sensorData.motion.magnitude?.toFixed(3) || '0.000'} m/s²
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Variance</span>
                    <span className="text-sm font-medium text-gray-900">
                      {sensorData.motion.variance?.toFixed(3) || '0.000'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Inactivity</span>
                    <span className="text-sm font-medium text-gray-900">
                      {Math.round((sensorData.motion.inactivityDuration || 0) / 1000)}s
                    </span>
                  </div>
                  
                  <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                    <strong>Source:</strong> {sensorData.motion.dataSource}<br />
                    <strong>Note:</strong> {sensorData.motion.note}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  {permissions.motion ? (
                    <p className="text-sm text-gray-500">Waiting for real motion data...</p>
                  ) : (
                    <div className="text-red-600">
                      <XCircle className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">Motion permission denied</p>
                      <p className="text-xs">No motion data available</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* REAL Audio Data */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-green-600" />
                Real Audio Sensor
              </h3>
              
              {sensorData.audio ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">RMS Amplitude</span>
                    <span className="text-sm font-medium text-gray-900">
                      {sensorData.audio.rmsAmplitude?.toFixed(4) || '0.0000'}
                    </span>
                  </div>
                  
                  {/* Live amplitude bar */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500">Live Audio Level</span>
                      <span className="text-xs text-gray-500">
                        {Math.round((sensorData.audio.rmsAmplitude || 0) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-green-500 transition-all duration-100"
                        style={{ width: `${Math.min(100, (sensorData.audio.rmsAmplitude || 0) * 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Silence Duration</span>
                    <span className="text-sm font-medium text-gray-900">
                      {Math.round((sensorData.audio.silenceDuration || 0) / 1000)}s
                    </span>
                  </div>
                  
                  <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                    <strong>Source:</strong> {sensorData.audio.dataSource}<br />
                    <strong>Note:</strong> {sensorData.audio.note}<br />
                    <strong>Sample Rate:</strong> {sensorData.audio.sampleRate}Hz
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  {permissions.audio ? (
                    <p className="text-sm text-gray-500">Waiting for real audio data...</p>
                  ) : (
                    <div className="text-red-600">
                      <XCircle className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">Audio permission denied</p>
                      <p className="text-xs">No audio data available</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* REAL Location Data & Map */}
        {isMonitoring && (
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* REAL Location Stats */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-purple-600" />
                Real Location & Safe Zones
              </h3>
              
              {sensorData.location && !sensorData.location.error ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">GPS Coordinates</h4>
                    <p className="text-sm text-gray-600">
                      Lat: {sensorData.location.latitude?.toFixed(6)}<br />
                      Lng: {sensorData.location.longitude?.toFixed(6)}<br />
                      Accuracy: ±{Math.round(sensorData.location.accuracy)}m
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Tracking Status</h4>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${locationTracking ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm text-gray-600">
                        {locationTracking ? 'Live tracking active' : 'Tracking inactive'}
                      </span>
                    </div>
                    {currentSOSId && (
                      <p className="text-xs text-gray-500 mt-1">
                        SOS ID: {currentSOSId.substring(0, 20)}...
                      </p>
                    )}
                  </div>
                  
                  {sensorData.location.safeZones && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Nearest Emergency Services</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        {sensorData.location.safeZones.nearestHospital && (
                          <p>🏥 Hospital: {Math.round(sensorData.location.safeZones.nearestHospital.distance)}m</p>
                        )}
                        {sensorData.location.safeZones.nearestPolice && (
                          <p>🚓 Police: {Math.round(sensorData.location.safeZones.nearestPolice.distance)}m</p>
                        )}
                        {sensorData.location.safeZones.nearestFireStation && (
                          <p>🚒 Fire Station: {Math.round(sensorData.location.safeZones.nearestFireStation.distance)}m</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                    <strong>Source:</strong> {sensorData.location.dataSource}<br />
                    <strong>Note:</strong> {sensorData.location.note}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  {permissions.location ? (
                    <p className="text-sm text-gray-500">Waiting for real GPS data...</p>
                  ) : (
                    <div className="text-red-600">
                      <XCircle className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">Location permission denied</p>
                      <p className="text-xs">No GPS data available</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Real-Time Location Map */}
            <div className="card p-0">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Your Real Location</h3>
                <p className="text-sm text-gray-600">Live GPS tracking with Firestore integration</p>
              </div>
              
              <div className="p-4">
                <LiveSOSMap 
                  userId={user?.uid}
                  showAllEvents={false}
                  height="300px"
                  className=""
                />
              </div>
            </div>
          </div>
        )}

        {/* System Info */}
        <div className="card bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">🔍 Real Sensor System</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <p><strong>Motion Detection:</strong> Real accelerometer data only</p>
              <p><strong>Audio Analysis:</strong> Real microphone RMS amplitude</p>
              <p><strong>Location Tracking:</strong> Real GPS coordinates</p>
            </div>
            <div>
              <p><strong>No Fake Metrics:</strong> All data from browser APIs</p>
              <p><strong>Transparency:</strong> Data sources clearly labeled</p>
              <p><strong>Real-Time:</strong> Live sensor updates every 250ms</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealDashboard;