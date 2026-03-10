import { query, queryOne, insert, execute } from './db';
import { contentQuery, getMoviePosterPath, getSeriesPosterPath, type Movie, type Series } from './contentDb';

// ============================================================================
// WATCH PROGRESS TYPES
// ============================================================================

export interface WatchSession {
  id: number;
  user_id: number;
  content_id: string;
  content_type: 'movie' | 'series';
  season_number: number | null;
  episode_number: number | null;
  watch_time: number;
  total_duration: number;
  watch_percentage: number;
  completed: boolean;
  content_title: string | null;
  poster_path: string | null;
  created_at: Date;
  last_updated: Date;
}

export interface UserPreferences {
  id: number;
  user_id: number;
  preferred_quality: 'auto' | '360p' | '480p' | '720p' | '1080p' | '4k';
  preferred_language: string;
  auto_play: boolean;
  preferred_sources: string;
  created_at: Date;
  updated_at: Date;
}

async function enrichWatchSessions(sessions: WatchSession[]): Promise<WatchSession[]> {
  const movieIds = new Set<number>();
  const seriesIds = new Set<number>();
  const episodeTuples: Array<{ seriesId: number; season: number; episode: number }> = [];

  for (const s of sessions) {
    const needsTitle = !s.content_title;
    const needsPoster = !s.poster_path;
    if (!needsTitle && !needsPoster) continue;

    const contentIdNum = Number(s.content_id);
    if (!Number.isFinite(contentIdNum)) continue;

    if (s.content_type === 'movie') {
      movieIds.add(contentIdNum);
    } else {
      seriesIds.add(contentIdNum);
      if (needsTitle && s.season_number != null && s.episode_number != null) {
        episodeTuples.push({ seriesId: contentIdNum, season: s.season_number, episode: s.episode_number });
      }
    }
  }

  const movieMap = new Map<number, { title: string; poster: string }>();
  const seriesMap = new Map<number, { title: string; poster: string }>();
  const episodeTitleMap = new Map<string, string>();

  if (movieIds.size > 0) {
    const ids = Array.from(movieIds);
    const placeholders = ids.map(() => '?').join(',');
    const rows = await contentQuery<Pick<Movie, 'id' | 'title' | 'poster_url' | 'poster_local' | 'poster_scraper_local_path'>[]>(
      `SELECT id, title, poster_url, poster_local, poster_scraper_local_path FROM movies WHERE id IN (${placeholders})`,
      ids
    );
    rows.forEach(r => movieMap.set(r.id, { title: r.title, poster: getMoviePosterPath(r as Movie) }));
  }

  if (seriesIds.size > 0) {
    const ids = Array.from(seriesIds);
    const placeholders = ids.map(() => '?').join(',');
    const rows = await contentQuery<Pick<Series, 'id' | 'title' | 'poster_path' | 'poster_url'>[]>(
      `SELECT id, title, poster_path, poster_url FROM series WHERE id IN (${placeholders})`,
      ids
    );
    rows.forEach(r => seriesMap.set(r.id, { title: r.title, poster: getSeriesPosterPath(r as Series) }));
  }

  if (episodeTuples.length > 0) {
    const unique = new Map<string, { seriesId: number; season: number; episode: number }>();
    for (const t of episodeTuples) {
      unique.set(`${t.seriesId}:${t.season}:${t.episode}`, t);
    }
    const tuples = Array.from(unique.values());
    const placeholders = tuples.map(() => '(?,?,?)').join(',');
    const params: Array<number> = [];
    tuples.forEach(t => {
      params.push(t.seriesId, t.season, t.episode);
    });

    const rows = await contentQuery<{
      series_id: number;
      season_number: number;
      episode_number: number;
      episode_title: string;
    }[]>(
      `
      SELECT series_id, season_number, episode_number, episode_title
      FROM episodes
      WHERE (series_id, season_number, episode_number) IN (${placeholders})
      `,
      params
    );

    rows.forEach(r => {
      episodeTitleMap.set(`${r.series_id}:${r.season_number}:${r.episode_number}`, r.episode_title);
    });
  }

  return sessions.map((s) => {
    const contentIdNum = Number(s.content_id);
    if (!Number.isFinite(contentIdNum)) return s;

    if (s.content_type === 'movie') {
      const movie = movieMap.get(contentIdNum);
      return {
        ...s,
        content_title: s.content_title ?? movie?.title ?? s.content_title,
        poster_path: s.poster_path ?? movie?.poster ?? s.poster_path,
      };
    }

    const series = seriesMap.get(contentIdNum);
    const episodeTitle = (s.season_number != null && s.episode_number != null)
      ? episodeTitleMap.get(`${contentIdNum}:${s.season_number}:${s.episode_number}`)
      : undefined;

    return {
      ...s,
      content_title: s.content_title ?? episodeTitle ?? series?.title ?? s.content_title,
      poster_path: s.poster_path ?? series?.poster ?? s.poster_path,
    };
  });
}

