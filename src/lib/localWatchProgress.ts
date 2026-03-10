export type ContentType = 'movie' | 'series';

export interface LocalWatchSession {
  content_id: string;
  content_type: ContentType;
  season_number: number | null;
  episode_number: number | null;
  watch_time: number;
  total_duration: number;
  watch_percentage: number;
  completed: boolean;
  last_updated: number; // epoch ms
}

export interface LocalLastWatchedSeries {
  series_id: string;
  season_number: number;
  episode_number: number;
  watch_time: number;
  completed: boolean;
  last_updated: number; // epoch ms
}

const SESSIONS_KEY = 'cp_watch_sessions_v1';
const LAST_SERIES_KEY = 'cp_last_watched_series_v1';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function getSessionKey(params: {
  contentId: string | number;
  contentType: ContentType;
  seasonNumber?: number;
  episodeNumber?: number;
}): string {
  const season = params.seasonNumber ?? '';
  const episode = params.episodeNumber ?? '';
  return `${params.contentType}:${String(params.contentId)}:${season}:${episode}`;
}

export function loadLocalWatchSession(params: {
  contentId: string | number;
  contentType: ContentType;
  seasonNumber?: number;
  episodeNumber?: number;
}): LocalWatchSession | null {
  if (!isBrowser()) return null;
  const all = safeParse<Record<string, LocalWatchSession>>(window.localStorage.getItem(SESSIONS_KEY)) ?? {};
  return all[getSessionKey(params)] ?? null;
}

export function saveLocalWatchSession(params: {
  contentId: string | number;
  contentType: ContentType;
  seasonNumber?: number;
  episodeNumber?: number;
  watchTime: number;
  totalDuration: number;
}): LocalWatchSession {
  const now = Date.now();
  const totalDuration = Math.max(0, Math.floor(params.totalDuration || 0));
  const watchTime = Math.max(0, Math.floor(params.watchTime || 0));
  const watchPercentage = totalDuration > 0 ? Math.min((watchTime / totalDuration) * 100, 100) : 0;
  const completed = watchPercentage >= 95;

  const session: LocalWatchSession = {
    content_id: String(params.contentId),
    content_type: params.contentType,
    season_number: params.seasonNumber ?? null,
    episode_number: params.episodeNumber ?? null,
    watch_time: watchTime,
    total_duration: totalDuration,
    watch_percentage: watchPercentage,
    completed,
    last_updated: now,
  };

  if (!isBrowser()) return session;

  const all = safeParse<Record<string, LocalWatchSession>>(window.localStorage.getItem(SESSIONS_KEY)) ?? {};
  all[getSessionKey(params)] = session;
  window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(all));

  // Also track last-watched episode per series
  if (params.contentType === 'series' && params.seasonNumber != null && params.episodeNumber != null) {
    const lastSeries = safeParse<Record<string, LocalLastWatchedSeries>>(window.localStorage.getItem(LAST_SERIES_KEY)) ?? {};
    lastSeries[String(params.contentId)] = {
      series_id: String(params.contentId),
      season_number: params.seasonNumber,
      episode_number: params.episodeNumber,
      watch_time: watchTime,
      completed,
      last_updated: now,
    };
    window.localStorage.setItem(LAST_SERIES_KEY, JSON.stringify(lastSeries));
  }

  return session;
}

export function loadLocalLastWatchedSeries(seriesId: string | number): LocalLastWatchedSeries | null {
  if (!isBrowser()) return null;
  const all = safeParse<Record<string, LocalLastWatchedSeries>>(window.localStorage.getItem(LAST_SERIES_KEY)) ?? {};
  return all[String(seriesId)] ?? null;
}
