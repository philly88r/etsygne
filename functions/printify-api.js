const axios = require('axios');

exports.handler = async function(event, context) {
  console.log('🔵 NETLIFY FUNCTION - Printify API endpoint hit at:', new Date().toISOString());
  
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
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: false, message: 'Method not allowed' })
      };
    }
    
    // Log request details for debugging
    console.log('Request IP:', event.headers['client-ip'] || 'Unknown');
    
    // Get authorization token
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 200, // Use 200 for easier frontend handling
        headers,
        body: JSON.stringify({ success: false, message: 'Authorization header missing or invalid' })
      };
    }
    
    const token = authHeader.split(' ')[1];
    console.log('Token present:', !!token);
    
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
        statusCode: 200, // Use 200 for easier frontend handling
        headers,
        body: JSON.stringify({ success: false, message: 'Invalid JSON in request body' })
      };
    }
    
    console.log('Parsed request body:', JSON.stringify(requestBody));
    
    // Validate required fields
    const { endpoint, method, data } = requestBody;
    
    if (!endpoint) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: false, message: 'Missing required field: endpoint' })
      };
    }
    
    if (!method) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: false, message: 'Missing required field: method' })
      };
    }
    
    // Make request to Printify API
    try {
      const printifyUrl = `https://api.printify.com/v1${endpoint}`;
      console.log(`Making ${method} request to Printify API: ${printifyUrl}`);
      
      const options = {
        method,
        url: printifyUrl,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      
      // Add data if provided
      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.data = data;
      }
      
      const response = await axios(options);
      
      console.log('Printify API response status:', response.status);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          ...response.data
        })
      };
    } catch (error) {
      console.error('Error from Printify API:', error.message);
      console.error('Error details:', error.response ? JSON.stringify(error.response.data) : 'No response data');
      
      return {
        statusCode: 200, // Use 200 for easier frontend handling
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Failed to make request to Printify API',
          error: error.response ? error.response.data : error.message
        })
      };
    }
  } catch (error) {
    console.error('Server error:', error);
    return {
      statusCode: 200, // Use 200 for easier frontend handling
      headers,
      body: JSON.stringify({ success: false, message: `Server error: ${error.message}` })
    };
  }
};
