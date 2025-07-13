const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Enable CORS for all routes
app.use(cors());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Create a proxy for Printify API requests
app.use('/.netlify/functions/api', (req, res, next) => {
  // Extract the endpoint from the query parameters
  const endpoint = req.query.endpoint;
  
  if (!endpoint) {
    return res.status(400).json({ error: 'No endpoint specified' });
  }
  
  // Get the authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header provided' });
  }
  
  // Forward the request to the Printify API
  const printifyUrl = `https://api.printify.com/v1/${endpoint}`;
  
  // Create options for the fetch request
  const options = {
    method: req.method,
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    }
  };
  
  // If this is a POST or PUT request, forward the body
  if (req.method === 'POST' || req.method === 'PUT') {
    options.body = JSON.stringify(req.body);
  }
  
  // Forward the request to Printify
  fetch(printifyUrl, options)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      res.json({ success: true, ...data });
    })
    .catch(error => {
      console.error('Proxy error:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    });
});

// Special endpoint for token verification
app.post('/.netlify/functions/api', express.json(), (req, res) => {
  if (req.query.endpoint === 'verify-token') {
    const token = req.body.token;
    
    if (!token) {
      return res.status(400).json({ success: false, message: 'No token provided' });
    }
    
    // Verify the token by making a request to the Printify API
    fetch('https://api.printify.com/v1/shops.json', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      res.json({
        success: true,
        message: 'Token verified successfully',
        shops: data
      });
    })
    .catch(error => {
      console.error('Token verification error:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    });
  } else {
    res.status(404).json({ success: false, message: 'Endpoint not found' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Local development server running at http://localhost:${PORT}`);
  console.log(`API proxy available at http://localhost:${PORT}/.netlify/functions/api`);
});
