# Image Dataset Collector

A high-quality, Pinterest-style aesthetic image dataset collector.

## Netlify Deployment

This project is configured for easy deployment to Netlify.

### Steps to Deploy:

1.  **Connect to GitHub:** Push your code to a GitHub repository.
2.  **Create a New Site on Netlify:** Connect your GitHub repository to Netlify.
3.  **Build Settings:**
    *   **Build Command:** `npm run build`
    *   **Publish Directory:** `dist`
    *   **Functions Directory:** `netlify/functions`
4.  **Redirects:** The `netlify.toml` and `public/_redirects` files handle SPA routing and API proxying automatically.

### Features:
*   **Pinterest-style Masonry Layout:** Beautiful staggered image grid.
*   **Aesthetic Search:** Automatically enhances queries for Pinterest-like results.
*   **Dataset Collection:** Download images in bulk as a ZIP file.
*   **Serverless API:** Backend logic is handled by Netlify Functions for seamless deployment.
