/**
 * Emergency Notification Service
 * Sends real-time emergency alerts with live location data
 */

const nodemailer = require('nodemailer');
const { getFirestore } = require('../config/firebase');

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send emergency alert to all user's emergency contacts
 * @param {string} userId - User ID who triggered the emergency
 * @param {Object} emergencyData - Emergency details
 * @param {Object} locationData - Current location data
 */
async function sendEmergencyAlert(userId, emergencyData, locationData = null) {
  console.log('Sending emergency alert for user:', userId);
  
  try {
    const db = getFirestore();
    
    // Get user's emergency contacts
    const contactsSnapshot = await db.collection('emergency_contacts')
      .where('userId', '==', userId)
      .get();
    
    if (contactsSnapshot.empty) {
      console.log('No emergency contacts found for user:', userId);
      return {
        success: false,
        message: 'No emergency contacts configured',
        emailsSent: 0
      };
    }
    
    // Get user's current location if not provided
    if (!locationData) {
      try {
        const sosEventsSnapshot = await db.collection('sos_events')
          .where('userId', '==', userId)
          .where('status', '==', 'active')
          .limit(1)
          .get();
        
        if (!sosEventsSnapshot.empty) {
          // Sort in memory to get the most recent
          const docs = sosEventsSnapshot.docs.sort((a, b) => {
            const aTime = a.data().updatedAt?.toDate?.() || new Date(a.data().updatedAt);
            const bTime = b.data().updatedAt?.toDate?.() || new Date(b.data().updatedAt);
            return bTime - aTime;
          });
          
          const locationDoc = docs[0].data();
          locationData = {
            latitude: locationDoc.latitude,
            longitude: locationDoc.longitude,
            accuracy: locationDoc.accuracy,
            lastUpdate: locationDoc.updatedAt?.toDate?.() || new Date(locationDoc.updatedAt),
            severity: locationDoc.severity || 'emergency'
          };
        }
      } catch (locationError) {
        console.error('Failed to retrieve location data:', locationError);
      }
    }
    
    // Build recipient list
    const recipients = [
      {
        name: 'SilentSOS Admin',
        email: 'kanijayachandran25@gmail.com',
        type: 'admin'
      }
    ];
    
    contactsSnapshot.forEach(doc => {
      const contact = doc.data();
      if (contact.email && contact.email !== 'kanijayachandran25@gmail.com') {
        recipients.push({
          name: contact.name,
          email: contact.email,
          type: 'emergency_contact'
        });
      }
    });
    
    console.log(`Sending emergency alerts to ${recipients.length} recipients`);
    
    // Send emails
    const emailResults = {
      total: recipients.length,
      successful: 0,
      failed: 0,
      details: []
    };
    
    for (const recipient of recipients) {
      try {
        const htmlContent = generateEmergencyAlertHTML({
          recipientName: recipient.name,
          recipientType: recipient.type,
          userId,
          emergencyData,
          locationData,
          timestamp: new Date().toLocaleString()
        });
        
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: recipient.email,
          subject: '🚨 URGENT: SilentSOS Emergency Detected',
          html: htmlContent
        };
        
        await transporter.sendMail(mailOptions);
        
        emailResults.successful++;
        emailResults.details.push({
          recipient: recipient.email,
          status: 'sent',
          type: recipient.type
        });
        
        console.log(`Emergency alert sent to ${recipient.type}: ${recipient.email}`);
        
      } catch (emailError) {
        console.error(`Failed to send emergency email to ${recipient.email}:`, emailError);
        
        emailResults.failed++;
        emailResults.details.push({
          recipient: recipient.email,
          status: 'failed',
          type: recipient.type,
          error: emailError.message
        });
      }
    }
    
    return {
      success: true,
      message: `Emergency alerts sent to ${emailResults.successful}/${emailResults.total} recipients`,
      emailResults,
      locationIncluded: locationData !== null
    };
    
  } catch (error) {
    console.error('Emergency notification service error:', error);
    return {
      success: false,
      message: `Failed to send emergency alerts: ${error.message}`,
      emailsSent: 0
    };
  }
}

/**
 * Generate emergency alert email HTML
 */
