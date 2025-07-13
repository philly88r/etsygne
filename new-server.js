// New Express server for handling image uploads
console.log('🚀🚀🚀 STARTING NEW SERVER AT:', new Date().toISOString(), '🚀🚀🚀');

const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
const bodyParser = require('body-parser');

// Configuration
const PORT = 3003; // Using a different port
const PRINTIFY_API_BASE_URL = 'https://api.printify.com/v1';

const app = express();

// Middleware - explicitly use bodyParser for JSON and configure CORS
app.use(cors({
  origin: ['http://localhost:3001', 'http://127.0.0.1:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper function for Printify API requests
async function printifyRequest(endpoint, method = 'GET', data = null, token) {
  const url = `${PRINTIFY_API_BASE_URL}${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  
  console.log(`Making Printify API request to ${method} ${endpoint}`);
  
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsedData = JSON.parse(responseData);
            resolve(parsedData);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        } else {
          reject(new Error(`Request failed with status code ${res.statusCode}: ${responseData}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Verify Printify API token endpoint
app.post('/api/verify-token', async (req, res) => {
  console.log('🔵 NEW SERVER - Verify token endpoint hit at:', new Date().toISOString());
  console.log('Request headers:', JSON.stringify(req.headers));
  console.log('Request body:', JSON.stringify(req.body));
  
  const { token } = req.body || {};
  
  if (!token) {
    return res.status(400).json({ success: false, message: 'API token is required' });
  }
  
  try {
    // Make a simple request to Printify API to verify the token
    const result = await printifyRequest('/shops.json', 'GET', null, token);
    console.log('Token verification result:', result);
    
    // If we get here, the token is valid
    res.status(200).json({ success: true, shops: result });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).json({ success: false, message: 'Invalid API token' });
  }
});

// Upload image to Printify - dedicated endpoint
app.post('/api/images/upload', async (req, res) => {
  console.log('🔴 NEW SERVER - Image upload endpoint hit at:', new Date().toISOString());
  
  // Log raw request
  console.log('Request headers:', JSON.stringify(req.headers));
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Content-Length:', req.headers['content-length']);
  
  // Get the token from Authorization header
  const token = req.headers.authorization?.split(' ')[1];
  console.log('Token available:', !!token);
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'API token is required' 
    });
  }
  
  // Debug the request body
  console.log('Request body type:', typeof req.body);
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    // Extract data from request body
    const { fileName, imageUrl, imageData } = req.body || {};
    
    console.log('Extracted values:');
    console.log('- fileName:', fileName);
    console.log('- imageUrl:', imageUrl);
    console.log('- imageData:', imageData ? '(data present)' : '(no data)');
    
    if (!fileName || (!imageUrl && !imageData)) {
      console.log('Missing required fields for image upload');
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: fileName and either imageUrl or imageData' 
      });
    }
    
    // Prepare payload for Printify API
    const uploadPayload = {
      file_name: fileName,
      url: imageUrl,
      contents: imageData // contents should be base64 encoded string
    };
    
    console.log('Uploading to Printify with payload:', { 
      file_name: fileName, 
      url: imageUrl, 
      contents: imageData ? '...data...' : undefined 
    });
    
    // Make request to Printify API
    const result = await printifyRequest('/uploads/images.json', 'POST', uploadPayload, token);
    console.log('Printify upload result:', result);
    
    // Return success response
    res.status(200).json({ success: true, image: result });
  } catch (error) {
    console.error('Error during image upload:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Start the server with error handling
const server = app.listen(PORT, () => {
  console.log(`NEW SERVER running on port ${PORT}`);
  console.log(`Access the image upload endpoint at http://localhost:${PORT}/api/images/upload`);
});

server.on('error', (error) => {
  console.error('Server error:', error.message);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try a different port.`);
  }
});
