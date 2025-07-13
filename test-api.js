// Test script for the API endpoints
const fetch = require('node-fetch');

async function testGenerateImageAPI() {
  try {
    console.log('Testing generate-image API endpoint...');
    
    const response = await fetch('https://printify-design-generator.netlify.app/api/generate-image', {
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
    console.log('Response status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

// Run the test
testGenerateImageAPI();
