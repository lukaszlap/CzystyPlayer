'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Plus, Check, ThumbsUp, Share2, ChevronDown, Star, Calendar, Film, Crown, X, Copy, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StreamingNavbar } from '@/components/layout/StreamingNavbar';
import { loadLocalLastWatchedSeries } from '@/lib/localWatchProgress';
import { isInMyList, toggleMyList, isLiked, toggleLike } from '@/lib/myList';

interface Series {
  id: number;
  title: string;
  slug: string;
  year?: string;
  description?: string;
  rating?: number;
  posterPath?: string;
  backgroundPath?: string;
  categories?: string;
  countries?: string;
  total_seasons?: number;
  total_episodes?: number;
}

interface Episode {
  id: number;
  title: string;
  episode_number: number;
  season_number: number;
  description?: string;
  duration?: number;
  source_count?: number;
}

interface Season {
  season_number: number;
  episode_count: number;
  episodes: Episode[];
}

// Available source types for display
const SOURCE_TYPES = [
  { id: 'czystyplayer', name: 'CzystyPlayer (Napisy) - pl', premium: false },
  { id: 'premium', name: 'CzystyPlayer Premium', premium: true },
];

interface WatchProgress {
  season_number?: number;
  episode_number?: number;
  watch_time?: number;
  completed?: boolean;
}

