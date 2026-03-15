# Unistro — Complete Production Deployment Guide

This guide provides step-by-step instructions to deploy your full-stack Unistro application to modern cloud providers. We will deploy the **Frontend to Vercel** (for blazing fast CDN delivery) and the **Backend to Render or Railway** (for robust Node.js hosting). 

Since we are using **Supabase** for the database, it is already hosted in the cloud. We just need to connect our deployed backend to it.

---

## 🏗️ Phase 1: Preparation (GitHub)

Before deploying, your code needs to be pushed to a Git repository.

1. Initialize a Git repository in the master project folder (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial Unistro commit"
   ```
2. Create a new repository on [GitHub](https://github.com/), [GitLab](https://gitlab.com/), or [Bitbucket](https://bitbucket.org/).
3. Push your code to the new repository.

---

## 🎨 Phase 2: Deploy Frontend on Vercel

Vercel is the creator of Next.js and the absolute best place to host Vite/React frontend applications.

1. Go to [Vercel](https://vercel.com/) and create an account or log in with GitHub.
2. Click **"Add New..."** and select **"Project"**.
3. Import your Unistro Git repository.
4. **Configure Project:**
   - **Framework Preset:** Vercel should auto-detect **Vite**. If not, select it.
   - **Root Directory:** Click "Edit" and change it to `frontend` (since our Vite app is inside the `frontend` folder).
5. **Environment Variables:**
   - You need to set the `VITE_API_URL` to point to where your backend will be hosted.
   - *Note: Since we haven't deployed the backend yet, you can put a placeholder like `https://unistro-api.onrender.com/api` and come back to update it later, or deploy the backend first.*
     - Key: `VITE_API_URL`
     - Value: `https://your-backend-url.com/api`
6. Click **Deploy**.
7. Once deployed, Vercel will give you a live URL (e.g., `https://unistro-frontend.vercel.app`). **Copy this URL**, we will need it for the Backend's CORS settings.

---

## ⚙️ Phase 3: Deploy Backend (Choose Render OR Railway)

You only need to pick **one** of these providers for your Node.js Express backend. They both offer a free tier, but Railway is generally faster to build, while Render offers a permanent free tier (which spins down after inactivity).

### Option A: Deploy Backend on Render (Recommended for Free Tier)

1. Go to [Render.com](https://render.com/) and log in with GitHub.
2. Click **"New +"** and select **"Web Service"**.
3. Connect your GitHub repository.
4. **Configure the Web Service:**
   - **Name:** `unistro-api` (or whatever you like)
   - **Root Directory:** `backend` (CRITICAL: if you miss this, the build will fail).
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** Free
5. **Environment Variables:**
   Scroll down to the "Environment Variables" section and add all your keys from your local `.env`:
   - `TELEGRAM_API_ID` : (Your Telegram App ID)
   - `TELEGRAM_API_HASH` : (Your Telegram Hash)
   - `SUPABASE_URL` : (Your Supabase URL)
   - `SUPABASE_SERVICE_KEY` : (Your Supabase Service/Role Key)
   - `JWT_SECRET` : A highly secure random 32+ character string.
   - `ENCRYPTION_KEY` : A highly secure random 32 character string (EXACTLY 32 chars).
   - `FRONTEND_URL` : The URL Vercel gave you (e.g., `https://unistro-frontend.vercel.app`). *No trailing slash!*
   - `PORT` : `10000` (Render defaults to 10000)
6. Click **Create Web Service**. 
7. Render will build and deploy your Express app. Copy the live URL (e.g., `https://unistro-api.onrender.com`).

---

### Option B: Deploy Backend on Railway (Recommended for Speed & Developer Experience)

1. Go to [Railway.app](https://railway.app/) and log in with GitHub.
2. Click **"New Project"** -> **"Deploy from GitHub repo"**.
3. Select your Unistro repository.
4. Click **"Add Variables"** before the deployment finishes.
5. In the "Variables" tab, add all your `.env` variables:
   - `TELEGRAM_API_ID`
   - `TELEGRAM_API_HASH`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `JWT_SECRET`
   - `ENCRYPTION_KEY`
   - `FRONTEND_URL` (Your Vercel URL)
   - `PORT` : `5000` (or leave empty, Railway injects it automatically)
6. **Set Root Directory:**
   - Go to the **Settings** tab of your new service.
   - Find **"Root Directory"** and set it to `/backend`.
7. **Generate a Public URL:**
   - Go to the **Settings** tab -> **Networking**.
   - Click **"Generate Domain"** (it will create something like `unistro-api-production.up.railway.app`).
8. The service will automatically redeploy with the new settings.

---

## 🔌 Phase 4: Final Link-up

Now that both are deployed, we need to make sure they are talking to each other correctly.

1. **Update Vercel with Backend URL:**
   - If you put a placeholder in Vercel earlier, go to your Vercel Project -> **Settings** -> **Environment Variables**.
   - Edit `VITE_API_URL` and set it to your real backend URL + `/api` (e.g., `https://unistro-api.onrender.com/api` or `https://unistro-api-production.up.railway.app/api`).
   - Go to the **Deployments** tab and click **Redeploy** on the latest deployment so it picks up the new environment variable.

2. **Verify CORS on Backend:**
   - Ensure the `FRONTEND_URL` environment variable on your Render/Railway backend EXACTLY matches your Vercel URL (e.g., `https://unistro-frontend.vercel.app` — no trailing `/`). 
   - If you had to change it, trigger a manual deploy on Render/Railway.

## ✅ Phase 5: Production Verification Checklist

Visit your Vercel live URL and test the following:
- [ ] Try logging in with your Telegram account.
- [ ] Check if the OTP is sent to your Telegram app.
- [ ] Once logged in, upload a small file.
- [ ] Verify you can download the file.
- [ ] Verify the file appears in your private Telegram Storage Channel as an encrypted buffer.
- [ ] Create a "Share link" and try opening it in an Incognito window to test public sharing.

If everything works — congratulations! You have successfully deployed a highly scalable, unlimited zero-cost storage architecture.
