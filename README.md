# Web App Deployment Guide

This application is designed to be compatible with major web deployment platforms.

## Deployment Options

### 1. Vercel (Recommended)
Vercel is the easiest way to deploy this app. It automatically handles the frontend and the serverless functions in the `api/` directory.

- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment Variables:** Add your API keys (e.g., `REMOVE_BG_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`) in the Vercel dashboard.

### 2. Netlify
Netlify is great for static sites.

- **Build Command:** `npm run build`
- **Publish Directory:** `dist`
- **Redirects:** The `public/_redirects` file handles SPA routing.
- **Note:** The server-side background removal API will not work on Netlify unless you convert it to Netlify Functions.

### 3. GitHub Pages
GitHub Pages is perfect for free hosting of static content.

- **Build Command:** `npm run build`
- **Branch:** `gh-pages` (or use GitHub Actions to deploy from `main`)
- **SPA Routing:** The `public/404.html` and `index.html` script handle routing.
- **Base Path:** If your app is at `username.github.io/repo-name/`, you must update `base` in `vite.config.ts`.

## Environment Variables
Ensure you set the following variables in your deployment platform:

- `VITE_SUPABASE_URL`: Your Supabase Project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase Anonymous Key
- `GEMINI_API_KEY`: Your Google Gemini API Key
- `REMOVE_BG_API_KEY`: (Optional) For premium background removal
- `PHOTOROOM_API_KEY`: (Optional) For premium background removal
- `BRIA_API_KEY`: (Optional) For premium background removal

## Local Development
```bash
npm install
npm run dev
```
