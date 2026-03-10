import { NextRequest, NextResponse } from 'next/server';
import {
  searchMovies,
  searchSeries,
  getMoviePosterPath,
  getSeriesPosterPath,
  type MovieFull,
  type SeriesFull,
} from '@/lib/contentDb';

type Suggestion = {
  id: number;
  title: string;
  year?: string;
  posterPath: string;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') || 'movies').toLowerCase();
    const qRaw = searchParams.get('q') || '';
    const q = qRaw.trim();
    const limit = Math.min(parseInt(searchParams.get('limit') || '8', 10) || 8, 20);

    // Only start suggesting after 4 chars (as requested)
    if (q.length < 4) {
      return NextResponse.json({ success: true, suggestions: [] satisfies Suggestion[] });
    }

    if (type === 'series') {
      const { series } = await searchSeries(q, '', '', '', 1, limit);
      const suggestions: Suggestion[] = (series as SeriesFull[]).map((s) => ({
        id: s.id,
        title: s.title,
        year: s.year ?? undefined,
        posterPath: getSeriesPosterPath(s),
      }));

      return NextResponse.json({ success: true, suggestions });
    }

    // default: movies
    const { movies } = await searchMovies(q, '', '', '', 1, limit);
    const suggestions: Suggestion[] = (movies as MovieFull[]).map((m) => ({
      id: m.id,
      title: m.title,
      year: m.year ?? undefined,
      posterPath: getMoviePosterPath(m),
    }));

    return NextResponse.json({ success: true, suggestions });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}
