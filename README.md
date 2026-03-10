# ascenttax_academy

## Vercel Deployment

This is a static website (`index.html`, `styles.css`, `script.js`, `assets/*`) and is ready for Vercel.

### Option 1: Vercel Dashboard

1. Open Vercel and import this GitHub repo:
   `https://github.com/edutrip2025-crypto/ascenttax_academy`
2. Framework preset: `Other`
3. Build command: *(leave empty)*
4. Output directory: *(leave empty)*
5. Deploy

### Option 2: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
vercel --prod
```

### Notes

- `vercel.json` is included for clean URL/static behavior.
- No environment variables are required.
