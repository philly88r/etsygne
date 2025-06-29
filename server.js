const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const https = require('https');
const querystring = require('querystring');

// Load environment variables from .env file
require('./load-env.js');

// Configuration
const PORT = process.env.PORT || 3000;
const PRINTIFY_API_KEY = process.env.PRINTIFY_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const PRINTIFY_API_BASE = 'https://api.printify.com/v1';

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
        fs.readFile(path.join(__dirname, 'public', '404.html'), (err, content) => {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end(content, 'utf8');
        });
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
          const parsedData = JSON.parse(data);
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

// Helper function to make authenticated Printify API requests
async function printifyRequest(endpoint, method = 'GET', data = null, token) {
  const parsedUrl = new URL(`${PRINTIFY_API_BASE}${endpoint}`);
  
  const options = {
    hostname: parsedUrl.hostname,
    path: parsedUrl.pathname + parsedUrl.search,
    method: method,
    headers: {
      'Authorization': `Bearer ${token}`,
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
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'API token is required' });
    }

    const products = await printifyRequest(`/shops/${shopId}/products.json`, 'GET', null, token);
    return res.json({ success: true, products });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch products',
      error: error.response?.data || error.message
    });
  }
});

// Get blueprints (product types)
app.get('/api/catalog/blueprints', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'API token is required' });
    }

    const blueprints = await printifyRequest('/catalog/blueprints.json', 'GET', null, token);
    return res.json({ success: true, blueprints });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch blueprints',
      error: error.response?.data || error.message
    });
  }
});

// Get print providers for a blueprint
app.get('/api/catalog/blueprints/:blueprintId/print-providers', async (req, res) => {
  try {
    const { blueprintId } = req.params;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'API token is required' });
    }

    const printProviders = await printifyRequest(`/catalog/blueprints/${blueprintId}/print_providers.json`, 'GET', null, token);
    return res.json({ success: true, printProviders });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch print providers',
      error: error.response?.data || error.message
    });
  }
});

// Get variants for a blueprint and print provider
app.get('/api/catalog/blueprints/:blueprintId/print-providers/:providerId/variants', async (req, res) => {
  try {
    const { blueprintId, providerId } = req.params;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'API token is required' });
    }

    const variants = await printifyRequest(`/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants.json`, 'GET', null, token);
    return res.json({ success: true, variants });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch variants',
      error: error.response?.data || error.message
        }
      });
      req.on('error', reject);
    });
  };

  try {
    // Handle different API endpoints
    if (pathname === '/api/verify-token' && req.method === 'POST') {
      const body = await readBody();
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
    
    // Generate image with Google Imagen API
    if (pathname === '/api/generate-image' && req.method === 'POST') {
      const body = await readBody();
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
      
      // Set up the API call to Google Imagen using the format provided
      const PROJECT_ID = 'printify-app';
      const LOCATION = 'us-central1';
      const MODEL_VERSION = 'imagen-4.0-generate-preview-06-06';
      
      const options = {
        hostname: `${LOCATION}-aiplatform.googleapis.com`,
        path: `/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_VERSION}:predict`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GOOGLE_API_KEY}`
        }
      };

      const postData = JSON.stringify({
        instances: [
          {
            prompt: prompt
          }
        ],
        parameters: {
          sampleCount: numImages
          
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

    res.json({ images });
  } catch (error) {
    console.error('Error generating images:', error);
    res.status(500).json({ error: 'Failed to generate images', details: error.message });
  }
});

// Upload image to Printify
app.post('/api/upload-image', async (req, res) => {
  try {
    const { fileName, imageData } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'API token is required' });
    }

    if (!fileName || !imageData) {
      return res.status(400).json({ success: false, message: 'File name and image data are required' });
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

    const uploadResult = await printifyRequest('/uploads/images.json', 'POST', uploadData, token);
    
    return res.json({ 
      success: true, 
      image: uploadResult 
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to upload image',
      error: error.response?.data || error.message
    });
  }
});

// Create product with design
app.post('/api/shops/:shopId/products', async (req, res) => {
  try {
    const { shopId } = req.params;
    const { productData } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'API token is required' });
    }

    if (!productData) {
      return res.status(400).json({ success: false, message: 'Product data is required' });
    }

    const product = await printifyRequest(`/shops/${shopId}/products.json`, 'POST', productData, token);
    
    return res.json({ 
      success: true, 
      product 
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to create product',
      error: error.response?.data || error.message
    });
  }
});

// Publish product
app.post('/api/shops/:shopId/products/:productId/publish', async (req, res) => {
  try {
    const { shopId, productId } = req.params;
    const { publishData } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'API token is required' });
    }

    const publishResult = await printifyRequest(`/shops/${shopId}/products/${productId}/publish.json`, 'POST', publishData || {}, token);
    
    return res.json({ 
      success: true, 
      publishResult 
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to publish product',
      error: error.response?.data || error.message
    });
  }
});

// Serve the main HTML file for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the application at http://localhost:${PORT}`);
});

module.exports = app;
