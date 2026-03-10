'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';
import { loadLocalLastWatchedSeries, loadLocalWatchSession } from '@/lib/localWatchProgress';

interface EpisodeSource {
  id: number;
  url: string;
  hosting: string;
  quality: string;
  language: string;
}

interface Episode {
  id: number;
  title: string;
  episode_number: number;
  season_number: number;
  duration?: number;
}

interface Season {
  season_number: number;
  episodes: Episode[];
}

interface Series {
  id: number;
  title: string;
  slug: string;
  posterPath?: string;
  backgroundPath?: string;
  year?: string;
  rating?: number;
  description?: string;
  categories?: string;
}

export default function WatchSeriesPage() {
  const debug = (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  };

  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const seriesId = params.id as string;
  
  // Get initial episode from URL params
  const initialEpisodeId = searchParams.get('episode');
  const initialSeasonNum = searchParams.get('season') ?? searchParams.get('seasonNumber');
  const initialEpisodeNumber = searchParams.get('episodeNumber');

  const [series, setSeries] = useState<Series | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [sources, setSources] = useState<EpisodeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // userId: number = authenticated, null = explicitly not authenticated, undefined = still loading
  const [userId, setUserId] = useState<number | null | undefined>(undefined);
  const [initialProgress, setInitialProgress] = useState(0);

  // Get current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        debug('[WATCH] Auth response status:', res.status);
        if (res.ok) {
          const data = await res.json();
          debug('[WATCH] User data:', data);
          setUserId(data.user?.id ?? null);
        } else {
          debug('[WATCH] User not authenticated');
          setUserId(null);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[WATCH] Error fetching user:', err);
        setUserId(null);
      }
    };
    fetchUser();
  }, []);

  // Fetch series data
  useEffect(() => {
    const fetchSeries = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/content/series/${seriesId}`);
        
        if (!res.ok) {
          throw new Error('Series not found');
        }

        const data = await res.json();
        setSeries(data.series);
        setSeasons(data.seasons || []);

        // Select initial episode
        let episodeToPlay: Episode | null = null;

        // Try to find episode from URL params
        if (initialEpisodeId) {
          for (const season of data.seasons || []) {
            const found = season.episodes.find(
              (e: Episode) => e.id === parseInt(initialEpisodeId)
            );
            if (found) {
              episodeToPlay = found;
              break;
            }
          }
        }

        // Or from season param (play SxE1)
        if (!episodeToPlay && initialSeasonNum) {
          const season = data.seasons?.find(
            (s: Season) => s.season_number === parseInt(initialSeasonNum)
          );
          if (season && season.episodes.length > 0) {
            episodeToPlay = season.episodes[0];
          }
        }

        // Or from (seasonNumber, episodeNumber) params
        if (!episodeToPlay && initialSeasonNum && initialEpisodeNumber && !initialEpisodeId) {
          const seasonNum = parseInt(initialSeasonNum);
          const episodeNum = parseInt(initialEpisodeNumber);
          if (!Number.isNaN(seasonNum) && !Number.isNaN(episodeNum)) {
            const season = (data.seasons || []).find((s: Season) => s.season_number === seasonNum);
            const ep = season?.episodes.find((e: Episode) => e.episode_number === episodeNum);
            if (ep) {
              episodeToPlay = ep;
            }
          }
        }

        // Or resume from local last-watched episode (works without login)
        if (!episodeToPlay && !initialEpisodeId && !initialSeasonNum) {
          const last = loadLocalLastWatchedSeries(seriesId);
          if (last) {
            const season = (data.seasons || []).find((s: Season) => s.season_number === last.season_number);
            const ep = season?.episodes.find((e: Episode) => e.episode_number === last.episode_number);
            if (ep) {
              episodeToPlay = ep;
            }
          }
        }

        // Or just first episode of first season
        if (!episodeToPlay && data.seasons?.length > 0 && data.seasons[0].episodes.length > 0) {
          episodeToPlay = data.seasons[0].episodes[0];
        }

        if (episodeToPlay) {
          setCurrentEpisode(episodeToPlay);
        }

      } catch (err) {
        console.error('Error fetching series:', err);
        setError(err instanceof Error ? err.message : 'Failed to load series');
      } finally {
        setLoading(false);
      }
    };

    if (seriesId) {
      fetchSeries();
    }
  }, [seriesId, initialEpisodeId, initialSeasonNum, initialEpisodeNumber]);

  // Fetch episode sources when episode changes
  useEffect(() => {
    const fetchSources = async () => {
      if (!currentEpisode) return;

      try {
        const res = await fetch(`/api/content/episodes/${currentEpisode.id}/sources`);
        if (res.ok) {
          const data = await res.json();
          setSources(data.sources || []);
        }
      } catch (err) {
        console.error('Error fetching episode sources:', err);
      }
    };

    fetchSources();
  }, [currentEpisode]);
  
  // Fetch watch progress for current episode
  useEffect(() => {
    const fetchProgress = async () => {
      if (!seriesId || !currentEpisode) return;

      // Wait until auth state is known
      if (userId === undefined) {
        debug('[WATCH] Waiting for auth state before loading progress');
        return;
      }

      // Local fallback when not authenticated
      if (userId === null) {
        const local = loadLocalWatchSession({
          contentId: seriesId,
          contentType: 'series',
          seasonNumber: currentEpisode.season_number,
          episodeNumber: currentEpisode.episode_number,
        });
        const watchTime = local?.watch_time ?? 0;
        debug('[WATCH] Loaded local progress:', { watchTime, local });
        setInitialProgress(watchTime);
        return;
      }
      
      try {
        const url = `/api/watch?userId=${userId}&action=progress&contentId=${seriesId}&contentType=series&seasonNumber=${currentEpisode.season_number}&episodeNumber=${currentEpisode.episode_number}`;
        debug('[WATCH] Fetching progress:', url);
        
        const watchRes = await fetch(url);
        if (watchRes.ok) {
          const watchData = await watchRes.json();
          debug('[WATCH] Progress response:', watchData);
          if (watchData.success && watchData.data) {
            debug(`[WATCH] Setting initial progress to ${watchData.data.watch_time}s`);
            setInitialProgress(watchData.data.watch_time || 0);
          } else {
            debug('[WATCH] No saved progress found');
            setInitialProgress(0);
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[WATCH] Error fetching watch progress:', err);
      }
    };
    
    fetchProgress();
  }, [userId, seriesId, currentEpisode]);

  const handleEpisodeChange = useCallback((episode: Episode) => {
    setCurrentEpisode(episode);
    setInitialProgress(0); // Reset progress for new episode
    
    // Update URL without full navigation
    const newUrl = `/watch/series/${seriesId}?season=${episode.season_number}&episode=${episode.id}`;
    window.history.replaceState(null, '', newUrl);
  }, [seriesId]);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="animate-pulse text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-4">{error || 'Series not found'}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!currentEpisode) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-yellow-500 text-xl mb-4">No episodes available</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-yellow-500 text-xl mb-4">No video sources available for this episode</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      <VideoPlayer
        title={series.title}
        contentType="series"
        contentId={series.id}
        sources={sources}
        posterUrl={series.posterPath}
        backgroundUrl={series.backgroundPath}
        description={series.description}
        year={series.year}
        rating={series.rating}
        categories={series.categories}
        seasons={seasons}
        currentEpisode={currentEpisode}
        onEpisodeChange={handleEpisodeChange}
        userId={userId ?? undefined}
        initialProgress={initialProgress}
        onClose={handleClose}
      />
    </div>
  );
}
