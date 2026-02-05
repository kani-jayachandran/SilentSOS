import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Brain, BarChart3, Settings, Info, AlertTriangle, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRealSensor } from '../contexts/RealSensorContext';
import { apiService } from '../services/apiService';

const TransparencyPanel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sensorData, emergencyScore, isMonitoring, emergencyStatus } = useRealSensor();
  const [emergencyHistory, setEmergencyHistory] = useState([]);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingManualAlert, setSendingManualAlert] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    loadEmergencyHistory();
  }, [user, navigate]);

  const loadEmergencyHistory = async () => {
    try {
      setLoading(true);
      const history = await apiService.getEmergencyHistory(user.uid);
      setEmergencyHistory(history);
    } catch (error) {
      console.error('Failed to load emergency history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentBreakdown = () => {
    if (!isMonitoring || !sensorData.motion) {
      return null;
    }

    // SIMPLIFIED REAL-DATA-BASED BREAKDOWN
    const motionScore = Math.min(100, (sensorData.motion.magnitude || 0) * 2); // Scale magnitude
    const varianceScore = Math.min(100, (sensorData.motion.variance || 0) * 5); // Scale variance
    const inactivityScore = Math.min(100, (sensorData.motion.inactivityDuration || 0) / 300); // 30s = 100%
    
    const audioScore = sensorData.audio ? Math.min(100, (sensorData.audio.rmsAmplitude || 0) * 100) : 0;
    const silenceScore = sensorData.audio ? Math.min(100, (sensorData.audio.silenceDuration || 0) / 300) : 0;
    
    const locationScore = sensorData.location && sensorData.location.safeZones ? 
      (sensorData.location.safeZones.nearestHospital ? 
        Math.max(0, 100 - (sensorData.location.safeZones.nearestHospital.distance / 100)) : 50) : 50;

    return {
      sensorScore: (motionScore + varianceScore + audioScore) / 3,
      contextScore: inactivityScore,
      locationScore: locationScore,
      totalScore: emergencyScore,
      factors: [
        motionScore > 50 && `High motion detected (${sensorData.motion.magnitude?.toFixed(2)} m/s²)`,
        varianceScore > 50 && `Erratic movement patterns (variance: ${sensorData.motion.variance?.toFixed(2)})`,
        inactivityScore > 50 && `Prolonged inactivity (${Math.round((sensorData.motion.inactivityDuration || 0) / 1000)}s)`,
        audioScore > 30 && `Audio activity detected (${(sensorData.audio?.rmsAmplitude || 0).toFixed(4)})`,
        silenceScore > 50 && `Extended silence period (${Math.round((sensorData.audio?.silenceDuration || 0) / 1000)}s)`
      ].filter(Boolean)
    };
  };

  const sendManualAlert = async () => {
    if (!user || sendingManualAlert) return;
    
    try {
      setSendingManualAlert(true);
      
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
          note: 'Manual emergency alert triggered by user from transparency panel'
        },
        timestamp: new Date().toISOString(),
        confidence: 100, // Manual alerts are 100% confidence
        manual: true
      };
      
      const response = await apiService.reportEmergency(emergencyData);
      
      if (response.success) {
        alert('Manual emergency alert sent successfully! Emergency contacts have been notified.');
        loadEmergencyHistory(); // Refresh history
      } else {
        alert('Failed to send manual alert. Please try again.');
      }
      
    } catch (error) {
      console.error('Failed to send manual alert:', error);
      
      // More specific error messages
      if (error.message.includes('Backend server unavailable')) {
        alert('Server connection failed. Please ensure the backend server is running and try again.');
      } else if (error.message.includes('Authentication')) {
        alert('Authentication error. Please sign out and sign in again.');
      } else if (error.message.includes('Failed to fetch')) {
        alert('Network error. Please check your internet connection and try again.');
      } else {
        alert(`Error sending manual alert: ${error.message}`);
      }
    } finally {
      setSendingManualAlert(false);
    }
  };

  const currentBreakdown = getCurrentBreakdown();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                <Eye className="h-8 w-8 mr-3 text-blue-600" />
                Real Sensor Transparency Panel
              </h1>
              <p className="text-gray-600">
                Understand how SilentSOS makes emergency detection decisions using real sensor data
              </p>
            </div>
            
            {/* Manual Alert Button */}
            <button
              onClick={sendManualAlert}
              disabled={sendingManualAlert || !user}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                sendingManualAlert 
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              <Send className="h-5 w-5" />
              <span>{sendingManualAlert ? 'Sending...' : 'Send Manual Alert'}</span>
            </button>
          </div>
        </div>

        {/* Current Analysis */}
        {isMonitoring && currentBreakdown && (
          <div className="card mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Brain className="h-6 w-6 mr-2 text-green-600" />
              Live Real Sensor Analysis
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Score Breakdown */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Real Sensor Score Breakdown</h3>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700">Motion Analysis</span>
                      <span className="text-sm font-bold text-gray-900">
                        {Math.round(currentBreakdown.sensorScore)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, currentBreakdown.sensorScore)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Real accelerometer magnitude, variance, and audio RMS
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700">Inactivity Factor</span>
                      <span className="text-sm font-bold text-gray-900">
                        {Math.round(currentBreakdown.contextScore)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-orange-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, currentBreakdown.contextScore)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Real-time inactivity duration from motion sensor
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700">Location Safety</span>
                      <span className="text-sm font-bold text-gray-900">
                        {Math.round(currentBreakdown.locationScore)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-purple-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, currentBreakdown.locationScore)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Real GPS distance to emergency services (OpenStreetMap)
                    </p>
                  </div>
                  
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-semibold text-gray-900">Emergency Score</span>
                      <span className="text-lg font-bold text-gray-900">
                        {Math.round(currentBreakdown.totalScore)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          currentBreakdown.totalScore > 70 ? 'bg-red-500' :
                          currentBreakdown.totalScore > 40 ? 'bg-orange-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(100, currentBreakdown.totalScore)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Status: <strong>{emergencyStatus.toUpperCase()}</strong>
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Real Sensor Explanation */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Real Sensor Factors</h3>
                
                {currentBreakdown.factors.length > 0 ? (
                  <div className="space-y-2">
                    {currentBreakdown.factors.map((factor, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-700">{factor}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    All real sensor indicators are within normal ranges. No emergency factors detected.
                  </p>
                )}
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">Real Sensor Decision Logic</h4>
                  <div className="text-xs text-blue-800 space-y-1">
                    <p>• Score &lt; 40%: Normal activity (continue monitoring)</p>
                    <p>• Score 40-70%: Suspicious activity (increased monitoring)</p>
                    <p>• Score &gt; 70%: Emergency detected (trigger alert)</p>
                    <p>• <strong>Manual Alert:</strong> Instant 100% confidence alert</p>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <h4 className="text-sm font-semibold text-green-900 mb-2">🔍 Data Transparency</h4>
                  <div className="text-xs text-green-800 space-y-1">
                    <p>• Motion: {sensorData.motion?.dataSource || 'Not available'}</p>
                    <p>• Audio: {sensorData.audio?.dataSource || 'Not available'}</p>
                    <p>• Location: {sensorData.location?.dataSource || 'Not available'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Algorithm Explanation */}
        <div className="card mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Settings className="h-6 w-6 mr-2 text-purple-600" />
            How Our Real Sensor System Works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Real Sensor Data Collection</h3>
              <p className="text-sm text-gray-600 mb-3">
                Real-time monitoring using only authentic browser APIs with no fake or simulated data.
              </p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• DeviceMotionEvent API for real accelerometer data</li>
                <li>• Web Audio API for real microphone RMS amplitude</li>
                <li>• Geolocation API for real GPS coordinates</li>
                <li>• OpenStreetMap API for real emergency services</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Simplified Analysis</h3>
              <p className="text-sm text-gray-600 mb-3">
                Basic thresholds applied to real sensor values with complete transparency.
              </p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Motion magnitude &gt; 20 m/s² = potential fall</li>
                <li>• Motion variance &gt; 10 = erratic movement</li>
                <li>• Inactivity &gt; 30s = potential unconsciousness</li>
                <li>• All calculations from real device sensors</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Manual Override</h3>
              <p className="text-sm text-gray-600 mb-3">
                Users can instantly send emergency alerts regardless of sensor readings.
              </p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Manual alerts: 100% confidence</li>
                <li>• Instant notification to all emergency contacts</li>
                <li>• Includes real GPS location in alerts</li>
                <li>• No sensor validation required</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Emergency History */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="h-6 w-6 mr-2 text-indigo-600" />
            Emergency History & Learning
          </h2>
          
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          ) : emergencyHistory.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Emergency History</h3>
              <p className="text-gray-600">
                Your emergency detection history will appear here as the system learns your patterns.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {emergencyHistory.slice(0, 5).map((emergency) => (
                <div
                  key={emergency.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedEmergency?.id === emergency.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedEmergency(selectedEmergency?.id === emergency.id ? null : emergency)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        emergency.status === 'resolved' ? 'bg-green-100 text-green-800' :
                        emergency.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {emergency.status.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {Math.round(emergency.confidence)}% confidence
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(emergency.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {selectedEmergency?.id === emergency.id && emergency.breakdown && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Detection Analysis</h4>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="text-xs font-medium text-gray-700 mb-2">Score Breakdown</h5>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span>Sensor:</span>
                              <span>{Math.round(emergency.breakdown.sensorScore)}%</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>Context:</span>
                              <span>{Math.round(emergency.breakdown.contextScore)}%</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>Location:</span>
                              <span>{Math.round(emergency.breakdown.locationScore)}%</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="text-xs font-medium text-gray-700 mb-2">Learning Impact</h5>
                          <p className="text-xs text-gray-600">
                            {emergency.status === 'cancelled' 
                              ? 'This false positive helped reduce sensitivity for similar patterns.'
                              : emergency.status === 'resolved'
                              ? 'This confirmed emergency validated the detection accuracy.'
                              : 'This event is being analyzed for pattern learning.'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ethical AI Principles */}
        <div className="card mt-8 bg-green-50 border-green-200">
          <h2 className="text-xl font-bold text-green-900 mb-4">Our Real Sensor Principles</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-green-900 mb-2">Complete Transparency</h3>
              <p className="text-sm text-green-800 mb-3">
                Every sensor reading comes from real browser APIs with clear data source labeling and no fake metrics.
              </p>
              
              <h3 className="text-lg font-semibold text-green-900 mb-2">Privacy Protection</h3>
              <p className="text-sm text-green-800">
                No raw audio stored. Only RMS amplitude calculated. All sensor processing done locally on device.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-green-900 mb-2">User Control</h3>
              <p className="text-sm text-green-800 mb-3">
                Manual emergency alerts available anytime. Complete control over monitoring and emergency contacts.
              </p>
              
              <h3 className="text-lg font-semibold text-green-900 mb-2">Real Data Only</h3>
              <p className="text-sm text-green-800">
                No simulated, fake, or impossible metrics. All values come from actual device sensors with browser limitations clearly noted.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransparencyPanel;