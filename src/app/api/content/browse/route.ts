import { NextRequest, NextResponse } from 'next/server';
import { 
  getTrendingMoviesOptimized,
  getMostWatchedMovies2024_2025,
  getMoviesByCategory,
  getBestMoviesVaried,
  getRandomMovies,
  getTrendingSeriesOptimized,
  getMostWatchedSeries2024_2025,
  getSeriesByCategory,
  getRecommendedSeries,
  getBestSeriesVaried,
  getRandomSeries,
  getHeroMovie,
  getHeroSeries,
  getMoviePosterPath,
  getMovieBackgroundPath,
  getSeriesPosterPath,
  getSeriesBackgroundPath,
  type MovieFull,
  type SeriesFull
} from '@/lib/contentDb';

// Transform movie data
function transformMovie(movie: MovieFull) {
  return {
    id: movie.id,
    title: movie.title,
    year: movie.year,
    rating: movie.rating,
    views: movie.views,
    description: movie.description,
    categories: movie.categories,
    countries: movie.countries,
    posterPath: getMoviePosterPath(movie),
    backgroundPath: getMovieBackgroundPath(movie),
  };
}

// Transform series data
function transformSeries(series: SeriesFull) {
  return {
    id: series.id,
    title: series.title,
    year: series.year,
    rating: series.rating,
    views: series.views,
    description: series.description,
    categories: series.categories,
    countries: series.countries,
    posterPath: getSeriesPosterPath(series),
    backgroundPath: getSeriesBackgroundPath(series),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all'; // 'movies', 'series', 'all'
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '15');

    // If requesting specific category
    if (category) {
      if (type === 'movies') {
        const movies = await getMoviesByCategory(category, limit);
        return NextResponse.json({
          success: true,
          movies: movies.map(transformMovie),
        });
      } else {
        const series = await getSeriesByCategory(category, limit);
        return NextResponse.json({
          success: true,
          series: series.map(transformSeries),
        });
      }
    }

    // Parallel fetch all browse content for fast loading
    if (type === 'all') {
      const [
        heroMovies,
        heroSeries,
        trendingMovies,
        trendingSeries,
        mostWatchedMovies2024,
        mostWatchedSeries2024,
        randomMovies,
        randomSeries,
        bestMovies,
        recommendedSeries,
        // Genre-based movies
        actionMovies,
        dramaMovies,
        thrillerMovies,
        crimeMovies,
        scifiMovies,
        familyMovies,
        natureMovies,
        horrorMovies,
        romanceMovies,
        // Genre-based series
        actionSeries,
        dramaSeries,
        sportSeries,
        thrillerSeries,
        crimeSeries,
        scifiSeries,
        familySeries,
        natureSeries,
        horrorSeries,
        romanceSeries,
      ] = await Promise.all([
        getHeroMovie(5),
        getHeroSeries(5),
        getTrendingMoviesOptimized(15),
        getTrendingSeriesOptimized(15),
        getMostWatchedMovies2024_2025(15),
        getMostWatchedSeries2024_2025(15),
        getRandomMovies(15),
        getRandomSeries(15),
        getBestMoviesVaried(15),
        getRecommendedSeries(15),
        // Movie categories
        getMoviesByCategory('Akcja', 15),
        getMoviesByCategory('Dramat', 15),
        getMoviesByCategory('Thriller', 15),
        getMoviesByCategory('Kryminał', 15),
        getMoviesByCategory('Sci-Fi', 15),
        getMoviesByCategory('Familijny', 15),
        getMoviesByCategory('Przyrodniczy', 15),
        getMoviesByCategory('Horror', 15),
        getMoviesByCategory('Romans', 15),
        // Series categories
        getSeriesByCategory('Akcja', 15),
        getSeriesByCategory('Dramat', 15),
        getSeriesByCategory('Sport', 15),
        getSeriesByCategory('Thriller', 15),
        getSeriesByCategory('Kryminał', 15),
        getSeriesByCategory('Sci-Fi', 15),
        getSeriesByCategory('Familijny', 15),
        getSeriesByCategory('Przyrodniczy', 15),
        getSeriesByCategory('Horror', 15),
        getSeriesByCategory('Romans', 15),
      ]);

      return NextResponse.json({
        success: true,
        heroMovies: heroMovies.map(transformMovie),
        heroSeries: heroSeries.map(transformSeries),
        movies: {
          trending: trendingMovies.map(transformMovie),
          mostWatched2024: mostWatchedMovies2024.map(transformMovie),
          random: randomMovies.map(transformMovie),
          best: bestMovies.map(transformMovie),
          akcja: actionMovies.map(transformMovie),
          dramat: dramaMovies.map(transformMovie),
          thriller: thrillerMovies.map(transformMovie),
          kryminal: crimeMovies.map(transformMovie),
          scifi: scifiMovies.map(transformMovie),
          familijny: familyMovies.map(transformMovie),
          przyrodniczy: natureMovies.map(transformMovie),
          horror: horrorMovies.map(transformMovie),
          romans: romanceMovies.map(transformMovie),
        },
        series: {
          trending: trendingSeries.map(transformSeries),
          mostWatched2024: mostWatchedSeries2024.map(transformSeries),
          random: randomSeries.map(transformSeries),
          recommended: recommendedSeries.map(transformSeries),
          akcja: actionSeries.map(transformSeries),
          dramat: dramaSeries.map(transformSeries),
          sport: sportSeries.map(transformSeries),
          thriller: thrillerSeries.map(transformSeries),
          kryminal: crimeSeries.map(transformSeries),
          scifi: scifiSeries.map(transformSeries),
          familijny: familySeries.map(transformSeries),
          przyrodniczy: natureSeries.map(transformSeries),
          horror: horrorSeries.map(transformSeries),
          romans: romanceSeries.map(transformSeries),
        },
      });
    }

    // Movies only
    if (type === 'movies') {
      const [
        heroMovies,
        trendingMovies,
        mostWatched2024,
        randomMovies,
        bestMovies,
        actionMovies,
        dramaMovies,
        thrillerMovies,
        crimeMovies,
        scifiMovies,
        familyMovies,
        natureMovies,
        horrorMovies,
        romanceMovies,
      ] = await Promise.all([
        getHeroMovie(5),
        getTrendingMoviesOptimized(15),
        getMostWatchedMovies2024_2025(15),
        getRandomMovies(15),
        getBestMoviesVaried(15),
        getMoviesByCategory('Akcja', 15),
        getMoviesByCategory('Dramat', 15),
        getMoviesByCategory('Thriller', 15),
        getMoviesByCategory('Kryminał', 15),
        getMoviesByCategory('Sci-Fi', 15),
        getMoviesByCategory('Familijny', 15),
        getMoviesByCategory('Przyrodniczy', 15),
        getMoviesByCategory('Horror', 15),
        getMoviesByCategory('Romans', 15),
      ]);

      return NextResponse.json({
        success: true,
        hero: heroMovies.map(transformMovie),
        trending: trendingMovies.map(transformMovie),
        mostWatched2024: mostWatched2024.map(transformMovie),
        random: randomMovies.map(transformMovie),
        best: bestMovies.map(transformMovie),
        akcja: actionMovies.map(transformMovie),
        dramat: dramaMovies.map(transformMovie),
        thriller: thrillerMovies.map(transformMovie),
        kryminal: crimeMovies.map(transformMovie),
        scifi: scifiMovies.map(transformMovie),
        familijny: familyMovies.map(transformMovie),
        przyrodniczy: natureMovies.map(transformMovie),
        horror: horrorMovies.map(transformMovie),
        romans: romanceMovies.map(transformMovie),
      });
    }

    // Series only
    if (type === 'series') {
      const [
        heroSeries,
        trendingSeries,
        mostWatched2024,
        randomSeries,
        recommendedSeries,
        bestSeries,
        actionSeries,
        dramaSeries,
        sportSeries,
        thrillerSeries,
        crimeSeries,
        scifiSeries,
        familySeries,
        natureSeries,
        horrorSeries,
        romanceSeries,
      ] = await Promise.all([
        getHeroSeries(5),
        getTrendingSeriesOptimized(15),
        getMostWatchedSeries2024_2025(15),
        getRandomSeries(15),
        getRecommendedSeries(15),
        getBestSeriesVaried(15),
        getSeriesByCategory('Akcja', 15),
        getSeriesByCategory('Dramat', 15),
        getSeriesByCategory('Sport', 15),
        getSeriesByCategory('Thriller', 15),
        getSeriesByCategory('Kryminał', 15),
        getSeriesByCategory('Sci-Fi', 15),
        getSeriesByCategory('Familijny', 15),
        getSeriesByCategory('Przyrodniczy', 15),
        getSeriesByCategory('Horror', 15),
        getSeriesByCategory('Romans', 15),
      ]);

      return NextResponse.json({
        success: true,
        hero: heroSeries.map(transformSeries),
        trending: trendingSeries.map(transformSeries),
        mostWatched2024: mostWatched2024.map(transformSeries),
        random: randomSeries.map(transformSeries),
        recommended: recommendedSeries.map(transformSeries),
        best: bestSeries.map(transformSeries),
        akcja: actionSeries.map(transformSeries),
        dramat: dramaSeries.map(transformSeries),
        sport: sportSeries.map(transformSeries),
        thriller: thrillerSeries.map(transformSeries),
        kryminal: crimeSeries.map(transformSeries),
        scifi: scifiSeries.map(transformSeries),
        familijny: familySeries.map(transformSeries),
        przyrodniczy: natureSeries.map(transformSeries),
        horror: horrorSeries.map(transformSeries),
        romans: romanceSeries.map(transformSeries),
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 });

  } catch (error) {
    console.error('Error fetching browse content:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch browse content' },
      { status: 500 }
    );
  }
}
