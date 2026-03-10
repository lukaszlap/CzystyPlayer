import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import {
  searchMovies,
  searchSeries,
  getMovieCategories,
  getSeriesCategories,
  getMoviePosterPath,
  getSeriesPosterPath,
  contentQuery,
  type MovieFull,
  type SeriesFull,
} from '@/lib/contentDb';

// Initialize Gemini AI
if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is not set');
}
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Types for AI recommendations
interface ContentRecommendation {
  id: number;
  title: string;
  year: string | null;
  rating: number | null;
  categories: string | null;
  countries: string | null;
  description: string | null;
  posterPath: string;
  type: 'movie' | 'series';
  matchScore?: number;
  matchReason?: string;
}

interface AIRecommendationResult {
  success: boolean;
  recommendations: ContentRecommendation[];
  aiMessage?: string;
  query: string;
  contentType: string;
  searchId: string;
}

// Tool functions that AI can call
async function searchInDatabase(params: {
  query?: string;
  categories?: string[];
  type: 'movies' | 'series' | 'all';
  limit?: number;
}): Promise<{
  movies: ContentRecommendation[];
  series: ContentRecommendation[];
}> {
  const { query = '', categories = [], type = 'all', limit = 20 } = params;
  
  const results: { movies: ContentRecommendation[]; series: ContentRecommendation[] } = {
    movies: [],
    series: [],
  };

  // Search movies if type is 'movies' or 'all'
  if (type === 'movies' || type === 'all') {
    const category = categories.length > 0 ? categories[0] : undefined;
    const { movies } = await searchMovies(query, category, undefined, undefined, 1, limit);
    
    results.movies = movies.map((m: MovieFull) => ({
      id: m.id,
      title: m.title,
      year: m.year,
      rating: m.rating,
      categories: m.categories,
      countries: m.countries,
      description: m.description,
      posterPath: getMoviePosterPath(m),
      type: 'movie' as const,
    }));
  }

  // Search series if type is 'series' or 'all'
  if (type === 'series' || type === 'all') {
    const category = categories.length > 0 ? categories[0] : undefined;
    const { series } = await searchSeries(query, category, undefined, undefined, 1, limit);
    
    results.series = series.map((s: SeriesFull) => ({
      id: s.id,
      title: s.title,
      year: s.year,
      rating: s.rating,
      categories: s.categories,
      countries: s.countries,
      description: s.description,
      posterPath: getSeriesPosterPath(s),
      type: 'series' as const,
    }));
  }

  return results;
}

async function getAvailableCategoriesFunc(type: 'movies' | 'series' | 'all'): Promise<{
  movieCategories: string[];
  seriesCategories: string[];
}> {
  const result: { movieCategories: string[]; seriesCategories: string[] } = {
    movieCategories: [],
    seriesCategories: [],
  };

  if (type === 'movies' || type === 'all') {
    result.movieCategories = await getMovieCategories();
  }
  if (type === 'series' || type === 'all') {
    result.seriesCategories = await getSeriesCategories();
  }

  return result;
}

