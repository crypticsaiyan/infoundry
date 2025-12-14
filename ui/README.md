# InFoundry UI

Next.js 15 dashboard for InFoundry cloud architecture platform.

## Features
- 🏗️ Visual Architecture Editor (React Flow)
- 📊 Kestra Pipeline Monitoring
- ⚙️ Service Configuration Generator
- 📈 Real-time Step Progress Tracking

## Development

```bash
cd ui
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with feature overview |
| `/dashboard` | Architecture diagram editor |
| `/pipeline` | Kestra pipeline runner & monitor |
| `/configure` | Service profile configuration |

## Environment Variables

Copy `.env.example` to `.env.local` and update the values:
 
 ```bash
 cp .env.example .env.local
 ```
 
 Variables:
 - `KESTRA_API_URL`: URL of the Kestra API (default: `http://localhost:8080`)
 - `KESTRA_TENANT`: Kestra tenant ID (default: `main`)
 - `KESTRA_API_TOKEN`: Optional API token for authentication
 - `KESTRA_USERNAME` / `KESTRA_PASSWORD`: Optional credentials for basic auth

## Build

```bash
npm run build
npm start
```

## Deploy on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new?utm_medium=default-template&filter=next.js)

Check [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for details.
