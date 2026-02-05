import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, Activity, Users, BarChart3, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRealSensor } from '../contexts/RealSensorContext';

const Navbar = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { emergencyStatus, isMonitoring } = useRealSensor();

  const isActive = (path) => location.pathname === path;

  const getStatusColor = () => {
    if (!isMonitoring) return 'text-gray-500';
    switch (emergencyStatus) {
      case 'emergency': return 'text-red-500';
      case 'suspicious': return 'text-orange-500';
      case 'safe': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const handleAuth = async () => {
    if (user) {
      await signOut();
    }
    // If not authenticated, user will be redirected to auth setup via LandingPage
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Shield className={`h-8 w-8 ${getStatusColor()}`} />
              <span className="text-xl font-bold text-gray-900">SilentSOS</span>
            </Link>
            
            {isMonitoring && (
              <div className="ml-4 flex items-center space-x-1">
                <Activity className={`h-4 w-4 ${getStatusColor()}`} />
                <span className={`text-sm font-medium ${getStatusColor()}`}>
                  {emergencyStatus.charAt(0).toUpperCase() + emergencyStatus.slice(1)}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user && (
              <>
                <Link
                  to="/dashboard"
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/dashboard')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Activity className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>

                <Link
                  to="/contacts"
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/contacts')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span>Contacts</span>
                </Link>

                <Link
                  to="/emergency-dashboard"
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/emergency-dashboard')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Emergency Hub</span>
                </Link>

                <Link
                  to="/transparency"
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/transparency')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Eye className="h-4 w-4" />
                  <span>AI Transparency</span>
                </Link>
              </>
            )}

            <button
              onClick={handleAuth}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              {user ? 'Sign Out' : 'Get Started'}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;