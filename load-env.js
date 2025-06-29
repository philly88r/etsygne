// Simple .env file loader
const fs = require('fs');
const path = require('path');

try {
  // Read the .env file
  const envPath = path.join(__dirname, '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Parse the content and set environment variables
  const lines = envContent.split('\n');
  lines.forEach(line => {
    // Skip comments and empty lines
    if (!line || line.startsWith('#')) return;
    
    // Parse key=value pairs
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      
      // Remove quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      
      process.env[key] = value;
    }
  });
  
  console.log('Environment variables loaded successfully');
} catch (error) {
  console.error('Error loading .env file:', error.message);
}
