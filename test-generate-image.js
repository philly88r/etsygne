// Test script for the generate-image function
const fetch = require('node-fetch');

async function testGenerateImage() {
  try {
    console.log('Testing generate-image function...');
    
    const response = await fetch('http://localhost:8888/api/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'A colorful abstract design for a t-shirt',
        numImages: 2,
        printAreaContexts: [
          {
            printAreaId: 'front',
            position: 'front',
            width: 1000,
            height: 1000
          },
          {
            printAreaId: 'back',
            position: 'back',
            width: 1000,
            height: 1000
          }
        ]
      })
    });
    
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.images) {
      console.log(`Successfully generated ${data.images.length} images`);
      data.images.forEach((image, index) => {
        console.log(`Image ${index + 1}: ${image.url}`);
      });
    } else {
      console.error('Error:', data.message);
    }
  } catch (error) {
    console.error('Error testing generate-image function:', error);
  }
}

testGenerateImage();
