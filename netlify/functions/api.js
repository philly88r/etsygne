const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const PRINTIFY_API_BASE_URL = 'https://api.printify.com/v1';
const GOOGLE_API_KEY = 'AIzaSyAXvOheDSSeftRXkZgr9mLAkzfAqSOLwFg';

// Helper function to make HTTP requests
async function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

// Helper function to make requests to Printify API
async function printifyRequest(endpoint, method, data = null, token) {
  const options = {
    hostname: 'api.printify.com',
    path: `/v1${endpoint}`,
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  return (await makeRequest(options, data ? JSON.stringify(data) : null)).data;
}

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };
  
  // Handle OPTIONS request (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }
  
  const path = event.path.replace('/.netlify/functions/api', '');
  const method = event.httpMethod;
  const body = event.body ? JSON.parse(event.body) : {};
  const token = event.headers.authorization?.split(' ')[1];
  
  try {
    // Verify Printify API token
    if (path === '/verify-token' && method === 'POST') {
      const { token } = body;
      
      if (!token) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Token is required' })
        };
      }
      
      try {
        const shops = await printifyRequest('/shops.json', 'GET', null, token);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, shops })
        };
      } catch (error) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ success: false, message: 'Invalid API token' })
        };
      }
    }
    
    // Get shop blueprints (product types)
    if (path.match(/^\/shops\/\d+\/blueprints$/) && method === 'GET') {
      const shopId = path.split('/')[2];
      
      if (!token) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'API token is required' })
        };
      }
      
      const blueprints = await printifyRequest('/catalog/blueprints.json', 'GET', null, token);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, blueprints })
      };
    }
    
    // Get blueprint print providers
    if (path.match(/^\/catalog\/blueprints\/\d+\/print_providers$/) && method === 'GET') {
      const blueprintId = path.split('/')[3];
      
      if (!token) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'API token is required' })
        };
      }
      
      const providers = await printifyRequest(`/catalog/blueprints/${blueprintId}/print_providers.json`, 'GET', null, token);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, providers })
      };
    }
    
    // Get print provider variants
    if (path.match(/^\/catalog\/blueprints\/\d+\/print_providers\/\d+\/variants$/) && method === 'GET') {
      const blueprintId = path.split('/')[3];
      const providerId = path.split('/')[5];
      
      if (!token) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'API token is required' })
        };
      }
      
      const variants = await printifyRequest(`/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants.json`, 'GET', null, token);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, variants })
      };
    }
    
    // Get products from a shop
    if (path.match(/^\/shops\/\d+\/products$/) && method === 'GET') {
      const shopId = path.split('/')[2];
      
      if (!token) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'API token is required' })
        };
      }
      
      const products = await printifyRequest(`/shops/${shopId}/products.json`, 'GET', null, token);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, products })
      };
    }
    
    // Create product with design
    if (path.match(/^\/shops\/\d+\/products$/) && method === 'POST') {
      const shopId = path.split('/')[2];
      const { productData } = body;
      
      if (!token) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'API token is required' })
        };
      }
      
      if (!productData) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Product data is required' })
        };
      }
      
      const product = await printifyRequest(`/shops/${shopId}/products.json`, 'POST', productData, token);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, product })
      };
    }
    
    // Publish product
    if (path.match(/^\/shops\/\d+\/products\/\d+\/publish$/) && method === 'POST') {
      const shopId = path.split('/')[2];
      const productId = path.split('/')[4];
      const { publishData } = body;
      
      if (!token) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'API token is required' })
        };
      }
      
      const publishResult = await printifyRequest(`/shops/${shopId}/products/${productId}/publish.json`, 'POST', publishData || {}, token);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, publishResult })
      };
    }
    
    // Upload image to Printify
    if (path === '/images/upload' && method === 'POST') {
      const { fileName, imageData } = body;
      
      if (!token) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'API token is required' })
        };
      }
      
      if (!fileName || !imageData) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'File name and image data are required' })
        };
      }
      
      const uploadData = {
        file_name: fileName,
        contents: imageData
      };
      
      const uploadResult = await printifyRequest('/uploads/images.json', 'POST', uploadData, token);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, image: uploadResult })
      };
    }
    
    // Generate image with Google Imagen API
    if (path === '/generate-image' && method === 'POST') {
      const { prompt, numImages = 1 } = body;
      
      if (!prompt) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Prompt is required' })
        };
      }
      
      if (!GOOGLE_API_KEY) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Google API key is not configured' })
        };
      }
      
      // Set up the API call to Google Imagen using the correct format for Imagen 4
      const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: '/v1beta/models/imagen-4.0-generate-preview-06-06:generateContent',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GOOGLE_API_KEY}`
        }
      };
      
      const postData = JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Generate a high-quality, professional product design based on this description: ${prompt}. The image should be suitable for printing on products like t-shirts, mugs, and posters.`
              }
            ]
          }
        ],
        generation_config: {
          temperature: 0.7,
          topP: 1.0,
          topK: 32,
          maxOutputTokens: 2048,
          responseMimeType: 'image/png'
        }
      });
      
      try {
        const response = await makeRequest(options, postData);
        const images = [];
        
        // Process the response from Google Imagen API
        if (response.data && response.data.candidates && response.data.candidates[0].content.parts) {
          const parts = response.data.candidates[0].content.parts;
          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
              const imageData = part.inlineData.data; // Base64 encoded image
              const imageName = `design_${Date.now()}_${i}.png`;
              
              images.push({
                name: imageName,
                url: `data:${part.inlineData.mimeType};base64,${imageData}`,
                data: imageData // Include base64 data for preview
              });
            }
          }
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ images })
        };
      } catch (error) {
        console.error('Error generating images:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to generate images', details: error.message })
        };
      }
    }
    
    // Default response for unhandled routes
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' })
    };
    
  } catch (error) {
    console.error('Error processing request:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};
