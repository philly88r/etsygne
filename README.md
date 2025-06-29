# Printify Design Generator

A web application that integrates with the Printify API and Google Imagen 4 to create and manage product designs.

## Features

- Generate designs using Google Imagen 4 AI
- Upload designs to Printify
- Browse available product types (blueprints), print providers, and variants
- Create products with your designs
- Publish products to your Printify shop
- View your existing products

## Prerequisites

- Node.js (v14 or higher)
- Printify API key (from your Printify account)
- Google API key with access to Imagen 4

## Installation

1. Clone the repository or navigate to the project directory
2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:
   - Edit the `.env` file and add your API keys:
   ```
   PRINTIFY_API_KEY=your_printify_api_key_here
   GOOGLE_API_KEY=your_google_api_key_here
   PORT=3000
   ```

## Usage

1. Start the application:

```bash
npm start
```

2. Open your browser and navigate to `http://localhost:3000`
3. Enter your Printify API key in the top right corner
4. Select your shop from the dropdown
5. Use the tabs to:
   - Generate designs with AI
   - View your existing products
   - Create new products with your designs

## API Endpoints

### Authentication
- `POST /api/verify-token` - Verify Printify API token and get shops

### Products
- `GET /api/shops/:shopId/products` - Get products for a shop
- `POST /api/shops/:shopId/products` - Create a new product
- `POST /api/shops/:shopId/products/:productId/publish` - Publish a product

### Catalog
- `GET /api/catalog/blueprints` - Get available product types (blueprints)
- `GET /api/catalog/blueprints/:blueprintId/print-providers` - Get print providers for a blueprint
- `GET /api/catalog/blueprints/:blueprintId/print-providers/:providerId/variants` - Get variants for a blueprint and print provider

### Images
- `POST /api/generate-image` - Generate images with Google Imagen 4
- `POST /api/upload-image` - Upload an image to Printify

## Getting API Keys

### Printify API Key
1. Log in to your Printify account
2. Go to your profile settings
3. Navigate to the "API" section
4. Generate a new API key

### Google API Key for Imagen 4
1. Go to [Google AI Studio](https://makersuite.google.com/)
2. Create a new project or use an existing one
3. Navigate to API Keys
4. Create a new API key with access to Imagen 4

## Troubleshooting

- **API Key Issues**: Ensure your API keys are correctly entered in the `.env` file
- **Image Generation Errors**: Check that your Google API key has access to Imagen 4
- **Product Creation Errors**: Make sure you've selected a design, blueprint, print provider, variants, and assigned the design to at least one print area

## License

MIT
