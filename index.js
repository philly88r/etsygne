console.log('🚀🚀🚀 STARTING UPDATED INDEX.JS SERVER AT:', new Date().toISOString(), '🚀🚀🚀');

// Simple Express server for deployment
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { fal } = require('@fal-ai/client');
const https = require('https');
const bodyParser = require('body-parser');
const axios = require('axios');

// Configuration
const PORT = process.env.PORT || 3001;
const PRINTIFY_API_BASE_URL = 'https://api.printify.com/v1';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
// For development, using a placeholder API key - replace with your actual key
// You can get a key from https://fal.ai/dashboard
const FAL_API_KEY = process.env.FAL_API_KEY || 'cb1a3eea-92ee-4731-a3f9-b8375c197ac9:a8afa13dbbb6688ee74cc8813aa2cc42';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

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
  
  console.log(`Making Printify API request to ${method} ${endpoint}`);
  if (data) {
    console.log('Request payload size:', JSON.stringify(data).length, 'bytes');
  }
  
  try {
    const response = await makeRequest(options, data ? JSON.stringify(data) : null);
    
    // Check if we got a successful status code (2xx)
    if (response.statusCode < 200 || response.statusCode >= 300) {
      console.error(`Printify API error: ${response.statusCode}`, JSON.stringify(response.data, null, 2));
      
      // If the response contains an error message, include it with full details
      if (response.data) {
        // For validation errors, Printify often returns detailed information
        if (response.data.errors && Array.isArray(response.data.errors)) {
          console.error('Validation errors:', response.data.errors);
          
          // Format the validation errors for better readability
          const errorMessages = response.data.errors.map(err => {
            if (err.field) {
              return `Field '${err.field}': ${err.message || 'Invalid value'}`;
            }
            return err.message || 'Unknown validation error';
          }).join('; ');
          
          throw new Error(`Printify API validation error (${response.statusCode}): ${errorMessages} - ${JSON.stringify(response.data)}`);
        } 
        // General error with message
        else if (response.data.message) {
          throw new Error(`Printify API error (${response.statusCode}): ${response.data.message} - ${JSON.stringify(response.data)}`);
        } 
        // Unknown error format
        else {
          throw new Error(`Printify API error (${response.statusCode}): ${JSON.stringify(response.data)}`);
        }
      } else {
        throw new Error(`Printify API error: ${response.statusCode}`);
      }
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error in Printify request to ${endpoint}:`, error);
    throw error;
  }
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
    console.error('Printify API Error:', error.message);
    res.status(401).json({ success: false, message: 'Invalid API token', details: error.message });
  }
});

// Get all shops
app.get('/api/shops', async (req, res) => {
  let token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'API token is required' });
  }

  try {
    const shops = await printifyRequest('/shops.json', 'GET', null, token);
    res.json({ success: true, shops });
  } catch (error) {
    console.error('Error fetching shops:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
// Get shop details
app.get('/api/shops/:shopId', async (req, res) => {
  const { shopId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'API token is required' });
  }
  
  try {
    const shop = await printifyRequest(`/shops/${shopId}.json`, 'GET', null, token);
    res.json(shop);
  } catch (error) {
    console.error('Error fetching shop details:', error);
    res.status(500).json({ error: error.message });
  }
});

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
    console.error('Printify API Error:', error.message);
    res.status(401).json({ success: false, message: 'Invalid API token', details: error.message });
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

// Get blueprint details
app.get('/api/catalog/blueprints/:blueprintId', async (req, res) => {
  const { blueprintId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  
  console.log(`Requesting blueprint details for blueprint ${blueprintId}`);
  
  if (!token) {
    console.log('API token missing in blueprint details request');
    return res.status(401).json({ success: false, error: 'API token is required' });
  }
  
  try {
    console.log(`Making Printify API request to GET /catalog/blueprints/${blueprintId}.json`);
    const blueprint = await printifyRequest(`/catalog/blueprints/${blueprintId}.json`, 'GET', null, token);
    console.log('Blueprint details received successfully');
    
    // Log the structure of the blueprint object to understand where print areas might be
    console.log('Blueprint structure:', Object.keys(blueprint));
    if (blueprint.print_areas) {
      console.log(`Blueprint has ${blueprint.print_areas.length} print areas`);
    } else {
      console.log('No print_areas directly in blueprint');
    }
    
    // Check if we need to get print areas separately
    if (!blueprint.print_areas || blueprint.print_areas.length === 0) {
      console.log('No print areas in blueprint, checking print providers');
      // Try to get print areas from print providers
      try {
        const providers = await printifyRequest(`/catalog/blueprints/${blueprintId}/print_providers.json`, 'GET', null, token);
        if (providers && providers.length > 0) {
          const firstProviderId = providers[0].id;
          console.log(`Getting variants for provider ${firstProviderId}`);
          const variants = await printifyRequest(`/catalog/blueprints/${blueprintId}/print_providers/${firstProviderId}/variants.json`, 'GET', null, token);
          
          // Add print areas to blueprint if found in variants
          if (variants && variants.print_areas) {
            blueprint.print_areas = variants.print_areas;
            console.log(`Found ${variants.print_areas.length} print areas in variants`);
          }
        }
      } catch (providerError) {
        console.log(`Error getting print providers: ${providerError.message}`);
        // Continue with the blueprint we have
      }
    }
    
    res.json({ success: true, blueprint });
  } catch (error) {
    console.error(`Error fetching blueprint details: ${error.message}`);
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
    
    // Get the variants first - they should contain the print areas according to the API docs
    console.log(`Fetching variants from Printify API for blueprint ${blueprintId} and provider ${providerId}`);
    const variants = await printifyRequest(`/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants.json`, 'GET', null, token);
    
    // Log the raw variants response to understand its structure
    console.log('Raw variants response structure:', JSON.stringify(variants, null, 2));
    console.log('Variants type:', typeof variants);
    
    // Initialize print areas array
    let printAreas = [];
    
    // Extract print areas from variants - they should be in the placeholders property
    if (variants) {
      // Case 1: Variants is an array
      if (Array.isArray(variants) && variants.length > 0) {
        console.log('Variants is an array with', variants.length, 'items');
        console.log('First variant properties:', Object.keys(variants[0]));
        
        // Collect placeholders from all variants
        const seenPlaceholders = new Set();
        const allPlaceholders = [];
        
        for (const variant of variants) {
          if (variant.placeholders && Array.isArray(variant.placeholders) && variant.placeholders.length > 0) {
            console.log(`Found ${variant.placeholders.length} placeholders in variant ${variant.id}`);
            
            // Add each placeholder to our collection, using position+dimensions as key to avoid exact duplicates
            variant.placeholders.forEach(placeholder => {
              if (placeholder.position) {
                // Create a unique key based on position + dimensions
                const key = `${placeholder.position}_${placeholder.width}_${placeholder.height}`;
                
                if (!seenPlaceholders.has(key)) {
                  seenPlaceholders.add(key);
                  allPlaceholders.push(placeholder);
                }
              }
            });
          }
        }
        
        // Use the collected placeholders
        if (allPlaceholders.length > 0) {
          printAreas = allPlaceholders;
          console.log(`Collected ${printAreas.length} unique print areas from all variants`);
        }
      } 
      // Case 2: Variants is an object with keys (variant IDs)
      else if (typeof variants === 'object') {
        const variantKeys = Object.keys(variants);
        console.log('Variants is an object with', variantKeys.length, 'keys');
        
        // Collect placeholders from all variants
        const seenPlaceholders = new Set();
        const allPlaceholders = [];
        
        for (const key of variantKeys) {
          const variant = variants[key];
          if (variant && variant.placeholders && Array.isArray(variant.placeholders) && variant.placeholders.length > 0) {
            console.log(`Found ${variant.placeholders.length} placeholders in variant ${key}`);
            
            // Add each placeholder to our collection, using position+dimensions as key to avoid exact duplicates
            variant.placeholders.forEach(placeholder => {
              if (placeholder.position) {
                // Create a unique key based on position + dimensions
                const key = `${placeholder.position}_${placeholder.width}_${placeholder.height}`;
                
                if (!seenPlaceholders.has(key)) {
                  seenPlaceholders.add(key);
                  allPlaceholders.push(placeholder);
                }
              }
            });
          }
        }
        
        // Use the collected placeholders
        if (allPlaceholders.length > 0) {
          printAreas = allPlaceholders;
          console.log(`Collected ${printAreas.length} unique print areas from all variants`);
        }
      }
    }
    
    // If no print areas found in variants, try the blueprint details as fallback
    if (printAreas.length === 0) {
      console.log('No print areas found in variants, trying blueprint details');
      try {
        const blueprintDetails = await printifyRequest(`/catalog/blueprints/${blueprintId}.json`, 'GET', null, token);
        console.log('Blueprint details structure:', Object.keys(blueprintDetails));
        
        if (blueprintDetails && blueprintDetails.print_areas && Array.isArray(blueprintDetails.print_areas)) {
          printAreas = blueprintDetails.print_areas;
          console.log(`Found ${printAreas.length} print areas in blueprint details`);
        }
      } catch (error) {
        console.log('Could not fetch print areas from blueprint details:', error.message);
      }
    }
    
    // If still no print areas, create default ones based on the blueprint type
    if (printAreas.length === 0) {
      console.log('No print areas found in API responses, creating default print areas');
      // Default print area for front
      printAreas = [
        {
          position: 'front',
          height: 300,
          width: 300
        }
      ];
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

// Upload image to Printify
app.post('/api/images/upload', async (req, res) => {
  const { file_name, contents } = req.body;
  
  console.log('Image upload request received for:', file_name);
  console.log('Content length:', contents ? contents.length : 0, 'characters');
  
  // Try to get the token from different sources
  let token = req.headers.authorization?.split(' ')[1];
  
  // If no token in headers, check environment variable
  if (!token) {
    token = process.env.PRINTIFY_API_KEY;
  }
  
  // If still no token, check if it's in the request body
  if (!token && req.body.api_key) {
    token = req.body.api_key;
    delete req.body.api_key; // Remove it from the body to avoid sending to Printify
  }
  
  console.log('Token available:', !!token);
  
  if (!token) {
    console.error('No API token found in request or environment');
    return res.status(401).json({ error: 'API token is required. Please provide it in the Authorization header or request body.' });
  }
  
  if (!file_name || !contents) {
    console.error('Missing required fields for image upload');
    return res.status(400).json({ error: 'File name and contents are required' });
  }
  
  try {
    console.log(`Uploading image ${file_name} to Printify...`);
    
    const uploadData = {
      file_name,
      contents
    };
    
    console.log('Making request to Printify API...');
    const response = await printifyRequest('/uploads/images.json', 'POST', uploadData, token);
    
    // Validate the response has proper image ID
    if (!response || !response.id) {
      console.error('Printify API did not return a valid image ID:', response);
      throw new Error('Printify API did not return a valid image ID');
    }
    
    // Ensure ID is a string (Printify IDs are always strings)
    const imageId = String(response.id);
    
    // Validate ID format (Printify IDs are typically 24+ characters)
    if (imageId.length < 10) {
      console.error(`Invalid Printify image ID format: ${imageId}`);
      throw new Error(`Invalid Printify image ID format: ${imageId}`);
    }
    
    console.log('Printify returned image ID:', imageId, 'Type:', typeof imageId, 'Length:', imageId.length);
    
    // Return the validated response with a consistent structure
    const imageResponse = {
      id: imageId,  // Ensure ID is properly formatted string
      file_name: response.file_name || file_name,
      height: response.height || 1000,
      width: response.width || 1000,
      size: response.size || 0,
      mime_type: response.mime_type || 'image/png',
      preview_url: response.preview_url || response.src || '',
      upload_time: response.upload_time || new Date().toISOString()
    };
    
    console.log('Image upload successful, ID:', imageResponse.id);
    res.json({ success: true, image: imageResponse });
  } catch (error) {
    console.error('Error uploading image to Printify:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create product with design
app.post('/api/shops/:shopId/products', async (req, res) => {
  const { shopId } = req.params;
  const productData = req.body;
  
  // Try to get the token from different sources
  let token = req.headers.authorization?.split(' ')[1];
  
  // If no token in headers, check environment variable
  if (!token) {
    token = process.env.PRINTIFY_API_KEY;
  }
  
  // If still no token, check if it's in the request body
  if (!token && req.body.api_key) {
    token = req.body.api_key;
    delete req.body.api_key; // Remove it from the body to avoid sending to Printify
  }
  
  console.log('Product creation - Token available:', !!token);
  
  if (!token) {
    console.error('No API token found in request or environment');
    return res.status(401).json({ error: 'API token is required. Please provide it in the Authorization header or request body.' });
  }
  
  if (!productData) {
    return res.status(400).json({ error: 'Product data is required' });
  }
  
  // Validate required fields
  if (!productData.print_areas || !Array.isArray(productData.print_areas) || productData.print_areas.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'Print areas are required', 
      code: 8150
    });
  }
  
  try {
    // We're now expecting the frontend to handle image uploads separately
    // and provide valid Printify image IDs in the product data
    console.log('Creating product with data:', JSON.stringify(productData, null, 2));
    
    // Validate that all images have valid IDs
    let allImagesValid = true;
    let invalidImageDetails = [];
    
    productData.print_areas.forEach(printArea => {
      if (printArea.placeholders && Array.isArray(printArea.placeholders)) {
        printArea.placeholders.forEach(placeholder => {
          if (placeholder.images && Array.isArray(placeholder.images)) {
            placeholder.images.forEach(image => {
              // Check if ID exists
              if (!image.id) {
                allImagesValid = false;
                invalidImageDetails.push({
                  placement: printArea.placement,
                  error: 'Missing image ID'
                });
                console.error('Found image without ID in print area:', printArea.placement);
              } 
              // Check if ID is a string
              else if (typeof image.id !== 'string') {
                allImagesValid = false;
                invalidImageDetails.push({
                  placement: printArea.placement,
                  error: `Image ID is not a string: ${typeof image.id}`,
                  value: image.id
                });
                console.error(`Image ID is not a string in print area ${printArea.placement}:`, typeof image.id, image.id);
              }
              // Check if ID has proper format/length
              else if (image.id.length < 10) {
                allImagesValid = false;
                invalidImageDetails.push({
                  placement: printArea.placement,
                  error: `Invalid image ID format: ${image.id}`,
                  value: image.id
                });
                console.error(`Invalid image ID format in print area ${printArea.placement}:`, image.id);
              }
              else {
                // ID is valid, ensure it's a string
                image.id = String(image.id);
                console.log(`Valid image ID in print area ${printArea.placement}:`, image.id);
              }
            });
          }
        });
      }
    });
    
    if (!allImagesValid) {
      return res.status(400).json({
        success: false,
        message: 'All images must have valid Printify image IDs',
        code: 8253,
        details: invalidImageDetails
      });
    }
    
    // Create the product with Printify
    console.log('Creating product with Printify...');
    const product = await printifyRequest(`/shops/${shopId}/products.json`, 'POST', productData, token);
    console.log('Product created successfully:', JSON.stringify(product));
    res.json({ success: true, product });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update product
app.put('/api/shops/:shopId/products/:productId', async (req, res) => {
  const { shopId, productId } = req.params;
  const productData = req.body;
  
  // Try to get the token from different sources
  let token = req.headers.authorization?.split(' ')[1];
  
  // If no token in headers, check environment variable
  if (!token) {
    token = process.env.PRINTIFY_API_KEY;
  }
  
  // If still no token, check if it's in the request body
  if (!token && req.body.api_key) {
    token = req.body.api_key;
    delete req.body.api_key; // Remove it from the body to avoid sending to Printify
  }
  
  console.log(`Product update - Token available: ${!!token}, Product ID: ${productId}`);
  
  if (!token) {
    console.error('No API token found in request or environment');
    return res.status(401).json({ error: 'API token is required. Please provide it in the Authorization header or request body.' });
  }
  
  if (!productData) {
    return res.status(400).json({ error: 'Product data is required' });
  }
  
  // Validate required fields
  if (!productData.print_areas || !Array.isArray(productData.print_areas) || productData.print_areas.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'Print areas are required', 
      code: 8150
    });
  }
  
  try {
    // Log the full update payload for debugging
    console.log('Updating product with data:', JSON.stringify(productData, null, 2));
    
    // Validate that all images have valid IDs
    let allImagesValid = true;
    let invalidImageDetails = [];
    
    productData.print_areas.forEach(printArea => {
      if (printArea.placeholders && Array.isArray(printArea.placeholders)) {
        printArea.placeholders.forEach(placeholder => {
          if (placeholder.images && Array.isArray(placeholder.images)) {
            placeholder.images.forEach(image => {
              // Check if ID exists
              if (!image.id) {
                allImagesValid = false;
                invalidImageDetails.push({
                  position: placeholder.position || 'unknown',
                  error: 'Missing image ID'
                });
                console.error(`Found image without ID in position: ${placeholder.position || 'unknown'}`);
              } 
              // Check if ID is a string
              else if (typeof image.id !== 'string') {
                // Convert to string if possible
                image.id = String(image.id);
                console.log(`Converted image ID to string: ${image.id}`);
              }
              // Check if ID has proper format/length
              else if (image.id.length < 10) {
                allImagesValid = false;
                invalidImageDetails.push({
                  position: placeholder.position || 'unknown',
                  error: `Invalid image ID format: ${image.id}`,
                  value: image.id
                });
                console.error(`Invalid image ID format in position ${placeholder.position || 'unknown'}:`, image.id);
              }
              else {
                console.log(`Valid image ID in position ${placeholder.position || 'unknown'}:`, image.id);
              }
            });
          }
        });
      }
    });
    
    if (!allImagesValid) {
      return res.status(400).json({
        success: false,
        message: 'All images must have valid Printify image IDs',
        code: 8253,
        details: invalidImageDetails
      });
    }
    
    // Update the product with Printify
    console.log(`Updating product ${productId} with Printify...`);
    const product = await printifyRequest(`/shops/${shopId}/products/${productId}.json`, 'PUT', productData, token);
    console.log('Product updated successfully:', JSON.stringify(product));
    res.json({ success: true, product });
  } catch (error) {
    console.error('Error updating product:', error);
    
    // Try to extract more detailed error information
    let errorDetails = {};
    if (error.message && error.message.includes('Printify API error')) {
      try {
        // Extract the JSON part if present
        const jsonMatch = error.message.match(/\{.*\}/s);
        if (jsonMatch) {
          errorDetails = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.error('Error parsing Printify error details:', parseError);
      }
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message,
      details: errorDetails
    });
  }
});

// Publish product
app.post('/api/shops/:shopId/products/:productId/publish', async (req, res) => {
  const { shopId, productId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'API token is required' });
  }
  
  try {
    console.log(`Publishing product ${productId} in shop ${shopId}`);
    
    // Use the standard publish data format as per Printify API docs
    const publishData = {
      title: true,
      description: true,
      images: true,
      variants: true,
      tags: true,
      keyFeatures: true,
      shipping_template: true
    };
    
    const publishResult = await printifyRequest(`/shops/${shopId}/products/${productId}/publish.json`, 'POST', publishData, token);
    console.log('Publish result:', publishResult);
    
    // If the publish request was successful, mark the publishing as succeeded
    // This is required to remove the product from locked status in Printify
    try {
      const successData = {
        external: {
          id: productId,
          handle: `https://printify.com/app/products/${productId}`
        }
      };
      
      const successResult = await printifyRequest(`/shops/${shopId}/products/${productId}/publishing_succeeded.json`, 'POST', successData, token);
      console.log('Publishing succeeded result:', successResult);
    } catch (successError) {
      console.error('Error marking publishing as succeeded:', successError);
      // Continue with the original success response
    }
    
    res.json({ success: true, publishResult });
  } catch (error) {
    console.error('Error publishing product:', error);
    
    // Try to mark the publishing as failed
    try {
      const failedData = {
        reason: error.message || 'Unknown error'
      };
      
      await printifyRequest(`/shops/${shopId}/products/${productId}/publishing_failed.json`, 'POST', failedData, token);
    } catch (failedError) {
      console.error('Error marking publishing as failed:', failedError);
    }
    
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upload image to Printify
app.post('/api/images/upload', async (req, res) => {
  console.log('DEBUG: Raw req.body at start of /api/images/upload:', req.body);
  console.log('DEBUG: Content-Type header received:', req.headers['content-type']);
  console.log('DEBUG: Content-Length header received:', req.headers['content-length']);
  // Get the API token from headers or body
  const token = req.headers.authorization?.split(' ')[1] || req.body.api_key;
  const { fileName, imageData, imageUrl } = req.body;
  console.log('Backend received image upload request with:', { fileName, imageData: imageData ? 'present' : 'missing', imageUrl: imageUrl ? 'present' : 'missing', imageDataLength: imageData ? imageData.length : 0 });
  
  console.log('Image upload request received:', { 
    hasToken: !!token, 
    hasFileName: !!fileName, 
    hasImageData: !!imageData, 
    hasImageUrl: !!imageUrl 
  });
  
  if (!token) {
    return res.status(401).json({ error: 'API token is required' });
  }
  
  if (!fileName || (!imageData && !imageUrl)) {
    return res.status(400).json({ error: 'File name and either image data or image URL are required' });
  }
  
  try {
    let uploadData;
    
    if (imageUrl) {
      console.log(`Uploading image from URL: ${imageUrl.substring(0, 50)}...`);
      // If we have a URL, fetch the image first
      try {
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(imageResponse.data);
        const base64Data = buffer.toString('base64');
        
        uploadData = {
          file_name: fileName,
          contents: base64Data
        };
      } catch (fetchError) {
        console.error('Error fetching image from URL:', fetchError);
        return res.status(400).json({ success: false, message: 'Could not fetch image from provided URL' });
      }
    } else {
      // Use the provided image data directly
      // Check if the image data is already a base64 string without the data URL prefix
      let contents = imageData;
      
      // If it starts with data:image, extract just the base64 part
      if (typeof imageData === 'string' && imageData.startsWith('data:')) {
        contents = imageData.split(',')[1];
      }
      
      uploadData = {
        file_name: fileName,
        contents: contents
      };
    }
    
    console.log(`Uploading image to Printify with filename: ${uploadData.file_name}...`);
    try {
      const uploadResult = await printifyRequest('/uploads/images.json', 'POST', uploadData, token);
      
      // Log the full response for debugging
      console.log('Full Printify upload response:', JSON.stringify(uploadResult));
      
      // Check if the response has the expected structure
      if (!uploadResult || typeof uploadResult !== 'object') {
        console.error('Invalid response from Printify API:', uploadResult);
        return res.status(500).json({ success: false, message: 'Invalid response from Printify API' });
      }
      
      // Check if the response has an id field
      if (!uploadResult.id) {
        console.error('No image ID in Printify response:', uploadResult);
        
        // If there's an error message in the response, return it
        if (uploadResult.message) {
          return res.status(400).json({ success: false, message: uploadResult.message });
        }
        
        return res.status(400).json({ success: false, message: 'No image ID returned from Printify API' });
      }
      
      // Success - return the image data
      res.json({ success: true, image: uploadResult });
    } catch (uploadError) {
      console.error('Error in Printify upload request:', uploadError);
      res.status(500).json({ success: false, message: uploadError.message });
    }
  } catch (error) {
    console.error('Error uploading to Printify:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Generate image with Fal.ai API - Direct implementation using axios and polling
app.post('/api/generate-image', async (req, res) => {
  const { prompt, numImages = 1, width, height } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const imageDir = path.join(__dirname, 'public', 'generated-images');
  if (!fs.existsSync(imageDir)) {
    fs.mkdirSync(imageDir, { recursive: true });
  }

  const fallbackImages = [{
    name: 'fallback.png',
    url: '/test-images/fallback.png',
    data: 'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAnElEQVR42u3RAQ0AAAgDIN8/9K3hHFQg03Y4IYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhJAvLIYCIf5FwGsAAAAASUVORK5CYII='
  }];

  try {
    console.log(`Generating image with prompt: "${prompt}", numImages: ${numImages}`);
    if (!FAL_API_KEY || FAL_API_KEY.includes('test_key') || FAL_API_KEY.includes('placeholder') || FAL_API_KEY.includes('fal_test_api_key')) {
      console.log('FAL_API_KEY not set or is a placeholder. Using fallback image.');
      throw new Error('FAL_API_KEY not set');
    }
    console.log(`Using Fal.ai API key starting with: ${FAL_API_KEY.substring(0, 8)}...`);

    // Step 1: Submit the initial request to the Fal.ai API
    console.log('Submitting initial request to Fal.ai API...');
    const initialResponse = await axios.post('https://queue.fal.run/fal-ai/imagen4/preview/fast', {
      prompt: prompt,
      aspect_ratio: '1:1',
      num_images: numImages || 1
    }, {
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Initial response:', JSON.stringify(initialResponse.data));

    // Extract the request ID from the response
    const requestId = initialResponse.data.request_id;
    if (!requestId) {
      throw new Error('No request ID returned from Fal.ai API');
    }
    console.log(`Got request ID: ${requestId}. Starting polling...`);

    // Step 2: Poll the API until the image generation is complete
    let result = null;
    let attempts = 0;
    const maxAttempts = 15;
    const pollingInterval = 2000; // 2 seconds

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`Polling attempt ${attempts}/${maxAttempts}...`);
      
      // Check the status first
      const statusResponse = await axios.get(`https://queue.fal.run/fal-ai/imagen4/requests/${requestId}/status`, {
        headers: {
          'Authorization': `Key ${FAL_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`Status response: ${JSON.stringify(statusResponse.data)}`);
      
      // If completed, get the result
      if (statusResponse.data.status === 'COMPLETED') {
        const resultResponse = await axios.get(`https://queue.fal.run/fal-ai/imagen4/requests/${requestId}`, {
          headers: {
            'Authorization': `Key ${FAL_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        result = resultResponse.data;
        console.log('Image generation complete! Result:', JSON.stringify(result));
        break;
      }
      
      // If failed, stop polling
      if (statusResponse.data.status === 'FAILED') {
        throw new Error(`Generation failed with status: ${statusResponse.data.status}`);
      }
      
      // If not complete, wait before polling again
      if (attempts < maxAttempts) {
        console.log(`Generation not complete yet. Status: ${statusResponse.data.status}. Waiting ${pollingInterval/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, pollingInterval));
      }
    }

    if (!result || !result.images || result.images.length === 0) {
      throw new Error(`Image generation failed or timed out after ${attempts} attempts.`);
    }

    // Step 3: Process the generated images
    console.log(`Processing ${result.images.length} generated images...`);
    const images = [];
    
    for (let i = 0; i < result.images.length; i++) {
      const imageUrl = result.images[i].url;
      if (imageUrl) {
        try {
          const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
          const buffer = Buffer.from(imageResponse.data);
          const base64Data = buffer.toString('base64');
          const imageName = `design_${Date.now()}_${i}.png`;
          const imagePath = path.join(imageDir, imageName);
          fs.writeFileSync(imagePath, buffer);
          console.log(`Saved image to ${imagePath}`);
          
          images.push({
            name: imageName,
            url: `/generated-images/${imageName}`,
            data: base64Data,
            originalUrl: imageUrl
          });
        } catch (downloadError) {
          console.error(`Error downloading image from ${imageUrl}:`, downloadError);
        }
      }
    }

    if (images.length > 0) {
      console.log(`Successfully generated ${images.length} images. Sending to client.`);
      res.json({ images });
    } else {
      throw new Error('Failed to process any images from the successful generation.');
    }
  } catch (error) {
    console.error('ERROR in /api/generate-image:', error);
    res.status(500).json({
      error: 'Failed to generate image',
      details: error.message || 'An unknown error occurred',
      images: fallbackImages
    });
  }
});

// Get single product endpoint - handle both with and without .json suffix
app.get(['/api/shops/:shopId/products/:productId', '/api/shops/:shopId/products/:productId.json'], async (req, res) => {
  const { shopId, productId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authorization token is required' });
  }
  
  try {
    console.log(`Fetching product ${productId} for shop ${shopId}`);
    
    // Make sure we're using the correct endpoint format
    const endpoint = `/shops/${shopId}/products/${productId}.json`;
    console.log('Printify API endpoint:', endpoint);
    
    try {
      const result = await printifyRequest(endpoint, 'GET', null, token);
      console.log('Printify API response:', JSON.stringify(result).substring(0, 200) + '...');
      res.json({ success: true, product: result });
    } catch (printifyError) {
      console.error('Printify API error:', printifyError);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch product from Printify API', 
        message: printifyError.message || 'Unknown error',
        details: printifyError.toString()
      });
    }
  } catch (error) {
    console.error('Error in product fetch handler:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process product fetch request', 
      message: error.message || 'Unknown error',
      details: error.toString()
    });
  }
});

// Create product endpoint
app.post('/api/shops/:shopId/products.json', async (req, res) => {
  const { shopId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authorization token is required' });
  }
  
  try {
    const productData = req.body;
    console.log(`Creating product for shop ${shopId} with data:`, JSON.stringify(productData));
    
    const result = await printifyRequest(`/shops/${shopId}/products.json`, 'POST', productData, token);
    res.json(result);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ 
      error: 'Failed to create product', 
      details: error.message || 'Unknown error'
    });
  }
});

// Publish product endpoint - handle both with and without .json suffix
app.post(['/api/shops/:shopId/products/:productId/publish', '/api/shops/:shopId/products/:productId/publish.json'], async (req, res) => {
  const { shopId, productId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  const publishOptions = req.body || {};
  
  if (!token) {
    return res.status(401).json({ error: 'Authorization token is required' });
  }
  
  try {
    console.log(`Publishing product ${productId} for shop ${shopId} with options:`, publishOptions);
    
    // Make sure we have the required publishing options for Etsy
    const publishData = {
      title: publishOptions.title !== false,
      description: publishOptions.description !== false,
      images: publishOptions.images !== false,
      variants: publishOptions.variants !== false,
      tags: publishOptions.tags !== false,
      shipping_template: publishOptions.shipping_template !== false
    };
    
    console.log('Final publish options:', publishData);
    
    const publishResult = await printifyRequest(`/shops/${shopId}/products/${productId}/publish.json`, 'POST', publishData, token);
    console.log('Publish result from Printify:', publishResult);
    
    res.json({ success: true, publishResult });
  } catch (error) {
    console.error('Error publishing product:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to publish product', 
      message: error.message || 'Unknown error'
    });
  }
});

// Update product endpoint
app.put(['/api/shops/:shopId/products/:productId', '/api/shops/:shopId/products/:productId.json'], async (req, res) => {
  const { shopId, productId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  const updateData = req.body;
  
  if (!token) {
    return res.status(401).json({ error: 'Authorization token is required' });
  }
  
  try {
    console.log(`Updating product ${productId} for shop ${shopId}`);
    console.log('Update payload (first 200 chars):', JSON.stringify(updateData).substring(0, 200) + '...');
    
    // First check if the product exists
    try {
      console.log(`Checking if product ${productId} exists`);
      await printifyRequest(`/shops/${shopId}/products/${productId}.json`, 'GET', null, token);
      console.log(`Product ${productId} exists, proceeding with update`);
    } catch (checkError) {
      console.error(`Product ${productId} check failed:`, checkError);
      // If product doesn't exist, return 404
      if (checkError.message && checkError.message.includes('404')) {
        return res.status(404).json({
          success: false,
          error: 'Product not found',
          message: `Product with ID ${productId} does not exist or is not accessible`
        });
      }
      // Otherwise, rethrow the error
      throw checkError;
    }
    
    // Proceed with update
    try {
      // Validate the update payload according to Printify API requirements
      const requiredFields = ['title', 'description', 'blueprint_id', 'print_provider_id'];
      for (const field of requiredFields) {
        if (!updateData[field]) {
          console.error(`Missing required field: ${field}`);
          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            message: `Missing required field: ${field}`
          });
        }
      }
      
      // Log the payload structure
      console.log('Sending update request to Printify with data structure:', Object.keys(updateData));
      console.log('Update payload sample (first 500 chars):', JSON.stringify(updateData).substring(0, 500));
      
      // Make the API request with the .json suffix as required by Printify
      const result = await printifyRequest(`/shops/${shopId}/products/${productId}.json`, 'PUT', updateData, token);
      console.log('Update successful, response:', JSON.stringify(result).substring(0, 200) + '...');
      res.json({ success: true, product: result });
    } catch (updateError) {
      console.error('Printify update error:', updateError);
      
      // Extract validation errors if available
      let statusCode = 400;
      let errorMessage = 'Validation failed';
      let validationErrors = {};
      
      try {
        // Try to parse the error message for validation details
        if (updateError.message) {
          const match = updateError.message.match(/Printify API error \((\d+)\): (.+)/);
          if (match) {
            statusCode = parseInt(match[1]);
            errorMessage = match[2];
            
            // If there are validation details in the message
            if (updateError.details) {
              validationErrors = updateError.details;
            }
          }
        }
      } catch (parseError) {
        console.error('Error parsing validation errors:', parseError);
      }
      
      return res.status(statusCode).json({
        success: false,
        error: errorMessage,
        validationErrors: validationErrors,
        message: updateError.message || 'Unknown error',
        details: updateError.toString()
      });
    }
  } catch (error) {
    console.error('Error updating product:', error);
    
    // Determine appropriate status code
    let statusCode = 500;
    if (error.message && error.message.includes('404')) {
      statusCode = 404;
    } else if (error.message && error.message.includes('400')) {
      statusCode = 400;
    } else if (error.message && error.message.includes('401')) {
      statusCode = 401;
    } else if (error.message && error.message.includes('403')) {
      statusCode = 403;
    }
    
    res.status(statusCode).json({ 
      success: false,
      error: 'Failed to update product', 
      message: error.message || 'Unknown error',
      details: error.toString()
    });
  }
});

// Mark publishing as succeeded endpoint - handle both with and without .json suffix
app.post(['/api/shops/:shopId/products/:productId/publishing_succeeded', '/api/shops/:shopId/products/:productId/publishing_succeeded.json'], async (req, res) => {
  const { shopId, productId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  const externalData = req.body || {};
  
  if (!token) {
    return res.status(401).json({ error: 'Authorization token is required' });
  }
  
  try {
    console.log(`Marking product ${productId} publishing as succeeded with data:`, externalData);
    
    // This is required to remove the product from locked status in Printify
    // and complete the publishing process
    const successResult = await printifyRequest(`/shops/${shopId}/products/${productId}/publishing_succeeded.json`, 'POST', externalData, token);
    console.log('Publishing succeeded result:', successResult);
    
    res.json({ success: true, result: successResult });
  } catch (error) {
    console.error('Error marking publishing as succeeded:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to mark publishing as succeeded', 
      message: error.message || 'Unknown error'
    });
  }
});

// Upload image to Printify
app.post('/api/images/upload', async (req, res) => {
  console.log('🔴 HEROKU DEPLOYMENT - Image upload endpoint hit at:', new Date().toISOString());
  console.log('Request received from:', req.ip);
  const token = req.headers.authorization?.split(' ')[1];
  console.log('Token available:', !!token);
  
  // Debug request information
  console.log('Request headers:', JSON.stringify(req.headers));
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Content-Length:', req.headers['content-length']);
  console.log('Request body type:', typeof req.body);
  
  // Extra debugging for raw request
  let rawBody = '';
  if (typeof req.body === 'object') {
    console.log('Request body (parsed):', JSON.stringify(req.body));
    rawBody = JSON.stringify(req.body);
  } else {
    console.log('Request body is not an object, type:', typeof req.body);
    if (req.body) {
      console.log('Request body string:', req.body.toString());
      try {
        rawBody = req.body.toString();
      } catch (e) {
        console.log('Error converting body to string:', e);
      }
    } else {
      console.log('Request body is null or undefined');
    }
  }
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'API token is required' });
  }

  try {
    // Try to parse the body manually if it's not already parsed
    let fileName, imageUrl, imageData;
    
    if (typeof req.body === 'object' && req.body !== null) {
      // Body is already parsed
      ({ fileName, imageUrl, imageData } = req.body);
    } else if (rawBody) {
      // Try to parse the raw body
      try {
        const parsedBody = JSON.parse(rawBody);
        fileName = parsedBody.fileName;
        imageUrl = parsedBody.imageUrl;
        imageData = parsedBody.imageData;
        console.log('Successfully parsed raw body');
      } catch (parseError) {
        console.error('Error parsing raw body:', parseError);
      }
    }
    
    console.log('Extracted values after manual parsing:');
    console.log('- fileName:', fileName);
    console.log('- imageUrl:', imageUrl);
    console.log('- imageData:', imageData ? '(data present)' : '(no data)');
  
    if (!fileName || (!imageUrl && !imageData)) {
      console.log('Missing required fields for image upload');
      return res.status(400).json({ success: false, message: 'Missing required fields: fileName and either imageUrl or imageData' });
    }

    const uploadPayload = {
      file_name: fileName,
      url: imageUrl,
      contents: imageData, // contents should be base64 encoded string
    };
    
    console.log('Uploading to Printify with payload:', { file_name: fileName, url: imageUrl, contents: imageData ? '...data...' : undefined });

    // Assuming 'printifyRequest' helper exists and works in index.js
    const result = await printifyRequest('/uploads/images.json', 'POST', uploadPayload, token);
    
    console.log('Printify upload result:', result);

    res.status(200).json({ success: true, image: result });
  } catch (error) {
    console.error('Error during image upload:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Make sure all API routes are defined BEFORE this catch-all route

// Catch-all route to serve the main HTML file - but only for non-API requests
app.get('*', (req, res) => {
  // Don't handle API requests with this catch-all
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: `API endpoint not found: ${req.path}` });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Generate image using Fal.ai
// Generate image using Fal.ai, save it locally, and return both URLs
app.post('/api/generate-image', async (req, res) => {
  const { prompt, negative_prompt, image_url, image_size, num_designs = 1 } = req.body;

  if (!prompt) {
    return res.status(400).json({ success: false, message: 'Prompt is required' });
  }

  try {
    console.log(`Generating ${num_designs} design(s) with prompt: "${prompt}"`);

    const imagePromises = Array.from({ length: num_designs }).map(async (_, i) => {
      const result = await fal.imagine({
        prompt,
        negative_prompt,
        image_url,
        sync_mode: true,
        strength: 0.9,
        seed: Math.floor(Math.random() * 100000), // Use a random seed for variation
        ...(image_size && { width: image_size, height: image_size })
      });

      if (result && result.images && result.images.length > 0) {
        const originalUrl = result.images[0].url;
        console.log(`Design ${i + 1} generated, URL: ${originalUrl}`);
        const imageName = `design_${Date.now()}_${i}.png`;
        const imagePath = path.join(__dirname, 'public', 'generated-images', imageName);
        
        // Ensure the directory exists
        fs.mkdirSync(path.dirname(imagePath), { recursive: true });

        // Download and save the image
        const response = await axios({ url: originalUrl, responseType: 'stream' });
        const writer = fs.createWriteStream(imagePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
          writer.on('finish', () => {
            console.log(`Image ${imageName} saved successfully.`);
            resolve({
              name: imageName,
              url: `/generated-images/${imageName}`, // Local URL for display
              original_url: originalUrl, // Original URL for upload
            });
          });
          writer.on('error', (err) => {
            console.error(`Error saving image ${imageName}:`, err);
            reject(new Error(`Failed to save image ${imageName}`));
          });
        });
      } else {
        throw new Error(`Image generation failed for design ${i + 1}: No image URL returned`);
      }
    });

    const generatedImages = await Promise.all(imagePromises);
    // The frontend expects an `images` property in the response
    res.json({ success: true, images: generatedImages });

  } catch (error) {
    console.error('Error generating image with Fal.ai:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the application at http://localhost:${PORT}`);
});