export default function SeriesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const seriesId = params.id as string;

  const debug = (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  };

  const [series, setSeries] = useState<Series | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedSourceType, setSelectedSourceType] = useState('czystyplayer');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posterError, setPosterError] = useState(false);
  const [bgError, setBgError] = useState(false);
  const [lastWatched, setLastWatched] = useState<WatchProgress | null>(null);
  // userId: number = authenticated, null = not authenticated, undefined = loading
  const [userId, setUserId] = useState<number | null | undefined>(undefined);
  const [isMounted, setIsMounted] = useState(false);
  
  // My List and Like state
  const [inMyList, setInMyList] = useState(false);
  const [liked, setLiked] = useState(false);
  
  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const PLACEHOLDER_POSTER = '/images/placeholder-poster.jpg';
  const PLACEHOLDER_BG = '/images/placeholder-bg.jpg';

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
        
        // Set first available season
        if (data.seasons && data.seasons.length > 0) {
          setSelectedSeason(data.seasons[0].season_number);
        }
        
        // Check if series is in my list or liked
        setInMyList(isInMyList(data.series.id, 'series'));
        setLiked(isLiked(data.series.id, 'series'));
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
  }, [seriesId]);

  // Resolve auth state (used for server-side watch history)
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          setUserId(null);
          return;
        }
        const data = await res.json();
        setUserId(data.user?.id ?? null);
      } catch {
        setUserId(null);
      }
    };
    fetchUser();
  }, []);

  // Load last watched episode (DB when logged in, else localStorage)
  useEffect(() => {
    const fetchLastWatched = async () => {
      if (!seriesId || seasons.length === 0) return;
      if (userId === undefined) return; // wait for auth state

      if (userId === null) {
        const local = loadLocalLastWatchedSeries(seriesId);
        if (local) {
          setLastWatched(local);
          setSelectedSeason(local.season_number);
        }
        return;
      }

      try {
        const progressRes = await fetch(`/api/watch?userId=${userId}&action=lastEpisode&contentId=${seriesId}`);
        if (progressRes.ok) {
          const progressData = await progressRes.json();
          debug('[SERIES] lastEpisode response:', progressData);
          if (progressData.success && progressData.data) {
            setLastWatched(progressData.data);
            if (progressData.data.season_number) {
              setSelectedSeason(progressData.data.season_number);
            }
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[SERIES] Error fetching last watched:', err);
      }
    };

    fetchLastWatched();
  }, [seriesId, seasons.length, userId]);

  // Helper function to find episode by season and episode number
  const findEpisodeId = (seasonNum: number, episodeNum: number): number | null => {
    const seasonData = seasons.find(s => s.season_number === seasonNum);
    const episode = seasonData?.episodes.find(e => e.episode_number === episodeNum);
    return episode?.id || null;
  };

  const handlePlay = (episodeId?: number) => {
    if (episodeId) {
      router.push(`/watch/series/${seriesId}?episode=${episodeId}`);
    } else if ((lastWatched?.season_number && lastWatched?.episode_number) || loadLocalLastWatchedSeries(seriesId)) {
      const effective = lastWatched ?? loadLocalLastWatchedSeries(seriesId);
      if (!effective?.season_number || !effective?.episode_number) {
        // fall through to first episode
      } else {
        // If episode was completed, try to play next episode
        if (effective.completed) {
          // Find next episode in same season
          const currentSeasonData = seasons.find(s => s.season_number === effective.season_number);
          const nextEp = currentSeasonData?.episodes.find(e => e.episode_number === (effective.episode_number || 0) + 1);
          if (nextEp) {
            router.push(`/watch/series/${seriesId}?episode=${nextEp.id}`);
            return;
          }
          // Check next season
          const nextSeason = seasons.find(s => s.season_number === (effective.season_number || 0) + 1);
          if (nextSeason?.episodes?.[0]) {
            router.push(`/watch/series/${seriesId}?episode=${nextSeason.episodes[0].id}`);
            return;
          }
        }
        // Resume from last watched episode (not completed or no next episode)
        const episodeToResume = findEpisodeId(effective.season_number, effective.episode_number);
        if (episodeToResume) {
          router.push(`/watch/series/${seriesId}?episode=${episodeToResume}`);
          return;
        }
      }

    }
    // Fallback: Play first episode of first season
    const firstSeason = seasons[0];
    if (firstSeason && firstSeason.episodes.length > 0) {
      router.push(`/watch/series/${seriesId}?episode=${firstSeason.episodes[0].id}`);
    } else {
      router.push(`/watch/series/${seriesId}`);
    }
  };

  const handleToggleMyList = () => {
    if (!series) return;
    const added = toggleMyList({
      id: series.id,
      type: 'series',
      title: series.title,
      posterPath: series.posterPath,
      year: series.year,
      rating: series.rating,
    });
    setInMyList(added);
  };

  const handleToggleLike = () => {
    if (!series) return;
    const nowLiked = toggleLike(series.id, 'series');
    setLiked(nowLiked);
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleCopyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Get resume button text
  const getPlayButtonText = () => {
    const local = isMounted ? loadLocalLastWatchedSeries(seriesId) : null;
    const seasonNumber = lastWatched?.season_number ?? local?.season_number;
    const episodeNumber = lastWatched?.episode_number ?? local?.episode_number;
    const completed = Boolean(lastWatched?.completed ?? local?.completed);

    if (seasonNumber && episodeNumber && !completed) {
      return `Kontynuuj S${seasonNumber}E${episodeNumber}`;
    } else if (seasonNumber && episodeNumber && completed) {
      // Find next episode after the completed one
      const currentSeasonData = seasons.find(s => s.season_number === seasonNumber);
      const nextEp = currentSeasonData?.episodes.find(e => e.episode_number === (episodeNumber || 0) + 1);
      if (nextEp) {
        return `Odtwórz S${seasonNumber}E${nextEp.episode_number}`;
      }
      // Check next season
      const nextSeason = seasons.find(s => s.season_number === (seasonNumber || 0) + 1);
      if (nextSeason?.episodes?.[0]) {
        return `Odtwórz S${nextSeason.season_number}E1`;
      }
    }
    return 'Odtwórz';
  };

  const currentSeason = seasons.find(s => s.season_number === selectedSeason);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414] text-white flex items-center justify-center">
        <div className="animate-pulse text-xl">Loading...</div>
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="min-h-screen bg-[#141414] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-4">{error || 'Series not found'}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <StreamingNavbar variant="browse" />

      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[70vh]">
        {/* Background */}
        <div className="absolute inset-0">
          {series.backgroundPath && !bgError ? (
            <Image
              src={series.backgroundPath.startsWith('/') ? series.backgroundPath : `/${series.backgroundPath}`}
              alt={series.title}
              fill
              className="object-cover object-center"
              priority
              onError={() => setBgError(true)}
            />
          ) : series.posterPath && !posterError ? (
            <Image
              src={series.posterPath.startsWith('/') ? series.posterPath : `/${series.posterPath}`}
              alt={series.title}
              fill
              className="object-contain object-center"
              priority
              onError={() => setPosterError(true)}
            />
          ) : (
            <div className="absolute inset-0 bg-linear-to-b from-gray-900 to-[#141414]" />
          )}
          <div className="absolute inset-0 bg-linear-to-r from-black via-black/70 to-transparent" />
          <div className="absolute inset-0 bg-linear-to-t from-[#141414] via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="absolute bottom-[10%] left-4 md:left-12 z-10 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-black mb-4">{series.title}</h1>
            
            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
              {series.rating && (
                <span className="flex items-center gap-1 text-yellow-500">
                  <Star className="w-4 h-4 fill-yellow-500" />
                  {Number(series.rating).toFixed(1)}
                </span>
              )}
              {series.year && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {series.year}
                </span>
              )}
              {seasons.length > 0 && (
                <span className="flex items-center gap-1">
                  <Film className="w-4 h-4" />
                  {seasons.length} {seasons.length === 1 ? 'sezon' : 'sezony'}
                </span>
              )}
              <span className="px-2 py-0.5 border border-gray-400 text-xs">HD</span>
              <span className="px-2 py-0.5 border border-gray-400 text-xs">Serial</span>
            </div>

            {/* Description */}
            {series.description && (
              <p className="text-gray-200 mb-6 line-clamp-3 md:line-clamp-none max-w-2xl">
                {series.description}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 mb-6">
              <Button 
                onClick={() => handlePlay()}
                className="bg-white text-black hover:bg-gray-200 text-lg px-8 py-6 font-semibold"
                disabled={seasons.length === 0}
              >
                <Play className="mr-2 h-6 w-6 fill-black" /> {getPlayButtonText()}
              </Button>
              <Button 
                variant="outline" 
                className={`bg-gray-500/70 border-0 text-white hover:bg-gray-500 text-lg px-6 py-6 ${inMyList ? 'bg-green-600/70 hover:bg-green-600' : ''}`}
                onClick={handleToggleMyList}
              >
                {inMyList ? <Check className="mr-2 h-5 w-5" /> : <Plus className="mr-2 h-5 w-5" />}
                {inMyList ? 'Na liście' : 'Moja lista'}
              </Button>
              <Button 
                variant="outline" 
                className={`bg-gray-500/70 border-0 text-white hover:bg-gray-500 p-6 rounded-full ${liked ? 'bg-[#E50914]/70 hover:bg-[#E50914]' : ''}`}
                onClick={handleToggleLike}
              >
                <ThumbsUp className={`h-5 w-5 ${liked ? 'fill-white' : ''}`} />
              </Button>
              <Button 
                variant="outline" 
                className="bg-gray-500/70 border-0 text-white hover:bg-gray-500 p-6 rounded-full"
                onClick={handleShare}
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </div>

            {/* Categories */}
            {series.categories && (
              <div className="flex flex-wrap gap-2 text-sm text-gray-300 mb-6">
                {series.categories.split(',').map((cat, idx) => (
                  <span key={idx} className="bg-red-600 px-3 py-1 rounded text-white font-medium">
                    {cat.trim().toUpperCase()}
                  </span>
                ))}
              </div>
            )}

            {/* Source Selector */}
            <div className="flex items-center gap-4">
              <span className="text-gray-400">Źródło:</span>
              <select
                value={selectedSourceType}
                onChange={(e) => setSelectedSourceType(e.target.value)}
                className="bg-[#2a2a2a] text-white px-4 py-2 rounded border border-gray-600 cursor-pointer min-w-[280px]"
              >
                {SOURCE_TYPES.map(source => (
                  <option key={source.id} value={source.id}>
                    {source.name} {source.premium ? '👑' : '🎬'}
                  </option>
                ))}
              </select>
              
              {selectedSourceType === 'premium' && (
                <Button className="bg-yellow-600 hover:bg-yellow-700 text-black font-semibold">
                  <Crown className="w-4 h-4 mr-2" />
                  CzystyPlayer Premium
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Seasons & Episodes Section */}
      <div className="px-4 md:px-12 py-8 -mt-10 relative z-10">
        {/* Season Tabs */}
        {seasons.length > 0 && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-4">Odcinki</h2>
            
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
              {seasons.map((season) => (
                <button
                  key={season.season_number}
                  onClick={() => setSelectedSeason(season.season_number)}
                  className={`px-6 py-3 rounded-lg whitespace-nowrap transition font-medium ${
                    selectedSeason === season.season_number
                      ? 'bg-white text-black'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  Sezon {season.season_number}
                  <span className="ml-2 text-sm opacity-70">
                    ({season.episode_count} odc.)
                  </span>
                </button>
              ))}
            </div>

            {/* Episodes List */}
            {currentSeason && (
              <div className="space-y-4">
                {currentSeason.episodes.map((episode) => (
                  <motion.div
                    key={episode.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 rounded-lg overflow-hidden hover:bg-white/10 transition group"
                  >
                    <div className="flex items-center gap-4 p-4">
                      {/* Episode Number */}
                      <div className="shrink-0 w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center text-xl font-bold">
                        {episode.episode_number}
                      </div>

                      {/* Episode Info */}
                      <div className="grow min-w-0">
                        <h4 className="font-semibold truncate">
                          {episode.title}
                        </h4>
                        <div className="flex items-center gap-3 text-sm text-gray-400">
                          <span>S{episode.season_number} E{episode.episode_number}</span>
                          {episode.duration && (
                            <span>{Math.floor(episode.duration / 60)} min</span>
                          )}
                          {episode.source_count !== undefined && episode.source_count > 0 && (
                            <span className="text-green-500">{episode.source_count} źródeł</span>
                          )}
                        </div>
                        {episode.description && (
                          <p className="text-gray-400 text-sm mt-2 line-clamp-2">
                            {episode.description}
                          </p>
                        )}
                      </div>

                      {/* Play Button */}
                      <Button
                        onClick={() => handlePlay(episode.id)}
                        className="bg-red-600 hover:bg-red-700 shrink-0 opacity-0 group-hover:opacity-100 transition"
                        disabled={episode.source_count === 0}
                      >
                        <Play className="w-5 h-5 mr-2 fill-white" />
                        Odtwórz
                      </Button>
                    </div>
                  </motion.div>
                ))}

                {currentSeason.episodes.length === 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-yellow-500 text-center">
                    Brak dostępnych odcinków dla tego sezonu.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {seasons.length === 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 text-yellow-500 text-center">
            Brak dostępnych sezonów. Sprawdź później.
          </div>
        )}

        {/* Additional Info */}
        <div className="mt-12 grid md:grid-cols-2 gap-8">
          {/* Left - Poster */}
          <div className="flex justify-center md:justify-start">
            <div className="relative w-64 aspect-2/3 rounded-lg overflow-hidden shadow-2xl">
              <Image
                src={posterError ? PLACEHOLDER_POSTER : (series.posterPath?.startsWith('/') ? series.posterPath : `/${series.posterPath || ''}`) || PLACEHOLDER_POSTER}
                alt={series.title}
                fill
                className="object-cover"
                onError={() => setPosterError(true)}
              />
            </div>
          </div>

          {/* Right - Details */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold mb-6">Szczegóły</h3>
            
            <div className="grid gap-4">
              {series.countries && (
                <div className="flex">
                  <span className="text-gray-400 w-40">Kraj produkcji:</span>
                  <span className="text-white font-medium">{series.countries}</span>
                </div>
              )}

              {series.year && (
                <div className="flex">
                  <span className="text-gray-400 w-40">Rok premiery:</span>
                  <span className="text-white font-medium">{series.year}</span>
                </div>
              )}

              {series.rating && (
                <div className="flex">
                  <span className="text-gray-400 w-40">Ocena:</span>
                  <span className="text-yellow-500 font-medium flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-500" />
                    {Number(series.rating).toFixed(1)} / 10
                  </span>
                </div>
              )}

              {seasons.length > 0 && (
                <div className="flex">
                  <span className="text-gray-400 w-40">Liczba sezonów:</span>
                  <span className="text-white font-medium">{seasons.length}</span>
                </div>
              )}

              {series.total_episodes && (
                <div className="flex">
                  <span className="text-gray-400 w-40">Łączna liczba odcinków:</span>
                  <span className="text-white font-medium">{series.total_episodes}</span>
                </div>
              )}

              {currentSeason && (
                <div className="flex">
                  <span className="text-gray-400 w-40">Odcinków w sez. {selectedSeason}:</span>
                  <span className="text-white font-medium">{currentSeason.episode_count}</span>
                </div>
              )}

              {series.categories && (
                <div className="flex">
                  <span className="text-gray-400 w-40">Gatunki:</span>
                  <span className="text-white font-medium">{series.categories}</span>
                </div>
              )}
            </div>

            {series.description && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h4 className="text-lg font-semibold mb-3">Opis</h4>
                <p className="text-gray-300 leading-relaxed">{series.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a1a1a] rounded-lg p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Udostępnij</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <p className="text-gray-400 text-sm mb-4">
                Skopiuj link i udostępnij znajomym:
              </p>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? window.location.href : ''}
                  className="flex-1 bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-300 outline-none"
                />
                <Button
                  onClick={handleCopyLink}
                  className={`px-4 ${copied ? 'bg-green-600 hover:bg-green-600' : 'bg-[#E50914] hover:bg-[#f40612]'}`}
                >
                  {copied ? <CheckCircle className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                </Button>
              </div>
              
              {copied && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-green-500 text-sm mt-2"
                >
                  Link skopiowany!
                </motion.p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="py-12 px-4 md:px-12 mt-16 border-t border-gray-800 bg-black/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-bold text-lg mb-4">CzystyPlayer</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                Najlepsza platforma do oglądania filmów i seriali online. 
                Wysoka jakość, szybkie ładowanie, bez reklam.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Nawigacja</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link href="/" className="hover:text-white transition">Strona główna</Link></li>
                <li><Link href="/movies" className="hover:text-white transition">Filmy</Link></li>
                <li><Link href="/series" className="hover:text-white transition">Seriale</Link></li>
                <li><Link href="/browse" className="hover:text-white transition">Przeglądaj</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Gatunki</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link href="/browse?category=Akcja" className="hover:text-white transition">Akcja</Link></li>
                <li><Link href="/browse?category=Komedia" className="hover:text-white transition">Komedia</Link></li>
                <li><Link href="/browse?category=Dramat" className="hover:text-white transition">Dramat</Link></li>
                <li><Link href="/browse?category=Horror" className="hover:text-white transition">Horror</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Informacje</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition">O nas</a></li>
                <li><a href="#" className="hover:text-white transition">Kontakt</a></li>
                <li><a href="#" className="hover:text-white transition">Polityka prywatności</a></li>
                <li><a href="#" className="hover:text-white transition">Regulamin</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">© {new Date().getFullYear()} CzystyPlayer Polska. Wszystkie prawa zastrzeżone.</p>
            <div className="flex items-center gap-4 text-gray-500 text-sm">
              <span>Wersja 1.0.0</span>
              <span>•</span>
              <span>Made with ❤️ in Poland</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
