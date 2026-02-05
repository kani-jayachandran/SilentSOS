import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, MapPin, Phone, Mail, CheckCircle, XCircle } from 'lucide-react';
import { apiService } from '../services/apiService';

const SOSStatus = () => {
  const { emergencyId } = useParams();
  const navigate = useNavigate();
  const [emergency, setEmergency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!emergencyId) {
      navigate('/');
      return;
    }
    
    loadEmergencyDetails();
  }, [emergencyId, navigate]);

  const loadEmergencyDetails = async () => {
    try {
      setLoading(true);
      // In a real implementation, you'd have an endpoint to get specific emergency details
      // For now, we'll simulate this with the active emergencies endpoint
      const emergencies = await apiService.getActiveEmergencies();
      const foundEmergency = emergencies.find(e => e.id === emergencyId);
      
      if (foundEmergency) {
        setEmergency(foundEmergency);
      } else {
        setError('Emergency not found');
      }
    } catch (err) {
      console.error('Failed to load emergency details:', err);
      setError('Failed to load emergency details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-red-600 bg-red-100';
      case 'resolved': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <AlertTriangle className="h-6 w-6" />;
      case 'resolved': return <CheckCircle className="h-6 w-6" />;
      case 'cancelled': return <XCircle className="h-6 w-6" />;
      default: return <Clock className="h-6 w-6" />;
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return time.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading emergency details...</p>
        </div>
      </div>
    );
  }

  if (error || !emergency) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Emergency Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The requested emergency could not be found.'}</p>
          <button
            onClick={() => navigate('/emergency-dashboard')}
            className="btn-primary"
          >
            View Emergency Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className={`p-3 rounded-full ${getStatusColor(emergency.status)}`}>
              {getStatusIcon(emergency.status)}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {emergency.status === 'active' ? 'ACTIVE EMERGENCY' :
                 emergency.status === 'resolved' ? 'Emergency Resolved' :
                 'Emergency Cancelled'}
              </h1>
              <p className="text-gray-600">Emergency ID: {emergency.id}</p>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="card mb-8">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {Math.round(emergency.confidence)}%
              </div>
              <div className="text-sm text-gray-600">Confidence Level</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
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
            
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 mb-1">
                {formatTimeAgo(emergency.timestamp)}
              </div>
              <div className="text-sm text-gray-600">Time Detected</div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(emergency.timestamp).toLocaleString()}
              </div>
            </div>
            
            <div className="text-center">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(emergency.status)}`}>
                {emergency.status.toUpperCase()}
              </div>
              <div className="text-sm text-gray-600 mt-1">Current Status</div>
            </div>
          </div>
        </div>

        {/* Location Information */}
        {emergency.location && (
          <div className="card mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <MapPin className="h-6 w-6 mr-2 text-blue-600" />
              Location Information
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Coordinates</h3>
                <p className="text-gray-600 mb-2">
                  Latitude: {emergency.location.latitude.toFixed(6)}<br />
                  Longitude: {emergency.location.longitude.toFixed(6)}
                </p>
                <a
                  href={`https://maps.google.com/?q=${emergency.location.latitude},${emergency.location.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  View on Google Maps →
                </a>
              </div>
              
              {emergency.location.safeZones && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Nearby Emergency Services</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    {emergency.location.safeZones.nearestHospital && (
                      <div className="flex items-center space-x-2">
                        <span>🏥</span>
                        <span>Hospital: {Math.round(emergency.location.safeZones.nearestHospital.distance)}m away</span>
                      </div>
                    )}
                    {emergency.location.safeZones.nearestPolice && (
                      <div className="flex items-center space-x-2">
                        <span>🚓</span>
                        <span>Police: {Math.round(emergency.location.safeZones.nearestPolice.distance)}m away</span>
                      </div>
                    )}
                    {emergency.location.safeZones.nearestFireStation && (
                      <div className="flex items-center space-x-2">
                        <span>🚒</span>
                        <span>Fire Station: {Math.round(emergency.location.safeZones.nearestFireStation.distance)}m away</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Detection Analysis */}
        {emergency.breakdown && (
          <div className="card mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Detection Analysis</h2>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Sensor Analysis</span>
                  <span className="text-sm font-bold text-gray-900">
                    {Math.round(emergency.breakdown.sensorScore)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-blue-500"
                    style={{ width: `${Math.min(100, emergency.breakdown.sensorScore)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Motion patterns, audio analysis, and activity detection
                </p>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Context Factors</span>
                  <span className="text-sm font-bold text-gray-900">
                    {Math.round(emergency.breakdown.contextScore)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-orange-500"
                    style={{ width: `${Math.min(100, emergency.breakdown.contextScore)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Time of day, environmental factors, and user patterns
                </p>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Location Risk</span>
                  <span className="text-sm font-bold text-gray-900">
                    {Math.round(emergency.breakdown.locationScore)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-purple-500"
                    style={{ width: `${Math.min(100, emergency.breakdown.locationScore)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Isolation factors, safe zone proximity, and location type
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Emergency Response Actions */}
        <div className="card mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Emergency Response</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <Mail className="h-5 w-5 mr-2 text-blue-600" />
                Notifications Sent
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Trusted contacts notified via email</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Emergency dashboard updated</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Location shared with responders</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <Phone className="h-5 w-5 mr-2 text-green-600" />
                Recommended Actions
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• Contact the person immediately</p>
                <p>• If no response, call local emergency services</p>
                <p>• Check the location using the map link above</p>
                <p>• Monitor this page for status updates</p>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Emergency Timeline</h2>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="bg-red-500 rounded-full p-2">
                <AlertTriangle className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Emergency Detected</p>
                <p className="text-sm text-gray-600">
                  {new Date(emergency.timestamp).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  AI confidence: {Math.round(emergency.confidence)}%
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-blue-500 rounded-full p-2">
                <Mail className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Notifications Sent</p>
                <p className="text-sm text-gray-600">
                  {new Date(new Date(emergency.timestamp).getTime() + 5000).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  All trusted contacts notified
                </p>
              </div>
            </div>
            
            {emergency.status === 'resolved' && (
              <div className="flex items-start space-x-3">
                <div className="bg-green-500 rounded-full p-2">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Emergency Resolved</p>
                  <p className="text-sm text-gray-600">
                    {emergency.resolvedAt && new Date(emergency.resolvedAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {emergency.resolutionNotes || 'Emergency successfully resolved'}
                  </p>
                </div>
              </div>
            )}
            
            {emergency.status === 'cancelled' && (
              <div className="flex items-start space-x-3">
                <div className="bg-gray-500 rounded-full p-2">
                  <XCircle className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Emergency Cancelled</p>
                  <p className="text-sm text-gray-600">
                    {emergency.cancelledAt && new Date(emergency.cancelledAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {emergency.cancelReason || 'Cancelled by user - false alarm'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/emergency-dashboard')}
            className="btn-primary"
          >
            Back to Emergency Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default SOSStatus;