const admin = require('firebase-admin');

let db;

const initializeFirebase = () => {
  try {
    // Initialize Firebase Admin SDK
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        // Add your Firebase project config here
      });
    }
    
    db = admin.firestore();
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
};

const getFirestore = () => {
  if (!db) {
    throw new Error('Firestore not initialized');
  }
  return db;
};

module.exports = {
  initializeFirebase,
  getFirestore,
  admin
};