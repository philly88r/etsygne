// Netlify serverless function for generating images and uploading them to Printify
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

// Get Printify API token from environment variables
const PRINTIFY_API_KEY = process.env.PRINTIFY_API_KEY;

// Helper function to upload an image to Printify
async function uploadToPrintify(base64Data, fileName, apiKey) {
  if (!apiKey) {
    throw new Error('Printify API key is not configured');
  }
  
  const uploadResponse = await fetch('https://api.printify.com/v1/uploads/images.json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      file_name: fileName,
      contents: base64Data
    })
  });

  if (!uploadResponse.ok) {
    const errorBody = await uploadResponse.text();
    throw new Error(`Printify upload failed: ${uploadResponse.status} ${errorBody}`);
  }

  return uploadResponse.json();
}

const handler = async function(event, context) {
  console.log('Generate image function triggered');
  console.log('Environment variables check:', {
    FAL_API_KEY_SET: !!process.env.FAL_AI_API_KEY,
    PRINTIFY_API_KEY_SET: !!process.env.PRINTIFY_API_KEY
  });
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'OK' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Method Not Allowed' }) };
  }

  try {
    console.log('Parsing request body...');
    const { prompt, numImages = 3, width, height, printAreaId, printAreaContexts = [], apiKey = null } = JSON.parse(event.body);
    console.log('Request parsed:', { 
      prompt: prompt.substring(0, 30) + '...', 
      numImages, 
      width, 
      height, 
      printAreaId,
      printAreaContextsCount: printAreaContexts.length, 
      apiKeyProvided: !!apiKey 
    });
    
    if (!prompt) {
      console.log('Error: No prompt provided');
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Prompt is required' }) };
    }

    const falApiKey = process.env.FAL_AI_API_KEY;
    console.log('FAL_AI_API_KEY present:', !!falApiKey);
    
    if (!falApiKey) {
      console.log('Error: FAL_AI_API_KEY not set');
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'FAL.AI API key not configured' }) };
    }
    
    // Use API key from request body if provided, otherwise use environment variable
    const printifyApiKey = apiKey || process.env.PRINTIFY_API_KEY;
    console.log('PRINTIFY_API_KEY present:', !!printifyApiKey);
    
    if (!printifyApiKey) {
      console.log('Error: PRINTIFY_API_KEY not set');
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'Printify API key not configured. Please provide a valid API key.' }) };
    }

    const imagePromises = Array.from({ length: numImages }).map(async (_, i) => {
      // Create a context object that prioritizes explicit width/height parameters
      // Ensure width and height are numbers, not strings
      const contextWidth = typeof width === 'string' ? parseInt(width) : width;
      const contextHeight = typeof height === 'string' ? parseInt(height) : height;
      
      // Use the provided dimensions or fallback to context array or default
      const context = {
        width: contextWidth || (printAreaContexts[i % printAreaContexts.length]?.width) || 1024,
        height: contextHeight || (printAreaContexts[i % printAreaContexts.length]?.height) || 1024,
        position: (printAreaContexts[i % printAreaContexts.length]?.position) || 'front',
        id: printAreaId || (printAreaContexts[i % printAreaContexts.length]?.id)
      };
      
      // Convert dimensions to integers and apply reasonable constraints only if needed
      // We want to use the exact print area dimensions when possible
      const finalWidth = parseInt(context.width) || 1024;
      const finalHeight = parseInt(context.height) || 1024;
      
      // Only constrain dimensions if they're outside the API's acceptable range
      const apiMinDimension = 512;
      const apiMaxDimension = 1536;
      const constrainedWidth = finalWidth < apiMinDimension ? apiMinDimension : (finalWidth > apiMaxDimension ? apiMaxDimension : finalWidth);
      const constrainedHeight = finalHeight < apiMinDimension ? apiMinDimension : (finalHeight > apiMaxDimension ? apiMaxDimension : finalHeight);
      
      console.log(`Generating image ${i+1} with dimensions: ${context.width}x${context.height}`);
      console.log(`Original dimensions: ${finalWidth}x${finalHeight}, Constrained if needed: ${constrainedWidth}x${constrainedHeight}`);
      const enhancedPrompt = `${prompt} for the ${context.position} of a t-shirt`;

      // Generate image with Fal.ai
      const falResponse = await fetch('https://api.fal.ai/v1/models/fal-ai/imagen4/preview/fast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${falApiKey}`
        },
        body: JSON.stringify({
          input: {
            prompt: enhancedPrompt,
            negative_prompt: 'low quality, blurry, distorted, text, watermark',
            // Use the exact dimensions from the print area when possible, only constrain if outside API limits
            width: constrainedWidth,
            height: constrainedHeight,
            num_inference_steps: 30,
            guidance_scale: 7.5,
            num_images: 1
          }
        })
      });

      if (!falResponse.ok) {
        const errorBody = await falResponse.text();
        throw new Error(`Fal.ai generation failed: ${falResponse.status} ${errorBody}`);
      }

      const falData = await falResponse.json();
      const base64Data = falData.images[0];
      if (!base64Data) {
        throw new Error('No image data from Fal.ai');
      }

      // Upload the generated image to Printify
      const fileName = `design-${uuidv4()}.png`;
      const printifyImage = await uploadToPrintify(base64Data, fileName, printifyApiKey);

      return {
        id: printifyImage.id,
        url: printifyImage.preview_url,
        originalUrl: printifyImage.preview_url,
        name: fileName.replace('.png', ''),
        width: finalWidth,
        height: finalHeight,
        printAreaContext: {
          id: context.id,
          width: finalWidth,
          height: finalHeight,
          position: context.position
        }
      };
    });

    const images = await Promise.all(imagePromises);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, images })
    };

  } catch (error) {
    console.error('Error in generate-image function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: error.message || 'An internal error occurred' })
    };
  }
};

// Export the handler function
exports.handler = handler;
