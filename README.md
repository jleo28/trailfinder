# TrailFinder

A social hiking app for the LA trail community. Browse trails, log hikes, and share adventures with friends.

> Rebuilt from a CSCI-201 final project. Originally Java Servlets + custom JWT auth, now Next.js 14 + Supabase.

## Stack

- **Framework:** Next.js 14 (App Router, TypeScript strict)
- **Database & Auth:** Supabase (Postgres + Supabase Auth)
- **Maps:** Leaflet + react-leaflet + OpenStreetMap tiles
- **Styling:** Tailwind CSS + CSS variables
- **Hosting:** Vercel

## Features

- Trail browser with map and filters
- Hike logging with photos
- Social feed and friend activity
- Trail passport stamps on profiles

## Local setup

```bash
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

## Database

```bash
# Apply migrations
supabase db push

# Regenerate TypeScript types
npm run db:types

# Seed trail data
npm run seed
```

## Deployment

Deploys to Vercel. See `.env.local.example` for required environment variables.

## Original CSCI-201 team

This project is a ground-up rebuild of a group final project originally built for CSCI-201 (Systems Programming) at USC. The original concept and features were designed collaboratively by the team:

- Evan Adami
- Ibsa Abadiga
- Logan Lusher
- Lucas Jerry
- Malachi Dewitt
- Nicolo Naoni
- Yaphet Bekele
- Joseph Leo

Rebuilt by [Joseph Leo](https://jleo.me).

## License

MIT