function generateEmergencyAlertHTML(data) {
  const { recipientName, recipientType, userId, emergencyData, locationData, timestamp } = data;
  
  const isAdmin = recipientType === 'admin';
  const greeting = isAdmin ? 'SilentSOS Administrator' : recipientName;
  
  // Generate location section
  let locationSection = '';
  if (locationData) {
    const { latitude, longitude, accuracy, lastUpdate, severity } = locationData;
    const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const appleMapsUrl = `https://maps.apple.com/?q=${latitude},${longitude}`;
    
    locationSection = `
      <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
        <h3 style="color: #dc2626; margin-top: 0; display: flex; align-items: center;">
          🚨 EMERGENCY LOCATION
        </h3>
        
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #fecaca; font-weight: bold; color: #dc2626;">Coordinates:</td>
            <td style="padding: 8px; border-bottom: 1px solid #fecaca; color: #dc2626;">
              <strong>${latitude.toFixed(6)}, ${longitude.toFixed(6)}</strong>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #fecaca; font-weight: bold; color: #dc2626;">Accuracy:</td>
            <td style="padding: 8px; border-bottom: 1px solid #fecaca; color: #dc2626;">±${accuracy}m</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #fecaca; font-weight: bold; color: #dc2626;">Last Update:</td>
            <td style="padding: 8px; border-bottom: 1px solid #fecaca; color: #dc2626;">
              ${lastUpdate.toLocaleString()}
            </td>
          </tr>
        </table>
        
        <div style="margin-top: 15px;">
          <a href="${googleMapsUrl}" target="_blank" 
             style="background-color: #dc2626; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; margin-right: 10px;">
            📍 Google Maps
          </a>
          <a href="${appleMapsUrl}" target="_blank" 
             style="background-color: #374151; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            🍎 Apple Maps
          </a>
        </div>
        
        <p style="color: #dc2626; font-size: 12px; margin: 15px 0 0 0; font-style: italic;">
          * This is the user's live GPS location at the time of emergency detection
        </p>
      </div>
    `;
  } else {
    locationSection = `
      <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <h3 style="color: #92400e; margin-top: 0;">📍 Location Status</h3>
        <p style="color: #92400e; margin: 0;">
          ⚠️ Location data not available. GPS may be disabled or location tracking inactive.
        </p>
      </div>
    `;
  }
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">🚨 EMERGENCY ALERT</h1>
        <p style="font-size: 18px; margin: 10px 0 0 0; font-weight: bold;">SilentSOS Emergency Detected</p>
      </div>
      
      <div style="padding: 20px; background-color: #f9f9f9;">
        <h2 style="color: #dc2626;">URGENT: ${greeting}</h2>
        <p style="font-size: 16px; color: #374151; font-weight: bold;">
          ${isAdmin 
            ? 'An emergency has been automatically detected by the SilentSOS system.' 
            : 'The person who added you as an emergency contact may be in danger and needs immediate assistance.'
          }
        </p>
        
        <div style="background-color: #dc2626; color: white; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
          <h3 style="margin-top: 0; font-size: 18px;">⚠️ IMMEDIATE ACTION REQUIRED</h3>
          <p style="margin: 0; font-size: 14px;">
            ${isAdmin 
              ? 'Review emergency details and coordinate response if needed.'
              : 'Please check on this person immediately or contact emergency services if you cannot reach them.'
            }
          </p>
        </div>
        
        ${locationSection}
        
        <h3>Emergency Details</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Emergency ID:</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${emergencyData.id || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Confidence Level:</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">
              <strong style="color: #dc2626;">${Math.round(emergencyData.confidence || 0)}%</strong>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Detection Time:</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${timestamp}</td>
          </tr>
          ${isAdmin ? `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">User ID:</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${userId}</td>
          </tr>
          ` : ''}
        </table>
        
        ${emergencyData.breakdown ? `
        <h4>Detection Factors:</h4>
        <ul style="color: #374151;">
          <li>Sensor Score: ${Math.round(emergencyData.breakdown.sensorScore || 0)}%</li>
          <li>Context Score: ${Math.round(emergencyData.breakdown.contextScore || 0)}%</li>
          <li>Location Score: ${Math.round(emergencyData.breakdown.locationScore || 0)}%</li>
        </ul>
        ` : ''}
        
        ${!isAdmin ? `
        <div style="background-color: #dbeafe; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #1e40af; margin-top: 0;">What You Should Do:</h3>
          <ol style="color: #1e40af; margin: 0; padding-left: 20px;">
            <li><strong>Try to contact the person immediately</strong> by phone or text</li>
            <li><strong>If you cannot reach them</strong>, consider calling emergency services</li>
            <li><strong>Use the location information</strong> provided above to help responders</li>
            <li><strong>Stay calm</strong> but act quickly - this is an automated alert</li>
          </ol>
        </div>
        ` : `
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #92400e; margin-top: 0;">System Status:</h3>
          <p style="color: #92400e; margin: 0;">
            🚨 Emergency automatically detected by AI system<br>
            📍 Live location data ${locationData ? 'included' : 'not available'}<br>
            📧 All emergency contacts have been notified<br>
            ⏰ Response coordination may be required
          </p>
        </div>
        `}
        
        <div style="border-top: 2px solid #dc2626; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #666;">
          <p><strong>This is an automated emergency alert from SilentSOS.</strong></p>
          <p>Alert generated: ${new Date().toISOString()}</p>
          ${locationData ? '<p>📍 Location is updated in real-time from GPS sensors</p>' : ''}
          <p style="color: #dc2626; font-weight: bold;">If this is a false alarm, the user can cancel within 5 seconds of detection.</p>
        </div>
      </div>
    </div>
  `;
}

module.exports = {
  sendEmergencyAlert
};