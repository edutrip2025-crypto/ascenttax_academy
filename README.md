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

### Form Setup (Titan SMTP)

Both forms submit to `/api/submit` and the backend sends email via Titan SMTP.

Set these environment variables in Vercel:

- `SMTP_HOST` = `smtp.titan.email`
- `SMTP_PORT` = `465`
- `SMTP_SECURE` = `true`
- `SMTP_USER` = `info@ascenttaxacademy.com`
- `SMTP_PASS` = `<your-email-password>`
- `FORM_FROM_EMAIL` = `Ascent Tax Academy <info@ascenttaxacademy.com>`
- `FORM_TO_EMAIL` = `info@ascenttaxacademy.com`

### Notes

- `vercel.json` is included for clean URL/static behavior.
- SMTP environment variables are required for form delivery.
