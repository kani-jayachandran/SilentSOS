const express = require('express');
const router = express.Router();
const { getFirestore, admin } = require('../config/firebase');
const { authenticateUser } = require('../middleware/auth');
const nodemailer = require('nodemailer');

// Apply authentication middleware
router.use(authenticateUser);

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Add emergency contact with multi-recipient email alerts
router.post('/add', async (req, res) => {
  try {
    const { name, phone, email, relationship } = req.body;
    const userId = req.user.uid;

    // Validate required fields
    if (!name || !phone || !email) {
      return res.status(400).json({
        success: false,
        error: "Name, phone, and email are required"
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: "Invalid email format"
      });
    }

    const db = getFirestore();
    
    // Prepare contact data
    const contactData = {
      userId,
      name,
      phone,
      email,
      relationship: relationship || 'Emergency Contact',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      userEmail: req.user.email || 'Anonymous User'
    };

    // Save to Firestore
    let docRef;
    try {
      docRef = await db.collection('emergency_contacts').add(contactData);
      console.log('Emergency contact saved to Firestore:', docRef.id);
    } catch (firestoreError) {
      console.error('Firestore write failed:', firestoreError);
      return res.status(500).json({
        success: false,
        error: `Firestore write failed: ${firestoreError.message}`
      });
    }

    // Get all existing emergency contacts for this user to build recipient list
    let allContacts = [];
    try {
      console.log('Querying emergency_contacts collection for userId:', userId);
      
      const contactsSnapshot = await db.collection('emergency_contacts')
        .where('userId', '==', userId)
        .get();
      
      console.log(`Found ${contactsSnapshot.size} existing contacts for user`);
      
      contactsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.email) {
          allContacts.push({
            id: doc.id,
            name: data.name,
            email: data.email
          });
        }
      });
      
      console.log(`${allContacts.length} contacts have valid email addresses`);
      
    } catch (firestoreQueryError) {
      console.error('Firestore query failed for emergency_contacts:', firestoreQueryError);
      
      // Check for index-related errors
      if (firestoreQueryError.code === 'FAILED_PRECONDITION') {
        console.error('FIRESTORE INDEX ERROR:');
        console.error('Collection: emergency_contacts');
        console.error('Query fields: userId (==)');
        console.error('Error details:', firestoreQueryError.message);
        
        return res.status(500).json({
          success: false,
          error: `Firestore index required: Collection 'emergency_contacts' needs index for field 'userId'. Error: ${firestoreQueryError.message}`
        });
      }
      
      // Log query structure for debugging
      console.error('Query structure that failed:');
      console.error('- Collection: emergency_contacts');
      console.error('- Where clause: userId == ' + userId);
      console.error('- Query type: Direct collection query (not collectionGroup)');
      
      // Continue with just the admin email if query fails
      console.log('Continuing with admin-only email due to query failure');
    }

    // Send multi-recipient email alerts
    const emailResults = await sendMultiRecipientEmergencyAlert({
      userId,
      newContact: { name, phone, email, relationship },
      allContacts,
      userEmail: req.user.email,
      contactId: docRef.id
    });

    // Return success response with email details
    res.json({
      success: true,
      message: "Emergency contact saved. Alert sent to admin and emergency contacts.",
      contactId: docRef.id,
      emailResults
    });

  } catch (error) {
    console.error('Emergency contact add error:', error);
    res.status(500).json({
      success: false,
      error: `Server error: ${error.message}`
    });
  }
});

