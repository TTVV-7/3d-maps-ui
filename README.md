# 3D Map Generator

A web application that lets you create and visualize 3D printable topographic maps of any location. Pick a location, select the map size/shape, and download the STL file for 3D printing!

## Features

✨ **Location Picker** - Search for any address worldwide using OpenStreetMap geocoding
📐 **Shape Selector** - Choose between square or circular map shapes
👀 **3D Viewer** - Preview your generated models with Three.js
📥 **STL Export** - Download ready-to-print STL files
🎨 **Modern UI** - Clean, responsive design with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS, React
- **3D Visualization**: Three.js, STL parsing
- **Backend**: Next.js API Routes
- **Geocoding**: Nominatim (OpenStreetMap)

## Project Structure

```
├── app/
│   ├── components/
│   │   ├── LocationPicker.tsx    # Address input & geocoding
│   │   ├── ShapeSelector.tsx     # Map shape selection
│   │   └── ModelViewer.tsx       # 3D viewer component
│   ├── api/
│   │   └── generate/
│   │       └── route.ts          # STL generation API
│   ├── page.tsx                  # Main UI
│   ├── layout.tsx
│   └── globals.css
├── package.json
├── next.config.ts
├── tsconfig.json
└── README.md
```

## Getting Started

### Local Development

1. **Install dependencies**:
```bash
cd 3d-maps-ui
npm install
```

2. **Run development server**:
```bash
npm run dev
```

3. **Open browser**:
Navigate to `http://localhost:3000`

4. (Optional) **Connect Python Backend**:
If you want to generate actual topographic maps instead of placeholder STLs, modify `app/api/generate/route.ts` to call your Python service:

```typescript
const response = await fetch('http://localhost:5000/generate', {
  method: 'POST',
  body: JSON.stringify({ latitude, longitude, size, shape })
});
```

### Python Backend Integration

To integrate your existing `grand_forks_map.py` script:

1. Create a Python Flask/FastAPI server that wraps your script
2. Expose a `/generate` endpoint that accepts:
   - `latitude`, `longitude`, `size`, `shape` as JSON
   - Returns binary STL file
3. Deploy alongside the Next.js app or as a separate service

## Deployment on Vercel

### Option 1: Simple Deployment (No Backend)

This creates a working UI with placeholder STL files:

1. **Push to GitHub**:
```bash
cd 3d-maps-ui
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/3d-maps-ui.git
git push -u origin main
```

2. **Deploy on Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New..." → "Project"
   - Select your GitHub repository
   - Click "Deploy"
   - Done! Your app is live at a `.vercel.app` domain

### Option 2: With Python Backend (Advanced)

For full topographic generation, you'll need to:

1. Deploy Python backend separately:
   - Use Railway, Heroku, or AWS Lambda
   - Make it publicly accessible at `https://your-backend-url.com`

2. Set environment variable on Vercel:
   - Go to Project Settings → Environment Variables
   - Add: `NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com`

3. Update `app/api/generate/route.ts` to use this URL

## Environment Variables

Create `.env.local` for local development (optional):

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

## Using the App

1. **Enter Location**
   - Type an address (e.g., "Grand Forks, BC")
   - Adjust map size with the slider (1-50 km)

2. **Choose Shape**
   - Currently supports Square (Circle coming soon)

3. **Generate Map**
   - Click "Generate Map"
   - Wait for 3D model to render

4. **View & Download**
   - Rotate model with mouse in 3D viewer
   - Click "Download STL File" to save for 3D printing

## API Routes

### POST `/api/generate`

**Request**:
```json
{
  "latitude": 48.995,
  "longitude": -118.45,
  "size": 5000,
  "shape": "square"
}
```

**Response**:
- Binary STL file (model/stl)

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers supported

## Performance Notes

- Geocoding uses Nominatim (public, rate-limited)
- 3D viewer optimized for models up to ~50 MB
- STL generation may take 30+ seconds depending on complexity
- Large maps (>20km) recommended for server-side generation

## Troubleshooting

**"Address not found"**
- Try a more specific address
- Include country/region name

**3D model won't load**
- Check browser console for errors
- Try a smaller map size
- Ensure backend is responding (if configured)

**Slow generation**
- Large maps take longer to generate
- Backend processing depends on hardware
- Consider running generation asynchronously

## Future Enhancements

- [ ] Circle/polygon shape support
- [ ] Color selection for 3D printed layers
- [ ] Support for different DEM sources
- [ ] Batch processing multiple locations
- [ ] Real-time progress updates
- [ ] Advanced styling options

## License

MIT

## Support

For issues or questions, check:
- GitHub Issues
- [Next.js Documentation](https://nextjs.org/docs)
- [Three.js Documentation](https://threejs.org/docs)

---

**Happy 3D mapping! 🗺️🖨️**

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
