# Deployment Instructions

Your website is ready to be deployed! Since this is a simple static HTML site (no build process required), the easiest way to deploy is using **Netlify** or **Vercel** via their Drag & Drop interface.

## Option 1: Netlify (Recommended)

1.  Go to [app.netlify.com](https://app.netlify.com).
2.  Log in or Sign up.
3.  Go to the **Sites** tab.
4.  Drag and drop the `stitch (2)` folder (or the folder containing `index.html`) into the "Drag and drop your site output folder here" area.
5.  Your site will be live instantly!

## Option 2: Vercel

1.  Go to [vercel.com](https://vercel.com) and log in.
2.  Install the Vercel CLI if you prefer: `npm i -g vercel` then run `vercel` in this directory.
3.  OR, import a git repository if you push this code to GitHub.

## Local Testing

To test locally before deploying:

1.  If you have Python installed:
    ```bash
    python -m http.server
    ```
    Then open `http://localhost:8000`.

2.  Or just double-click `index.html` to open it in your browser.