// ============================================================================
// WATCH PROGRESS OPERATIONS
// ============================================================================

/**
 * Get or create a watch session for user
 */
export async function getOrCreateWatchSession(
  userId: number,
  contentId: string,
  contentType: 'movie' | 'series',
  seasonNumber?: number,
  episodeNumber?: number,
  contentTitle?: string,
  posterPath?: string
): Promise<WatchSession | null> {
  // Check if session exists
  const existing = await queryOne<WatchSession>(`
    SELECT * FROM watch_sessions 
    WHERE user_id = ? 
      AND content_id = ? 
      AND content_type = ?
      AND (season_number = ? OR (season_number IS NULL AND ? IS NULL))
      AND (episode_number = ? OR (episode_number IS NULL AND ? IS NULL))
  `, [
    userId, 
    contentId, 
    contentType, 
    seasonNumber ?? null, 
    seasonNumber ?? null,
    episodeNumber ?? null, 
    episodeNumber ?? null
  ]);

  if (existing) {
    return existing;
  }

  // Create new session
  const result = await insert(`
    INSERT INTO watch_sessions 
    (user_id, content_id, content_type, season_number, episode_number, content_title, poster_path)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    userId, 
    contentId, 
    contentType, 
    seasonNumber ?? null, 
    episodeNumber ?? null,
    contentTitle ?? null,
    posterPath ?? null
  ]);

  return queryOne<WatchSession>('SELECT * FROM watch_sessions WHERE id = ?', [result.insertId]);
}

/**
 * Update watch progress
 */
export async function updateWatchProgress(
  userId: number,
  contentId: string,
  contentType: 'movie' | 'series',
  watchTime: number,
  totalDuration: number,
  seasonNumber?: number,
  episodeNumber?: number,
  contentTitle?: string,
  posterPath?: string
): Promise<WatchSession | null> {
  const watchPercentage = totalDuration > 0 ? Math.min((watchTime / totalDuration) * 100, 100) : 0;
  const completed = watchPercentage >= 95;

  // Upsert watch session
  await execute(`
    INSERT INTO watch_sessions 
    (user_id, content_id, content_type, season_number, episode_number, watch_time, total_duration, watch_percentage, completed, content_title, poster_path)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      watch_time = VALUES(watch_time),
      total_duration = VALUES(total_duration),
      watch_percentage = VALUES(watch_percentage),
      completed = VALUES(completed),
      content_title = COALESCE(VALUES(content_title), content_title),
      poster_path = COALESCE(VALUES(poster_path), poster_path),
      last_updated = CURRENT_TIMESTAMP
  `, [
    userId,
    contentId,
    contentType,
    seasonNumber ?? null,
    episodeNumber ?? null,
    watchTime,
    totalDuration,
    watchPercentage,
    completed,
    contentTitle ?? null,
    posterPath ?? null
  ]);

  return queryOne<WatchSession>(`
    SELECT * FROM watch_sessions 
    WHERE user_id = ? 
      AND content_id = ? 
      AND content_type = ?
      AND (season_number = ? OR (season_number IS NULL AND ? IS NULL))
      AND (episode_number = ? OR (episode_number IS NULL AND ? IS NULL))
  `, [
    userId,
    contentId,
    contentType,
    seasonNumber ?? null,
    seasonNumber ?? null,
    episodeNumber ?? null,
    episodeNumber ?? null
  ]);
}

/**
 * Get the last watched episode for a series (to resume watching)
 * Returns the most recently watched episode regardless of completion status
 */
export async function getLastWatchedEpisode(
  userId: number,
  seriesId: string
): Promise<WatchSession | null> {
  return queryOne<WatchSession>(`
    SELECT * FROM watch_sessions 
    WHERE user_id = ? 
      AND content_id = ? 
      AND content_type = 'series'
    ORDER BY last_updated DESC
    LIMIT 1
  `, [userId, seriesId]);
}

/**
 * Get watch progress for specific content
 */
export async function getWatchProgress(
  userId: number,
  contentId: string,
  contentType: 'movie' | 'series',
  seasonNumber?: number,
  episodeNumber?: number
): Promise<WatchSession | null> {
  return queryOne<WatchSession>(`
    SELECT * FROM watch_sessions 
    WHERE user_id = ? 
      AND content_id = ? 
      AND content_type = ?
      AND (season_number = ? OR (season_number IS NULL AND ? IS NULL))
      AND (episode_number = ? OR (episode_number IS NULL AND ? IS NULL))
  `, [
    userId,
    contentId,
    contentType,
    seasonNumber ?? null,
    seasonNumber ?? null,
    episodeNumber ?? null,
    episodeNumber ?? null
  ]);
}

/**
 * Get continue watching list for user (in-progress content)
 * For series: shows only the most recently watched episode per series (not all episodes)
 * For movies: shows each movie separately
 */
export async function getContinueWatching(userId: number, limit: number = 20): Promise<WatchSession[]> {
  // Use subquery to get the latest session per content (for series: per series, not per episode)
  // This ensures only ONE entry per series (the most recent episode watched)
  const sessions = await query<WatchSession[]>(`
    SELECT ws.*
    FROM watch_sessions ws
    INNER JOIN (
      SELECT content_type, content_id, MAX(last_updated) as max_updated
      FROM watch_sessions
      WHERE user_id = ?
        AND completed = FALSE
        AND watch_percentage > 0
      GROUP BY content_type, content_id
    ) latest ON ws.content_type = latest.content_type 
            AND ws.content_id = latest.content_id 
            AND ws.last_updated = latest.max_updated
    WHERE ws.user_id = ?
      AND ws.completed = FALSE
      AND ws.watch_percentage > 0
    ORDER BY ws.last_updated DESC
    LIMIT ?
  `, [userId, userId, limit]);

  return enrichWatchSessions(sessions);
}

/**
 * Get watch history for user (all watched content)
 */
export async function getWatchHistory(
  userId: number, 
  page: number = 1, 
  limit: number = 20
): Promise<{ sessions: WatchSession[]; total: number }> {
  const offset = (page - 1) * limit;
  
  const countResult = await query<[{ total: number }]>(`
    SELECT COUNT(*) as total FROM watch_sessions WHERE user_id = ?
  `, [userId]);

  const sessions = await query<WatchSession[]>(`
    SELECT * FROM watch_sessions
    WHERE user_id = ?
    ORDER BY last_updated DESC
    LIMIT ? OFFSET ?
  `, [userId, limit, offset]);

  const enriched = await enrichWatchSessions(sessions);
  return { sessions: enriched, total: countResult[0].total };
}

/**
 * Get next episode to watch for a series
 */
export async function getNextEpisode(
  userId: number,
  seriesId: string
): Promise<{ nextSeason: number; nextEpisode: number } | null> {
  // Get the last watched episode for this series
  const lastWatched = await queryOne<WatchSession>(`
    SELECT * FROM watch_sessions 
    WHERE user_id = ? 
      AND content_id = ? 
      AND content_type = 'series'
      AND completed = TRUE
    ORDER BY season_number DESC, episode_number DESC
    LIMIT 1
  `, [userId, seriesId]);

  if (!lastWatched) {
    // No completed episodes, start from S1E1
    return { nextSeason: 1, nextEpisode: 1 };
  }

  // Check if there's a next episode in the same season
  const nextEpisode = (lastWatched.episode_number || 0) + 1;
  const nextSeason = lastWatched.season_number || 1;

  // Return next episode (caller should verify it exists)
  return { nextSeason, nextEpisode };
}

/**
 * Mark content as completed
 */
export async function markAsCompleted(
  userId: number,
  contentId: string,
  contentType: 'movie' | 'series',
  seasonNumber?: number,
  episodeNumber?: number
): Promise<void> {
  await execute(`
    UPDATE watch_sessions 
    SET completed = TRUE, watch_percentage = 100, last_updated = CURRENT_TIMESTAMP
    WHERE user_id = ? 
      AND content_id = ? 
      AND content_type = ?
      AND (season_number = ? OR (season_number IS NULL AND ? IS NULL))
      AND (episode_number = ? OR (episode_number IS NULL AND ? IS NULL))
  `, [
    userId,
    contentId,
    contentType,
    seasonNumber ?? null,
    seasonNumber ?? null,
    episodeNumber ?? null,
    episodeNumber ?? null
  ]);
}

/**
 * Remove from watch history
 */
export async function removeFromHistory(
  userId: number,
  contentId: string,
  contentType: 'movie' | 'series',
  seasonNumber?: number,
  episodeNumber?: number
): Promise<void> {
  await execute(`
    DELETE FROM watch_sessions 
    WHERE user_id = ? 
      AND content_id = ? 
      AND content_type = ?
      AND (season_number = ? OR (season_number IS NULL AND ? IS NULL))
      AND (episode_number = ? OR (episode_number IS NULL AND ? IS NULL))
  `, [
    userId,
    contentId,
    contentType,
    seasonNumber ?? null,
    seasonNumber ?? null,
    episodeNumber ?? null,
    episodeNumber ?? null
  ]);
}

// ============================================================================
// USER PREFERENCES
// ============================================================================

/**
 * Get user preferences
 */
export async function getUserPreferences(userId: number): Promise<UserPreferences | null> {
  return queryOne<UserPreferences>('SELECT * FROM user_preferences WHERE user_id = ?', [userId]);
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  userId: number,
  preferences: Partial<Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<UserPreferences | null> {
  const fields: string[] = [];
  const values: (string | boolean)[] = [];

  if (preferences.preferred_quality !== undefined) {
    fields.push('preferred_quality = ?');
    values.push(preferences.preferred_quality);
  }
  if (preferences.preferred_language !== undefined) {
    fields.push('preferred_language = ?');
    values.push(preferences.preferred_language);
  }
  if (preferences.auto_play !== undefined) {
    fields.push('auto_play = ?');
    values.push(preferences.auto_play);
  }
  if (preferences.preferred_sources !== undefined) {
    fields.push('preferred_sources = ?');
    values.push(preferences.preferred_sources);
  }

  if (fields.length === 0) return getUserPreferences(userId);

  // Upsert preferences
  await execute(`
    INSERT INTO user_preferences (user_id, ${fields.map(f => f.split(' = ')[0]).join(', ')})
    VALUES (?, ${values.map(() => '?').join(', ')})
    ON DUPLICATE KEY UPDATE ${fields.join(', ')}
  `, [userId, ...values, ...values]);

  return getUserPreferences(userId);
}

// ============================================================================
// USER STATISTICS
// ============================================================================

export interface UserStats {
  total_watches: number;
  completed_watches: number;
  movies_watched: number;
  episodes_watched: number;
  total_watch_time_seconds: number;
  last_watch_date: Date | null;
}

export async function getUserStats(userId: number): Promise<UserStats> {
  const result = await queryOne<UserStats>(`
    SELECT 
      COUNT(*) as total_watches,
      SUM(CASE WHEN completed = TRUE THEN 1 ELSE 0 END) as completed_watches,
      SUM(CASE WHEN content_type = 'movie' THEN 1 ELSE 0 END) as movies_watched,
      SUM(CASE WHEN content_type = 'series' THEN 1 ELSE 0 END) as episodes_watched,
      SUM(watch_time) as total_watch_time_seconds,
      MAX(last_updated) as last_watch_date
    FROM watch_sessions
    WHERE user_id = ?
  `, [userId]);

  return result || {
    total_watches: 0,
    completed_watches: 0,
    movies_watched: 0,
    episodes_watched: 0,
    total_watch_time_seconds: 0,
    last_watch_date: null
  };
}
