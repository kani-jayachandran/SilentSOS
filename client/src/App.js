import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { RealSensorProvider } from './contexts/RealSensorContext';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';

// Components
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import RealDashboard from './pages/RealDashboard';
import TrustedContacts from './pages/TrustedContacts';
import EmergencyDashboard from './pages/EmergencyDashboard';
import TransparencyPanel from './pages/TransparencyPanel';
import SOSStatus from './pages/SOSStatus';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <RealSensorProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Navbar />
              <main>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/dashboard" element={<RealDashboard />} />
                  <Route path="/contacts" element={<TrustedContacts />} />
                  <Route path="/emergency-dashboard" element={<EmergencyDashboard />} />
                  <Route path="/transparency" element={<TransparencyPanel />} />
                  <Route path="/sos/:emergencyId" element={<SOSStatus />} />
                </Routes>
              </main>
            </div>
          </Router>
        </RealSensorProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;