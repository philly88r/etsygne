const axios = require('axios');

// Helper function to make requests to Printify API
async function printifyRequest(endpoint, method = 'GET', data = null, token) {
  try {
    const url = `https://api.printify.com/v1${endpoint}`;
    console.log(`Making Printify API request to ${method} ${endpoint}`);
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    const options = {
      method,
      url,
      headers,
      data: data ? JSON.stringify(data) : undefined
    };
    
    const response = await axios(options);
    return response.data;
  } catch (error) {
    console.error('Error making Printify API request:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

exports.handler = async function(event, context) {
  console.log(' NETLIFY FUNCTION - Image upload endpoint hit at:', new Date().toISOString());
  
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
    console.log('Request headers:', JSON.stringify(event.headers));
    
    // Get authorization token
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 200,
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
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: false, message: 'Invalid JSON in request body' })
      };
    }
    
    console.log('Parsed request body:', JSON.stringify(requestBody));
    
    // Validate required fields
    const { fileName, imageUrl, imageData } = requestBody;
    
    if (!fileName) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: false, message: 'Missing required field: fileName' })
      };
    }
    
    if (!imageUrl && !imageData) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: false, message: 'Either imageUrl or imageData is required' })
      };
    }
    
    // Prepare payload for Printify API
    let printifyPayload;
    
    if (imageUrl) {
      console.log('Using imageUrl for upload');
      printifyPayload = {
        file_name: fileName,
        url: imageUrl
      };
    } else {
      console.log('Using imageData for upload');
      printifyPayload = {
        file_name: fileName,
        contents: imageData
      };
    }
    
    console.log('Sending request to Printify API');
    
    // Make request to Printify API
    try {
      const printifyResponse = await axios.post(
        'https://api.printify.com/v1/uploads/images.json',
        printifyPayload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Printify API response status:', printifyResponse.status);
      console.log('Printify API response data:', JSON.stringify(printifyResponse.data));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Image uploaded successfully',
          image: printifyResponse.data
        })
      };
    } catch (error) {
      console.error('Error from Printify API:', error.message);
      console.error('Error details:', error.response ? JSON.stringify(error.response.data) : 'No response data');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Failed to upload image to Printify',
          error: error.response ? error.response.data : error.message
        })
      };
    }
  } catch (error) {
    console.error('Server error:', error);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: false, message: `Server error: ${error.message}` })
    };
  }
};
