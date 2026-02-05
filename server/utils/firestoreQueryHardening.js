/**
 * Firestore Query Hardening Utilities
 * Provides consistent error handling and logging for Firestore queries
 */

/**
 * Handle Firestore query errors with detailed logging and index error detection
 * @param {Error} error - The Firestore error
 * @param {Object} queryInfo - Information about the query that failed
 * @param {string} queryInfo.collection - Collection name
 * @param {Array} queryInfo.whereFields - Array of where clause fields
 * @param {Array} queryInfo.orderByFields - Array of orderBy fields
 * @param {number} queryInfo.limit - Query limit if any
 * @returns {Object} Standardized error response
 */
function handleFirestoreQueryError(error, queryInfo) {
  const { collection, whereFields = [], orderByFields = [], limit } = queryInfo;
  
  console.error(`Firestore query failed for collection: ${collection}`, error);
  
  // Check for index-related errors
  if (error.code === 'FAILED_PRECONDITION') {
    console.error('FIRESTORE INDEX ERROR:');
    console.error(`Collection: ${collection}`);
    
    const allFields = [...whereFields, ...orderByFields];
    console.error(`Query fields: ${allFields.join(', ')}`);
    console.error('Error details:', error.message);
    
    // Generate helpful index creation message
    let indexMessage = `Firestore composite index required: Collection '${collection}' needs `;
    if (allFields.length === 1) {
      indexMessage += `index for field '${allFields[0]}'`;
    } else {
      indexMessage += `composite index for fields '${allFields.join("', '")}'`;
    }
    
    return {
      success: false,
      error: `${indexMessage}. Error: ${error.message}`,
      indexRequired: true,
      collection,
      fields: allFields
    };
  }
  
  // Log query structure for debugging
  console.error('Query structure that failed:');
  console.error(`- Collection: ${collection}`);
  
  if (whereFields.length > 0) {
    whereFields.forEach(field => {
      console.error(`- Where clause: ${field}`);
    });
  }
  
  if (orderByFields.length > 0) {
    orderByFields.forEach(field => {
      console.error(`- OrderBy clause: ${field}`);
    });
  }
  
  if (limit) {
    console.error(`- Limit: ${limit}`);
  }
  
  console.error('- Query type: Direct collection query (not collectionGroup)');
  
  return {
    success: false,
    error: `Query failed: ${error.message}`,
    collection,
    queryInfo
  };
}

/**
 * Log successful query execution
 * @param {string} collection - Collection name
 * @param {number} resultCount - Number of documents returned
 * @param {string} operation - Type of operation (query, get, etc.)
 */
function logQuerySuccess(collection, resultCount, operation = 'query') {
  console.log(`Firestore ${operation} successful: Collection '${collection}' returned ${resultCount} documents`);
}

/**
 * Validate query parameters to prevent common issues
 * @param {Object} queryParams - Query parameters to validate
 * @param {string} queryParams.collection - Collection name
 * @param {Array} queryParams.whereFields - Where clause fields
 * @param {Array} queryParams.orderByFields - OrderBy fields
 * @returns {Object} Validation result
 */
function validateQueryParams(queryParams) {
  const { collection, whereFields = [], orderByFields = [] } = queryParams;
  
  if (!collection || typeof collection !== 'string') {
    return {
      valid: false,
      error: 'Collection name is required and must be a string'
    };
  }
  
  // Check for collectionGroup usage (should be avoided unless necessary)
  if (collection.includes('/')) {
    console.warn(`Warning: Collection path '${collection}' suggests collectionGroup usage. Use direct collection queries when possible.`);
  }
  
  // Validate field names
  const allFields = [...whereFields, ...orderByFields];
  for (const field of allFields) {
    if (!field || typeof field !== 'string') {
      return {
        valid: false,
        error: `Invalid field name: ${field}. All field names must be non-empty strings.`
      };
    }
  }
  
  return { valid: true };
}

/**
 * Execute a Firestore query with proper error handling and logging
 * @param {Function} queryFunction - Function that executes the Firestore query
 * @param {Object} queryInfo - Information about the query for error handling
 * @returns {Promise<Object>} Query result or error response
 */
async function executeHardenedQuery(queryFunction, queryInfo) {
  const validation = validateQueryParams(queryInfo);
  if (!validation.valid) {
    console.error('Query validation failed:', validation.error);
    return {
      success: false,
      error: validation.error
    };
  }
  
  try {
    console.log(`Executing Firestore query on collection: ${queryInfo.collection}`);
    
    const result = await queryFunction();
    
    // Log success
    const resultCount = result.size !== undefined ? result.size : (result.length || 1);
    logQuerySuccess(queryInfo.collection, resultCount);
    
    return {
      success: true,
      result
    };
    
  } catch (error) {
    return handleFirestoreQueryError(error, queryInfo);
  }
}

module.exports = {
  handleFirestoreQueryError,
  logQuerySuccess,
  validateQueryParams,
  executeHardenedQuery
};