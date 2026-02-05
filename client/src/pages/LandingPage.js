import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Smartphone, Brain, Users, MapPin, Eye, Clock, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AuthSetup from '../components/AuthSetup';

const LandingPage = () => {
  const { user } = useAuth();

  // If user is not authenticated, show auth setup
  if (!user) {
    return <AuthSetup />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <Shield className="h-20 w-20 text-blue-600" />
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              SilentSOS
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-4">
              Automatic Emergency Detection Without User Action
            </p>
            
            <p className="text-lg text-gray-500 mb-8 max-w-3xl mx-auto">
              Revolutionary AI-powered safety system that monitors your well-being using real device sensors 
              and automatically alerts trusted contacts when emergencies are detected.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/dashboard"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-medium transition-colors"
              >
                Go to Dashboard
              </Link>
              
              <Link
                to="/emergency-dashboard"
                className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-8 py-4 rounded-lg text-lg font-medium transition-colors"
              >
                View Live Demo
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Problem Statement */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">The Problem</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Traditional emergency systems require conscious user action. But what happens when someone 
              can't press a button? Falls, accidents, medical emergencies, or dangerous situations 
              often leave victims unable to call for help.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                <Clock className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Time Critical</h3>
              <p className="text-gray-600">Every second counts in emergencies. Delayed response can be fatal.</p>
            </div>
            
            <div className="text-center p-6">
              <div className="bg-orange-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                <Smartphone className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Unable to Act</h3>
              <p className="text-gray-600">Victims may be unconscious, trapped, or physically unable to use devices.</p>
            </div>
            
            <div className="text-center p-6">
              <div className="bg-yellow-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                <Users className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Isolation</h3>
              <p className="text-gray-600">Many emergencies happen when people are alone with no one to help.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Solution */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Solution</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              SilentSOS continuously monitors your safety using real device sensors and AI, 
              automatically detecting emergencies and alerting help without any user action required.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <Smartphone className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Real Sensor Data</h3>
              <p className="text-gray-600 text-sm">
                Uses DeviceMotion, Web Audio, and Geolocation APIs to monitor falls, distress sounds, and location changes.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <Brain className="h-12 w-12 text-green-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Context-Aware AI</h3>
              <p className="text-gray-600 text-sm">
                Intelligent scoring considers time, location, user patterns, and environmental factors for accurate detection.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <Zap className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Automatic Alerts</h3>
              <p className="text-gray-600 text-sm">
                Instantly notifies trusted contacts and emergency services when danger is detected, no button press needed.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <Eye className="h-12 w-12 text-indigo-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Transparent AI</h3>
              <p className="text-gray-600 text-sm">
                Full explainability of emergency decisions with ethical AI principles and user privacy protection.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Innovation Highlights */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Innovation Highlights</h2>
            <p className="text-lg text-gray-600">
              Cutting-edge features that set SilentSOS apart from traditional emergency systems.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Brain className="h-6 w-6 text-blue-600 mr-2" />
                Adaptive Learning System
              </h3>
              <p className="text-gray-600 mb-4">
                Learns from false alarms to personalize detection thresholds, reducing false positives 
                while maintaining high sensitivity to real emergencies.
              </p>
              
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Users className="h-6 w-6 text-green-600 mr-2" />
                Crowd Signal Verification
              </h3>
              <p className="text-gray-600 mb-4">
                Correlates emergency signals from nearby users to increase confidence in mass casualty 
                events and reduce individual false alarms.
              </p>
              
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <MapPin className="h-6 w-6 text-purple-600 mr-2" />
                Safe Zone Awareness
              </h3>
              <p className="text-gray-600">
                Automatically detects proximity to hospitals, police stations, and emergency services, 
                adjusting risk assessment and providing optimal routing information.
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Shield className="h-6 w-6 text-indigo-600 mr-2" />
                Silent Mode Operation
              </h3>
              <p className="text-gray-600 mb-4">
                Continues monitoring even in stealth mode, perfect for sensitive situations where 
                visible alerts might escalate danger.
              </p>
              
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Eye className="h-6 w-6 text-orange-600 mr-2" />
                Ethical AI Transparency
              </h3>
              <p className="text-gray-600 mb-4">
                Every emergency decision is fully explainable with detailed breakdowns of contributing 
                factors, ensuring trust and accountability.
              </p>
              
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Clock className="h-6 w-6 text-red-600 mr-2" />
                Context-Aware Scoring
              </h3>
              <p className="text-gray-600">
                Dynamic risk assessment based on time of day, location type, user patterns, and 
                environmental factors for unprecedented accuracy.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ethics & Privacy */}
      <div className="bg-blue-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Privacy & Ethics First</h2>
            <p className="text-lg text-gray-600">
              Your safety and privacy are our top priorities. SilentSOS is built with ethical AI principles.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <Shield className="h-8 w-8 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Data Protection</h3>
              <p className="text-gray-600 text-sm">
                No raw audio is stored. Only metadata and emergency-relevant features are processed. 
                All data is encrypted and user-controlled.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <Eye className="h-8 w-8 text-green-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Transparent Decisions</h3>
              <p className="text-gray-600 text-sm">
                Every emergency alert includes a full explanation of why it was triggered, 
                with clear breakdowns of contributing factors.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <Users className="h-8 w-8 text-purple-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">User Control</h3>
              <p className="text-gray-600 text-sm">
                Complete control over monitoring settings, trusted contacts, and data sharing. 
                Easy opt-out and data deletion at any time.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-blue-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Experience Automatic Emergency Protection?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join the future of personal safety with AI-powered emergency detection.
          </p>
          
          <Link
            to="/dashboard"
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-medium transition-colors inline-block"
          >
            Start Monitoring Now
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;