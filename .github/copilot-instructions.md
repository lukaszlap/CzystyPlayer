# Copilot Instructions for CzystyPlayer

A Netflix-style Polish streaming platform built with Next.js 16 (App Router), React 19, Tailwind CSS v4, and MariaDB.

## Architecture Overview

### Dual Database Architecture (CRITICAL)
This project uses **two separate MariaDB databases** - never mix their imports:

| Database | Import | Purpose | Tables |
|----------|--------|---------|--------|
| `czystyplayer` | `@/lib/db` | User data | users, sessions, watch_progress |
| `czystyplayerbaza` | `@/lib/contentDb` | Content | movies, series, episodes, sources |

```typescript
// User operations
import { query, queryOne, insert } from '@/lib/db';

// Content operations  
import { contentQuery, contentQueryOne, getMovies, getMoviePosterPath } from '@/lib/contentDb';
```

### Video Streaming Flow
```
VideoPlayer.tsx → /api/stream/resolve → streaming.ts (VOE decryption) → /api/stream/proxy (HLS restream)
```
- Only `RESTREAM_HOSTINGS` domains in [VideoPlayer.tsx](src/components/VideoPlayer.tsx) get native playback
- Other hostings fall back to iframe embed
- `streaming.ts` handles base64/ROT13 decryption for VOE.sx sources

### State Management
- **Auth**: Zustand with persistence (`useAuthStore` in `src/hooks/useAuth.ts`)
- **Watch Progress**: Dual storage - `localWatchProgress.ts` (localStorage for guests) + `watchProgress.ts` (MariaDB for authenticated)
- **My List/Likes**: `src/lib/myList.ts` (localStorage only)

## Developer Commands
```bash
npm run dev      # Dev server at http://localhost:3000
npm run build    # Production build (runs type checking)
npm run lint     # ESLint with Next.js config
```

## Code Patterns

### API Route Response Format
```typescript
// Success
return NextResponse.json({ success: true, movies: [...], total: 100 });

// Error
return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
```

### Content Data Transformation (Required)
Always transform content to include local image paths:
```typescript
import { getMoviePosterPath, getMovieBackgroundPath } from '@/lib/contentDb';

function transformMovie(movie: MovieFull) {
  return { ...movie, posterPath: getMoviePosterPath(movie), backgroundPath: getMovieBackgroundPath(movie) };
}
```

### Page Component Pattern
All pages use `'use client'` with consistent structure:
```typescript
'use client';
import { StreamingNavbar } from '@/components/layout/StreamingNavbar';
// See src/app/movies/[id]/page.tsx for loading/error state patterns
```

### JWT Authentication
Uses `jose` library (NOT `jsonwebtoken`):
```typescript
import { SignJWT, jwtVerify } from 'jose';
// Access token: 15min | Refresh token: 7 days
// See src/lib/auth.ts for implementation
```

## Key File Locations

| Purpose | File |
|---------|------|
| Content SQL queries | [src/lib/contentDb.ts](src/lib/contentDb.ts) (1290 lines) |
| Video player | [src/components/VideoPlayer.tsx](src/components/VideoPlayer.tsx) (1700+ lines) |
| Auth logic | [src/lib/auth.ts](src/lib/auth.ts) |
| API client | [src/lib/api/client.ts](src/lib/api/client.ts) |
| Shared types | [src/lib/types.ts](src/lib/types.ts) |
| UI primitives | `src/components/ui/*` (Radix-based) |

## Styling Conventions
- **Dark theme**: Background `#141414`, accent `#E50914` (Netflix red)
- **Animations**: Framer Motion (`motion` components)
- **UI Components**: Radix UI primitives wrapped in `src/components/ui/`
- **Path alias**: `@/*` → `src/*`

### Static Image Paths
```
public/images/imgPoster/              # Movie posters: {id}_{title}.jpg
public/images/imgSeriesPoster_final/  # Series posters
public/images/backgrounds/            # Movie backgrounds
public/images/series_backgrounds_final/ # Series backgrounds
```

## Common Tasks

### Adding a Content API Endpoint
1. Create `src/app/api/content/<resource>/route.ts`
2. Add typed query function to `src/lib/contentDb.ts`
3. Transform results with `getMoviePosterPath()` / `getSeriesPosterPath()`

### Adding a New Page
1. Create `src/app/<route>/page.tsx` with `'use client'`
2. Include `<StreamingNavbar variant="browse" />` for navigation
3. Follow loading/error patterns from [movies/[id]/page.tsx](src/app/movies/[id]/page.tsx)

### Adding a Video Hosting
1. Add domain to `RESTREAM_HOSTINGS` in VideoPlayer.tsx
2. Implement resolver in `streaming.ts` (handle encoding/decryption)
3. Test with `/api/stream/resolve` endpoint

## Critical Don'ts
- **Don't mix** `db.ts` and `contentDb.ts` - different databases
- **Don't use** `jsonwebtoken` - use `jose` for JWT
- **Don't hardcode** DB credentials - use env vars (`DB_HOST`, `CONTENT_DB_HOST`, etc.)
- **Don't skip** content transformation - images won't load without `posterPath`/`backgroundPath`
- **Don't modify** ThemeProvider or root layout fonts without testing CSS variables
