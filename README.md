# Printify Design Generator

A web application that integrates with the Printify API and FAL.ai to create and manage product designs with multi-design generation capabilities.

## Features

- Generate multiple designs using FAL.ai's Stable Diffusion XL
- Assign different designs to different print areas
- Upload designs to Printify
- Browse available product types (blueprints), print providers, and variants
- Create products with your designs
- Publish products to your Printify shop
- View your existing products

## Prerequisites

- Node.js (v14 or higher)
- Printify API key (from your Printify account)
- FAL.ai API key for image generation

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
   FAL_AI_API_KEY=your_fal_ai_api_key_here
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
   - Generate multiple designs with AI
   - Assign different designs to different print areas
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
- `POST /api/generate-image` - Generate multiple images with FAL.ai Stable Diffusion XL
- `POST /api/upload-image` - Upload an image to Printify

## Getting API Keys

### Printify API Key
1. Log in to your Printify account
2. Go to your profile settings
3. Navigate to the "API" section
4. Generate a new API key

### FAL.ai API Key
1. Go to [FAL.ai](https://fal.ai/)
2. Create an account or log in
3. Navigate to your dashboard
4. Generate a new API key

## Troubleshooting

- **API Key Issues**: Ensure your API keys are correctly entered in the `.env` file
- **Image Generation Errors**: Check that your FAL.ai API key is valid and has sufficient credits
- **Product Creation Errors**: Make sure you've selected designs, blueprint, print provider, variants, and assigned designs to print areas
- **Multi-Design Issues**: Ensure you've assigned the appropriate designs to each print area before creating the product

## License

MIT
