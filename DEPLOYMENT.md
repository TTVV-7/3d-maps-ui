# Deployment Guide

Complete steps to deploy your 3D Map Generator to Vercel.

## Prerequisites

- GitHub account
- Vercel account (free tier available)
- Node.js 18+ installed locally

## Step 1: Prepare Your Repository

### 1.1 Initialize Git (if not already done)

```bash
cd /Users/tomster/3d-maps-ui
git init
git add .
git commit -m "Initial commit: 3D Map Generator UI"
```

### 1.2 Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Name it: `3d-maps-ui`
3. Add description: "3D printable map generator"
4. Choose Public or Private
5. Click "Create repository"

### 1.3 Push Code to GitHub

```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/3d-maps-ui.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

## Step 2: Deploy to Vercel

### 2.1 Connect Vercel to GitHub

1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up" and choose "Continue with GitHub"
3. Authorize Vercel to access your GitHub account

### 2.2 Create New Project

1. On Vercel dashboard, click "Add New" → "Project"
2. Select your `3d-maps-ui` repository
3. Click "Import"

### 2.3 Configure Project

**Project Settings** (should auto-detect):
- Framework: Next.js ✓
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

**Environment Variables** (optional, only if using custom backend):
- Key: `NEXT_PUBLIC_BACKEND_URL`
- Value: `https://your-backend-api.com`

### 2.4 Deploy

1. Click "Deploy"
2. Wait 2-3 minutes for build to complete
3. Once deployed, you'll get a URL like: `https://3d-maps-ui.vercel.app`

## Step 3: Verify Deployment

Visit your Vercel URL and test:
- [ ] Location picker works
- [ ] Map size slider adjusts
- [ ] Shape selector updates
- [ ] Generate button responsive
- [ ] Download button appears after generation
- [ ] 3D viewer responsive

## Step 4: Custom Domain (Optional)

1. In Vercel project settings → Domains
2. Add your custom domain (e.g., `maps.yourdomain.com`)
3. Follow DNS setup instructions for your domain provider

## Connecting Your Python Backend

### Option A: Keep Backend Local (Testing)

For development/testing only:

```bash
# In separate terminal, run your Python backend
cd /Users/tomster/3D\ maps
python grand_forks_map.py
```

Backend must run on `http://localhost:5000` (or configure the URL in the Next.js app).

### Option B: Deploy Backend to Cloud

Choose one of these platforms:

#### Railway.app (Recommended - easiest)

1. Go to [railway.app](https://railway.app)
2. Click "Create New Project"
3. Connect your GitHub (or upload your Python code)
4. Set Python version: 3.11
5. Add start command: `python grand_forks_map.py` (wrap in Flask/FastAPI)
6. Get your public URL
7. Add to Vercel environment variables

#### Render.com

Similar process to Railway, free tier available.

#### AWS Lambda / Google Cloud

For production-grade deployment.

### Step 5: Wrap Python Script in Web Server

Your Python backend needs to expose HTTP endpoints:

**Option 1: Flask**

```python
from flask import Flask, request, jsonify
import grand_forks_map

app = Flask(__name__)

@app.route('/generate', methods=['POST'])
def generate():
    data = request.json
    lat = data['latitude']
    lon = data['longitude']
    size = data['size']
    shape = data['shape']
    
    # Call your existing function
    stl_file = grand_forks_map.generate_stl(lat, lon, size, shape)
    
    return send_file(stl_file, mimetype='model/stl')

if __name__ == '__main__':
    app.run(port=5000)
```

**Option 2: FastAPI (Modern)**

```python
from fastapi import FastAPI
from fastapi.responses import FileResponse
import grand_forks_map

app = FastAPI()

@app.post('/generate')
async def generate(latitude: float, longitude: float, size: int, shape: str):
    stl_file = grand_forks_map.generate_stl(latitude, longitude, size, shape)
    return FileResponse(stl_file, media_type='model/stl')
```

### Step 6: Update Frontend API Call

In `/app/api/generate/route.ts`:

```typescript
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

const response = await fetch(`${backendUrl}/generate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ latitude, longitude, size, shape })
});

const blob = await response.blob();
return new NextResponse(blob, {
  headers: { 'Content-Type': 'model/stl' }
});
```

## Troubleshooting

### Build Fails on Vercel

**Error: "Node version too old"**
- Fix in Vercel: Settings → Node.js Version → Select 18.x or 20.x

**Error: "Module not found"**
- Ensure all dependencies in package.json
- Run `npm install` locally first
- Commit `package-lock.json` to git

### Frontend Won't Load

- Check browser console (F12 → Console)
- Look for 404 errors on API routes
- Verify Vercel function logs: Vercel Dashboard → Deployments → View Function Logs

### Backend Connection Issues

- Test backend URL directly in browser
- Add CORS headers to backend:
```python
# Flask
from flask_cors import CORS
CORS(app)

# FastAPI
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_origins=["*"])
```

## Updates & Redeployment

After making changes locally:

```bash
git add .
git commit -m "Description of changes"
git push origin main
```

Vercel automatically redeploys when you push to main branch.

## Monitoring

- **Vercel Analytics**: Vercel Dashboard → Analytics (shows page views, performance)
- **Function Logs**: Debug API routes in Vercel Dashboard → Deployments
- **Error Tracking**: Set up Sentry for production error monitoring

## Performance Optimization

- Vercel Edge Functions (reduce latency)
- Image optimization for DEM previews
- API response caching (if generating same areas frequently)
- Implement STL compression/streaming for large models

## Security Notes

- Don't expose API keys in frontend code
- Use environment variables for sensitive data
- Rate limit `/api/generate` to prevent abuse
- Validate input coordinates (prevent DoS)

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Community Discord](https://vercel.com/support)

---

**Your 3D map app is now live! 🚀**
