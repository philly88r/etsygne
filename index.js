// Simple Express server for deployment
const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

// Configuration
const PORT = process.env.PORT || 3001;
const PRINTIFY_API_BASE_URL = 'https://api.printify.com/v1';
const GOOGLE_API_KEY = 'AIzaSyAXvOheDSSeftRXkZgr9mLAkzfAqSOLwFg';

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

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

// API Routes
// Verify Printify API token
app.post('/api/verify-token', async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  
  try {
    const shops = await printifyRequest('/shops.json', 'GET', null, token);
    res.json({ success: true, shops });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid API token' });
  }
});

// Get shop blueprints (product types) - supports both endpoint patterns
app.get('/api/shops/:shopId/blueprints', async (req, res) => {
  const { shopId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'API token is required' });
  }
  
  try {
    const blueprints = await printifyRequest('/catalog/blueprints.json', 'GET', null, token);
    res.json({ success: true, blueprints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get catalog blueprints (product types) - this is the endpoint the frontend is actually using
app.get('/api/catalog/blueprints', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'API token is required' });
  }
  
  try {
    const blueprints = await printifyRequest('/catalog/blueprints.json', 'GET', null, token);
    res.json({ success: true, blueprints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get blueprint print providers
app.get('/api/catalog/blueprints/:blueprintId/print_providers', async (req, res) => {
  const { blueprintId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'API token is required' });
  }
  
  try {
    const providers = await printifyRequest(`/catalog/blueprints/${blueprintId}/print_providers.json`, 'GET', null, token);
    res.json({ success: true, providers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get print provider variants
app.get('/api/catalog/blueprints/:blueprintId/print_providers/:providerId/variants', async (req, res) => {
  const { blueprintId, providerId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'API token is required' });
  }
  
  try {
    console.log(`Requesting variants for blueprint ${blueprintId} and provider ${providerId}`);
    
    // First, try to get the print areas for this product
    let printAreas = [];
    try {
      const blueprintDetails = await printifyRequest(`/catalog/blueprints/${blueprintId}.json`, 'GET', null, token);
      if (blueprintDetails && blueprintDetails.print_areas) {
        printAreas = blueprintDetails.print_areas;
        console.log(`Found ${printAreas.length} print areas in blueprint details`);
      }
    } catch (error) {
      console.log('Could not fetch print areas from blueprint details:', error.message);
    }
    
    // Now get the variants
    const variants = await printifyRequest(`/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants.json`, 'GET', null, token);
    
    // Log the structure of the first variant for debugging
    if (variants && variants.length > 0) {
      console.log('First variant example:', JSON.stringify(variants[0], null, 2));
      console.log('Total variants:', variants.length);
      console.log('Has cost property:', variants[0].hasOwnProperty('cost'));
      console.log('Has price property:', variants[0].hasOwnProperty('price'));
      console.log('Properties:', Object.keys(variants[0]));
      
      // Add print areas to the response if we have them
      if (printAreas.length > 0) {
        // Add print areas to the first variant so frontend can access them
        variants[0].placeholders = printAreas;
      }
    } else {
      console.log('No variants returned from Printify API');
    }
    
    res.json({ success: true, variants, print_areas: printAreas });
  } catch (error) {
    console.error('Error fetching variants:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get products from a shop
app.get('/api/shops/:shopId/products', async (req, res) => {
  const { shopId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'API token is required' });
  }
  
  try {
    const products = await printifyRequest(`/shops/${shopId}/products.json`, 'GET', null, token);
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create product with design
app.post('/api/shops/:shopId/products', async (req, res) => {
  const { shopId } = req.params;
  const { productData } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'API token is required' });
  }
  
  if (!productData) {
    return res.status(400).json({ error: 'Product data is required' });
  }
  
  try {
    const product = await printifyRequest(`/shops/${shopId}/products.json`, 'POST', productData, token);
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Publish product
app.post('/api/shops/:shopId/products/:productId/publish', async (req, res) => {
  const { shopId, productId } = req.params;
  const { publishData } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'API token is required' });
  }
  
  try {
    const publishResult = await printifyRequest(`/shops/${shopId}/products/${productId}/publish.json`, 'POST', publishData || {}, token);
    res.json({ success: true, publishResult });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upload image to Printify
app.post('/api/images/upload', async (req, res) => {
  const { fileName, imageData } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'API token is required' });
  }
  
  if (!fileName || !imageData) {
    return res.status(400).json({ error: 'File name and image data are required' });
  }
  
  try {
    const uploadData = {
      file_name: fileName,
      contents: imageData
    };
    
    const uploadResult = await printifyRequest('/uploads/images.json', 'POST', uploadData, token);
    res.json({ success: true, image: uploadResult });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Generate image with Google Imagen API
app.post('/api/generate-image', async (req, res) => {
  const { prompt, numImages = 1 } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }
  
  if (!GOOGLE_API_KEY) {
    return res.status(500).json({ error: 'Google API key is not configured' });
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
    
    const imageDir = path.join(__dirname, 'public', 'generated-images');
    if (!fs.existsSync(imageDir)) {
      fs.mkdirSync(imageDir, { recursive: true });
    }
    
    const images = [];
    
    // Process the response from Google Imagen API
    if (response.data && response.data.candidates && response.data.candidates[0].content.parts) {
      const parts = response.data.candidates[0].content.parts;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
          const imageData = part.inlineData.data; // Base64 encoded image
          const imageName = `design_${Date.now()}_${i}.png`;
          const imagePath = path.join(imageDir, imageName);
          
          // Save the image to the server
          fs.writeFileSync(imagePath, Buffer.from(imageData, 'base64'));
          
          images.push({
            name: imageName,
            url: `/generated-images/${imageName}`,
            data: imageData // Include base64 data for preview
          });
        }
      }
    }
    
    res.json({ success: true, images });
  } catch (error) {
    console.error('Error generating images:', error);
    res.status(500).json({ error: 'Failed to generate images', details: error.message });
  }
});

// Catch-all route to serve the main HTML file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the application at http://localhost:${PORT}`);
});
