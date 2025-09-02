# 📚 Peerly — where peers rate what's worth reading

A Goodreads-style tracker for academic papers. Paste a DOI, fetch metadata, add it to your shelves (Want / Reading / Read), and share ratings & reviews with others.

👉 **Live now: https://paperlog-shelf.vercel.app/**

## ✨ Features

🔑 **Google OAuth** — Sign in securely with your Google account

📂 **Shelves** — Organize papers into Want, Reading, and Read

⭐ **Ratings & Reviews** — Rate from 1–5 stars and leave reviews

🔎 **DOI Resolution** — Paste DOI or keywords to fetch papers

⚡ **Supabase Backend** — Real-time database with Row-Level Security

📱 **Responsive UI** — Clean academic-focused design across devices

♿ **Accessibility** — Full keyboard navigation & screen reader support

🌙 **Dark Mode** — Consistent academic-friendly palette

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone <repository-url>
cd peerly
npm install
```

### 2. Configure Supabase

**Create a Supabase project**

- Copy Project URL and anon key from Settings → API

**Create `.env.local` in the project root:**
```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SITE_URL=http://localhost:5173
```

### 3. Database Schema

Run the provided migration in Supabase SQL Editor.

**Tables:**
- `profiles` — user profiles (linked to auth.users)
- `papers` — paper metadata (DOI, title, abstract, etc.)
- `user_papers` — relationships (shelf, rating, review)

**Row-Level Security (RLS) is enabled:**
- Users can modify only their own shelves/reviews
- Paper metadata is publicly readable

### 4. Enable Google OAuth

In Supabase Dashboard → Authentication → Providers, enable Google

Add Client ID and Secret from Google Cloud Console

In Authentication → URL Configuration, set:
- Site URL: `http://localhost:5173` (or your deployed domain)
- Redirect URLs: `http://localhost:5173/` and your production domain

## 🖥️ Development

### Run locally
```bash
npm run dev
```

App will be available at: `http://localhost:5173`

### Pages & Routing

- `/` — Home (search papers by DOI or keyword)
- `/paper/[id]-[slug]` — Canonical paper detail
- `/paper/doi/[encoded]` — DOI resolver → redirects to canonical
- `/author/[id]` — Author profile
- `/journal/[id]` — Journal profile
- `/u/[handle]` — User library
- `/auth` — OAuth callback handler
- `/profile` — Current user's profile

## 🛠️ Tech Stack

**Frontend:** React + Vite + TypeScript

**Styling:** TailwindCSS + shadcn/ui + Lucide icons

**Auth & DB:** Supabase (Postgres + Auth + RLS)

**Routing:** React Router

**Design:** Academic-inspired indigo/slate theme with consistent typography & spacing

## 🎨 Design System

- Neutral slate/zinc base with indigo accent
- Typography scale optimized for long-form reading
- Semantic tokens in CSS variables
- Rounded 2xl radius for cards/buttons
- Dark mode support out of the box
- Accessibility-first: visible focus rings, high contrast

## 🔒 Authentication Flow

1. User clicks "Sign in with Google"
2. Redirects to Google OAuth → returns with session
3. Profile auto-created in `profiles` table
4. User can now track, rate, and review papers

## 🌍 Production Deployment

Update env vars in your host (Vercel/Netlify)

Add deployed domain to Supabase → Auth → URL Configuration

Deploy! (We're live at [paperlog-shelf.vercel.app](https://paperlog-shelf.vercel.app))

## 📜 License

MIT — see LICENSE for details.