async function findSimilarByCategory(params: {
  categories: string[];
  type: 'movies' | 'series' | 'all';
  excludeIds?: number[];
  limit?: number;
}): Promise<ContentRecommendation[]> {
  const { categories, type, excludeIds = [], limit = 15 } = params;
  const results: ContentRecommendation[] = [];

  if (categories.length === 0) return results;

  // Find movies by category
  if (type === 'movies' || type === 'all') {
    for (const category of categories.slice(0, 3)) {
      const excludeClause = excludeIds.length > 0 ? `AND m.id NOT IN (${excludeIds.join(',')})` : '';
      const movies = await contentQuery<MovieFull[]>(`
        SELECT DISTINCT m.*, 
          GROUP_CONCAT(DISTINCT mc.category SEPARATOR ', ') as categories,
          GROUP_CONCAT(DISTINCT mco.country SEPARATOR ', ') as countries
        FROM movies m
        INNER JOIN movie_categories mc_filter ON m.id = mc_filter.movie_id AND mc_filter.category = ?
        LEFT JOIN movie_categories mc ON m.id = mc.movie_id
        LEFT JOIN movie_countries mco ON m.id = mco.movie_id
        WHERE 1=1 ${excludeClause}
        GROUP BY m.id
        ORDER BY m.rating DESC, CAST(m.views AS UNSIGNED) DESC
        LIMIT ?
      `, [category, Math.ceil(limit / categories.length)]);

      for (const m of movies) {
        if (!results.some(r => r.id === m.id && r.type === 'movie')) {
          results.push({
            id: m.id,
            title: m.title,
            year: m.year,
            rating: m.rating,
            categories: m.categories,
            countries: m.countries,
            description: m.description,
            posterPath: getMoviePosterPath(m),
            type: 'movie',
          });
        }
      }
    }
  }

  // Find series by category
  if (type === 'series' || type === 'all') {
    for (const category of categories.slice(0, 3)) {
      const excludeClause = excludeIds.length > 0 ? `AND s.id NOT IN (${excludeIds.join(',')})` : '';
      const series = await contentQuery<SeriesFull[]>(`
        SELECT DISTINCT s.*, 
          GROUP_CONCAT(DISTINCT sc.category SEPARATOR ', ') as categories,
          GROUP_CONCAT(DISTINCT sco.country SEPARATOR ', ') as countries
        FROM series s
        INNER JOIN series_categories sc_filter ON s.id = sc_filter.series_id AND sc_filter.category = ?
        LEFT JOIN series_categories sc ON s.id = sc.series_id
        LEFT JOIN series_countries sco ON s.id = sco.series_id
        WHERE 1=1 ${excludeClause}
        GROUP BY s.id
        ORDER BY s.rating DESC, CAST(s.views AS UNSIGNED) DESC
        LIMIT ?
      `, [category, Math.ceil(limit / categories.length)]);

      for (const s of series) {
        if (!results.some(r => r.id === s.id && r.type === 'series')) {
          results.push({
            id: s.id,
            title: s.title,
            year: s.year,
            rating: s.rating,
            categories: s.categories,
            countries: s.countries,
            description: s.description,
            posterPath: getSeriesPosterPath(s),
            type: 'series',
          });
        }
      }
    }
  }

  return results.slice(0, limit);
}

async function findExactTitle(params: {
  title: string;
  type: 'movies' | 'series' | 'all';
}): Promise<ContentRecommendation | null> {
  const { title, type } = params;

  // Try exact match first
  if (type === 'movies' || type === 'all') {
    const movie = await contentQuery<MovieFull[]>(`
      SELECT m.*, 
        GROUP_CONCAT(DISTINCT mc.category SEPARATOR ', ') as categories,
        GROUP_CONCAT(DISTINCT mco.country SEPARATOR ', ') as countries
      FROM movies m
      LEFT JOIN movie_categories mc ON m.id = mc.movie_id
      LEFT JOIN movie_countries mco ON m.id = mco.movie_id
      WHERE m.title LIKE ? OR m.title LIKE ?
      GROUP BY m.id
      ORDER BY 
        CASE WHEN m.title = ? THEN 0 ELSE 1 END,
        m.rating DESC
      LIMIT 1
    `, [`%${title}%`, `${title}%`, title]);

    if (movie.length > 0) {
      return {
        id: movie[0].id,
        title: movie[0].title,
        year: movie[0].year,
        rating: movie[0].rating,
        categories: movie[0].categories,
        countries: movie[0].countries,
        description: movie[0].description,
        posterPath: getMoviePosterPath(movie[0]),
        type: 'movie',
      };
    }
  }

  if (type === 'series' || type === 'all') {
    const series = await contentQuery<SeriesFull[]>(`
      SELECT s.*, 
        GROUP_CONCAT(DISTINCT sc.category SEPARATOR ', ') as categories,
        GROUP_CONCAT(DISTINCT sco.country SEPARATOR ', ') as countries
      FROM series s
      LEFT JOIN series_categories sc ON s.id = sc.series_id
      LEFT JOIN series_countries sco ON s.id = sco.series_id
      WHERE s.title LIKE ? OR s.title LIKE ?
      GROUP BY s.id
      ORDER BY 
        CASE WHEN s.title = ? THEN 0 ELSE 1 END,
        s.rating DESC
      LIMIT 1
    `, [`%${title}%`, `${title}%`, title]);

    if (series.length > 0) {
      return {
        id: series[0].id,
        title: series[0].title,
        year: series[0].year,
        rating: series[0].rating,
        categories: series[0].categories,
        countries: series[0].countries,
        description: series[0].description,
        posterPath: getSeriesPosterPath(series[0]),
        type: 'series',
      };
    }
  }

  return null;
}

