const { admin } = require('../config/firebase');

/**
 * Firebase Authentication Middleware
 * Validates Firebase ID tokens and ensures user is authenticated
 */
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized: No valid authentication token provided' 
      });
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    
    if (!idToken) {
      return res.status(401).json({ 
        error: 'Unauthorized: Invalid token format' 
      });
    }
    
    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Add user info to request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      isAnonymous: decodedToken.firebase.sign_in_provider === 'anonymous'
    };
    
    next();
    
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        error: 'Unauthorized: Token expired. Please sign in again.' 
      });
    }
    
    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({ 
        error: 'Unauthorized: Token revoked. Please sign in again.' 
      });
    }
    
    return res.status(401).json({ 
      error: 'Unauthorized: Invalid authentication token' 
    });
  }
};

/**
 * Validate that the authenticated user matches the requested userId
 */
const validateUserAccess = (req, res, next) => {
  const requestedUserId = req.params.userId;
  const authenticatedUserId = req.user.uid;
  
  if (requestedUserId !== authenticatedUserId) {
    return res.status(403).json({ 
      error: 'Forbidden: You can only access your own data' 
    });
  }
  
  next();
};

module.exports = {
  authenticateUser,
  validateUserAccess
};