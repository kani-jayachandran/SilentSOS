const express = require('express');
const router = express.Router();
const { getFirestore } = require('../config/firebase');
const { sendEmergencyNotifications } = require('../services/notifications');
const { sendEmergencyAlert } = require('../services/emergencyNotificationService');
const { calculateEmergencyScore } = require('../services/emergencyDetection');
const { authenticateUser, validateUserAccess } = require('../middleware/auth');

// Apply authentication middleware to all emergency routes
router.use(authenticateUser);

// Report emergency
router.post('/report', async (req, res) => {
  try {
    const {
      sensorData,
      location,
      contextData,
      timestamp,
      confidence,
      manual
    } = req.body;

    // Use authenticated user ID
    const userId = req.user.uid;

    const db = getFirestore();
    const io = req.app.get('io');

    // Calculate emergency score (skip for manual alerts)
    let emergencyScore;
    if (manual) {
      // For manual alerts, use 100% confidence and skip complex scoring
      emergencyScore = {
        totalScore: 100,
        breakdown: {
          sensorScore: 0,
          contextScore: 0,
          locationScore: 0,
          crowdScore: 0,
          totalScore: 100,
          manual: true,
          note: 'Manual emergency alert - 100% confidence'
        }
      };
    } else {
      emergencyScore = calculateEmergencyScore(sensorData, contextData, location);
    }
    
    // Create emergency record
    const emergencyData = {
      userId,
      sensorData,
      location,
      contextData,
      timestamp: timestamp || new Date().toISOString(),
      confidence: manual ? 100 : emergencyScore.totalScore,
      breakdown: emergencyScore.breakdown,
      status: 'active',
      resolved: false,
      createdAt: new Date().toISOString(),
      userEmail: req.user.email,
      isAnonymous: req.user.isAnonymous,
      manual: manual || false
    };

    const docRef = await db.collection('emergencies').add(emergencyData);
    
    // Emit real-time update to dashboard
    if (io) {
      io.to('dashboard').emit('new-emergency', {
        id: docRef.id,
        ...emergencyData
      });
    }

    // Send notifications to trusted contacts
    try {
      await sendEmergencyNotifications(userId, {
        id: docRef.id,
        ...emergencyData
      });
    } catch (notificationError) {
      console.error('Notification error:', notificationError);
    }

    // Send emergency alerts with live location to emergency contacts
    try {
      const alertResult = await sendEmergencyAlert(userId, {
        id: docRef.id,
        confidence: manual ? 100 : emergencyScore.totalScore,
        breakdown: emergencyScore.breakdown,
        manual: manual || false,
        ...emergencyData
      }, location);
      
      console.log('Emergency alert result:', alertResult);
    } catch (alertError) {
      console.error('Emergency alert error:', alertError);
    }

    res.json({
      success: true,
      emergencyId: docRef.id,
      score: manual ? 100 : emergencyScore.totalScore,
      breakdown: emergencyScore.breakdown,
      manual: manual || false
    });

  } catch (error) {
    console.error('Emergency report error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to report emergency',
      details: error.message 
    });
  }
});

// Cancel emergency
router.post('/cancel/:emergencyId', async (req, res) => {
  try {
    const { emergencyId } = req.params;
    const { reason, sensorSnapshot } = req.body;
    const userId = req.user.uid;
    
    const db = getFirestore();
    const io = req.app.get('io');

    // Verify the emergency belongs to the authenticated user
    const emergencyDoc = await db.collection('emergencies').doc(emergencyId).get();
    if (!emergencyDoc.exists) {
      return res.status(404).json({ error: 'Emergency not found' });
    }
    
    const emergencyData = emergencyDoc.data();
    if (emergencyData.userId !== userId) {
      return res.status(403).json({ error: 'You can only cancel your own emergencies' });
    }

    // Update emergency status
    await db.collection('emergencies').doc(emergencyId).update({
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelReason: reason,
      resolved: true
    });

    // Store learning data for adaptive algorithm
    if (sensorSnapshot) {
      await db.collection('learning_data').add({
        userId,
        emergencyId,
        sensorSnapshot,
        outcome: 'false_positive',
        timestamp: new Date().toISOString()
      });
    }

    // Emit cancellation to dashboard
    io.to('dashboard').emit('emergency-cancelled', {
      emergencyId,
      reason
    });

    res.json({ success: true });

  } catch (error) {
    console.error('Emergency cancellation error:', error);
    res.status(500).json({ error: 'Failed to cancel emergency' });
  }
});

