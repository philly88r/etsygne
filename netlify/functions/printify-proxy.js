// Netlify serverless function to proxy requests to Printify API
const axios = require('axios');

exports.handler = async function(event, context) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Printify-Api-Key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Get API key from request headers
    const apiKey = event.headers['x-printify-api-key'];
    
    if (!apiKey) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'API key is required' })
      };
    }

    // Parse request body
    const requestBody = JSON.parse(event.body);
    const { action, shopId } = requestBody;

    // Base URL for Printify API
    const baseUrl = 'https://api.printify.com/v1';
    
    // Handle different actions
    switch (action) {
      case 'getShops':
        // Get shops for the authenticated user
        const shopsResponse = await axios.get(`${baseUrl}/shops.json`, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(shopsResponse.data)
        };
      
      case 'getBlueprints':
        // Get available blueprints (product templates)
        const blueprintsResponse = await axios.get(`${baseUrl}/catalog/blueprints.json`, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(blueprintsResponse.data)
        };
      
      case 'getBlueprintDetails':
        // Get details for a specific blueprint
        const { blueprintId } = requestBody;
        
        if (!blueprintId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Blueprint ID is required' })
          };
        }
        
        const blueprintDetailsResponse = await axios.get(`${baseUrl}/catalog/blueprints/${blueprintId}.json`, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(blueprintDetailsResponse.data)
        };
      
      case 'getPrintProviders':
        // Get print providers for a specific blueprint
        const { blueprintId: providersForBlueprint } = requestBody;
        
        if (!providersForBlueprint) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Blueprint ID is required' })
          };
        }
        
        const printProvidersResponse = await axios.get(`${baseUrl}/catalog/blueprints/${providersForBlueprint}/print_providers.json`, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(printProvidersResponse.data)
        };
      
      case 'getVariants':
        // Get variants for a specific blueprint and print provider
        const { blueprintId: variantsBlueprint, printProviderId } = requestBody;
        
        if (!variantsBlueprint || !printProviderId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Blueprint ID and Print Provider ID are required' })
          };
        }
        
        const variantsResponse = await axios.get(`${baseUrl}/catalog/blueprints/${variantsBlueprint}/print_providers/${printProviderId}/variants.json`, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(variantsResponse.data)
        };
      
      case 'uploadImage':
        // Upload an image to Printify
        const { fileName, imageData } = requestBody;
        
        if (!shopId || !fileName || !imageData) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Shop ID, file name, and image data are required' })
          };
        }
        
        const uploadResponse = await axios.post(`${baseUrl}/shops/${shopId}/images.json`, {
          file_name: fileName,
          contents: imageData
        }, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(uploadResponse.data)
        };
      
      case 'createProduct':
        // Create a new product
        const { productData } = requestBody;
        
        if (!shopId || !productData) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Shop ID and product data are required' })
          };
        }
        
        const createProductResponse = await axios.post(`${baseUrl}/shops/${shopId}/products.json`, productData, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(createProductResponse.data)
        };
      
      case 'publishProduct':
        // Publish a product
        const { productId } = requestBody;
        
        if (!shopId || !productId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Shop ID and product ID are required' })
          };
        }
        
        const publishResponse = await axios.post(`${baseUrl}/shops/${shopId}/products/${productId}/publish.json`, {}, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(publishResponse.data)
        };
      
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Unsupported action: ${action}` })
        };
    }
  } catch (error) {
    console.error('Error processing request:', error);
    
    return {
      statusCode: error.response?.status || 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        details: error.response?.data || 'Internal server error'
      })
    };
  }
};