// Send multi-recipient emergency contact alert emails
async function sendMultiRecipientEmergencyAlert(alertData) {
  const { userId, newContact, allContacts, userEmail, contactId } = alertData;
  const { name, phone, email, relationship } = newContact;
  
  // Get user's current location from sos_events
  let userLocation = null;
  try {
    const db = getFirestore();
    const sosEventsSnapshot = await db.collection('sos_events')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get();
    
    if (!sosEventsSnapshot.empty) {
      const locationData = sosEventsSnapshot.docs[0].data();
      userLocation = {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        lastUpdate: locationData.updatedAt?.toDate?.() || new Date(locationData.updatedAt),
        severity: locationData.severity || 'normal'
      };
      console.log('User location retrieved for email:', userLocation);
    } else {
      console.log('No active location data found for user:', userId);
    }
  } catch (locationError) {
    console.error('Failed to retrieve user location for email:', locationError);
    // Continue without location data
  }
  
  // Build recipient list
  const recipients = [
    { 
      name: 'SilentSOS Admin', 
      email: 'kanijayachandran25@gmail.com',
      type: 'admin'
    }
  ];
  
  // Add all emergency contacts as recipients
  allContacts.forEach(contact => {
    if (contact.email && contact.email !== 'kanijayachandran25@gmail.com') {
      recipients.push({
        name: contact.name,
        email: contact.email,
        type: 'emergency_contact'
      });
    }
  });

  const subject = '🚨 SilentSOS Emergency Alert - Contact Added';
  const timestamp = new Date().toLocaleString();
  
  const emailResults = {
    total: recipients.length,
    successful: 0,
    failed: 0,
    details: [],
    locationIncluded: userLocation !== null
  };

  // Send email to each recipient individually
  for (const recipient of recipients) {
    try {
      const htmlContent = generateEmergencyAlertEmail({
        recipientName: recipient.name,
        recipientType: recipient.type,
        userId,
        userEmail,
        contactName: name,
        contactPhone: phone,
        contactEmail: email,
        relationship,
        contactId,
        timestamp,
        userLocation
      });
      
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipient.email,
        subject: subject,
        html: htmlContent
      };
      
      await transporter.sendMail(mailOptions);
      
      emailResults.successful++;
      emailResults.details.push({
        recipient: recipient.email,
        status: 'sent',
        type: recipient.type,
        locationIncluded: userLocation !== null
      });
      
      console.log(`Emergency alert sent to ${recipient.type}: ${recipient.email} (location: ${userLocation ? 'included' : 'not available'})`);
      
    } catch (emailError) {
      console.error(`Failed to send email to ${recipient.email}:`, emailError);
      
      emailResults.failed++;
      emailResults.details.push({
        recipient: recipient.email,
        status: 'failed',
        type: recipient.type,
        error: emailError.message
      });
    }
  }
  
  return emailResults;
}

