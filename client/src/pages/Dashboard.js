import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, CheckCircle, XCircle, Play, Square, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRealSensor } from '../contexts/RealSensorContext';
import LiveSOSMap from '../components/LiveSOSMap';
import { realTimeLocationService } from '../services/RealTimeLocationService';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    sensorData,
    isMonitoring,
    permissions,
    emergencyScore,
    emergencyStatus,
    sosCountdown,
    startMonitoring,
    stopMonitoring,
    cancelEmergency,
    triggerManualEmergency
  } = useRealSensor();

  const [showPermissionHelp, setShowPermissionHelp] = useState(false);
  const [locationTracking, setLocationTracking] = useState(false);
  const [currentSOSId, setCurrentSOSId] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Start location tracking when monitoring begins
  useEffect(() => {
    if (isMonitoring && user && !locationTracking) {
      startLocationTracking();
    } else if (!isMonitoring && locationTracking) {
      stopLocationTracking();
    }
  }, [isMonitoring, user, locationTracking]);

  const startLocationTracking = () => {
    if (!user) return;

    // Generate unique SOS ID for this session
    const sosId = `sos_${user.uid}_${Date.now()}`;
    setCurrentSOSId(sosId);

    console.log('Starting location tracking for SOS session:', sosId);

    realTimeLocationService.startTracking(
      user.uid,
      sosId,
      (locationData) => {
        console.log('Location update received:', locationData);
        setLocationTracking(true);
      },
      (error) => {
        console.error('Location tracking error:', error);
        setLocationTracking(false);
      }
    );
  };

  const stopLocationTracking = () => {
    console.log('Stopping location tracking');
    realTimeLocationService.stopTracking();
    setLocationTracking(false);
    setCurrentSOSId(null);
  };

  // Update SOS severity when emergency status changes
  useEffect(() => {
    if (locationTracking && emergencyStatus) {
      const severity = emergencyStatus === 'emergency' ? 'emergency' : 
                      emergencyStatus === 'suspicious' ? 'suspicious' : 'normal';
      
      realTimeLocationService.updateSeverity(severity);
    }
  }, [emergencyStatus, locationTracking]);

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Safety Dashboard</h1>
          <p className="text-gray-600">Real-time emergency detection monitoring</p>
        </div>

        {/* SOS Countdown Alert */}
        {sosCountdown !== null && (
          <div className="mb-6 bg-red-600 text-white rounded-lg p-6 shadow-lg emergency-pulse">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">🚨 EMERGENCY DETECTED</h2>
                <p className="text-lg">
                  Sending alert in <span className="text-3xl font-bold">{sosCountdown}</span> seconds...
                </p>
                <p className="text-sm mt-2 opacity-90">
                  Cancel if this is a false alarm
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
                  {isMonitoring ? 'Actively monitoring your safety' : 'Monitoring paused'}
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

          {/* Emergency Score */}
          {isMonitoring && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Emergency Confidence</span>
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
            </div>
          )}
        </div>

        {/* Permissions Status */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Motion Sensor</h3>
                <p className="text-xs text-gray-500">Fall & impact detection</p>
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
                <h3 className="text-sm font-medium text-gray-700 mb-1">Microphone</h3>
                <p className="text-xs text-gray-500">Real audio amplitude analysis</p>
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
                <p className="text-xs text-gray-500">Safe zone detection</p>
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
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">Permissions Required</h3>
                <p className="text-yellow-800 mb-4">
                  SilentSOS needs access to your device sensors to detect emergencies. Please grant the following permissions:
                </p>
                <ul className="list-disc list-inside space-y-1 text-yellow-800 text-sm">
                  {!permissions.motion && <li>Motion & Orientation (for fall detection)</li>}
                  {!permissions.audio && <li>Microphone (for real audio amplitude analysis)</li>}
                  {!permissions.location && <li>Location (for safe zone awareness)</li>}
                </ul>
                <p className="text-yellow-800 text-sm mt-4">
                  <strong>Note:</strong> On iOS, you may need to interact with the page first (tap anywhere) before granting motion permissions.
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

        {/* Live Sensor Data */}
        {isMonitoring && sensorData && (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Motion Data */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-blue-600" />
                Motion Sensor
              </h3>
              
              {sensorData.motion ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Magnitude</span>
                    <span className="text-sm font-medium text-gray-900">
                      {sensorData.motion.magnitude?.toFixed(2) || '0.00'}g
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Variance</span>
                    <span className="text-sm font-medium text-gray-900">
                      {sensorData.motion.variance?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Stillness</span>
                    <span className="text-sm font-medium text-gray-900">
                      {Math.round((sensorData.motion.stillnessDuration || 0) / 1000)}s
                    </span>
                  </div>
                  
                  {sensorData.motion.suddenImpact && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 mt-3">
                      <p className="text-sm font-medium text-red-900">
                        ⚠️ Sudden Impact Detected: {sensorData.motion.suddenImpact.magnitude.toFixed(1)}g
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No motion data available</p>
              )}
            </div>

            {/* Audio Data */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-green-600" />
                Audio Sensor
              </h3>
              
              {sensorData.audio ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">RMS Amplitude</span>
                    <span className="text-sm font-medium text-gray-900">
                      {(sensorData.audio.rmsAmplitude || 0).toFixed(4)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Silence Duration</span>
                    <span className="text-sm font-medium text-gray-900">
                      {Math.round((sensorData.audio.silenceDuration || 0) / 1000)}s
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No audio data available</p>
              )}
            </div>
          </div>
        )}

        {/* Location Data & Real-Time Map */}
        {isMonitoring && (
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Location Stats */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-purple-600" />
                Location & Safe Zones
              </h3>
              
              {sensorData.location ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Current Location</h4>
                    <p className="text-sm text-gray-600">
                      Lat: {sensorData.location.latitude?.toFixed(6)}<br />
                      Lon: {sensorData.location.longitude?.toFixed(6)}<br />
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
                </div>
              ) : (
                <p className="text-sm text-gray-500">Waiting for location data...</p>
              )}
            </div>

            {/* Real-Time Location Map */}
            <div className="card p-0">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Your Live Location</h3>
                <p className="text-sm text-gray-600">Real-time tracking with Firestore integration</p>
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

        {/* Test Emergency Button (for demo) */}
        <div className="card bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Testing & Demo</h3>
          <p className="text-sm text-gray-600 mb-4">
            Trigger a test emergency to see how the system works (for demonstration purposes only)
          </p>
          <button
            onClick={triggerManualEmergency}
            disabled={!isMonitoring}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Trigger Test Emergency
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;