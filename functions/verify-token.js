const axios = require('axios');

exports.handler = async function(event, context) {
  console.log('🔵 NETLIFY FUNCTION - Verify token endpoint hit at:', new Date().toISOString());
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }
  
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ success: false, message: 'Method not allowed' })
      };
    }
    
    // Parse request body
    let requestBody;
    try {
      if (typeof event.body === 'string') {
        requestBody = JSON.parse(event.body);
      } else if (typeof event.body === 'object') {
        requestBody = event.body;
      } else {
        throw new Error('Invalid request body format');
      }
    } catch (error) {
      console.error('Error parsing request body:', error);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, message: 'Invalid JSON in request body' })
      };
    }
    
    console.log('Request body:', JSON.stringify(requestBody));
    const { token } = requestBody;
    
    if (!token) {
      console.log('No token provided in request');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, message: 'No token provided' })
      };
    }
    
    console.log('Attempting to verify token with Printify API');
    
    // Verify token by making a simple request to Printify API
    try {
      const response = await axios.get('https://api.printify.com/v1/shops.json', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Token verification successful, Printify API response status:', response.status);
      console.log('Printify API response data:', JSON.stringify(response.data));
      
      // Ensure we're returning the shops data in the expected format
      let shopsData;
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        // Standard Printify API response format
        shopsData = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        // Alternative format
        shopsData = response.data;
      } else {
        // Fallback - create an empty array
        console.error('Unexpected Printify API response format');
        shopsData = [];
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: 'Token is valid',
          shops: shopsData
        })
      };
    } catch (error) {
      console.error('Token verification failed:', error.response ? error.response.status : error.message);
      
      // Return a 200 status with success: false to make it easier for the frontend to handle
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: false, 
          message: 'Invalid token',
          error: error.message
        })
      };
    }
    
  } catch (error) {
    console.error('Error in verify token function:', error);
    return {
      statusCode: 200, // Still return 200 to make it easier for frontend to handle
      headers,
      body: JSON.stringify({ 
        success: false, 
        message: `Server error: ${error.message}` 
      })
    };
  }
};
