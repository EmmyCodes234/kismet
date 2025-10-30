# Deployment to Netlify

This document provides instructions for deploying the Kismet application to Netlify.

## Prerequisites

- A Netlify account
- Access to the project repository

## Netlify Deployment Settings

1. Connect your repository to Netlify
2. Set the following build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Base directory: `/` (root)

3. Environment variables:
   The application requires the following environment variables to be set in Netlify:
   - `GEMINI_API_KEY` - Your Gemini API key for AI features
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

   These can be set in the Netlify dashboard under:
   Site settings → Build & deploy → Environment

## Configuration Files

This project includes the following deployment configuration files:

1. `netlify.toml` - Main Netlify configuration file
2. `public/_redirects` - Handles SPA routing by redirecting all requests to index.html
3. `vite.config.ts` - Updated Vite configuration for proper deployment

## Deployment Process

1. Push your code to your Git repository
2. Connect Netlify to your repository
3. Configure the build settings as described above
4. Add the required environment variables
5. Deploy the site

## Troubleshooting

If you encounter issues:

1. Make sure all environment variables are correctly set
2. Verify that the build command runs successfully locally with `npm run build`
3. Check the Netlify build logs for specific error messages
4. Ensure the Supabase credentials are correct and the database is accessible

## Local Development

To test the production build locally:

```bash
npm run build
npm run preview
```

This will create a production build and serve it locally to verify everything works as expected.