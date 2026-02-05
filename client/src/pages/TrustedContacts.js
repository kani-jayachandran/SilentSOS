import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Mail, Phone, User, Check, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';

const TrustedContacts = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    relationship: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    loadContacts();
  }, [user, navigate]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const response = await apiService.getEmergencyContacts();
      if (response.success) {
        setContacts(response.contacts || []);
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to load contacts' });
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone || !formData.email) {
      setMessage({ type: 'error', text: 'Name, phone, and email are required' });
      return;
    }

    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      
      const response = await apiService.addEmergencyContact(formData);
      
      if (response.success) {
        setMessage({ 
          type: 'success', 
          text: response.emailResults?.locationIncluded 
            ? `${response.message} Live location included in alerts.`
            : response.message || 'Emergency contact saved successfully!'
        });
        await loadContacts();
        resetForm();
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to save contact' });
      }
    } catch (error) {
      console.error('Failed to save contact:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', email: '', relationship: '' });
    setShowAddForm(false);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Emergency Contacts</h1>
          <p className="text-gray-600">
            Add emergency contacts who will be notified immediately when SilentSOS detects an emergency
          </p>
        </div>

        {/* Message Display */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex items-center space-x-2">
              {message.type === 'success' ? (
                <Check className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        {/* Add Contact Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary flex items-center space-x-2"
            disabled={saving}
          >
            <Plus className="h-5 w-5" />
            <span>Add Emergency Contact</span>
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add New Emergency Contact
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    disabled={saving}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    placeholder="Enter full name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    disabled={saving}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    placeholder="contact@example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    disabled={saving}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship
                  </label>
                  <select
                    name="relationship"
                    value={formData.relationship}
                    onChange={handleInputChange}
                    disabled={saving}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">Select relationship</option>
                    <option value="Family Member">Family Member</option>
                    <option value="Spouse/Partner">Spouse/Partner</option>
                    <option value="Friend">Friend</option>
                    <option value="Colleague">Colleague</option>
                    <option value="Neighbor">Neighbor</option>
                    <option value="Caregiver">Caregiver</option>
                    <option value="Emergency Contact">Emergency Contact</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Add Contact'}</span>
                </button>
                
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Contacts List */}
        {loading ? (
          <div className="card">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              </div>
            </div>
          </div>
        ) : contacts.length === 0 ? (
          <div className="card text-center py-12">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No emergency contacts yet</h3>
            <p className="text-gray-600 mb-6">
              Add people who should be notified immediately during emergencies. Each contact will receive personalized email alerts along with the admin. We recommend adding at least 2-3 contacts for redundancy.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary"
            >
              Add Your First Contact
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {contacts.map((contact) => (
              <div key={contact.id} className="card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-red-100 rounded-full p-3">
                      <User className="h-6 w-6 text-red-600" />
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{contact.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Mail className="h-4 w-4" />
                          <span>{contact.email}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <Phone className="h-4 w-4" />
                          <span>{contact.phone}</span>
                        </div>
                        
                        {contact.userEmail && (
                          <div className="flex items-center space-x-1 text-xs">
                            <span className="text-gray-400">User: {contact.userEmail}</span>
                          </div>
                        )}
                      </div>
                      
                      {contact.relationship && (
                        <span className="inline-block mt-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                          {contact.relationship}
                        </span>
                      )}
                      
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs text-gray-500">
                          Added {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString() : 'Recently'}
                        </span>
                        
                        <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          <Check className="h-3 w-3 mr-1" />
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      ID: {contact.id?.substring(0, 8)}...
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Card */}
        <div className="card mt-8 bg-red-50 border-red-200">
          <h3 className="text-lg font-semibold text-red-900 mb-2">🚨 Multi-Recipient Emergency Alert System</h3>
          <ul className="text-red-800 text-sm space-y-1">
            <li>• When you add an emergency contact, alerts are sent to:</li>
            <li className="ml-4">→ Admin: <strong>kanijayachandran25@gmail.com</strong></li>
            <li className="ml-4">→ ALL your emergency contacts individually</li>
            <li>• Each contact receives personalized emergency alert notifications</li>
            <li>• <strong>📍 Live location data included</strong> when GPS tracking is active</li>
            <li>• All contact data is securely stored in Firebase Firestore</li>
            <li>• You have 5 seconds to cancel false alarms after detection</li>
            <li>• We recommend adding 2-3 contacts for maximum safety coverage</li>
          </ul>
        </div>

        {/* System Status */}
        <div className="card mt-4 bg-blue-50 border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">📧 Multi-Recipient Email System Status</h3>
          <div className="text-blue-800 text-sm">
            <p>✅ Gmail SMTP configured for multi-recipient alerts</p>
            <p>✅ Firebase Firestore integration with email field</p>
            <p>✅ Individual email delivery to each contact</p>
            <p>✅ Admin notifications to kanijayachandran25@gmail.com</p>
            <p>✅ <strong>Live GPS location included in all emergency emails</strong></p>
            <p>✅ Google Maps links for immediate navigation</p>
            <p>✅ Real-time emergency detection enabled</p>
            <p>✅ Authentication required for all operations</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrustedContacts;