import mysql from 'mysql2/promise';

// Content Database configuration (czystyplayerbaza - movies/series data)
const contentDbConfig = {
  host: process.env.CONTENT_DB_HOST || '192.168.1.55',
  port: parseInt(process.env.CONTENT_DB_PORT || '3306'),
  user: process.env.CONTENT_DB_USER || 'remote',
  password: process.env.CONTENT_DB_PASSWORD || 'Lapix1@3456xD',
  database: process.env.CONTENT_DB_NAME || 'czystyplayerbaza',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4',
};

// Create connection pool for content database
const contentPool = mysql.createPool(contentDbConfig);

// Helper function to execute queries on content database
export async function contentQuery<T>(
  sql: string,
  params?: (string | number | boolean | null | undefined)[]
): Promise<T> {
  const [results] = await contentPool.execute(sql, params);
  return results as T;
}

// Helper function for single row queries
export async function contentQueryOne<T>(
  sql: string,
  params?: (string | number | boolean | null | undefined)[]
): Promise<T | null> {
  const results = await contentQuery<T[]>(sql, params);
  return Array.isArray(results) && results.length > 0 ? results[0] : null;
}

// ============================================================================
// MOVIES QUERIES
// ============================================================================

export interface Movie {
  id: number;
  title: string;
  year: string | null;
  description: string | null;
  url: string;
  views: string | null;
  rating: number | null;
  rating_count: string | null;
  total_sources: number;
  background_url: string | null;
  background_local: string | null;
  poster_url: string | null;
  poster_local: string | null;
  poster_scraper_local_path: string | null;
  poster_scraper_filename: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface MovieFull extends Movie {
  categories: string | null;
  countries: string | null;
  directors: string | null;
  screenplay: string | null;
  source_count: number;
}

export interface MovieSource {
  id: number;
  movie_id: number;
  src: string;
  hosting: string | null;
  version: string | null;
  quality: string | null;
  width: string | null;
  height: string | null;
  source_order: number;
}

// Get all movies with pagination - OPTIMIZED
export async function getMovies(
  page: number = 1,
  limit: number = 20,
  sortBy: string = 'rating',
  sortOrder: 'ASC' | 'DESC' = 'DESC'
): Promise<{ movies: MovieFull[]; total: number }> {
  const offset = (page - 1) * limit;
  
  // Validate sort column
  const validSortColumns = ['id', 'title', 'year', 'rating', 'views', 'created_at'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'rating';
  
  // Parallel queries for count and base movies
  const [countResult, baseMovies] = await Promise.all([
    contentQuery<[{ total: number }]>('SELECT COUNT(*) as total FROM movies'),
    contentQuery<Movie[]>(`
      SELECT * FROM movies 
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT ? OFFSET ?
    `, [limit, offset])
  ]);
  
  if (baseMovies.length === 0) {
    return { movies: [], total: countResult[0].total };
  }
  
  // Batch fetch categories and countries only (skip others for list view)
  const movieIds = baseMovies.map(m => m.id);
  const placeholders = movieIds.map(() => '?').join(',');
  
  const [categories, countries] = await Promise.all([
    contentQuery<{ movie_id: number; category: string }[]>(`
      SELECT movie_id, category FROM movie_categories 
      WHERE movie_id IN (${placeholders})
    `, movieIds),
    contentQuery<{ movie_id: number; country: string }[]>(`
      SELECT movie_id, country FROM movie_countries 
      WHERE movie_id IN (${placeholders})
    `, movieIds)
  ]);
  
  // Build lookup maps
  const categoryMap = new Map<number, string[]>();
  const countryMap = new Map<number, string[]>();
  
  categories.forEach(c => {
    if (!categoryMap.has(c.movie_id)) categoryMap.set(c.movie_id, []);
    categoryMap.get(c.movie_id)!.push(c.category);
  });
  
  countries.forEach(c => {
    if (!countryMap.has(c.movie_id)) countryMap.set(c.movie_id, []);
    countryMap.get(c.movie_id)!.push(c.country);
  });
  
  // Assemble full movie objects
  const movies: MovieFull[] = baseMovies.map(m => ({
    ...m,
    categories: categoryMap.get(m.id)?.join(', ') || null,
    countries: countryMap.get(m.id)?.join(', ') || null,
    directors: null, // Skip for list view
    screenplay: null, // Skip for list view
    source_count: 0, // Skip for list view
  }));
  
  return { movies, total: countResult[0].total };
}

// Get movie by ID with full details
export async function getMovieById(id: number): Promise<MovieFull | null> {
  return contentQueryOne<MovieFull>(`
    SELECT 
      m.*,
      GROUP_CONCAT(DISTINCT mc.category ORDER BY mc.category SEPARATOR ', ') as categories,
      GROUP_CONCAT(DISTINCT mco.country ORDER BY mco.country SEPARATOR ', ') as countries,
      GROUP_CONCAT(DISTINCT md.director ORDER BY md.director SEPARATOR ', ') as directors,
      GROUP_CONCAT(DISTINCT ms.writer ORDER BY ms.writer SEPARATOR ', ') as screenplay,
      COUNT(DISTINCT msrc.id) as source_count
    FROM movies m
    LEFT JOIN movie_categories mc ON m.id = mc.movie_id
    LEFT JOIN movie_countries mco ON m.id = mco.movie_id
    LEFT JOIN movie_directors md ON m.id = md.movie_id
    LEFT JOIN movie_screenplay ms ON m.id = ms.movie_id
    LEFT JOIN movie_sources msrc ON m.id = msrc.movie_id
    WHERE m.id = ?
    GROUP BY m.id
  `, [id]);
}

// Get movie sources (video links)
export async function getMovieSources(movieId: number): Promise<MovieSource[]> {
  return contentQuery<MovieSource[]>(`
    SELECT * FROM movie_sources 
    WHERE movie_id = ? 
    ORDER BY 
      CASE WHEN hosting = 'voe.sx' THEN 0 ELSE 1 END,
      source_order ASC
  `, [movieId]);
}

// Search movies
export async function searchMovies(
  query: string,
  category?: string,
  country?: string,
  year?: string,
  page: number = 1,
  limit: number = 20
): Promise<{ movies: MovieFull[]; total: number }> {
  const offset = (page - 1) * limit;
  const params: (string | number)[] = [];
  
  let whereClause = 'WHERE 1=1';
  
  if (query) {
    whereClause += ' AND m.title LIKE ?';
    params.push(`%${query}%`);
  }
  
  if (year && year !== 'Wszystkie lata') {
    whereClause += ' AND m.year = ?';
    params.push(year);
  }
  
  const categoryJoin = category && category !== 'Wszystkie gatunki' 
    ? `INNER JOIN movie_categories mc_filter ON m.id = mc_filter.movie_id AND mc_filter.category = ?` 
    : '';
  if (category && category !== 'Wszystkie gatunki') {
    params.unshift(category);
  }
  
  const countryJoin = country && country !== 'Wszystkie kraje'
    ? `INNER JOIN movie_countries mco_filter ON m.id = mco_filter.movie_id AND mco_filter.country = ?`
    : '';
  if (country && country !== 'Wszystkie kraje') {
    params.unshift(country);
  }
  
  // Count total
  const countSql = `
    SELECT COUNT(DISTINCT m.id) as total 
    FROM movies m
    ${countryJoin}
    ${categoryJoin}
    ${whereClause}
  `;
  const countResult = await contentQuery<[{ total: number }]>(countSql, params);
  
  // Get movies
  const moviesSql = `
    SELECT 
      m.*,
      GROUP_CONCAT(DISTINCT mc.category ORDER BY mc.category SEPARATOR ', ') as categories,
      GROUP_CONCAT(DISTINCT mco.country ORDER BY mco.country SEPARATOR ', ') as countries,
      GROUP_CONCAT(DISTINCT md.director ORDER BY md.director SEPARATOR ', ') as directors,
      GROUP_CONCAT(DISTINCT ms.writer ORDER BY ms.writer SEPARATOR ', ') as screenplay,
      COUNT(DISTINCT msrc.id) as source_count
    FROM movies m
    ${countryJoin}
    ${categoryJoin}
    LEFT JOIN movie_categories mc ON m.id = mc.movie_id
    LEFT JOIN movie_countries mco ON m.id = mco.movie_id
    LEFT JOIN movie_directors md ON m.id = md.movie_id
    LEFT JOIN movie_screenplay ms ON m.id = ms.movie_id
    LEFT JOIN movie_sources msrc ON m.id = msrc.movie_id
    ${whereClause}
    GROUP BY m.id
    ORDER BY m.rating DESC
    LIMIT ? OFFSET ?
  `;
  
  const movies = await contentQuery<MovieFull[]>(moviesSql, [...params, limit, offset]);
  
  return { movies, total: countResult[0].total };
}

// Get unique categories
export async function getMovieCategories(): Promise<string[]> {
  const result = await contentQuery<{ category: string }[]>(
    'SELECT DISTINCT category FROM movie_categories ORDER BY category'
  );
  return result.map(r => r.category);
}

// Get unique countries
export async function getMovieCountries(): Promise<string[]> {
  const result = await contentQuery<{ country: string }[]>(
    'SELECT DISTINCT country FROM movie_countries ORDER BY country'
  );
  return result.map(r => r.country);
}

// Get unique years for movies
export async function getMovieYears(): Promise<string[]> {
  const result = await contentQuery<{ year: string }[]>(
    `SELECT DISTINCT year FROM movies 
     WHERE year IS NOT NULL AND year != '' 
     ORDER BY year DESC`
  );
  return result.map(r => r.year).filter(y => y);
}

// Get trending movies (by views/rating)
export async function getTrendingMovies(limit: number = 10): Promise<MovieFull[]> {
  return contentQuery<MovieFull[]>(`
    SELECT 
      m.*,
      GROUP_CONCAT(DISTINCT mc.category ORDER BY mc.category SEPARATOR ', ') as categories,
      GROUP_CONCAT(DISTINCT mco.country ORDER BY mco.country SEPARATOR ', ') as countries,
      GROUP_CONCAT(DISTINCT md.director ORDER BY md.director SEPARATOR ', ') as directors,
      GROUP_CONCAT(DISTINCT ms.writer ORDER BY ms.writer SEPARATOR ', ') as screenplay,
      COUNT(DISTINCT msrc.id) as source_count
    FROM movies m
    LEFT JOIN movie_categories mc ON m.id = mc.movie_id
    LEFT JOIN movie_countries mco ON m.id = mco.movie_id
    LEFT JOIN movie_directors md ON m.id = md.movie_id
    LEFT JOIN movie_screenplay ms ON m.id = ms.movie_id
    LEFT JOIN movie_sources msrc ON m.id = msrc.movie_id
    GROUP BY m.id
    ORDER BY CAST(m.views AS UNSIGNED) DESC, m.rating DESC
    LIMIT ?
  `, [limit]);
}

// Get random movies for suggestions
export async function getRandomMovies(limit: number = 4): Promise<MovieFull[]> {
  return contentQuery<MovieFull[]>(`
    SELECT 
      m.id,
      m.title,
      m.poster_url,
      m.poster_scraper_local_path,
      m.poster_local,
      m.background_local,
      m.rating
    FROM movies m
    WHERE m.poster_scraper_local_path IS NOT NULL OR m.poster_url IS NOT NULL
    ORDER BY RAND()
    LIMIT ?
  `, [limit]);
}

// ============================================================================
// SERIES QUERIES
// ============================================================================

export interface Series {
  id: number;
  url: string;
  title: string;
  original_title: string | null;
  year: string | null;
  description: string | null;
  poster_url: string | null;
  poster_path: string | null;
  background_url: string | null;
  background_path: string | null;
  rating: number | null;
  views: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SeriesFull extends Series {
  categories: string | null;
  countries: string | null;
  cast: string | null;
  season_count: number;
  episode_count: number;
}

export interface Season {
  id: number;
  series_id: number;
  season_number: number;
  season_title: string | null;
}

export interface Episode {
  id: number;
  season_id: number;
  series_id: number;
  episode_title: string | null;
  episode_url: string | null;
  is_premium: boolean;
  season_number: number;
  episode_number: number;
}

// Episode data formatted for frontend display
export interface EpisodeDisplay {
  id: number;
  title: string;
  episode_number: number;
  season_number: number;
  description?: string;
  duration?: number;
  source_count?: number;
}

export interface EpisodeSource {
  id: number;
  episode_id: number;
  hosting: string | null;
  quality: string | null;
  uploader: string | null;
  iframe_url: string;
  language: string | null;
  source_order: number;
}

// Get all series with pagination - OPTIMIZED (no heavy JOINs for list view)
export async function getSeries(
  page: number = 1,
  limit: number = 20,
  sortBy: string = 'rating',
  sortOrder: 'ASC' | 'DESC' = 'DESC'
): Promise<{ series: SeriesFull[]; total: number }> {
  const offset = (page - 1) * limit;
  
  const validSortColumns = ['id', 'title', 'year', 'rating', 'views', 'created_at'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'rating';
  
  // Use parallel queries for better performance
  const [countResult, baseSeries] = await Promise.all([
    contentQuery<[{ total: number }]>('SELECT COUNT(*) as total FROM series'),
    contentQuery<Series[]>(`
      SELECT * FROM series 
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT ? OFFSET ?
    `, [limit, offset])
  ]);
  
  if (baseSeries.length === 0) {
    return { series: [], total: countResult[0].total };
  }
  
  // Get IDs for batch queries
  const seriesIds = baseSeries.map(s => s.id);
  const placeholders = seriesIds.map(() => '?').join(',');
  
  // Batch fetch categories and countries only (skip counts for list view - too slow)
  const [categories, countries] = await Promise.all([
    contentQuery<{ series_id: number; category: string }[]>(`
      SELECT series_id, category FROM series_categories 
      WHERE series_id IN (${placeholders})
    `, seriesIds),
    contentQuery<{ series_id: number; country: string }[]>(`
      SELECT series_id, country FROM series_countries 
      WHERE series_id IN (${placeholders})
    `, seriesIds)
  ]);
  
  // Build lookup maps
  const categoryMap = new Map<number, string[]>();
  const countryMap = new Map<number, string[]>();
  
  categories.forEach(c => {
    if (!categoryMap.has(c.series_id)) categoryMap.set(c.series_id, []);
    categoryMap.get(c.series_id)!.push(c.category);
  });
  
  countries.forEach(c => {
    if (!countryMap.has(c.series_id)) countryMap.set(c.series_id, []);
    countryMap.get(c.series_id)!.push(c.country);
  });
  
  // Assemble full series objects (skip episode/season counts for performance)
  const series: SeriesFull[] = baseSeries.map(s => ({
    ...s,
    categories: categoryMap.get(s.id)?.join(', ') || null,
    countries: countryMap.get(s.id)?.join(', ') || null,
    cast: null,
    season_count: 0, // Skip for list view
    episode_count: 0, // Skip for list view
  }));
  
  return { series, total: countResult[0].total };
}

// Get series by ID with full details
export async function getSeriesById(id: number): Promise<SeriesFull | null> {
  return contentQueryOne<SeriesFull>(`
    SELECT 
      s.*,
      GROUP_CONCAT(DISTINCT sc.category ORDER BY sc.category SEPARATOR ', ') as categories,
      GROUP_CONCAT(DISTINCT sco.country ORDER BY sco.country SEPARATOR ', ') as countries,
      GROUP_CONCAT(DISTINCT scast.actor_name ORDER BY scast.actor_name SEPARATOR ', ') as cast,
      COUNT(DISTINCT seas.id) as season_count,
      COUNT(DISTINCT ep.id) as episode_count
    FROM series s
    LEFT JOIN series_categories sc ON s.id = sc.series_id
    LEFT JOIN series_countries sco ON s.id = sco.series_id
    LEFT JOIN series_cast scast ON s.id = scast.series_id
    LEFT JOIN seasons seas ON s.id = seas.series_id
    LEFT JOIN episodes ep ON s.id = ep.series_id
    WHERE s.id = ?
    GROUP BY s.id
  `, [id]);
}

// Get series seasons
export async function getSeriesSeasons(seriesId: number): Promise<Season[]> {
  return contentQuery<Season[]>(`
    SELECT * FROM seasons 
    WHERE series_id = ? 
    ORDER BY season_number ASC
  `, [seriesId]);
}

// Get episodes for a season
export async function getSeasonEpisodes(seasonId: number): Promise<Episode[]> {
  return contentQuery<Episode[]>(`
    SELECT * FROM episodes 
    WHERE season_id = ? 
    ORDER BY episode_number ASC
  `, [seasonId]);
}

// Get episodes by series and season number (returns EpisodeDisplay for frontend)
export async function getEpisodesBySeriesAndSeason(
  seriesId: number, 
  seasonNumber: number
): Promise<EpisodeDisplay[]> {
  const episodes = await contentQuery<Array<{
    id: number;
    episode_title: string | null;
    episode_number: number;
    season_number: number;
    description?: string;
    duration?: number;
    source_count?: number;
  }>>(`
    SELECT e.*, 
           (SELECT COUNT(*) FROM episode_sources es WHERE es.episode_id = e.id) as source_count
    FROM episodes e
    WHERE e.series_id = ? AND e.season_number = ?
    ORDER BY e.episode_number ASC
  `, [seriesId, seasonNumber]);
  
  // Map episode_title to title for frontend compatibility
  return episodes.map(ep => ({
    id: ep.id,
    title: ep.episode_title || `Odcinek ${ep.episode_number}`,
    episode_number: ep.episode_number,
    season_number: ep.season_number,
    description: ep.description,
    duration: ep.duration,
    source_count: ep.source_count || 0,
  }));
}

// Get episode sources - sorted by: 1) VOE.sx first (restream supported), 2) language priority
export async function getEpisodeSources(episodeId: number): Promise<EpisodeSource[]> {
  return contentQuery<EpisodeSource[]>(`
    SELECT * FROM episode_sources 
    WHERE episode_id = ? 
    ORDER BY 
      CASE 
        -- VOE.sx with lektor first (best option - restream + polish audio)
        WHEN (hosting = 'voe.sx' OR hosting LIKE '%voe%') AND LOWER(language) LIKE '%lektor%' THEN 1
        -- VOE.sx with dubbing second
        WHEN (hosting = 'voe.sx' OR hosting LIKE '%voe%') AND LOWER(language) LIKE '%dubbing%' THEN 2
        -- VOE.sx with napisy third
        WHEN (hosting = 'voe.sx' OR hosting LIKE '%voe%') AND LOWER(language) LIKE '%napisy%' THEN 3
        -- Any other VOE.sx
        WHEN (hosting = 'voe.sx' OR hosting LIKE '%voe%') THEN 4
        -- Then other hostings with lektor (iframe fallback)
        WHEN LOWER(language) LIKE '%lektor%' THEN 10
        WHEN LOWER(language) LIKE '%dubbing%' THEN 11
        WHEN LOWER(language) LIKE '%napisy%' THEN 12
        ELSE 20 
      END,
      source_order ASC
  `, [episodeId]);
}

// Search series - OPTIMIZED
export async function searchSeries(
  query: string,
  category?: string,
  country?: string,
  year?: string,
  page: number = 1,
  limit: number = 20
): Promise<{ series: SeriesFull[]; total: number }> {
  const offset = (page - 1) * limit;
  const params: (string | number)[] = [];
  
  let whereClause = 'WHERE 1=1';
  
  if (query) {
    whereClause += ' AND s.title LIKE ?';
    params.push(`%${query}%`);
  }
  
  if (year && year !== 'Wszystkie lata') {
    whereClause += ' AND s.year = ?';
    params.push(year);
  }
  
  const categoryJoin = category && category !== 'Wszystkie gatunki'
    ? `INNER JOIN series_categories sc_filter ON s.id = sc_filter.series_id AND sc_filter.category = ?`
    : '';
  if (category && category !== 'Wszystkie gatunki') {
    params.unshift(category);
  }
  
  const countryJoin = country && country !== 'Wszystkie kraje'
    ? `INNER JOIN series_countries sco_filter ON s.id = sco_filter.series_id AND sco_filter.country = ?`
    : '';
  if (country && country !== 'Wszystkie kraje') {
    params.unshift(country);
  }
  
  const countSql = `
    SELECT COUNT(DISTINCT s.id) as total 
    FROM series s
    ${countryJoin}
    ${categoryJoin}
    ${whereClause}
  `;
  
  // First get count and base series (optimized - no GROUP_CONCAT)
  const [countResult, baseSeries] = await Promise.all([
    contentQuery<[{ total: number }]>(countSql, params),
    contentQuery<Series[]>(`
      SELECT DISTINCT s.* FROM series s
      ${countryJoin}
      ${categoryJoin}
      ${whereClause}
      ORDER BY s.rating DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset])
  ]);
  
  if (baseSeries.length === 0) {
    return { series: [], total: countResult[0].total };
  }
  
  // Batch fetch additional data (skip counts for performance)
  const seriesIds = baseSeries.map(s => s.id);
  const placeholders = seriesIds.map(() => '?').join(',');
  
  const [categories, countries] = await Promise.all([
    contentQuery<{ series_id: number; category: string }[]>(`
      SELECT series_id, category FROM series_categories 
      WHERE series_id IN (${placeholders})
    `, seriesIds),
    contentQuery<{ series_id: number; country: string }[]>(`
      SELECT series_id, country FROM series_countries 
      WHERE series_id IN (${placeholders})
    `, seriesIds)
  ]);
  
  // Build lookup maps
  const categoryMap = new Map<number, string[]>();
  const countryMap = new Map<number, string[]>();
  
  categories.forEach(c => {
    if (!categoryMap.has(c.series_id)) categoryMap.set(c.series_id, []);
    categoryMap.get(c.series_id)!.push(c.category);
  });
  
  countries.forEach(c => {
    if (!countryMap.has(c.series_id)) countryMap.set(c.series_id, []);
    countryMap.get(c.series_id)!.push(c.country);
  });
  
  // Assemble full series objects
  const series: SeriesFull[] = baseSeries.map(s => ({
    ...s,
    categories: categoryMap.get(s.id)?.join(', ') || null,
    countries: countryMap.get(s.id)?.join(', ') || null,
    cast: null,
    season_count: 0,
    episode_count: 0,
  }));
  
  return { series, total: countResult[0].total };
}

// Get series categories
export async function getSeriesCategories(): Promise<string[]> {
  const result = await contentQuery<{ category: string }[]>(
    'SELECT DISTINCT category FROM series_categories ORDER BY category'
  );
  return result.map(r => r.category);
}

// Get series countries
export async function getSeriesCountries(): Promise<string[]> {
  const result = await contentQuery<{ country: string }[]>(
    'SELECT DISTINCT country FROM series_countries ORDER BY country'
  );
  return result.map(r => r.country);
}

// Get unique years for series
export async function getSeriesYears(): Promise<string[]> {
  const result = await contentQuery<{ year: string }[]>(
    `SELECT DISTINCT year FROM series 
     WHERE year IS NOT NULL AND year != '' 
     ORDER BY year DESC`
  );
  return result.map(r => r.year).filter(y => y);
}

// Get trending series - OPTIMIZED
export async function getTrendingSeries(limit: number = 10): Promise<SeriesFull[]> {
  // First get base series
  const baseSeries = await contentQuery<Series[]>(`
    SELECT * FROM series 
    ORDER BY CAST(views AS UNSIGNED) DESC, rating DESC
    LIMIT ?
  `, [limit]);
  
  if (baseSeries.length === 0) {
    return [];
  }
  
  // Batch fetch additional data (skip counts for performance)
  const seriesIds = baseSeries.map(s => s.id);
  const placeholders = seriesIds.map(() => '?').join(',');
  
  const [categories, countries] = await Promise.all([
    contentQuery<{ series_id: number; category: string }[]>(`
      SELECT series_id, category FROM series_categories 
      WHERE series_id IN (${placeholders})
    `, seriesIds),
    contentQuery<{ series_id: number; country: string }[]>(`
      SELECT series_id, country FROM series_countries 
      WHERE series_id IN (${placeholders})
    `, seriesIds)
  ]);
  
  // Build lookup maps
  const categoryMap = new Map<number, string[]>();
  const countryMap = new Map<number, string[]>();
  
  categories.forEach(c => {
    if (!categoryMap.has(c.series_id)) categoryMap.set(c.series_id, []);
    categoryMap.get(c.series_id)!.push(c.category);
  });
  
  countries.forEach(c => {
    if (!countryMap.has(c.series_id)) countryMap.set(c.series_id, []);
    countryMap.get(c.series_id)!.push(c.country);
  });
  
  // Assemble and return - preserve original order
  return baseSeries.map(s => ({
    ...s,
    categories: categoryMap.get(s.id)?.join(', ') || null,
    countries: countryMap.get(s.id)?.join(', ') || null,
    cast: null,
    season_count: 0,
    episode_count: 0,
  }));
}

// Get random series for suggestions
export async function getRandomSeries(limit: number = 4): Promise<SeriesFull[]> {
  const series = await contentQuery<Series[]>(`
    SELECT 
      s.id,
      s.title,
      s.poster_url,
      s.poster_path,
      s.background_path,
      s.rating
    FROM series s
    WHERE s.poster_path IS NOT NULL OR s.poster_url IS NOT NULL
    ORDER BY RAND()
    LIMIT ?
  `, [limit]);
  
  return series.map(s => ({
    ...s,
    url: '',
    original_title: null,
    year: null,
    description: null,
    background_url: null,
    views: null,
    created_at: new Date(),
    updated_at: new Date(),
    categories: null,
    countries: null,
    cast: null,
    season_count: 0,
    episode_count: 0,
  }));
}

// ============================================================================
// OPTIMIZED BROWSE QUERIES
// ============================================================================

/**
 * Get trending movies (newest with good ratings) - Optimized for fast loading
 * Algorithm: Newest movies from 2024/2025, prioritized by date added and rating
 * This is DIFFERENT from most watched - focuses on NEWNESS, not popularity
 */
export async function getTrendingMoviesOptimized(limit: number = 15): Promise<MovieFull[]> {
  // Newest movies - prioritize by created_at and rating (not views!)
  const movies = await contentQuery<Movie[]>(`
    SELECT * FROM movies 
    WHERE year IN ('2024', '2025') AND rating >= 6.0
    ORDER BY created_at DESC, rating DESC
    LIMIT ?
  `, [limit]);
  
  if (movies.length === 0) return [];
  
  const movieIds = movies.map(m => m.id);
  const placeholders = movieIds.map(() => '?').join(',');
  
  const categories = await contentQuery<{ movie_id: number; category: string }[]>(`
    SELECT movie_id, category FROM movie_categories WHERE movie_id IN (${placeholders})
  `, movieIds);
  
  const categoryMap = new Map<number, string[]>();
  categories.forEach(c => {
    if (!categoryMap.has(c.movie_id)) categoryMap.set(c.movie_id, []);
    categoryMap.get(c.movie_id)!.push(c.category);
  });
  
  return movies.map(m => ({
    ...m,
    categories: categoryMap.get(m.id)?.join(', ') || null,
    countries: null,
    directors: null,
    screenplay: null,
    source_count: 0,
  }));
}

/**
 * Get most watched movies from 2024/2025 - Optimized
 * Algorithm: Highest view count, excluding movies already in trending
 * This is DIFFERENT from trending - focuses on POPULARITY (views), not newness
 */
export async function getMostWatchedMovies2024_2025(limit: number = 15): Promise<MovieFull[]> {
  // Get movies sorted by views, offset to avoid overlap with trending
  const movies = await contentQuery<Movie[]>(`
    SELECT * FROM movies 
    WHERE year IN ('2024', '2025')
    ORDER BY CAST(views AS UNSIGNED) DESC, created_at DESC
    LIMIT ? OFFSET ?
  `, [limit, limit]); // Offset by limit to skip trending ones
  
  if (movies.length === 0) return [];
  
  const movieIds = movies.map(m => m.id);
  const placeholders = movieIds.map(() => '?').join(',');
  
  const categories = await contentQuery<{ movie_id: number; category: string }[]>(`
    SELECT movie_id, category FROM movie_categories WHERE movie_id IN (${placeholders})
  `, movieIds);
  
  const categoryMap = new Map<number, string[]>();
  categories.forEach(c => {
    if (!categoryMap.has(c.movie_id)) categoryMap.set(c.movie_id, []);
    categoryMap.get(c.movie_id)!.push(c.category);
  });
  
  return movies.map(m => ({
    ...m,
    categories: categoryMap.get(m.id)?.join(', ') || null,
    countries: null,
    directors: null,
    screenplay: null,
    source_count: 0,
  }));
}

/**
 * Get movies by category - Optimized
 */
export async function getMoviesByCategory(category: string, limit: number = 15): Promise<MovieFull[]> {
  const movies = await contentQuery<Movie[]>(`
    SELECT m.* FROM movies m
    INNER JOIN movie_categories mc ON m.id = mc.movie_id
    WHERE mc.category = ?
    ORDER BY m.rating DESC, CAST(m.views AS UNSIGNED) DESC
    LIMIT ?
  `, [category, limit]);
  
  return movies.map(m => ({
    ...m,
    categories: category,
    countries: null,
    directors: null,
    screenplay: null,
    source_count: 0,
  }));
}

/**
 * Get best movies from various countries, genres and years - Optimized
 */
export async function getBestMoviesVaried(limit: number = 15): Promise<MovieFull[]> {
  const movies = await contentQuery<Movie[]>(`
    SELECT * FROM movies 
    WHERE rating >= 7.0
    ORDER BY rating DESC, CAST(views AS UNSIGNED) DESC
    LIMIT ?
  `, [limit]);
  
  if (movies.length === 0) return [];
  
  const movieIds = movies.map(m => m.id);
  const placeholders = movieIds.map(() => '?').join(',');
  
  const [categories, countries] = await Promise.all([
    contentQuery<{ movie_id: number; category: string }[]>(`
      SELECT movie_id, category FROM movie_categories WHERE movie_id IN (${placeholders})
    `, movieIds),
    contentQuery<{ movie_id: number; country: string }[]>(`
      SELECT movie_id, country FROM movie_countries WHERE movie_id IN (${placeholders})
    `, movieIds)
  ]);
  
  const categoryMap = new Map<number, string[]>();
  const countryMap = new Map<number, string[]>();
  
  categories.forEach(c => {
    if (!categoryMap.has(c.movie_id)) categoryMap.set(c.movie_id, []);
    categoryMap.get(c.movie_id)!.push(c.category);
  });
  
  countries.forEach(c => {
    if (!countryMap.has(c.movie_id)) countryMap.set(c.movie_id, []);
    countryMap.get(c.movie_id)!.push(c.country);
  });
  
  return movies.map(m => ({
    ...m,
    categories: categoryMap.get(m.id)?.join(', ') || null,
    countries: countryMap.get(m.id)?.join(', ') || null,
    directors: null,
    screenplay: null,
    source_count: 0,
  }));
}

/**
 * Get trending series (newest with good ratings) - Optimized
 * Algorithm: Newest series from 2024/2025, prioritized by date added and rating
 * This is DIFFERENT from most watched - focuses on NEWNESS, not popularity
 */
export async function getTrendingSeriesOptimized(limit: number = 15): Promise<SeriesFull[]> {
  // Newest series - prioritize by created_at and rating (not views!)
  const baseSeries = await contentQuery<Series[]>(`
    SELECT * FROM series 
    WHERE year IN ('2024', '2025') AND rating >= 6.0
    ORDER BY created_at DESC, rating DESC
    LIMIT ?
  `, [limit]);
  
  if (baseSeries.length === 0) return [];
  
  const seriesIds = baseSeries.map(s => s.id);
  const placeholders = seriesIds.map(() => '?').join(',');
  
  const categories = await contentQuery<{ series_id: number; category: string }[]>(`
    SELECT series_id, category FROM series_categories WHERE series_id IN (${placeholders})
  `, seriesIds);
  
  const categoryMap = new Map<number, string[]>();
  categories.forEach(c => {
    if (!categoryMap.has(c.series_id)) categoryMap.set(c.series_id, []);
    categoryMap.get(c.series_id)!.push(c.category);
  });
  
  return baseSeries.map(s => ({
    ...s,
    categories: categoryMap.get(s.id)?.join(', ') || null,
    countries: null,
    cast: null,
    season_count: 0,
    episode_count: 0,
  }));
}

/**
 * Get most watched series from 2024/2025 - Optimized
 * Algorithm: Highest view count, excluding series already in trending
 * This is DIFFERENT from trending - focuses on POPULARITY (views), not newness
 */
export async function getMostWatchedSeries2024_2025(limit: number = 15): Promise<SeriesFull[]> {
  // Get series sorted by views, offset to avoid overlap with trending
  const baseSeries = await contentQuery<Series[]>(`
    SELECT * FROM series 
    WHERE year IN ('2024', '2025')
    ORDER BY CAST(views AS UNSIGNED) DESC, created_at DESC
    LIMIT ? OFFSET ?
  `, [limit, limit]); // Offset by limit to skip trending ones
  
  if (baseSeries.length === 0) return [];
  
  const seriesIds = baseSeries.map(s => s.id);
  const placeholders = seriesIds.map(() => '?').join(',');
  
  const categories = await contentQuery<{ series_id: number; category: string }[]>(`
    SELECT series_id, category FROM series_categories WHERE series_id IN (${placeholders})
  `, seriesIds);
  
  const categoryMap = new Map<number, string[]>();
  categories.forEach(c => {
    if (!categoryMap.has(c.series_id)) categoryMap.set(c.series_id, []);
    categoryMap.get(c.series_id)!.push(c.category);
  });
  
  return baseSeries.map(s => ({
    ...s,
    categories: categoryMap.get(s.id)?.join(', ') || null,
    countries: null,
    cast: null,
    season_count: 0,
    episode_count: 0,
  }));
}

/**
 * Get series by category - Optimized
 */
export async function getSeriesByCategory(category: string, limit: number = 15): Promise<SeriesFull[]> {
  const baseSeries = await contentQuery<Series[]>(`
    SELECT s.* FROM series s
    INNER JOIN series_categories sc ON s.id = sc.series_id
    WHERE sc.category = ?
    ORDER BY s.rating DESC, CAST(s.views AS UNSIGNED) DESC
    LIMIT ?
  `, [category, limit]);
  
  return baseSeries.map(s => ({
    ...s,
    categories: category,
    countries: null,
    cast: null,
    season_count: 0,
    episode_count: 0,
  }));
}

/**
 * Get recommended series (high rating) - Optimized
 */
export async function getRecommendedSeries(limit: number = 15): Promise<SeriesFull[]> {
  const baseSeries = await contentQuery<Series[]>(`
    SELECT * FROM series 
    WHERE rating >= 7.5
    ORDER BY rating DESC, CAST(views AS UNSIGNED) DESC
    LIMIT ?
  `, [limit]);
  
  if (baseSeries.length === 0) return [];
  
  const seriesIds = baseSeries.map(s => s.id);
  const placeholders = seriesIds.map(() => '?').join(',');
  
  const categories = await contentQuery<{ series_id: number; category: string }[]>(`
    SELECT series_id, category FROM series_categories WHERE series_id IN (${placeholders})
  `, seriesIds);
  
  const categoryMap = new Map<number, string[]>();
  categories.forEach(c => {
    if (!categoryMap.has(c.series_id)) categoryMap.set(c.series_id, []);
    categoryMap.get(c.series_id)!.push(c.category);
  });
  
  return baseSeries.map(s => ({
    ...s,
    categories: categoryMap.get(s.id)?.join(', ') || null,
    countries: null,
    cast: null,
    season_count: 0,
    episode_count: 0,
  }));
}

/**
 * Get best series from various countries, genres and years - Optimized
 */
export async function getBestSeriesVaried(limit: number = 15): Promise<SeriesFull[]> {
  const baseSeries = await contentQuery<Series[]>(`
    SELECT * FROM series 
    WHERE rating >= 7.0
    ORDER BY rating DESC, CAST(views AS UNSIGNED) DESC
    LIMIT ?
  `, [limit]);
  
  if (baseSeries.length === 0) return [];
  
  const seriesIds = baseSeries.map(s => s.id);
  const placeholders = seriesIds.map(() => '?').join(',');
  
  const [categories, countries] = await Promise.all([
    contentQuery<{ series_id: number; category: string }[]>(`
      SELECT series_id, category FROM series_categories WHERE series_id IN (${placeholders})
    `, seriesIds),
    contentQuery<{ series_id: number; country: string }[]>(`
      SELECT series_id, country FROM series_countries WHERE series_id IN (${placeholders})
    `, seriesIds)
  ]);
  
  const categoryMap = new Map<number, string[]>();
  const countryMap = new Map<number, string[]>();
  
  categories.forEach(c => {
    if (!categoryMap.has(c.series_id)) categoryMap.set(c.series_id, []);
    categoryMap.get(c.series_id)!.push(c.category);
  });
  
  countries.forEach(c => {
    if (!countryMap.has(c.series_id)) countryMap.set(c.series_id, []);
    countryMap.get(c.series_id)!.push(c.country);
  });
  
  return baseSeries.map(s => ({
    ...s,
    categories: categoryMap.get(s.id)?.join(', ') || null,
    countries: countryMap.get(s.id)?.join(', ') || null,
    cast: null,
    season_count: 0,
    episode_count: 0,
  }));
}

/**
 * Get hero content for pages (movie or series with background) - Optimized
 */
export async function getHeroMovie(limit: number = 5): Promise<MovieFull[]> {
  const movies = await contentQuery<Movie[]>(`
    SELECT * FROM movies 
    WHERE (background_local IS NOT NULL OR background_url IS NOT NULL)
      AND year IN ('2024', '2025')
    ORDER BY CAST(views AS UNSIGNED) DESC, rating DESC
    LIMIT ?
  `, [limit]);
  
  if (movies.length === 0) {
    // Fallback to any movie with background
    const fallback = await contentQuery<Movie[]>(`
      SELECT * FROM movies 
      WHERE background_local IS NOT NULL OR background_url IS NOT NULL
      ORDER BY rating DESC
      LIMIT ?
    `, [limit]);
    return fallback.map(m => ({
      ...m,
      categories: null,
      countries: null,
      directors: null,
      screenplay: null,
      source_count: 0,
    }));
  }
  
  return movies.map(m => ({
    ...m,
    categories: null,
    countries: null,
    directors: null,
    screenplay: null,
    source_count: 0,
  }));
}

/**
 * Get hero content for series page - Optimized
 */
export async function getHeroSeries(limit: number = 5): Promise<SeriesFull[]> {
  const baseSeries = await contentQuery<Series[]>(`
    SELECT * FROM series 
    WHERE (background_path IS NOT NULL OR background_url IS NOT NULL)
      AND year IN ('2024', '2025')
    ORDER BY CAST(views AS UNSIGNED) DESC, rating DESC
    LIMIT ?
  `, [limit]);
  
  if (baseSeries.length === 0) {
    // Fallback to any series with background
    const fallback = await contentQuery<Series[]>(`
      SELECT * FROM series 
      WHERE background_path IS NOT NULL OR background_url IS NOT NULL
      ORDER BY rating DESC
      LIMIT ?
    `, [limit]);
    return fallback.map(s => ({
      ...s,
      categories: null,
      countries: null,
      cast: null,
      season_count: 0,
      episode_count: 0,
    }));
  }
  
  return baseSeries.map(s => ({
    ...s,
    categories: null,
    countries: null,
    cast: null,
    season_count: 0,
    episode_count: 0,
  }));
}

// ============================================================================
// POSTER/BACKGROUND HELPER
// ============================================================================

/**
 * Get the correct poster path for a movie.
 * Priority: poster_scraper_local_path > poster_local > poster_url
 */
export function getMoviePosterPath(movie: Movie | MovieFull): string {
  const isHttpUrl = (value?: string | null) =>
    typeof value === 'string' && /^https?:\/\//i.test(value);

  if (movie.poster_scraper_local_path) {
    // Convert "imgPoster\\filename.jpg" to "/images/imgPoster/filename.jpg"
    return '/images/' + movie.poster_scraper_local_path.replace(/\\\\/g, '/').replace(/\\/g, '/');
  }
  if (movie.poster_local) {
    return '/images/' + movie.poster_local.replace(/\\\\/g, '/').replace(/\\/g, '/');
  }

  // Never return remote URLs (we keep all assets local)
  if (movie.poster_url && !isHttpUrl(movie.poster_url) && movie.poster_url.startsWith('/')) {
    return movie.poster_url;
  }

  return '/images/placeholder-poster.jpg';
}

/**
 * Get the correct background path for a movie.
 */
export function getMovieBackgroundPath(movie: Movie | MovieFull): string {
  const isHttpUrl = (value?: string | null) =>
    typeof value === 'string' && /^https?:\/\//i.test(value);

  if (movie.background_local) {
    // Convert "backgrounds\\filename.jpg" to "/images/backgrounds/filename.jpg"
    return '/images/' + movie.background_local.replace(/\\\\/g, '/').replace(/\\/g, '/');
  }

  // Never return remote URLs (we keep all assets local)
  if (movie.background_url && !isHttpUrl(movie.background_url) && movie.background_url.startsWith('/')) {
    return movie.background_url;
  }

  return '/images/placeholder-bg.jpg';
}

/**
 * Get the correct poster path for a series.
 * Files are in format: {id}-{title}.jpg
 */
export function getSeriesPosterPath(series: Series | SeriesFull): string {
  const PLACEHOLDER = '/images/placeholder-poster.jpg';
  
  // First try the database path if it exists
  if (series.poster_path) {
    const dbPath = '/images/' + series.poster_path.replace(/\\\\/g, '/').replace(/\\/g, '/');
    return dbPath || PLACEHOLDER;
  }
  
  // If no title, return placeholder
  if (!series.title) {
    return PLACEHOLDER;
  }
  
  // Generate path based on series ID and title
  // Files are named: {id}-{sanitized_title}.jpg
  // Keep Polish characters, just replace spaces and problematic chars
  const sanitizedTitle = series.title
    .replace(/[/:*?"<>|\\]/g, '') // Remove filesystem-unsafe chars
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 80); // Limit length
  
  // Return generated path - Next.js Image will handle 404 with onError
  return `/images/imgSeriesPoster_final/${series.id}-${sanitizedTitle}.jpg`;
}

/**
 * Get the correct background path for a series.
 */
export function getSeriesBackgroundPath(series: Series | SeriesFull): string {
  if (series.background_path) {
    return '/images/' + series.background_path.replace(/\\\\/g, '/').replace(/\\/g, '/');
  }

  // Never return remote URLs (we keep all assets local)
  if (series.background_url && series.background_url.startsWith('/')) {
    return series.background_url;
  }

  return '/images/placeholder-bg.jpg';
}

export default contentPool;
