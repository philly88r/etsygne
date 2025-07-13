// Netlify serverless function that acts as an Express server
const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser');

// Create Express app
const app = express();
const router = express.Router();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Verify Printify API token
router.post('/verify-token', async (req, res) => {
  console.log('🔵 API - Verify token endpoint hit');
  
  try {
    const { token } = req.body;
    
    if (!token) {
      console.log('No token provided in request');
      return res.json({ success: false, message: 'No token provided' });
    }
    
    console.log('Attempting to verify token with Printify API');
    
    try {
      const response = await axios.get('https://api.printify.com/v1/shops.json', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Token verification successful, Printify API response status:', response.status);
      
      return res.json({ 
        success: true, 
        message: 'Token is valid',
        shops: response.data.data
      });
    } catch (error) {
      console.error('Token verification failed:', error.response ? error.response.status : error.message);
      
      return res.json({ 
        success: false, 
        message: 'Invalid token',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Error in verify token function:', error);
    return res.json({ 
      success: false, 
      message: `Server error: ${error.message}` 
    });
  }
});

// Get shops
router.get('/shops', async (req, res) => {
  console.log('🔵 API - Get shops endpoint hit');
  
  try {
    // Get authorization token
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({ success: false, message: 'Authorization header missing or invalid' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const response = await axios.get('https://api.printify.com/v1/shops.json', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return res.json({
        success: true,
        shops: response.data.data
      });
    } catch (error) {
      console.error('Error fetching shops:', error.message);
      return res.json({
        success: false,
        message: 'Failed to fetch shops',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Server error:', error);
    return res.json({ success: false, message: `Server error: ${error.message}` });
  }
});

// Get products for a shop
router.get('/products/:shopId', async (req, res) => {
  console.log('🔵 API - Get products endpoint hit');
  
  try {
    // Get authorization token
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({ success: false, message: 'Authorization header missing or invalid' });
    }
    
    const token = authHeader.split(' ')[1];
    const { shopId } = req.params;
    
    if (!shopId) {
      return res.json({ success: false, message: 'Shop ID is required' });
    }
    
    try {
      const response = await axios.get(`https://api.printify.com/v1/shops/${shopId}/products.json`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return res.json({
        success: true,
        products: response.data.data
      });
    } catch (error) {
      console.error('Error fetching products:', error.message);
      return res.json({
        success: false,
        message: 'Failed to fetch products',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Server error:', error);
    return res.json({ success: false, message: `Server error: ${error.message}` });
  }
});

// Upload images to Printify
router.post('/images-upload', async (req, res) => {
  console.log('🔵 API - Image upload endpoint hit');
  
  try {
    // Get authorization token
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({ success: false, message: 'Authorization header missing or invalid' });
    }
    
    const token = authHeader.split(' ')[1];
    console.log('Token present:', !!token);
    
    // Validate required fields
    const { fileName, imageUrl, imageData } = req.body;
    
    if (!fileName) {
      return res.json({ success: false, message: 'Missing required field: fileName' });
    }
    
    if (!imageUrl && !imageData) {
      return res.json({ success: false, message: 'Either imageUrl or imageData is required' });
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
      
      return res.json({
        success: true,
        message: 'Image uploaded successfully',
        image: printifyResponse.data
      });
    } catch (error) {
      console.error('Error from Printify API:', error.message);
      console.error('Error details:', error.response ? JSON.stringify(error.response.data) : 'No response data');
      
      return res.json({
        success: false,
        message: 'Failed to upload image to Printify',
        error: error.response ? error.response.data : error.message
      });
    }
  } catch (error) {
    console.error('Server error:', error);
    return res.json({ success: false, message: `Server error: ${error.message}` });
  }
});

// Generic Printify API proxy
router.post('/printify-api', async (req, res) => {
  console.log('🔵 API - Printify API proxy endpoint hit');
  
  try {
    // Get authorization token
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({ success: false, message: 'Authorization header missing or invalid' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Parse request body
    const { endpoint, method, data } = req.body;
    
    if (!endpoint) {
      return res.json({ success: false, message: 'Missing required field: endpoint' });
    }
    
    if (!method) {
      return res.json({ success: false, message: 'Missing required field: method' });
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
      
      return res.json({
        success: true,
        ...response.data
      });
    } catch (error) {
      console.error('Error from Printify API:', error.message);
      console.error('Error details:', error.response ? JSON.stringify(error.response.data) : 'No response data');
      
      return res.json({
        success: false,
        message: 'Failed to make request to Printify API',
        error: error.response ? error.response.data : error.message
      });
    }
  } catch (error) {
    console.error('Server error:', error);
    return res.json({ success: false, message: `Server error: ${error.message}` });
  }
});

// Mount the router
app.use('/.netlify/functions/server', router);

// Export the serverless function
module.exports.handler = serverless(app);
