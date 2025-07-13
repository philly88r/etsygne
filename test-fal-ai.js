const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testLocalImageGeneration() {
  console.log('Testing local /api/generate-image endpoint');

  const prompt = 'A vibrant, abstract painting of a city at night';
  const numImages = 1;

  try {
    console.log(`Sending request to http://localhost:3001/api/generate-image with prompt: "${prompt}"`);

    const response = await axios.post('http://localhost:3001/api/generate-image', {
      prompt: prompt,
      numImages: numImages,
    }, {
      timeout: 60000, // 60 second timeout for the entire process
    });

    console.log('Local server response received');
    console.log('Response status:', response.status);

    if (response.data && response.data.images && response.data.images.length > 0) {
      console.log(`Successfully received ${response.data.images.length} images.`);
      const image = response.data.images[0];
      console.log('First image URL:', image.url);
      console.log('First image has base64 data:', !!image.data);

      // Optional: save the base64 data as a local file to verify
      if (image.data) {
        const buffer = Buffer.from(image.data, 'base64');
        const savePath = path.join(__dirname, 'test-output.png');
        fs.writeFileSync(savePath, buffer);
        console.log(`Saved received image to ${savePath}`);
      }
      console.log('Test successful!');
    } else if (response.data.error) {
        console.error('Server returned an error:', response.data.error);
        console.error('Details:', response.data.details);
    } else {
      console.log('No images found in response, or response format is unexpected.');
      console.log('Full response:', JSON.stringify(response.data, null, 2));
    }

  } catch (error) {
    console.error('Error testing local API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testLocalImageGeneration();
