const express = require('express');
const router = express.Router();
const { getFirestore } = require('../config/firebase');
const { authenticateUser, validateUserAccess } = require('../middleware/auth');

// Apply authentication middleware to all user routes
router.use(authenticateUser);

// Create or update user profile
router.post('/profile', async (req, res) => {
  try {
    const { name, email, phone, emergencyInfo, preferences } = req.body;
    const userId = req.user.uid; // Use authenticated user ID
    
    const db = getFirestore();
    
    const userData = {
      userId,
      name,
      email: email || req.user.email,
      phone,
      emergencyInfo,
      preferences: {
        silentMode: preferences?.silentMode || false,
        adaptiveLearning: preferences?.adaptiveLearning !== false,
        crowdVerification: preferences?.crowdVerification !== false,
        locationSharing: preferences?.locationSharing !== false,
        ...preferences
      },
      updatedAt: new Date().toISOString(),
      isAnonymous: req.user.isAnonymous
    };
    
    await db.collection('users').doc(userId).set(userData, { merge: true });
    
    res.json({ success: true, user: userData });
    
  } catch (error) {
    console.error('User profile update error:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// Get user profile
router.get('/profile/:userId', validateUserAccess, async (req, res) => {
  try {
    const { userId } = req.params;
    const db = getFirestore();
    
    const doc = await db.collection('users').doc(userId).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(doc.data());
    
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Update user preferences
router.patch('/preferences/:userId', validateUserAccess, async (req, res) => {
  try {
    const { userId } = req.params;
    const preferences = req.body;
    
    const db = getFirestore();
    
    await db.collection('users').doc(userId).update({
      preferences,
      updatedAt: new Date().toISOString()
    });
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Store user learning data
router.post('/learning/:userId', validateUserAccess, async (req, res) => {
  try {
    const { userId } = req.params;
    const { sensorSnapshot, outcome, emergencyId } = req.body;
    
    const db = getFirestore();
    
    await db.collection('learning_data').add({
      userId,
      sensorSnapshot,
      outcome, // 'false_positive', 'true_positive', 'missed_emergency'
      emergencyId,
      timestamp: new Date().toISOString()
    });
    
    // Update user's adaptive thresholds
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      const currentThresholds = userData.adaptiveThresholds || {
        motionSensitivity: 1.0,
        audioSensitivity: 1.0,
        contextWeight: 1.0
      };
      
      // Adjust thresholds based on outcome
      if (outcome === 'false_positive') {
        currentThresholds.motionSensitivity *= 0.95; // Reduce sensitivity
        currentThresholds.audioSensitivity *= 0.95;
      } else if (outcome === 'missed_emergency') {
        currentThresholds.motionSensitivity *= 1.05; // Increase sensitivity
        currentThresholds.audioSensitivity *= 1.05;
      }
      
      await db.collection('users').doc(userId).update({
        adaptiveThresholds: currentThresholds,
        lastLearningUpdate: new Date().toISOString()
      });
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Store learning data error:', error);
    res.status(500).json({ error: 'Failed to store learning data' });
  }
});

// Get user statistics
router.get('/stats/:userId', validateUserAccess, async (req, res) => {
  try {
    const { userId } = req.params;
    const db = getFirestore();
    
    console.log('Querying emergencies collection for user stats, userId:', userId);
    
    // Get emergency history
    const emergenciesSnapshot = await db.collection('emergencies')
      .where('userId', '==', userId)
      .get();
    
    console.log(`Retrieved ${emergenciesSnapshot.size} emergencies for user stats`);
    
    const emergencies = [];
    emergenciesSnapshot.forEach(doc => {
      emergencies.push({ id: doc.id, ...doc.data() });
    });
    
    // Calculate statistics
    const stats = {
      totalEmergencies: emergencies.length,
      falsePositives: emergencies.filter(e => e.status === 'cancelled').length,
      resolvedEmergencies: emergencies.filter(e => e.status === 'resolved').length,
      averageResponseTime: calculateAverageResponseTime(emergencies),
      lastEmergency: emergencies.length > 0 ? emergencies[0].createdAt : null
    };
    
    res.json(stats);
    
  } catch (firestoreError) {
    console.error('Get user stats error:', firestoreError);
    
    // Check for index-related errors
    if (firestoreError.code === 'FAILED_PRECONDITION') {
      console.error('FIRESTORE INDEX ERROR:');
      console.error('Collection: emergencies');
      console.error('Query fields: userId (==)');
      console.error('Error details:', firestoreError.message);
      
      return res.status(500).json({
        success: false,
        error: `Firestore index required: Collection 'emergencies' needs index for field 'userId'. Error: ${firestoreError.message}`
      });
    }
    
    // Log query structure for debugging
    console.error('Query structure that failed:');
    console.error('- Collection: emergencies');
    console.error('- Where clause: userId == ' + userId);
    console.error('- Query type: Direct collection query (not collectionGroup)');
    
    res.status(500).json({ 
      success: false,
      error: `Failed to get user statistics: ${firestoreError.message}` 
    });
  }
});

const calculateAverageResponseTime = (emergencies) => {
  const resolvedEmergencies = emergencies.filter(e => 
    e.status === 'resolved' && e.resolvedAt && e.createdAt
  );
  
  if (resolvedEmergencies.length === 0) return null;
  
  const totalTime = resolvedEmergencies.reduce((sum, emergency) => {
    const created = new Date(emergency.createdAt);
    const resolved = new Date(emergency.resolvedAt);
    return sum + (resolved - created);
  }, 0);
  
  return Math.round(totalTime / resolvedEmergencies.length / 1000); // seconds
};

module.exports = router;