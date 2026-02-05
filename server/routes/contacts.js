const express = require('express');
const router = express.Router();
const { getFirestore } = require('../config/firebase');
const { authenticateUser, validateUserAccess } = require('../middleware/auth');

// Apply authentication middleware to all contact routes
router.use(authenticateUser);

// Add trusted contact
router.post('/:userId', validateUserAccess, async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, phone, relationship } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    
    const db = getFirestore();
    
    // Get current user data
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    
    const trustedContacts = userData.trustedContacts || [];
    
    // Check if contact already exists
    const existingContact = trustedContacts.find(contact => contact.email === email);
    if (existingContact) {
      return res.status(400).json({ error: 'Contact already exists' });
    }
    
    // Add new contact
    const newContact = {
      id: Date.now().toString(),
      name,
      email,
      phone,
      relationship,
      addedAt: new Date().toISOString(),
      verified: false
    };
    
    trustedContacts.push(newContact);
    
    await db.collection('users').doc(userId).update({
      trustedContacts,
      updatedAt: new Date().toISOString()
    });
    
    res.json({ success: true, contact: newContact });
    
  } catch (error) {
    console.error('Add contact error:', error);
    res.status(500).json({ error: 'Failed to add trusted contact' });
  }
});

// Get trusted contacts
router.get('/:userId', validateUserAccess, async (req, res) => {
  try {
    const { userId } = req.params;
    const db = getFirestore();
    
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.json([]);
    }
    
    const userData = userDoc.data();
    const trustedContacts = userData.trustedContacts || [];
    
    res.json(trustedContacts);
    
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: 'Failed to get trusted contacts' });
  }
});

// Update trusted contact
router.put('/:userId/:contactId', validateUserAccess, async (req, res) => {
  try {
    const { userId, contactId } = req.params;
    const { name, email, phone, relationship } = req.body;
    
    const db = getFirestore();
    
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    const trustedContacts = userData.trustedContacts || [];
    
    const contactIndex = trustedContacts.findIndex(contact => contact.id === contactId);
    if (contactIndex === -1) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    // Update contact
    trustedContacts[contactIndex] = {
      ...trustedContacts[contactIndex],
      name,
      email,
      phone,
      relationship,
      updatedAt: new Date().toISOString()
    };
    
    await db.collection('users').doc(userId).update({
      trustedContacts,
      updatedAt: new Date().toISOString()
    });
    
    res.json({ success: true, contact: trustedContacts[contactIndex] });
    
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ error: 'Failed to update trusted contact' });
  }
});

// Delete trusted contact
router.delete('/:userId/:contactId', validateUserAccess, async (req, res) => {
  try {
    const { userId, contactId } = req.params;
    const db = getFirestore();
    
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    const trustedContacts = userData.trustedContacts || [];
    
    const filteredContacts = trustedContacts.filter(contact => contact.id !== contactId);
    
    if (filteredContacts.length === trustedContacts.length) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    await db.collection('users').doc(userId).update({
      trustedContacts: filteredContacts,
      updatedAt: new Date().toISOString()
    });
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ error: 'Failed to delete trusted contact' });
  }
});

// Verify contact (for future use - email verification)
router.post('/:userId/:contactId/verify', validateUserAccess, async (req, res) => {
  try {
    const { userId, contactId } = req.params;
    const { verificationCode } = req.body;
    
    const db = getFirestore();
    
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    const trustedContacts = userData.trustedContacts || [];
    
    const contactIndex = trustedContacts.findIndex(contact => contact.id === contactId);
    if (contactIndex === -1) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    // For now, just mark as verified
    // In production, you'd verify the code against a stored verification
    trustedContacts[contactIndex].verified = true;
    trustedContacts[contactIndex].verifiedAt = new Date().toISOString();
    
    await db.collection('users').doc(userId).update({
      trustedContacts,
      updatedAt: new Date().toISOString()
    });
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Verify contact error:', error);
    res.status(500).json({ error: 'Failed to verify contact' });
  }
});

module.exports = router;