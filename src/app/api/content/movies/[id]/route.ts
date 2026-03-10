import { NextRequest, NextResponse } from 'next/server';
import { 
  getMovieById, 
  getMovieSources,
  getMoviePosterPath,
  getMovieBackgroundPath,
} from '@/lib/contentDb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const movieId = parseInt(id);

    if (isNaN(movieId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid movie ID' },
        { status: 400 }
      );
    }

    const movie = await getMovieById(movieId);

    if (!movie) {
      return NextResponse.json(
        { success: false, error: 'Movie not found' },
        { status: 404 }
      );
    }

    // Get video sources and transform to match VideoPlayer interface
    const rawSources = await getMovieSources(movieId);
    const sources = rawSources.map(s => ({
      id: s.id,
      url: s.src,
      hosting: s.hosting || 'unknown',
      quality: s.quality || 'unknown',
      language: s.version || 'pl'
    }));

    return NextResponse.json({
      success: true,
      movie: {
        ...movie,
        posterPath: getMoviePosterPath(movie),
        backgroundPath: getMovieBackgroundPath(movie),
      },
      sources,
    });

  } catch (error) {
    console.error('Error fetching movie:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch movie' },
      { status: 500 }
    );
  }
}
