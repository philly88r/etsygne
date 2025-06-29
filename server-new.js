const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const https = require('https');

// Load environment variables from .env file
require('./load-env.js');

// Configuration
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PRINTIFY_API_KEY = process.env.PRINTIFY_API_KEY;
// Use the provided Google API key
const GOOGLE_API_KEY = 'AIzaSyAXvOheDSSeftRXkZgr9mLAkzfAqSOLwFg';
const PRINTIFY_API_BASE = 'https://api.printify.com/v1';

// Google Imagen API configuration
const GOOGLE_PROJECT_ID = 'printify-app';
const GOOGLE_LOCATION = 'us-central1';
const GOOGLE_MODEL_VERSION = 'imagen-4.0-generate-preview-06-06';

// MIME types for serving static files
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// Helper function to serve static files
function serveStaticFile(filePath, res) {
  const extname = path.extname(filePath);
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // File not found
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<html><body><h1>404 Not Found</h1></body></html>', 'utf8');
      } else {
        // Server error
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      // Success
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf8');
    }
  });
}

// Helper function to handle API requests
async function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = data ? JSON.parse(data) : {};
          resolve({ statusCode: res.statusCode, data: parsedData });
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${e.message}`));
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

// Helper function to make authenticated Printify API requests
async function printifyRequest(endpoint, method = 'GET', data = null, token) {
  const parsedUrl = new URL(`${PRINTIFY_API_BASE}${endpoint}`);
  
  const options = {
    hostname: parsedUrl.hostname,
    path: parsedUrl.pathname + parsedUrl.search,
    method: method,
    headers: {
      'Authorization': `Bearer ${token || PRINTIFY_API_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  let postData = null;
  if (data) {
    postData = JSON.stringify(data);
    options.headers['Content-Length'] = Buffer.byteLength(postData);
  }

  try {
    const response = await makeRequest(options, postData);
    return response.data;
  } catch (error) {
    console.error(`Printify API error: ${error.message}`);
    throw error;
  }
}

// Function to read request body
async function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Function to handle API requests
async function handleApiRequest(req, res, pathname, query) {
  try {
    // Verify Printify API token
    if (pathname === '/api/verify-token' && req.method === 'POST') {
      const body = await readRequestBody(req);
      const { token } = body;
      
      if (!token) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Token is required' }));
        return;
      }
      
      try {
        const shops = await printifyRequest('/shops.json', 'GET', null, token);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, shops }));
      } catch (error) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid token' }));
      }
      return;
    }
    
    // Get blueprints (product types)
    if (pathname === '/api/catalog/blueprints' && req.method === 'GET') {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API token is required' }));
        return;
      }
      
      const blueprints = await printifyRequest('/catalog/blueprints.json', 'GET', null, token);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, blueprints }));
      return;
    }
    
    // Get print providers for a blueprint
    if (pathname.match(/^\/api\/catalog\/blueprints\/\d+\/print-providers$/) && req.method === 'GET') {
      const blueprintId = pathname.split('/')[4];
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API token is required' }));
        return;
      }
      
      const printProviders = await printifyRequest(`/catalog/blueprints/${blueprintId}/print_providers.json`, 'GET', null, token);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, printProviders }));
      return;
    }
    
    // Get variants for a blueprint and print provider
    if (pathname.match(/^\/api\/catalog\/blueprints\/\d+\/print-providers\/\d+\/variants$/) && req.method === 'GET') {
      const parts = pathname.split('/');
      const blueprintId = parts[4];
      const providerId = parts[6];
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API token is required' }));
        return;
      }
      
      const variants = await printifyRequest(`/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants.json`, 'GET', null, token);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, variants }));
      return;
    }
    
    // Generate image with Google Imagen API
    if (pathname === '/api/generate-image' && req.method === 'POST') {
      const body = await readRequestBody(req);
      const { prompt, numImages = 1 } = body;
      
      if (!prompt) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Prompt is required' }));
        return;
      }

      if (!GOOGLE_API_KEY) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Google API key is not configured' }));
        return;
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

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ images }));
      } catch (error) {
        console.error('Error generating images:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to generate images', details: error.message }));
      }
      return;
    }
    
    // Upload image to Printify
    if (pathname === '/api/upload-image' && req.method === 'POST') {
      const body = await readRequestBody(req);
      const { fileName, imageData } = body;
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API token is required' }));
        return;
      }

      if (!fileName || !imageData) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'File name and image data are required' }));
        return;
      }

      // Extract base64 data (remove data:image/png;base64, prefix if present)
      const base64Data = imageData.includes('base64,') 
        ? imageData.split('base64,')[1] 
        : imageData;

      // Upload to Printify
      const uploadData = {
        file_name: fileName,
        contents: base64Data
      };

      try {
        const uploadResult = await printifyRequest('/uploads/images.json', 'POST', uploadData, token);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, image: uploadResult }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          message: 'Failed to upload image',
          error: error.message
        }));
      }
      return;
    }
    
    // Get products from a shop
    if (pathname.match(/^\/api\/shops\/\d+\/products$/) && req.method === 'GET') {
      const shopId = pathname.split('/')[3];
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API token is required' }));
        return;
      }
      
      try {
        const products = await printifyRequest(`/shops/${shopId}/products.json`, 'GET', null, token);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, products }));
      } catch (error) {
        console.error('Error fetching products:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          message: 'Failed to fetch products',
          error: error.message
        }));
      }
      return;
    }
    
    // Create product with design
    if (pathname.match(/^\/api\/shops\/\d+\/products$/) && req.method === 'POST') {
      const shopId = pathname.split('/')[3];
      const body = await readRequestBody(req);
      const { productData } = body;
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API token is required' }));
        return;
      }

      if (!productData) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Product data is required' }));
        return;
      }

      try {
        const product = await printifyRequest(`/shops/${shopId}/products.json`, 'POST', productData, token);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, product }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          message: 'Failed to create product',
          error: error.message
        }));
      }
      return;
    }
    
    // Publish product
    if (pathname.match(/^\/api\/shops\/\d+\/products\/[^\/]+\/publish$/) && req.method === 'POST') {
      const parts = pathname.split('/');
      const shopId = parts[3];
      const productId = parts[5];
      const body = await readRequestBody(req);
      const publishData = body || {};
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API token is required' }));
        return;
      }

      try {
        const publishResult = await printifyRequest(`/shops/${shopId}/products/${productId}/publish.json`, 'POST', publishData, token);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, publishResult }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          message: 'Failed to publish product',
          error: error.message
        }));
      }
      return;
    }
    
    // If no API endpoint matched
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'API endpoint not found' }));
    
  } catch (error) {
    console.error('API request error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error', details: error.message }));
  }
}

// Create the HTTP server
const server = http.createServer((req, res) => {
  // Parse the URL
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // Handle API requests
  if (pathname.startsWith('/api/')) {
    handleApiRequest(req, res, pathname, parsedUrl.query);
    return;
  }
  
  // Serve static files
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
  
  // If the path doesn't have an extension, assume it's a route and serve index.html
  if (!path.extname(filePath)) {
    filePath = path.join(__dirname, 'public', 'index.html');
  }
  
  serveStaticFile(filePath, res);
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the application at http://localhost:${PORT}`);
});

module.exports = server;