// Generate emergency alert email HTML
function generateEmergencyAlertEmail(data) {
  const { 
    recipientName, 
    recipientType, 
    userId, 
    userEmail, 
    contactName, 
    contactPhone, 
    contactEmail,
    relationship, 
    contactId, 
    timestamp,
    userLocation
  } = data;
  
  const isAdmin = recipientType === 'admin';
  const greeting = isAdmin ? 'SilentSOS Administrator' : recipientName;
  const message = isAdmin 
    ? 'A new emergency contact has been added to the SilentSOS system.'
    : 'You have been added as an emergency contact. Please stay alert.';

  // Generate location section
  let locationSection = '';
  if (userLocation) {
    const { latitude, longitude, accuracy, lastUpdate, severity } = userLocation;
    const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const severityColor = severity === 'emergency' ? '#dc2626' : 
                         severity === 'suspicious' ? '#f59e0b' : '#10b981';
    const severityText = severity.charAt(0).toUpperCase() + severity.slice(1);
    
    locationSection = `
      <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
        <h3 style="color: #0c4a6e; margin-top: 0; display: flex; align-items: center;">
          📍 User's Current Location
        </h3>
        
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e0f2fe; font-weight: bold; color: #0c4a6e;">Coordinates:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e0f2fe; color: #0c4a6e;">
              <a href="${googleMapsUrl}" target="_blank" style="color: #0ea5e9; text-decoration: none;">
                ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e0f2fe; font-weight: bold; color: #0c4a6e;">Accuracy:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e0f2fe; color: #0c4a6e;">±${accuracy}m</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e0f2fe; font-weight: bold; color: #0c4a6e;">Status:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e0f2fe;">
              <span style="background-color: ${severityColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                ${severityText}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e0f2fe; font-weight: bold; color: #0c4a6e;">Last Update:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e0f2fe; color: #0c4a6e;">
              ${lastUpdate.toLocaleString()}
            </td>
          </tr>
        </table>
        
        <div style="margin-top: 15px;">
          <a href="${googleMapsUrl}" target="_blank" 
             style="background-color: #0ea5e9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            📍 View on Google Maps
          </a>
        </div>
        
        <p style="color: #0c4a6e; font-size: 12px; margin: 10px 0 0 0; font-style: italic;">
          * Location data is updated in real-time from the user's device GPS
        </p>
      </div>
    `;
  } else {
    locationSection = `
      <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <h3 style="color: #92400e; margin-top: 0;">📍 Location Status</h3>
        <p style="color: #92400e; margin: 0;">
          ⚠️ User location not currently available. Location tracking may not be active or GPS may be disabled.
        </p>
      </div>
    `;
  }
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
        <h1>🚨 SilentSOS Emergency Alert</h1>
        <p style="font-size: 18px; margin: 0;">Emergency Contact Added</p>
      </div>
      
      <div style="padding: 20px; background-color: #f9f9f9;">
        <h2>Hello ${greeting},</h2>
        <p style="font-size: 16px; color: #374151;">${message}</p>
        
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #92400e; margin-top: 0;">Alert Details:</h3>
          <p style="color: #92400e; margin: 0;">
            <strong>Alert Type:</strong> Emergency Contact Added<br>
            <strong>Timestamp:</strong> ${timestamp}
          </p>
        </div>
        
        ${locationSection}
        
        <h3>Contact Information</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Contact Name:</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${contactName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Contact Phone:</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${contactPhone}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Contact Email:</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${contactEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Relationship:</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${relationship}</td>
          </tr>
          ${isAdmin ? `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">User ID:</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${userId}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">User Email:</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${userEmail || 'Anonymous'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Contact ID:</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${contactId}</td>
          </tr>
          ` : ''}
        </table>
        
        ${!isAdmin ? `
        <div style="background-color: #dbeafe; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #1e40af; margin-top: 0;">What This Means:</h3>
          <p style="color: #1e40af; margin: 0;">
            • You are now listed as an emergency contact for this user<br>
            • You may receive emergency alerts if SilentSOS detects a dangerous situation<br>
            • The user's live location will be included in emergency notifications<br>
            • Please keep your phone accessible and respond promptly to emergency notifications<br>
            • Contact the user if you have questions about this designation
          </p>
        </div>
        ` : `
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #92400e; margin-top: 0;">System Status:</h3>
          <p style="color: #92400e; margin: 0;">
            ✅ Emergency contact successfully saved to Firestore database<br>
            📧 Multi-recipient email notifications sent<br>
            📍 Live location data ${userLocation ? 'included' : 'not available'}<br>
            🔒 All data encrypted and securely stored<br>
            🚨 Emergency detection system active
          </p>
        </div>
        `}
        
        <div style="border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #666;">
          <p>This alert was automatically generated by SilentSOS emergency contact system.</p>
          <p>Time: ${new Date().toISOString()}</p>
          ${userLocation ? '<p>📍 Location data is updated in real-time from GPS sensors</p>' : ''}
          ${!isAdmin ? '<p>If you did not expect this notification, please contact the user immediately.</p>' : ''}
        </div>
      </div>
    </div>
  `;
}

// Get emergency contacts for user
router.get('/list', async (req, res) => {
  try {
    const userId = req.user.uid;
    const db = getFirestore();
    
    console.log('Querying emergency_contacts collection for user list, userId:', userId);
    
    const snapshot = await db.collection('emergency_contacts')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    console.log(`Retrieved ${snapshot.size} emergency contacts for user`);
    
    const contacts = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      contacts.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
      });
    });
    
    res.json({
      success: true,
      contacts
    });
    
  } catch (firestoreError) {
    console.error('Get emergency contacts error:', firestoreError);
    
    // Check for index-related errors
    if (firestoreError.code === 'FAILED_PRECONDITION') {
      console.error('FIRESTORE INDEX ERROR:');
      console.error('Collection: emergency_contacts');
      console.error('Query fields: userId (==), createdAt (orderBy desc)');
      console.error('Error details:', firestoreError.message);
      
      return res.status(500).json({
        success: false,
        error: `Firestore composite index required: Collection 'emergency_contacts' needs composite index for fields 'userId' and 'createdAt'. Error: ${firestoreError.message}`
      });
    }
    
    // Log query structure for debugging
    console.error('Query structure that failed:');
    console.error('- Collection: emergency_contacts');
    console.error('- Where clause: userId == ' + req.user.uid);
    console.error('- OrderBy clause: createdAt desc');
    console.error('- Query type: Direct collection query (not collectionGroup)');
    
    res.status(500).json({
      success: false,
      error: `Failed to retrieve contacts: ${firestoreError.message}`
    });
  }
});

module.exports = router;