// Get active emergencies (admin access - all emergencies)
router.get('/active', async (req, res) => {
  try {
    const db = getFirestore();
    
    console.log('Querying emergencies collection for active emergencies');
    
    const snapshot = await db.collection('emergencies')
      .where('status', '==', 'active')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    console.log(`Retrieved ${snapshot.size} active emergencies`);

    const emergencies = [];
    snapshot.forEach(doc => {
      emergencies.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(emergencies);

  } catch (firestoreError) {
    console.error('Get active emergencies error:', firestoreError);
    
    // Check for index-related errors
    if (firestoreError.code === 'FAILED_PRECONDITION') {
      console.error('FIRESTORE INDEX ERROR:');
      console.error('Collection: emergencies');
      console.error('Query fields: status (==), createdAt (orderBy desc)');
      console.error('Error details:', firestoreError.message);
      
      return res.status(500).json({
        success: false,
        error: `Firestore composite index required: Collection 'emergencies' needs composite index for fields 'status' and 'createdAt'. Error: ${firestoreError.message}`
      });
    }
    
    // Log query structure for debugging
    console.error('Query structure that failed:');
    console.error('- Collection: emergencies');
    console.error('- Where clause: status == active');
    console.error('- OrderBy clause: createdAt desc');
    console.error('- Limit: 50');
    console.error('- Query type: Direct collection query (not collectionGroup)');
    
    res.status(500).json({ 
      success: false,
      error: `Failed to get emergencies: ${firestoreError.message}` 
    });
  }
});

// Get user emergency history (user-specific)
router.get('/history/:userId', validateUserAccess, async (req, res) => {
  try {
    const { userId } = req.params;
    const db = getFirestore();
    
    console.log('Querying emergencies collection for user history, userId:', userId);
    
    const snapshot = await db.collection('emergencies')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    console.log(`Retrieved ${snapshot.size} emergency history records for user`);

    const emergencies = [];
    snapshot.forEach(doc => {
      emergencies.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(emergencies);

  } catch (firestoreError) {
    console.error('Get emergency history error:', firestoreError);
    
    // Check for index-related errors
    if (firestoreError.code === 'FAILED_PRECONDITION') {
      console.error('FIRESTORE INDEX ERROR:');
      console.error('Collection: emergencies');
      console.error('Query fields: userId (==), createdAt (orderBy desc)');
      console.error('Error details:', firestoreError.message);
      
      return res.status(500).json({
        success: false,
        error: `Firestore composite index required: Collection 'emergencies' needs composite index for fields 'userId' and 'createdAt'. Error: ${firestoreError.message}`
      });
    }
    
    // Log query structure for debugging
    console.error('Query structure that failed:');
    console.error('- Collection: emergencies');
    console.error('- Where clause: userId == ' + userId);
    console.error('- OrderBy clause: createdAt desc');
    console.error('- Limit: 20');
    console.error('- Query type: Direct collection query (not collectionGroup)');
    
    res.status(500).json({ 
      success: false,
      error: `Failed to get emergency history: ${firestoreError.message}` 
    });
  }
});

// Resolve emergency (admin function)
router.post('/resolve/:emergencyId', async (req, res) => {
  try {
    const { emergencyId } = req.params;
    const { notes } = req.body;
    const resolvedBy = req.user.email || req.user.uid;
    
    const db = getFirestore();
    const io = req.app.get('io');

    await db.collection('emergencies').doc(emergencyId).update({
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
      resolvedBy,
      resolutionNotes: notes,
      resolved: true
    });

    // Emit resolution to dashboard
    io.to('dashboard').emit('emergency-resolved', {
      emergencyId,
      resolvedBy,
      notes
    });

    res.json({ success: true });

  } catch (error) {
    console.error('Emergency resolution error:', error);
    res.status(500).json({ error: 'Failed to resolve emergency' });
  }
});

module.exports = router;