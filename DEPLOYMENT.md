# SimplyPray-Web Deployment Guide

## Vercel Setup

1. Go to vercel.com -> New Project
2. Import `SolomonSolutionsLLC/SimplyPray-Web`
3. Framework preset: Next.js
4. Root directory: `packages/app`
5. Add environment variables from `packages/app/.env.example`

## Environment Variables (Vercel)

- `NEXT_PUBLIC_SUPABASE_URL` -- Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` -- Supabase publishable anon key
- `SUPABASE_SERVICE_ROLE_KEY` -- Supabase service role (server-only)
- `STRIPE_SECRET_KEY` -- Stripe secret key
- `STRIPE_WEBHOOK_SECRET` -- Stripe webhook signing secret
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` -- Stripe publishable key
- `NEXT_PUBLIC_APP_URL` -- `https://app.simplypray.io`

## Custom Domain

1. Add `app.simplypray.io` in Vercel -> Settings -> Domains
2. DNS: CNAME `app` -> `cname.vercel-dns.com`

## Stripe Webhook (Production)

1. Stripe Dashboard -> Webhooks -> Add endpoint
2. URL: `https://app.simplypray.io/api/stripe/webhook`
3. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
4. Copy webhook secret -> add to Vercel env vars as `STRIPE_WEBHOOK_SECRET`

## Supabase Auth Redirect URLs

In Supabase Dashboard -> Authentication -> URL Configuration:
- Site URL: `https://app.simplypray.io`
- Redirect URLs: `https://app.simplypray.io/auth/callback`
