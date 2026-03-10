import { NextRequest, NextResponse } from 'next/server';
import { 
  getMovies, 
  searchMovies, 
  getMovieCategories, 
  getMovieCountries,
  getTrendingMovies,
  getRandomMovies,
  getMoviePosterPath,
  getMovieBackgroundPath,
  type MovieFull 
} from '@/lib/contentDb';

// Transform movie data to include correct image paths
function transformMovie(movie: MovieFull) {
  return {
    ...movie,
    posterPath: getMoviePosterPath(movie),
    backgroundPath: getMovieBackgroundPath(movie),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'rating';
    const sortOrder = (searchParams.get('sortOrder') || 'DESC') as 'ASC' | 'DESC';
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const country = searchParams.get('country') || '';
    const year = searchParams.get('year') || '';
    const trending = searchParams.get('trending') === 'true';
    const random = searchParams.get('random') === 'true';

    // If requesting random movies for suggestions
    if (random) {
      const randomLimit = parseInt(searchParams.get('limit') || '4');
      const movies = await getRandomMovies(randomLimit);
      return NextResponse.json({
        success: true,
        movies: movies.map(transformMovie),
        total: movies.length,
      });
    }

    // If requesting trending movies
    if (trending) {
      const trendingLimit = parseInt(searchParams.get('limit') || '10');
      const movies = await getTrendingMovies(trendingLimit);
      return NextResponse.json({
        success: true,
        movies: movies.map(transformMovie),
        total: movies.length,
      });
    }

    // If searching
    if (search || category || country || year) {
      const { movies, total } = await searchMovies(search, category, country, year, page, limit);
      return NextResponse.json({
        success: true,
        movies: movies.map(transformMovie),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    }

    // Default: get all movies with pagination
    const { movies, total } = await getMovies(page, limit, sortBy, sortOrder);

    return NextResponse.json({
      success: true,
      movies: movies.map(transformMovie),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });

  } catch (error) {
    console.error('Error fetching movies:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch movies' },
      { status: 500 }
    );
  }
}

// Get filter options
export async function OPTIONS() {
  try {
    const [categories, countries] = await Promise.all([
      getMovieCategories(),
      getMovieCountries(),
    ]);

    return NextResponse.json({
      success: true,
      categories: ['Wszystkie gatunki', ...categories],
      countries: ['Wszystkie kraje', ...countries],
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch filter options' },
      { status: 500 }
    );
  }
}
