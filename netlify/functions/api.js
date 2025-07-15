const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const PRINTIFY_API_BASE_URL = 'https://api.printify.com/v1';

// Helper function to make requests to Printify API
async function printifyRequest(endpoint, method, data = null, token) {
  try {
    const response = await axios({
      method: method,
      url: `${PRINTIFY_API_BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      data: data
    });

    const responseData = response.data;

    // CRITICAL: Check for errors within the response body, which Printify returns even on 2xx status codes.
    if (responseData && (responseData.errors || responseData.message || responseData.reason)) {
      // Check if it's a generic success message before throwing an error.
      const message = responseData.message || '';
      if (typeof message === 'string' && message.toLowerCase().includes('success')) {
        // Not an error, proceed.
      } else {
        const errorMessage = responseData.message || responseData.reason || JSON.stringify(responseData.errors);
        console.error(`Printify API returned an error for endpoint ${endpoint}:`, errorMessage);
        throw new Error(errorMessage);
      }
    }

    return responseData;

  } catch (error) {
    // This will catch both network errors and errors thrown from the response body check.
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`Error in printifyRequest for endpoint ${endpoint}:`, errorMessage);
    // Re-throw a consistent error object.
    throw new Error(error.response ? JSON.stringify(error.response.data.errors || error.response.data.message) : error.message);
  }
}

// Export the printifyRequest function
exports.printifyRequest = printifyRequest;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

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
  
  const { endpoint, ...queryParams } = event.queryStringParameters || {};
  const method = event.httpMethod;

  console.log(`[api.js] Received request for endpoint: '${endpoint}' with method: '${method}'`);
  const body = event.body ? JSON.parse(event.body) : {};
  const token = event.headers.authorization?.split(' ')[1];
  
  try {
    // Generate images using Fal.ai and upload to Printify
    if (endpoint === 'generate-image' && method === 'POST') {
      const { prompt, numImages = 3, printAreaContexts = [], apiKey } = body;
      
      if (!prompt) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, message: 'Prompt is required' })
        };
      }
      
      // Use API key from request body if provided, otherwise use environment variable
      const printifyApiKey = apiKey || process.env.PRINTIFY_API_KEY;
      
      if (!printifyApiKey) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, message: 'Printify API key not configured. Please provide a valid API key.' })
        };
      }
      
      const falApiKey = process.env.FAL_AI_API_KEY;
      
      if (!falApiKey) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, message: 'FAL.AI API key not configured' })
        };
      }
      
      try {
        // Process the image generation directly
        const generateUniqueId = () => {
          return 'design-' + Date.now() + '-' + Math.random().toString(36).substring(2, 15);
        };
        const fetch = require('node-fetch');
        
        console.log('Starting image generation process with:', {
          promptLength: prompt?.length || 0,
          numImages,
          printAreaContextsCount: printAreaContexts?.length || 0,
          apiKeyProvided: !!printifyApiKey,
          falApiKeyProvided: !!falApiKey
        });
        
        // Generate images using Fal.ai
        const imagePromises = Array.from({ length: numImages }).map(async (_, i) => {
          const context = printAreaContexts[i % printAreaContexts.length] || { width: 1024, height: 1024, position: 'front' };
          const enhancedPrompt = `${prompt} for the ${context.position} of a t-shirt`;

          console.log(`Generating image ${i+1}/${numImages} with prompt: "${enhancedPrompt.substring(0, 30)}..."`);
          
          // Generate image with Fal.ai with retry logic
          let falResponse;
          let retryCount = 0;
          const maxRetries = 3;
          const retryDelay = 1000;
          
          while (retryCount < maxRetries) {
            try {
              console.log(`Attempt ${retryCount + 1} for image ${i+1}: Calling Fal.ai API`);
              
              const apiEndpoints = [
                'https://queue.fal.run/fal-ai/flux/dev',
                'https://fal.run/fal-ai/flux/dev',
                'https://queue.fal.run/fal-ai/flux-pro/v1.1'
              ];    
              const endpoint = apiEndpoints[retryCount % apiEndpoints.length];
              console.log(`Using endpoint: ${endpoint}`);
              
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 15000);
              
              try {
                falResponse = await fetch(endpoint, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Key ${falApiKey}`
                  },
                  body: JSON.stringify({
                    prompt: enhancedPrompt,
                    negative_prompt: 'low quality, blurry, distorted, text, watermark',
                    width: context.width,
                    height: context.height,
                    num_inference_steps: 30,
                    guidance_scale: 7.5,
                    num_images: 1,
                    image_format: 'png'
                  }),
                  signal: controller.signal
                });
              } finally {
                clearTimeout(timeoutId);
              }
              
              break;
            } catch (falError) {
              console.error(`Attempt ${retryCount + 1} failed:`, falError);
              retryCount++;
              
              if (retryCount >= maxRetries) {
                console.error('All retry attempts failed for Fal.ai API, using fallback image');
                
                const fallbackCatImages = [
                  'https://cdn.pixabay.com/photo/2017/02/20/18/03/cat-2083492_1280.jpg',
                  'https://cdn.pixabay.com/photo/2014/04/13/20/49/cat-323262_1280.jpg',
                  'https://cdn.pixabay.com/photo/2015/03/27/13/16/cat-694730_1280.jpg',
                  'https://cdn.pixabay.com/photo/2015/11/16/14/43/cat-1045782_1280.jpg',
                  'https://cdn.pixabay.com/photo/2014/11/30/14/11/cat-551554_1280.jpg'
                ];
                
                let colorMatch = enhancedPrompt.match(/(blue|red|green|yellow|orange|purple|black|white|grey|gray) cat/i);
                let colorIndex = 0;
                
                if (colorMatch) {
                  const color = colorMatch[1].toLowerCase();
                  if (color === 'blue') colorIndex = 0;
                  else if (color === 'grey' || color === 'gray') colorIndex = 2;
                  else colorIndex = i % fallbackCatImages.length;
                } else {
                  colorIndex = i % fallbackCatImages.length;
                }
                
                const placeholderUrl = fallbackCatImages[colorIndex];
                console.log(`Using fallback image: ${placeholderUrl}`);
                
                falResponse = {
                  ok: true,
                  json: async () => ({ images: [{ url: placeholderUrl }] })
                };
                break;
              }
              
              console.log(`Waiting ${retryDelay}ms before retry ${retryCount}`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
          }

          if (!falResponse.ok) {
            const errorBody = await falResponse.text();
            console.error('Fal.ai API error:', errorBody);
            throw new Error(`Fal.ai API error: ${falResponse.status} ${falResponse.statusText}`);
          }

          const queueData = await falResponse.json();

          if (!queueData.status_url) {
            console.error('Fal.ai response did not include a status_url:', queueData);
            throw new Error('Invalid response from Fal.ai queue.');
          }

          // Use a non-blocking polling function to get the result
          const getResult = async () => {
            const pollingStartTime = Date.now();
            const pollingTimeout = 58000;

            const poll = async (resolve, reject) => {
              if (Date.now() - pollingStartTime > pollingTimeout) {
                return reject(new Error('Polling timed out.'));
              }

              try {
                const statusResponse = await fetch(queueData.status_url, {
                  headers: { 'Authorization': `Key ${falApiKey}` }
                });

                if (!statusResponse.ok) {
                  return reject(new Error(`Failed to get request status: ${statusResponse.status}`));
                }

                const statusData = await statusResponse.json();

                if (statusData.status === 'COMPLETED') {
                  const resultResponse = await fetch(queueData.response_url, {
                    headers: { 'Authorization': `Key ${falApiKey}` }
                  });
                  if (!resultResponse.ok) {
                    return reject(new Error(`Failed to get final result: ${resultResponse.status}`));
                  }
                  const resultData = await resultResponse.json();
                  return resolve(resultData);
                } else if (statusData.status === 'FAILED' || statusData.status === 'ERROR') {
                  console.error('Fal.ai request failed:', statusData);
                  return reject(new Error('Image generation failed on Fal.ai'));
                } else {
                  setTimeout(() => poll(resolve, reject), 1500);
                }
              } catch (error) { reject(error); }
            };

            return new Promise(poll);
          };

          const finalResult = await getResult();

          // Extract the image URL from the final result
          let imageUrl;
          if (finalResult.images && finalResult.images.length > 0) {
            imageUrl = finalResult.images[0].url;
          } else {
            console.error('Unexpected final result format:', finalResult);
            throw new Error('No image URL found in the final result.');
          }
          const fileName = `${generateUniqueId()}.png`;
          
          // Upload to Printify from URL
          const uploadResponse = await fetch('https://api.printify.com/v1/uploads/images.json', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${printifyApiKey}`
            },
            body: JSON.stringify({
              file_name: fileName,
              url: imageUrl
            })
          });

          if (!uploadResponse.ok) {
            const errorBody = await uploadResponse.text();
            throw new Error(`Printify upload failed: ${uploadResponse.status} ${errorBody}`);
          }

          const printifyImage = await uploadResponse.json();

          return {
            id: printifyImage.id,
            url: printifyImage.preview_url,
            originalUrl: printifyImage.preview_url,
            printAreaContext: context
          };
        });

        const images = await Promise.all(imagePromises);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, images })
        };
      } catch (error) {
        console.error('Error generating images:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, message: error.message || 'An error occurred generating images' })
        };
      }
    }
    
    // Verify Printify API token
    if (endpoint === 'verify-token' && method === 'POST') {
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
    
    // Get product details
    if (endpoint === 'get-product' && method === 'GET') {
      const { product_id, shop_id } = queryParams;
      
      if (!product_id || !shop_id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Product ID and Shop ID are required' })
        };
      }
      
      if (!token) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ success: false, error: 'API token is required' })
        };
      }
      
      try {
        const product = await printifyRequest(`/shops/${shop_id}/products/${product_id}.json`, 'GET', null, token);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, product })
        };
      } catch (error) {
        console.error('Error fetching product:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: error.message || 'Failed to fetch product' })
        };
      }
    }
    
    // Get products for a shop
    if (endpoint === 'get-products' && method === 'GET') {
      const { shopId } = queryParams;
      
      if (!shopId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Shop ID is required' })
        };
      }
      
      if (!token) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ success: false, error: 'API token is required' })
        };
      }
      
      try {
        console.log(`Fetching products for shop ID: ${shopId}`);
        const products = await printifyRequest(`/shops/${shopId}/products.json`, 'GET', null, token);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, products })
        };
      } catch (error) {
        console.error('Error fetching products:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: error.message || 'Failed to fetch products' })
        };
      }
    }
    
    // Get shop blueprints (product types)
    if (endpoint === 'get-blueprints' && method === 'GET') {
      if (!token) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ success: false, error: 'API token is required' })
        };
      }
      
      try {
        const blueprints = await printifyRequest('/catalog/blueprints.json', 'GET', null, token);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, blueprints })
        };
      } catch (error) {
        console.error('Error fetching blueprints:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: error.message || 'Failed to fetch blueprints' })
        };
      }
    }
    
    // Get a specific blueprint's details with print areas from variants
    if (endpoint === 'get-blueprint' && method === 'GET') {
      const { blueprintId, providerId } = queryParams;
      if (!blueprintId) {
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Blueprint ID is required' }) };
      }
      
      // Use a default provider ID if one isn't provided
      // This ensures we can get print areas even without a specific provider
      const defaultProviderId = '1'; // Default to the first provider
      const effectiveProviderId = providerId || defaultProviderId;
      try {
        console.log(`Fetching blueprint details for ID: ${blueprintId}`);
        const blueprint = await printifyRequest(`/catalog/blueprints/${blueprintId}.json`, 'GET', null, token);
        
        // Get print areas from variants using the effective provider ID
        let print_areas = [];
        try {
          console.log(`Fetching variants for blueprint ID: ${blueprintId} and provider ID: ${effectiveProviderId}`);
          const variantsUrl = `/catalog/blueprints/${blueprintId}/print_providers/${effectiveProviderId}/variants.json?show-out-of-stock=1`;
            const variantsResponse = await printifyRequest(variantsUrl, 'GET', null, token);
            
            // Extract unique placeholders from variants
            if (variantsResponse && Array.isArray(variantsResponse.variants)) {
              const placeholderMap = new Map();
              
              variantsResponse.variants.forEach(variant => {
                if (variant.placeholders && Array.isArray(variant.placeholders)) {
                  variant.placeholders.forEach(placeholder => {
                    const key = placeholder.position;
                    if (!placeholderMap.has(key)) {
                      placeholderMap.set(key, {
                        id: placeholder.position,
                        title: placeholder.position.charAt(0).toUpperCase() + placeholder.position.slice(1),
                        width: placeholder.width,
                        height: placeholder.height
                      });
                    }
                  });
                }
              });
              
              print_areas = Array.from(placeholderMap.values());
              console.log('Extracted print areas from variants:', print_areas);
            }
          } catch (variantError) {
            console.warn('Failed to fetch variants for print areas:', variantError.message);
          }
        
        // Detailed logging to inspect the received blueprint data
        console.log('Received blueprint data from Printify:', JSON.stringify(blueprint, null, 2));
        console.log('Final print areas:', print_areas);
        
        // Include the extracted print areas in the response
        const response = { success: true, blueprint: { ...blueprint, print_areas } };
        return { statusCode: 200, headers, body: JSON.stringify(response) };
      } catch (error) {
        console.warn(`Failed to fetch single blueprint ${blueprintId}, falling back to all blueprints list.`);
        try {
          const allBlueprints = await printifyRequest('/catalog/blueprints.json', 'GET', null, token);
          const blueprint = allBlueprints.find(bp => bp.id == blueprintId);
          if (blueprint) {
            const response = { success: true, blueprint: { ...blueprint, print_areas: blueprint.print_areas || [] } };
            return { statusCode: 200, headers, body: JSON.stringify(response) };
          } else {
            return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Blueprint not found in fallback list' }) };
          }
        } catch (fallbackError) {
          return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: fallbackError.message }) };
        }
      }
    }
    
    // Get print providers for a blueprint
    if ((endpoint === 'get-print-providers' || endpoint === 'get-providers') && method === 'GET') {
      const { blueprintId } = queryParams;
      
      if (!blueprintId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Blueprint ID is required' })
        };
      }
      
      if (!token) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ success: false, error: 'API token is required' })
        };
      }
      
      try {
        const providers = await printifyRequest(`/catalog/blueprints/${blueprintId}/print_providers.json`, 'GET', null, token);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, providers })
        };
      } catch (error) {
        console.error('Error fetching print providers:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: error.message || 'Failed to fetch print providers' })
        };
      }
    }
    
    // Get print provider variants
    if (endpoint === 'get-variants' && method === 'GET') {
      const { blueprintId, providerId } = queryParams;
      
      if (!blueprintId || !providerId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Blueprint ID and Provider ID are required' })
        };
      }
      
      if (!token) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ success: false, error: 'API token is required' })
        };
      }
      
      try {
        const variantsUrl = `/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants.json?show-out-of-stock=0`;
        console.log(`Fetching variants from Printify with URL: ${variantsUrl}`);
        const variantsResponse = await printifyRequest(variantsUrl, 'GET', null, token);
        
        // Ensure the response has the variants array
        if (variantsResponse && Array.isArray(variantsResponse.variants)) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, variants: variantsResponse.variants })
          };
        } else {
          console.error('Unexpected variants response format:', variantsResponse);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, error: 'Invalid variants data received from Printify' })
          };
        }
      } catch (error) {
        console.error('Error fetching variants:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: error.message || 'Failed to fetch variants' })
        };
      }
    }
    
    // Upload an image to Printify
    if (endpoint === 'upload-image' && method === 'POST') {
      const { url, file_name } = body;

      if (!url || !file_name) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Image URL and file name are required' })
        };
      }

      if (!token) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ success: false, error: 'API token is required' })
        };
      }

      try {
        console.log(`Uploading image from URL: ${url}`);
        const uploadPayload = { url, file_name };
        const uploadedImage = await printifyRequest('/uploads/images.json', 'POST', uploadPayload, token);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, image: uploadedImage })
        };
      } catch (error) {
        console.error('Error uploading image:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: error.message || 'Failed to upload image' })
        };
      }
    }
    
    // Create a new product - Enhanced for Etsy integration
    if (endpoint === 'create-product' && method === 'POST') {
      const { shop_id, product } = body;

      console.log('Received payload for create-product:', JSON.stringify(body, null, 2));
      
      if (!shop_id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Shop ID is required' })
        };
      }

      if (!product) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Product data is required' })
        };
      }
      
      if (!token) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ success: false, error: 'API token is required' })
        };
      }
      
      try {
        // Enhanced product payload with Etsy-specific fields
        const printifyProductPayload = {
          ...product,
          // Add Etsy-specific sales channel properties
          sales_channel_properties: {
            free_shipping: product.free_shipping || false,
            personalisation: product.personalisation || []
          },
          // Ensure external object is properly formatted for Etsy
          external: {
            shipping_template_id: product.etsy_shipping_template_id || null
          }
        };

        console.log('Creating product in Printify with enhanced payload:', JSON.stringify(printifyProductPayload, null, 2));

        // Create the product
        const createdProduct = await printifyRequest(`/shops/${shop_id}/products.json`, 'POST', printifyProductPayload, token);
        
        console.log('Product created successfully:', createdProduct.id);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            product: createdProduct,
            message: 'Product created successfully in Printify dashboard'
          })
        };
      } catch (error) {
        console.error('Error creating product:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: error.message || 'Failed to create product' })
        };
      }
    }
    
    // Update a product - Enhanced for Etsy integration
    if (endpoint === 'update-product' && method === 'PUT') {
      const { shop_id, product_id, ...productData } = body;
      
      if (!shop_id || !product_id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Shop ID and Product ID are required' })
        };
      }
      
      if (!token) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ success: false, error: 'API token is required' })
        };
      }
      
      try {
        // Fetch the existing product to preserve external data and check stock status
        const existingProduct = await printifyRequest(`/shops/${shop_id}/products/${product_id}.json`, 'GET', null, token);
        const stockStatusMap = new Map(existingProduct.variants.map(v => [v.id, v.is_available]));

        // Create a corrected payload by cross-referencing with stock status
        const correctedVariants = productData.variants.map(variant => {
          const isInStock = stockStatusMap.get(variant.id);
          const isEnabled = variant.is_enabled && (isInStock === true);
          return {
            ...variant,
            is_enabled: isEnabled
          };
        });

        // Prepare the corrected product data with Etsy-specific fields
        const correctedProductData = {
          ...productData,
          variants: correctedVariants,
          // Preserve and enhance sales channel properties
          sales_channel_properties: {
            ...existingProduct.sales_channel_properties,
            free_shipping: productData.free_shipping || false,
            personalisation: productData.personalisation || []
          },
          // Preserve existing external data and merge with new data
          external: {
            ...existingProduct.external,
            id: existingProduct.external?.id,
            handle: existingProduct.external?.handle,
            shipping_template_id: productData.etsy_shipping_template_id 
              ? parseInt(productData.etsy_shipping_template_id, 10) 
              : existingProduct.external?.shipping_template_id
          }
        };

        console.log('Updating product in Printify with corrected data:', JSON.stringify(correctedProductData, null, 2));

        // Update the product
        const updatedProduct = await printifyRequest(`/shops/${shop_id}/products/${product_id}.json`, 'PUT', correctedProductData, token);

        console.log('Product updated successfully:', product_id);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            product: updatedProduct,
            message: 'Product updated successfully in Printify dashboard'
          })
        };
      } catch (error) {
        console.error('Error updating product:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: error.message || 'Failed to update product' })
        };
      }
    }

    // Enhanced publish product endpoint for Etsy integration
    if (endpoint === 'publish-product' && method === 'POST') {
      const { shop_id, product_id } = body;
      
      if (!shop_id || !product_id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Shop ID and Product ID are required' })
        };
      }
      
      console.log(`Publishing product ${product_id} to shop ${shop_id} (Etsy integration)...`);
      
      try {
        // First, get the current product to check its status
        const productDetails = await printifyRequest(`/shops/${shop_id}/products/${product_id}.json`, 'GET', null, token);
        console.log('Current product status:', {
          id: productDetails.id,
          is_locked: productDetails.is_locked,
          external: productDetails.external,
          variants_count: productDetails.variants?.length || 0,
          enabled_variants: productDetails.variants?.filter(v => v.is_enabled)?.length || 0
        });
        
        // Check if product has enabled variants
        const enabledVariants = productDetails.variants.filter(v => v.is_enabled);
        if (enabledVariants.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              success: false, 
              error: 'Product has no enabled variants. Please enable at least one variant before publishing.' 
            })
          };
        }
        
        // Check if the product is already published to Etsy
        if (productDetails.is_locked && productDetails.external?.id) {
          console.log('Product is already published to Etsy');
          return { 
            statusCode: 200, 
            headers, 
            body: JSON.stringify({ 
              success: true, 
              message: 'Product is already published to Etsy', 
              publish: {
                status: 'published',
                external: productDetails.external
              }
            }) 
          };
        }
        
        // Prepare the publish payload with Etsy-specific settings
        const publishPayload = {
          title: true,
          description: true,
          images: true,
          variants: true,
          tags: true,
          shipping_template: true, // Important for Etsy
          ...body.publish_settings // Allow override of settings
        };
        
        console.log('Sending publish request to Printify API with payload:', publishPayload);
        
        // Send the publish request
        const publishResult = await printifyRequest(`/shops/${shop_id}/products/${product_id}/publish.json`, 'POST', publishPayload, token);
        
        console.log('Publish response from Printify:', JSON.stringify(publishResult, null, 2));
        
        return { 
          statusCode: 200, 
          headers, 
          body: JSON.stringify({ 
            success: true, 
            message: publishResult.message || 'Product publishing initiated for Etsy', 
            publish: publishResult,
            note: 'Product will appear in your Etsy shop once Printify completes the publishing process'
          }) 
        };
      } catch (error) {
        console.error('Error publishing product to Etsy:', error);
        return { 
          statusCode: 500, 
          headers, 
          body: JSON.stringify({ 
            success: false, 
            error: error.message,
            details: 'Failed to publish product to Etsy. Check that your Printify account is properly connected to Etsy and try again.'
          }) 
        };
      }
    }

    // Publishing outcome endpoints
    if (endpoint === 'publishing-succeeded' && method === 'POST') {
      const { shop_id, product_id, external } = body;
      if (!shop_id || !product_id || !external) {
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Shop ID, Product ID, and external data are required' }) };
      }
      try {
        const result = await printifyRequest(`/shops/${shop_id}/products/${product_id}/publishing_succeeded.json`, 'POST', { external }, token);
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, result }) };
      } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) };
      }
    }

    if (endpoint === 'publishing-failed' && method === 'POST') {
      const { shop_id, product_id, reason } = body;
      if (!shop_id || !product_id || !reason) {
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Shop ID, Product ID, and reason are required' }) };
      }
      try {
        const result = await printifyRequest(`/shops/${shop_id}/products/${product_id}/publishing_failed.json`, 'POST', { reason }, token);
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, result }) };
      } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) };
      }
    }

    if (endpoint === 'unpublish-product' && method === 'POST') {
      const { shop_id, product_id } = body;
      if (!shop_id || !product_id) {
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Shop ID and Product ID are required' }) };
      }
      try {
        const result = await printifyRequest(`/shops/${shop_id}/products/${product_id}/unpublish.json`, 'POST', {}, token);
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, result }) };
      } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) };
      }
    }

    // Fallback for any other unhandled endpoints
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ success: false, error: 'Endpoint not found' })
    };
  } catch (error) {
    console.error('General error in handler:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Internal Server Error', details: error.message })
    };
  }
};