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

Create `.env.local`:

```bash
KESTRA_API_URL=http://localhost:8080
```

## Build

```bash
npm run build
npm start
```

## Deploy on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new?utm_medium=default-template&filter=next.js)

Check [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for details.