// Suppress unused variable warnings
void getAvailableCategoriesFunc;
void searchInDatabase;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, contentType = 'all' } = body as { query: string; contentType: 'movies' | 'series' | 'all' };

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Zapytanie musi mieć co najmniej 2 znaki',
      }, { status: 400 });
    }

    const searchId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // First, find the source title
    const sourceContent = await findExactTitle({ title: query, type: contentType });
    
    // Get categories from source
    const sourceCategories = sourceContent?.categories?.split(', ').filter(Boolean) || [];
    
    // If we found the source, find similar content by category
    let recommendations: ContentRecommendation[] = [];
    
    if (sourceContent && sourceCategories.length > 0) {
      // Find similar by categories
      recommendations = await findSimilarByCategory({
        categories: sourceCategories,
        type: contentType,
        excludeIds: [sourceContent.id],
        limit: 15,
      });
    } else {
      // Fallback: search directly
      const searchResults = await searchInDatabase({
        query,
        type: contentType,
        limit: 15,
      });
      recommendations = [...searchResults.movies, ...searchResults.series];
    }

    // If still no results, try broader search
    if (recommendations.length === 0) {
      const broadSearch = await searchInDatabase({
        query: query.split(' ')[0], // First word only
        type: contentType,
        limit: 15,
      });
      recommendations = [...broadSearch.movies, ...broadSearch.series];
    }

    // Now use AI to analyze and rank the recommendations
    let aiMessage = 'Oto rekomendacje na podstawie Twojego wyszukiwania.';
    
    if (recommendations.length > 0 && sourceContent) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-robotics-er-1.5-preview',
          contents: [{
            role: 'user',
            parts: [{
              text: `Jesteś asystentem rekomendacji dla polskiej platformy streamingowej.
              
Użytkownik szuka podobnych treści do: "${query}"
Znaleziony tytuł: ${sourceContent.title} (${sourceContent.year || 'brak roku'})
Kategorie: ${sourceContent.categories || 'brak'}

Oto lista ${recommendations.length} podobnych treści z naszej bazy:
${recommendations.map((r, i) => `${i + 1}. ${r.title} (${r.year || '?'}) - ${r.categories || 'brak kategorii'} - ${r.type === 'movie' ? 'Film' : 'Serial'}`).join('\n')}

Twoje zadanie:
1. Przeanalizuj które z tych treści są najbardziej podobne do "${sourceContent.title}"
2. Dla każdej treści (po ID) przypisz krótkie uzasadnienie po polsku (max 60 znaków) dlaczego pasuje

Odpowiedz TYLKO w formacie JSON (bez markdown):
{
  "message": "Krótka wiadomość dla użytkownika po polsku (1-2 zdania)",
  "rankings": [
    {"index": 0, "reason": "Podobny klimat fantasy i magia"},
    {"index": 1, "reason": "Ten sam reżyser, podobna estetyka"}
  ]
}`
            }]
          }],
        });

        const responseText = response.text || '';
        
        // Try to parse JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          aiMessage = parsed.message || aiMessage;
          
          // Apply AI reasons to recommendations
          if (parsed.rankings && Array.isArray(parsed.rankings)) {
            for (const ranking of parsed.rankings) {
              const idx = ranking.index;
              if (typeof idx === 'number' && idx >= 0 && idx < recommendations.length) {
                recommendations[idx].matchReason = ranking.reason;
              }
            }
          }
        }
      } catch (aiError) {
        console.error('AI analysis error:', aiError);
        // Continue with recommendations without AI enhancement
      }
    }

    // Calculate match scores
    recommendations = recommendations.map((r, index) => ({
      ...r,
      matchScore: Math.max(97 - index * 2, 70),
    }));

    // Deduplicate
    const seen = new Set<string>();
    const uniqueRecommendations = recommendations.filter(r => {
      const key = `${r.type}-${r.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 12);

    const result: AIRecommendationResult = {
      success: true,
      recommendations: uniqueRecommendations,
      aiMessage,
      query,
      contentType,
      searchId,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Recommendations error:', error);
    return NextResponse.json({
      success: false,
      error: 'Wystąpił błąd podczas generowania rekomendacji',
    }, { status: 500 });
  }
}
