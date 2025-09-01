# Peerly: where peers rate what's worth reading

A Goodreads-style tracker for academic papers built with Vite, React, TypeScript, TailwindCSS, shadcn/ui, and Supabase.

## Features

- **Google OAuth Authentication**: Sign in with your Google account
- **Paper Tracking**: Organize papers into Want/Reading/Read shelves
- **Rating & Reviews**: Rate papers 1-5 stars and write reviews
- **DOI Resolution**: Paste DOI links or keywords to find papers
- **Real-time Database**: Powered by Supabase with Row-Level Security
- **Responsive Design**: Beautiful academic-focused UI that works on all devices
- **Accessibility**: Full keyboard navigation and screen reader support

## Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd peerly
npm install
```

### 2. Set up Supabase

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for setup to complete

2. **Get your credentials**
   - Go to Settings > API
   - Copy your Project URL and anon/public key

3. **Configure Environment**
   - Create `.env.local` in your project root:
   ```env
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_SITE_URL=http://localhost:5173
   ```

4. **Run Database Migration**
   - The database schema is already created via migration
   - Tables: `profiles`, `papers`, `user_papers` with proper RLS policies

### 3. Set up Google OAuth

1. **Enable Google Provider**
   - In Supabase Dashboard → Authentication → Providers
   - Enable Google OAuth
   - Add your Google Client ID and Secret

2. **Configure Redirect URLs**
   - In Authentication → URL Configuration
   - Site URL: `http://localhost:5173` (or your domain)
   - Redirect URLs: `http://localhost:5173/` (and your production domain)

3. **Google Cloud Setup**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create OAuth 2.0 credentials
   - Add authorized origins: `http://localhost:5173`
   - Add redirect URIs: your Supabase auth callback URL

### 4. Run the App
```bash
npm run dev
```

Visit `http://localhost:5173`

## Pages & Routing

- `/` - Home page with recent/trending papers
- `/auth` - Authentication page
- `/paper/[id]-[slug]` - Canonical paper page with full details
- `/paper/doi/[encoded]` - DOI resolver that redirects to canonical URLs
- `/author/[id]` - Author profile with their papers
- `/journal/[id]` - Journal page with recent publications
- `/u/[handle]` - User profile and library
- `/profile` - Current user's profile and library

## Database Schema

### Tables
- **profiles**: User profiles (synced with auth.users)
- **papers**: Paper metadata with DOI, title, abstract, etc.
- **user_papers**: User-paper relationships (shelf, rating, review)

### Row Level Security (RLS)
- Users can only modify their own data
- All paper data is publicly readable
- Profile creation is handled automatically on sign-in

## Tech Stack

- **Vite + React 18** for fast development and builds
- **TypeScript** for type safety
- **TailwindCSS** for styling
- **shadcn/ui** for UI components
- **Supabase** for database, auth, and backend
- **React Router** for client-side routing
- **Lucide React** for icons

## Design System

The app uses a comprehensive design system with:

- **Academic color palette** (slate/indigo theme)
- **Semantic color tokens** defined in CSS variables
- **Typography scale** optimized for reading
- **Consistent spacing** and border radius
- **Dark mode support** throughout
- **Accessibility-first** focus states and contrast

## Key Components

- **AuthButton** - Google OAuth sign-in/out with user menu
- **PaperActions** - Combined shelf/rating/review interface
- **SearchBar** - DOI and keyword search with validation
- **PaperCard** - Responsive paper display with metadata
- **RatingStars** - Interactive 5-star rating system
- **ShelfSelector** - Three-state shelf management

## Authentication Flow

1. User clicks "Sign In with Google"
2. Redirected to Google OAuth
3. Returns to app with session
4. Profile automatically created/updated in database
5. User can now track papers, rate, and review

## Development

### Adding New Features
- Database changes: Use Supabase migrations
- New pages: Add to `src/pages/` and update routing
- Components: Follow shadcn/ui patterns
- Styling: Use design system tokens

### Environment Variables
```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_SITE_URL=http://localhost:5173
```

## Production Deployment

1. Update environment variables for production
2. Configure production redirect URLs in Supabase
3. Set up proper domain and HTTPS
4. Deploy to your preferred platform (Vercel, Netlify, etc.)

## License

MIT License - see LICENSE file for details