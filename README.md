# BISU Calape Feedback System

Customer Satisfaction and Feedback System for Bohol Island State University - Calape Campus.

## Environment Variables (.env)

Sensitive keys and secrets are kept in `.env` (which is excluded from Git via `.gitignore`):

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Fill in your credentials:
   - `VITE_SUPABASE_URL`: Your Supabase project URL (e.g., `https://xyzcompany.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous public key

## Run Locally

**Prerequisites:** Node.js (v18+)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run development server:
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   ```

