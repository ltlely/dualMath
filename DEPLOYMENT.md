# Math Game Deployment Guide

## Deployment Setup

### Prerequisites
- Frontend deployed on Vercel: `https://dual-math.vercel.app`
- Backend deployed on Render: `https://dualmath.onrender.com` (replace with your actual Render URL)

---

## Frontend Deployment (Vercel)

### 1. Update `.env` with your actual Render backend URL

**File: `desktop/.env`**
```env
VITE_SOCKET_URL=https://your-actual-render-service.onrender.com
```

Replace `your-actual-render-service` with your real Render service name.

### 2. Deploy to Vercel
```bash
cd desktop
npm run build
# Deploy build/ folder to Vercel
```

---

## Backend Deployment (Render)

### 1. Create `Procfile` in server root

**File: `server/Procfile`**
```
web: node index.js
```

### 2. Set Environment Variables in Render Dashboard

Go to your Render service settings and add:

```
ALLOWED_ORIGINS=https://dual-math.vercel.app,https://your-actual-render-service.onrender.com
```

### 3. Ensure Node.js is set to run your server

**Build Command:**
```
npm install
```

**Start Command:**
```
node index.js
```

### 4. Deploy
```bash
cd server
git push
# Render auto-deploys on push
```

---

## Testing Deployment

### Test 1: Check if server is running
```bash
curl https://your-actual-render-service.onrender.com/
# Should return: {"status":"ok","message":"Math Game Server is running",...}

curl https://your-actual-render-service.onrender.com/health
# Should return: {"status":"healthy","uptime":...}
```

### Test 2: Check CORS headers
```bash
curl -H "Origin: https://dual-math.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  -X OPTIONS https://your-actual-render-service.onrender.com/socket.io/ -v
# Should see: Access-Control-Allow-Origin: https://dual-math.vercel.app
```

### Test 3: Test Socket.IO connection
- Visit `https://dual-math.vercel.app`
- Check browser console
- Should see: `✅ socket connected`
- Should NOT see CORS errors

---

## Common Issues & Fixes

### Issue: CORS error on Socket.IO connection

**Cause:** 
- Placeholder URL still in use
- ALLOWED_ORIGINS not set in Render environment

**Fix:**
1. Replace placeholder in `desktop/.env` with actual Render URL
2. Set `ALLOWED_ORIGINS` in Render dashboard
3. Restart Render service

### Issue: 404 on Socket.IO polling

**Cause:**
- Server not properly handling Socket.IO routes
- CORS blocking before server can respond

**Fix:**
- Ensure `cors()` middleware is enabled (✓ already configured)
- Check server is running: `curl https://your-service.onrender.com/`

### Issue: WebSocket connection fails, falls back to polling

**Cause:**
- Normal behavior if WebSocket not available
- Polling may fail due to CORS

**Fix:**
- Ensure ALLOWED_ORIGINS includes your frontend domain
- Check credentials: true is set

---

## Configuration Files Reference

### Server CORS Config
The server automatically includes these origins:
- `http://localhost:5173` (local dev)
- `http://localhost:3000` (local dev)
- `https://dual-math.vercel.app` (Vercel)
- `https://*.vercel.app` (any Vercel domain)
- `https://*.onrender.com` (any Render domain)

Or set via `ALLOWED_ORIGINS` environment variable.

### Frontend Socket.IO Config
**File: `desktop/src/App.jsx`**
```javascript
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
export const socket = io(SOCKET_URL, { autoConnect: true });
```

Reads from `VITE_SOCKET_URL` environment variable.

---

## Vercel Environment Variables

In Vercel dashboard, you may optionally set:
```
VITE_SOCKET_URL=https://your-actual-render-service.onrender.com
```

This ensures all builds have the correct backend URL.

---

## Local Development

### Start both servers locally:

**Terminal 1 - Backend (port 5050):**
```bash
cd server
npm install
npm start
# Or: node index.js
```

**Terminal 2 - Frontend (port 5173):**
```bash
cd desktop
npm install
npm run dev
```

**Frontend will connect to:** `http://localhost:5050`

---

## Troubleshooting Checklist

- [ ] `.env` has correct Render URL (not placeholder)
- [ ] Render environment variable `ALLOWED_ORIGINS` is set
- [ ] Render service is running (check `/health` endpoint)
- [ ] Vercel frontend is deployed
- [ ] Frontend points to correct backend URL
- [ ] CORS headers include your Vercel domain
- [ ] No firewall blocking the connection

---

## Support

If still having issues:
1. Check Render logs: `render.com/dashboard` → service → logs
2. Check Vercel logs: `vercel.com/dashboard` → project → logs
3. Check browser console (F12) for detailed error messages
