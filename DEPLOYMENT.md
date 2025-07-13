# Deployment Guide for Printify Design Generator

This guide will help you deploy the Printify Design Generator application to Netlify.

## Prerequisites

- A [Netlify](https://www.netlify.com/) account
- A [FAL.ai](https://fal.ai/) account with an API key
- A [Printify](https://printify.com/) account with an API key

## Deployment Steps

### 1. Set up your repository

Make sure your code is in a Git repository (GitHub, GitLab, or Bitbucket) that Netlify can access.

### 2. Deploy to Netlify

1. Log in to your Netlify account
2. Click "New site from Git"
3. Connect to your Git provider and select your repository
4. Configure the build settings:
   - Build command: `npm install`
   - Publish directory: `public`
5. Click "Deploy site"

### 3. Configure Environment Variables

After deployment, you need to set up the environment variables:

1. Go to your site's dashboard in Netlify
2. Navigate to "Site settings" > "Environment variables"
3. Add the following environment variables:
   - `FAL_AI_API_KEY`: Your FAL.ai API key for image generation
   - `PRINTIFY_API_KEY`: (Optional) Your Printify API key if you want to use a default key

### 4. Configure Function Settings

1. In your site's dashboard, go to "Site settings" > "Functions"
2. Make sure the "Functions directory" is set to `functions`
3. If you're using external Node modules, add them to the "External Node modules" list:
   - `express`
   - `serverless-http`
   - `axios`
   - `cors`
   - `body-parser`
   - `node-fetch`
   - `uuid`

### 5. Redeploy Your Site

1. Go to the "Deploys" tab in your Netlify dashboard
2. Click "Trigger deploy" > "Deploy site"

## Verifying Deployment

1. Once deployed, visit your Netlify site URL
2. Enter your Printify API key in the top right corner
3. Verify that you can:
   - Generate designs
   - Select a shop
   - Create products with your designs

## Troubleshooting

### Function Errors

If your functions aren't working:

1. Check the function logs in Netlify (Site settings > Functions > Logs)
2. Verify that all environment variables are set correctly
3. Make sure the function dependencies are properly installed

### CORS Issues

If you're experiencing CORS issues:

1. Check that your Netlify functions have the proper CORS headers
2. Verify that the API endpoints are being called with the correct URL format

### Image Generation Issues

If images aren't generating:

1. Verify your FAL.ai API key is valid and has sufficient credits
2. Check the function logs for any specific error messages
3. Test the API endpoint directly using a tool like Postman

## Updating Your Deployment

To update your deployment:

1. Push changes to your Git repository
2. Netlify will automatically rebuild and deploy your site

For manual updates:
1. Run `netlify deploy --prod` from your local repository
2. Follow the prompts to deploy your site
