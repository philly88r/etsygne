// Local API Helper for Printify Web App
// This file provides helper functions for local development mode

// Helper function to handle API calls in both local and production environments
async function callPrintifyApi(endpoint, method = 'GET', body = null) {
  if (!window.printifyApiKey) {
    throw new Error('API key not set');
  }
  
  const isLocalDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  try {
    let url, headers = {
      'Content-Type': 'application/json'
    };
    
    if (isLocalDevelopment) {
      // In local development, call Printify API directly
      url = `https://api.printify.com/v1/${endpoint}`;
      headers['Authorization'] = `Bearer ${window.printifyApiKey}`;
    } else {
      // In production, use our Netlify Functions
      const API_BASE = '/.netlify/functions';
      url = `${API_BASE}/api?endpoint=${endpoint}`;
      headers['Authorization'] = `Bearer ${window.printifyApiKey}`;
    }
    
    const options = {
      method,
      headers
    };
    
    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }
    
    console.log(`Calling API: ${url}`);
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error);
    throw error;
  }
}

// Function to load blueprints directly from Printify API
async function loadBlueprintsDirectly(providerId) {
  try {
    const endpoint = providerId 
      ? `shops/${window.selectedShopId}/blueprints.json?print_provider_id=${providerId}`
      : `shops/${window.selectedShopId}/blueprints.json`;
      
    return await callPrintifyApi(endpoint);
  } catch (error) {
    console.error('Error loading blueprints:', error);
    throw error;
  }
}

// Function to load blueprint details directly from Printify API
async function loadBlueprintDetailsDirectly(blueprintId) {
  try {
    const endpoint = `shops/${window.selectedShopId}/blueprints/${blueprintId}.json`;
    return await callPrintifyApi(endpoint);
  } catch (error) {
    console.error(`Error loading blueprint details for ID ${blueprintId}:`, error);
    throw error;
  }
}

// Function to load variants directly from Printify API
async function loadVariantsDirectly(blueprintId, providerId) {
  try {
    const endpoint = `shops/${window.selectedShopId}/blueprints/${blueprintId}/print_providers/${providerId}/variants.json`;
    return await callPrintifyApi(endpoint);
  } catch (error) {
    console.error(`Error loading variants for blueprint ${blueprintId} and provider ${providerId}:`, error);
    throw error;
  }
}

// Function to upload image directly to Printify API
async function uploadImageDirectly(imageData) {
  try {
    const endpoint = 'uploads/images.json';
    return await callPrintifyApi(endpoint, 'POST', imageData);
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

// Function to create product directly with Printify API
async function createProductDirectly(productData) {
  try {
    const endpoint = `shops/${window.selectedShopId}/products.json`;
    return await callPrintifyApi(endpoint, 'POST', productData);
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

// Function to publish product directly with Printify API
async function publishProductDirectly(productId, publishData) {
  try {
    const endpoint = `shops/${window.selectedShopId}/products/${productId}/publish.json`;
    return await callPrintifyApi(endpoint, 'POST', publishData);
  } catch (error) {
    console.error(`Error publishing product ${productId}:`, error);
    throw error;
  }
}

// Export all functions for use in app.js
window.localApiHelper = {
  callPrintifyApi,
  loadBlueprintsDirectly,
  loadBlueprintDetailsDirectly,
  loadVariantsDirectly,
  uploadImageDirectly,
  createProductDirectly,
  publishProductDirectly
};

console.log('Local API Helper loaded successfully');
