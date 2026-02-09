import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { apiService } from '../services/apiService';
import LiveSOSMap from '../components/LiveSOSMap';

const EmergencyDashboard = () => {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const { socket, joinDashboard } = useSocket();

  useEffect(() => {
    loadEmergencies();
    
    // Join dashboard room for real-time updates
    if (socket) {
      joinDashboard();
      
      // Listen for real-time emergency updates
      socket.on('new-emergency', (emergency) => {
        setEmergencies(prev => [emergency, ...prev]);
      });
      
      socket.on('emergency-cancelled', ({ emergencyId }) => {
        setEmergencies(prev => 
          prev.map(e => 
            e.id === emergencyId 
              ? { ...e, status: 'cancelled', resolved: true }
              : e
          )
        );
      });
      
      socket.on('emergency-resolved', ({ emergencyId }) => {
        setEmergencies(prev => 
          prev.map(e => 
            e.id === emergencyId 
              ? { ...e, status: 'resolved', resolved: true }
              : e
          )
        );
      });
      
      return () => {
        socket.off('new-emergency');
        socket.off('emergency-cancelled');
        socket.off('emergency-resolved');
      };
    }
  }, [socket, joinDashboard]);

  const loadEmergencies = async () => {
    try {
      setLoading(true);
      const data = await apiService.getActiveEmergencies();
      setEmergencies(data);
    } catch (error) {
      console.error('Failed to load emergencies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveEmergency = async (emergencyId) => {
    try {
      await apiService.resolveEmergency(emergencyId, {
        resolvedBy: 'Dashboard Admin',
        notes: 'Resolved from emergency dashboard'
      });
      
      setEmergencies(prev => 
        prev.map(e => 
          e.id === emergencyId 
            ? { ...e, status: 'resolved', resolved: true }
            : e
        )
      );
    } catch (error) {
      console.error('Failed to resolve emergency:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-red-500';
      case 'resolved': return 'bg-green-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-yellow-500';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'ACTIVE';
      case 'resolved': return 'RESOLVED';
      case 'cancelled': return 'CANCELLED';
      default: return 'UNKNOWN';
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return time.toLocaleDateString();
  };

  const activeEmergencies = emergencies.filter(e => e.status === 'active');
  const resolvedEmergencies = emergencies.filter(e => e.status !== 'active');

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Emergency Dashboard</h1>
          <p className="text-gray-600">Real-time monitoring of emergency alerts</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Emergencies</p>
                <p className="text-2xl font-bold text-red-600">{activeEmergencies.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Today</p>
                <p className="text-2xl font-bold text-gray-900">{emergencies.length}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{resolvedEmergencies.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">False Positives</p>
                <p className="text-2xl font-bold text-gray-600">
                  {emergencies.filter(e => e.status === 'cancelled').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Emergency List */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Live Emergencies</h2>
            
            {loading ? (
              <div className="card">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            ) : activeEmergencies.length === 0 ? (
              <div className="card text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">All Clear</h3>
                <p className="text-gray-600">No active emergencies at this time</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeEmergencies.map((emergency) => (
                  <div
                    key={emergency.id}
                    className={`card cursor-pointer transition-all ${
                      selectedEmergency?.id === emergency.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedEmergency(emergency)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(emergency.status)}`}>
                            {getStatusText(emergency.status)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatTimeAgo(emergency.timestamp)}
                          </span>
                        </div>
                        
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">Confidence Level</span>
                            <span className="text-sm font-bold text-gray-900">{Math.round(emergency.confidence)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                emergency.confidence > 70 ? 'bg-red-500' :
                                emergency.confidence > 40 ? 'bg-orange-500' :
                                'bg-yellow-500'
                              }`}
                              style={{ width: `${Math.min(100, emergency.confidence)}%` }}
                            />
                          </div>
                        </div>
                        
                        {emergency.location && emergency.location.latitude !== null && emergency.location.longitude !== null && (
                          <div className="flex items-center space-x-1 text-sm text-gray-600 mb-2">
                            <MapPin className="h-4 w-4" />
                            <span>
                              {emergency.location.latitude.toFixed(4)}, {emergency.location.longitude.toFixed(4)}
                            </span>
                          </div>
                        )}
                        
                        {emergency.breakdown && (
                          <div className="text-sm text-gray-600">
                            <span>Factors: </span>
                            <span>Sensor ({Math.round(emergency.breakdown.sensorScore)}%), </span>
                            <span>Context ({Math.round(emergency.breakdown.contextScore)}%), </span>
                            <span>Location ({Math.round(emergency.breakdown.locationScore)}%)</span>
                          </div>
                        )}
                      </div>
                      
                      {emergency.status === 'active' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResolveEmergency(emergency.id);
                          }}
                          className="ml-4 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Recent Resolved */}
            {resolvedEmergencies.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-2">
                  {resolvedEmergencies.slice(0, 5).map((emergency) => (
                    <div key={emergency.id} className="card py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(emergency.status)}`}>
                            {getStatusText(emergency.status)}
                          </span>
                          <span className="text-sm text-gray-600">
                            {Math.round(emergency.confidence)}% confidence
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatTimeAgo(emergency.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Real-Time SOS Map */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Live SOS Locations</h2>
            
            <LiveSOSMap 
              showAllEvents={true}
              height="500px"
              className="rounded-lg shadow-sm"
            />
            
            {/* Selected Emergency Details */}
            {selectedEmergency && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Details</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Emergency ID:</span>
                    <span className="text-sm text-gray-900">{selectedEmergency.id}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Status:</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(selectedEmergency.status)}`}>
                      {getStatusText(selectedEmergency.status)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Confidence:</span>
                    <span className="text-sm text-gray-900">{Math.round(selectedEmergency.confidence)}%</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Detected:</span>
                    <span className="text-sm text-gray-900">
                      {new Date(selectedEmergency.timestamp).toLocaleString()}
                    </span>
                  </div>
                  
                  {selectedEmergency.breakdown && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Detection Breakdown:</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Sensor Score:</span>
                          <span className="text-sm text-gray-900">{Math.round(selectedEmergency.breakdown.sensorScore)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Context Score:</span>
                          <span className="text-sm text-gray-900">{Math.round(selectedEmergency.breakdown.contextScore)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Location Score:</span>
                          <span className="text-sm text-gray-900">{Math.round(selectedEmergency.breakdown.locationScore)}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyDashboard;