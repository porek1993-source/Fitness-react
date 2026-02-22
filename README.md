# Agile Coach PWA 🏋️

AI-powered adaptive fitness tracking Progressive Web App.

## Tech Stack
- **Frontend**: React 18 + Vite + Tailwind CSS + Lucide Icons
- **Backend**: Supabase (Auth + PostgreSQL + Row-Level Security)
- **AI**: Google Gemini 2.5 Flash-Lite
- **PWA**: Vite PWA Plugin + Workbox (offline support)

---

## Project Structure

```
agile-coach/
├── src/
│   ├── lib/
│   │   ├── supabase.js       # Supabase client + offline queue
│   │   ├── gemini.js         # Gemini AI client + context builder
│   │   ├── recovery.js       # Fatigue decay engine (20%/24h)
│   │   └── useAppStore.jsx   # Global state (React Context)
│   ├── components/
│   │   └── MuscleMap.jsx     # Interactive SVG body map
│   ├── pages/
│   │   ├── AuthPage.jsx      # Email/password login + signup
│   │   ├── DashboardPage.jsx # Overview + AI greeting + stats
│   │   ├── WorkoutLoggerPage.jsx # Set tracking + haptics
│   │   ├── LibraryPage.jsx   # Visual exercise library
│   │   ├── PlannerPage.jsx   # Weekly split + AI optimization
│   │   └── CoachPage.jsx     # AI chat interface
│   ├── App.jsx               # Shell + tab navigation
│   ├── main.jsx              # Entry point + SW registration
│   └── index.css             # Global styles + Tailwind
├── public/
│   └── icons/                # PWA icons (192px, 512px)
├── vite.config.js            # Vite + PWA plugin config
├── tailwind.config.js
└── package.json
```

---

## Setup

### 1. Clone & Install

```bash
git clone <your-repo>
cd agile-coach
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_GEMINI_API_KEY=your_gemini_key
```

Get your keys:
- **Supabase**: Dashboard → Settings → API → `anon public` key
- **Gemini**: [Google AI Studio](https://aistudio.google.com) → Get API Key

### 3. Set Up Supabase Database

Run the SQL schema from `src/lib/supabase.js` (the block inside the `/* */` comment) in your Supabase SQL editor at:

`https://supabase.com/dashboard/project/tjtdkqlasjrnjcucnvvz/sql`

This creates:
- `profiles` table with `muscle_status` JSON + `weekly_split`
- `workouts` table with computed `total_volume` column
- `exercise_library` table with sample exercises
- Row-Level Security policies
- Auto-profile trigger on user signup

### 4. Add PWA Icons

Place icons in `public/icons/`:
- `icon-192.png` (192×192px)
- `icon-512.png` (512×512px)
- `apple-touch-icon.png` in `public/` (180×180px)

### 5. Run Development Server

```bash
npm run dev
```

Open `http://localhost:5173`

### 6. Build for Production

```bash
npm run build
npm run preview  # Test the production build
```

Deploy the `dist/` folder to Vercel, Netlify, or Cloudflare Pages.

---

## Key Features

### Recovery Engine
Fatigue decays **20% every 24 hours** using exponential decay:
```
F(t) = F₀ × (0.8)^(t / 24h)
```
Calculated from the `last_updated` timestamp — accurate even after the app is closed.

### Offline Support
- Service Worker caches app shell + API responses
- Workouts logged offline are queued in `localStorage`
- On reconnection, the queue auto-syncs to Supabase

### AI Context
Every Gemini call includes:
- Full muscle status with decay-adjusted values
- Last 5 workout sessions
- Proactive greeting instead of "How can I help?"

### Haptic Feedback
```javascript
navigator.vibrate(50)   // Button tap
navigator.vibrate([50, 30, 80])  // Set completion
navigator.vibrate([80, 40, 80])  // Error
```

---

## Adding Exercise Images

Update `image_url` in `exercise_library` with URLs to GIFs or images:

```sql
UPDATE exercise_library
SET image_url = 'https://example.com/bench-press.gif'
WHERE name = 'Bench Press';
```

Recommended sources:
- [GIPHY Fitness](https://giphy.com)
- [ExRx.net](https://exrx.net)
- Upload to Supabase Storage and use the public URL

---

## Supabase Storage (Exercise Images)

```sql
-- Create a public bucket for exercise images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('exercises', 'exercises', true);

-- Policy: anyone can read
CREATE POLICY "Public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'exercises');
```

Upload images via Supabase Dashboard → Storage → exercises bucket.
