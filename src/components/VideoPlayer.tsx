'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import Image from 'next/image';
import Hls from 'hls.js';
import { saveLocalWatchSession } from '@/lib/localWatchProgress';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
  SkipBack, SkipForward, Settings, ChevronLeft, ChevronRight,
  Loader2, AlertCircle, X, List, Monitor, Layers, RotateCcw, RotateCw
} from 'lucide-react';

// Supported hostings for restreaming (rest use iframe)
// Must match VOE_DOMAINS in streaming.ts
const RESTREAM_HOSTINGS = [
  'voe.sx',
  'voe',
  'walterprettytheir.com',
  'growingawarded.com',
  'launchreliantcloth.com',
  'steadicamjob.com',
  'deliverynightmares.com',
  'reaborede.com',
  'yourupload.com',
  'voeun-block.net',
  'voeunblk.com',
  'voe-un-block.com',
  'audaciousdefaulthouse.com',
  'dololotrede.com',
  'ufrede.com',
];

interface VideoSource {
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

interface SuggestedItem {
  id: number;
  title: string;
  posterPath: string;
  type: 'movie' | 'series';
}

interface VideoPlayerProps {
  title: string;
  contentType: 'movie' | 'series';
  contentId: number;
  sources: VideoSource[];
  posterUrl?: string;
  backgroundUrl?: string;
  description?: string;
  year?: string;
  rating?: number;
  categories?: string;
  // For series
  seasons?: Season[];
  currentEpisode?: Episode;
  onEpisodeChange?: (episode: Episode) => void;
  // Watch progress
  userId?: number;
  initialProgress?: number;
  onClose?: () => void;
}

// Check if hosting supports restreaming
function isRestreamSupported(hosting: string): boolean {
  const normalizedHosting = hosting.toLowerCase();
  return RESTREAM_HOSTINGS.some(h => normalizedHosting.includes(h));
}

export default function VideoPlayer({
  title,
  contentType,
  contentId,
  sources,
  posterUrl,
  backgroundUrl,
  description,
  year,
  rating,
  categories,
  seasons,
  currentEpisode,
  onEpisodeChange,
  userId,
  initialProgress = 0,
  onClose
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressSaveRef = useRef<NodeJS.Timeout | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const didInitialSeekRef = useRef(false);
  const initialProgressRef = useRef(0);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Source state
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [useIframe, setUseIframe] = useState(false);
  
  // Auto-play and next episode state
  const [showNextEpisodeCountdown, setShowNextEpisodeCountdown] = useState(false);
  const [nextEpisodeCountdown, setNextEpisodeCountdown] = useState(10);
  const [showEndSuggestions, setShowEndSuggestions] = useState(false);
  const [suggestedContent, setSuggestedContent] = useState<SuggestedItem[]>([]);
  const [movieEndCountdown, setMovieEndCountdown] = useState(20);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const [isHls, setIsHls] = useState(false);

  // Keep latest initialProgress in a ref for event handlers
  useEffect(() => {
    initialProgressRef.current = initialProgress || 0;
  }, [initialProgress]);

  // UI state
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(
    currentEpisode?.season_number || (seasons?.[0]?.season_number ?? 1)
  );

  // Get current source
  const currentSource = sources[currentSourceIndex];

  // Find next VOE source index (for auto-fallback)
  const findNextVoeSourceIndex = useCallback((startIndex: number): number => {
    for (let i = startIndex + 1; i < sources.length; i++) {
      if (isRestreamSupported(sources[i].hosting)) {
        return i;
      }
    }
    return -1; // No more VOE sources
  }, [sources]);

  // Find first iframe source index (fallback when all VOE fail)
  const findFirstIframeSourceIndex = useCallback((): number => {
    for (let i = 0; i < sources.length; i++) {
      if (!isRestreamSupported(sources[i].hosting)) {
        return i;
      }
    }
    return -1; // No iframe sources
  }, [sources]);

  // Auto-switch to next source (VOE first, then iframe)
  const switchToNextSource = useCallback(() => {
    // First try next VOE source
    const nextVoeIndex = findNextVoeSourceIndex(currentSourceIndex);
    if (nextVoeIndex !== -1) {
      console.log(`[PLAYER] Auto-switching to next VOE source at index ${nextVoeIndex}`);
      setCurrentSourceIndex(nextVoeIndex);
      return true;
    }
    
    // No more VOE sources, fallback to first iframe source
    const iframeIndex = findFirstIframeSourceIndex();
    if (iframeIndex !== -1 && iframeIndex !== currentSourceIndex) {
      console.log(`[PLAYER] All VOE sources failed, switching to iframe at index ${iframeIndex}`);
      setCurrentSourceIndex(iframeIndex);
      return true;
    }
    
    return false; // No more sources to try
  }, [currentSourceIndex, findNextVoeSourceIndex, findFirstIframeSourceIndex]);

  // Resolve video source (only for supported hostings)
  const resolveSource = useCallback(async (source: VideoSource) => {
    // Check if hosting supports restreaming
    if (!isRestreamSupported(source.hosting)) {
      console.log(`[PLAYER] Hosting "${source.hosting}" uses iframe mode`);
      setUseIframe(true);
      setIsLoading(false);
      setIsResolving(false);
      return;
    }

    setUseIframe(false);
    setIsResolving(true);
    setError(null);
    setIsHls(false);

    try {
      const response = await fetch('/api/stream/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: source.url,
          hosting: source.hosting
        })
      });

      const data = await response.json();
      console.log(`[PLAYER] Resolve response:`, data);

      if (data.success && data.direct_url) {
        const directUrl = data.direct_url;
        
        // Check if it's HLS stream
        const urlIsHls = directUrl.toLowerCase().includes('.m3u8');
        setIsHls(urlIsHls);
        console.log(`[PLAYER] Direct URL: ${directUrl.substring(0, 80)}...`);
        console.log(`[PLAYER] Is HLS: ${urlIsHls}`);
        
        // Use proxy to avoid CORS
        const proxyUrl = `/api/stream/proxy?url=${encodeURIComponent(directUrl)}`;
        setResolvedUrl(proxyUrl);
      } else {
        // Restreaming failed - try next VOE source automatically
        console.log(`[PLAYER] Restreaming failed for VOE: ${data.error}`);
        const switched = switchToNextSource();
        if (!switched) {
          // No more sources, stay on current with iframe
          console.log(`[PLAYER] No more sources to try, using iframe for current`);
          setUseIframe(true);
          setIsLoading(false);
        }
      }
    } catch (err) {
      console.error('Error resolving source:', err);
      // Try next VOE source on error
      const switched = switchToNextSource();
      if (!switched) {
        setUseIframe(true);
        setIsLoading(false);
      }
    } finally {
      setIsResolving(false);
    }
  }, [switchToNextSource]);

  // Initial source resolution
  useEffect(() => {
    if (sources.length > 0) {
      setResolvedUrl(null);
      setUseIframe(false);
      setError(null);
      setIsHls(false);
      resolveSource(sources[currentSourceIndex]);
    }
  }, [sources, currentSourceIndex, resolveSource]);

  // HLS.js setup and cleanup
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !resolvedUrl || useIframe) return;

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    console.log(`[PLAYER] Setting up video source: ${resolvedUrl.substring(0, 80)}...`);
    console.log(`[PLAYER] Is HLS: ${isHls}, HLS supported: ${Hls.isSupported()}`);

    if (isHls) {
      if (Hls.isSupported()) {
        // Use HLS.js for HLS streams
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 600,
          maxBufferSize: 60 * 1000 * 1000, // 60MB
          maxBufferHole: 0.5,
          debug: false,
          xhrSetup: (xhr, url) => {
            // Set proper headers for HLS segments
            xhr.withCredentials = false;
          }
        });

        hls.loadSource(resolvedUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('[PLAYER] HLS manifest parsed');
          setIsLoading(false);
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('[PLAYER] HLS Error:', data.type, data.details);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log('[PLAYER] Fatal network error, trying to recover');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('[PLAYER] Fatal media error, trying to recover');
                hls.recoverMediaError();
                break;
              default:
                console.log('[PLAYER] Fatal error, switching to iframe');
                hls.destroy();
                setUseIframe(true);
                break;
            }
          }
        });

        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        video.src = resolvedUrl;
      } else {
        console.log('[PLAYER] HLS not supported, falling back to iframe');
        setUseIframe(true);
      }
    } else {
      // Direct MP4 playback
      video.src = resolvedUrl;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [resolvedUrl, useIframe, isHls]);

  // Reset initial-seek guard when source/content changes
  useEffect(() => {
    didInitialSeekRef.current = false;
  }, [resolvedUrl, contentId, contentType, currentEpisode?.season_number, currentEpisode?.episode_number]);

  // Apply initial seek reliably (works for HLS where duration may not be ready yet)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || useIframe) return;
    if (!initialProgress || initialProgress <= 0) return;

    const trySeek = () => {
      if (!videoRef.current) return;
      if (didInitialSeekRef.current) return;

      const t = initialProgressRef.current;
      if (!t || t <= 0) return;

      // Need metadata/seekable range
      const hasMetadata = video.readyState >= 1; // HAVE_METADATA
      const hasSeekable = video.seekable && video.seekable.length > 0;
      if (!hasMetadata && !hasSeekable) return;

      // Clamp if duration is known
      const dur = Number.isFinite(video.duration) ? video.duration : undefined;
      const safeTime = dur && dur > 0 ? Math.min(t, Math.max(dur - 3, 0)) : t;

      try {
        console.log('[PLAYER] Applying initial seek:', { safeTime, dur, readyState: video.readyState });
        video.currentTime = safeTime;
        didInitialSeekRef.current = true;
      } catch (e) {
        // Some browsers throw if seeking too early; we'll try again on next event
        console.log('[PLAYER] Initial seek failed, will retry:', e);
      }
    };

    // Try immediately and on key readiness events
    trySeek();
    const onLoadedMetadata = () => trySeek();
    const onDurationChange = () => trySeek();
    const onCanPlay = () => trySeek();
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('canplay', onCanPlay);

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('canplay', onCanPlay);
    };
  }, [initialProgress, useIframe]);

  // Save watch progress periodically and on important events
  useEffect(() => {
    if (useIframe) return;

    // Save progress every 10 seconds while playing
    const saveInterval = setInterval(() => {
      if (videoRef.current && videoRef.current.currentTime > 0) {
        console.log(`[PLAYER] Auto-saving progress: ${Math.floor(videoRef.current.currentTime)}s`);
        saveProgress(videoRef.current.currentTime, videoRef.current.duration);
      }
    }, 10000);

    // Also save when pausing
    const handlePause = () => {
      if (videoRef.current && videoRef.current.currentTime > 0) {
        console.log(`[PLAYER] Saving progress on pause: ${Math.floor(videoRef.current.currentTime)}s`);
        saveProgress(videoRef.current.currentTime, videoRef.current.duration);
      }
    };

    const video = videoRef.current;
    video?.addEventListener('pause', handlePause);

    return () => {
      clearInterval(saveInterval);
      video?.removeEventListener('pause', handlePause);
      // Save on unmount
      if (video && video.currentTime > 0) {
        console.log(`[PLAYER] Saving progress on unmount: ${Math.floor(video.currentTime)}s`);
        saveProgress(video.currentTime, video.duration);
      }
    };
  }, [userId, useIframe, contentType, contentId, currentEpisode]);

  const saveProgress = async (time: number, dur: number) => {
    if (time <= 0) {
      console.log('[PLAYER] Cannot save progress - time is 0');
      return;
    }

    // If user is not authenticated, persist progress locally (localStorage)
    if (!userId) {
      saveLocalWatchSession({
        contentId,
        contentType,
        seasonNumber: currentEpisode?.season_number,
        episodeNumber: currentEpisode?.episode_number,
        watchTime: time,
        totalDuration: dur,
      });
      return;
    }

    const payload = {
      userId,
      contentType: contentType,
      contentId,
      seasonNumber: currentEpisode?.season_number,
      episodeNumber: currentEpisode?.episode_number,
      currentTime: Math.floor(time),
      duration: Math.floor(dur)
    };

    console.log('[PLAYER] Saving progress:', payload);

    try {
      const res = await fetch('/api/watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      console.log('[PLAYER] Save progress response:', data);
    } catch (err) {
      console.error('[PLAYER] Error saving progress:', err);
    }
  };

  // Auto-hide controls
  useEffect(() => {
    if (useIframe) return;

    const handleMouseMove = () => {
      setShowControls(true);
      
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }

      if (isPlaying) {
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
        }, 3000);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      return () => container.removeEventListener('mousemove', handleMouseMove);
    }
  }, [isPlaying, useIframe]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || useIframe) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          adjustVolume(0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          adjustVolume(-0.1);
          break;
        case 'm':
          toggleMute();
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'Escape':
          if (isFullscreen) {
            toggleFullscreen();
          } else if (onClose) {
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, onClose, useIframe]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Video event handlers
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);

      // Seek before autoplay if we have resume time
      if (!useIframe && !didInitialSeekRef.current && initialProgressRef.current > 0) {
        const dur = Number.isFinite(videoRef.current.duration) ? videoRef.current.duration : undefined;
        const safeTime = dur && dur > 0
          ? Math.min(initialProgressRef.current, Math.max(dur - 3, 0))
          : initialProgressRef.current;
        try {
          console.log('[PLAYER] Seeking on metadata before autoplay:', { safeTime, dur });
          videoRef.current.currentTime = safeTime;
          didInitialSeekRef.current = true;
        } catch (e) {
          console.log('[PLAYER] Seek on metadata failed:', e);
        }
      }
      
      // Auto-play when video is loaded
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.log('[PLAYER] Autoplay blocked:', err);
        // If autoplay is blocked, user needs to click play
      });
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      
      const timeLeft = videoRef.current.duration - videoRef.current.currentTime;
      
      // Show next episode countdown 10 seconds before end (series only)
      if (contentType === 'series' && timeLeft <= 10 && timeLeft > 0 && getNextEpisode()) {
        if (!showNextEpisodeCountdown) {
          setShowNextEpisodeCountdown(true);
          setNextEpisodeCountdown(Math.ceil(timeLeft));
        }
      }
      
      // Update countdown
      if (showNextEpisodeCountdown && timeLeft > 0) {
        setNextEpisodeCountdown(Math.ceil(timeLeft));
      }
    }
  };

  const handleEnded = async () => {
    setIsPlaying(false);
    setShowNextEpisodeCountdown(false);
    
    // Mark as completed
    if (userId) {
      await fetch('/api/watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          contentType: contentType, // 'movie' or 'series'
          contentId,
          seasonNumber: currentEpisode?.season_number,
          episodeNumber: currentEpisode?.episode_number,
          action: 'completed'
        })
      });
    }

    // Auto-play next episode for series
    if (contentType === 'series' && seasons && currentEpisode && onEpisodeChange) {
      const nextEpisode = getNextEpisode();
      if (nextEpisode) {
        // Automatically go to next episode
        onEpisodeChange(nextEpisode);
        return;
      }
    }
    
    // Show suggestions for movies (or series with no more episodes)
    if (contentType === 'movie' || (contentType === 'series' && !getNextEpisode())) {
      // Fetch suggestions first, then show overlay
      try {
        const [moviesRes, seriesRes] = await Promise.all([
          fetch('/api/content/movies?limit=4&random=true'),
          fetch('/api/content/series?limit=4&random=true')
        ]);
        
        const movies = await moviesRes.json();
        const series = await seriesRes.json();
        
        console.log('[PLAYER] Fetched suggestions:', { movies, series });
        
        // Mix movies and series, exclude current content
        const allContent: SuggestedItem[] = [
          ...(movies.movies || []).map((m: { id: number; title: string; posterPath?: string }) => ({ 
            id: m.id, 
            title: m.title, 
            posterPath: m.posterPath || '/images/placeholder.jpg',
            type: 'movie' as const 
          })),
          ...(series.series || []).map((s: { id: number; title: string; posterPath?: string }) => ({ 
            id: s.id, 
            title: s.title, 
            posterPath: s.posterPath || '/images/placeholder.jpg',
            type: 'series' as const 
          }))
        ].filter(item => !(item.type === contentType && item.id === contentId));
        
        // Shuffle and take 4
        const suggestions = allContent.sort(() => Math.random() - 0.5).slice(0, 4);
        console.log('[PLAYER] Final suggestions:', suggestions);
        
        // Use flushSync to ensure state is updated immediately before showing overlay
        flushSync(() => {
          setSuggestedContent(suggestions);
        });
        
        setShowEndSuggestions(true);
        setMovieEndCountdown(20);
        
        // Start countdown for auto-play suggestion (use suggestions directly, not state)
        const firstSuggestion = suggestions[0];
        countdownRef.current = setInterval(() => {
          setMovieEndCountdown(prev => {
            if (prev <= 1) {
              // Auto-play first suggestion
              if (countdownRef.current) clearInterval(countdownRef.current);
              if (firstSuggestion) {
                window.location.href = firstSuggestion.type === 'movie' 
                  ? `/watch/movie/${firstSuggestion.id}`
                  : `/series/${firstSuggestion.id}`;
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } catch (err) {
        console.error('[PLAYER] Error fetching suggestions:', err);
      }
    }
  };
  
  // Handle suggestion click
  const handleSuggestionClick = (item: SuggestedItem) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setShowEndSuggestions(false);
    
    // Navigate to the content
    window.location.href = item.type === 'movie' 
      ? `/watch/movie/${item.id}`
      : `/series/${item.id}`;
  };
  
  // Cancel auto-play countdown
  const cancelAutoPlay = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setMovieEndCountdown(0);
  };
  
  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  const handleError = () => {
    // If restreaming fails, try iframe
    if (!useIframe) {
      console.log('[PLAYER] Video error, switching to iframe');
      setUseIframe(true);
      setIsLoading(false);
    } else {
      setError('Failed to load video');
      setIsLoading(false);
    }
  };

  const handleWaiting = () => setIsLoading(true);
  const handleCanPlay = () => setIsLoading(false);

  // Controls
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(
        0,
        Math.min(videoRef.current.duration, videoRef.current.currentTime + seconds)
      );
    }
  };

  const adjustVolume = (delta: number) => {
    const newVolume = Math.max(0, Math.min(1, volume + delta));
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    if (newVolume > 0) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !videoRef.current) return;

    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = percent * duration;
  };

  const formatTime = (time: number): string => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getNextEpisode = (): Episode | null => {
    if (!seasons || !currentEpisode) return null;

    const currentSeason = seasons.find(s => s.season_number === currentEpisode.season_number);
    if (!currentSeason) return null;

    const nextInSeason = currentSeason.episodes.find(
      e => e.episode_number === currentEpisode.episode_number + 1
    );
    if (nextInSeason) return nextInSeason;

    const nextSeason = seasons.find(s => s.season_number === currentEpisode.season_number + 1);
    if (nextSeason && nextSeason.episodes.length > 0) {
      return nextSeason.episodes[0];
    }

    return null;
  };

  const getPrevEpisode = (): Episode | null => {
    if (!seasons || !currentEpisode) return null;

    const currentSeason = seasons.find(s => s.season_number === currentEpisode.season_number);
    if (!currentSeason) return null;

    const prevInSeason = currentSeason.episodes.find(
      e => e.episode_number === currentEpisode.episode_number - 1
    );
    if (prevInSeason) return prevInSeason;

    const prevSeason = seasons.find(s => s.season_number === currentEpisode.season_number - 1);
    if (prevSeason && prevSeason.episodes.length > 0) {
      return prevSeason.episodes[prevSeason.episodes.length - 1];
    }

    return null;
  };

  // Change source
  const handleSourceChange = (index: number) => {
    if (index !== currentSourceIndex) {
      // Cleanup HLS instance before changing source
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      setCurrentSourceIndex(index);
      setResolvedUrl(null);
      setUseIframe(false);
      setIsHls(false);
      setShowSourceMenu(false);
      setShowNextEpisodeCountdown(false);
      setShowEndSuggestions(false);
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    }
  };

  // Parse categories
  const categoryList = categories?.split(',').map(c => c.trim()).filter(Boolean) || [];

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-black group"
    >
      {/* Background for paused state */}
      {!isPlaying && !useIframe && backgroundUrl && (
        <div className="absolute inset-0 z-0">
          <Image 
            src={backgroundUrl}
            alt={title}
            fill
            className="object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black via-black/60 to-black/40" />
        </div>
      )}

      {/* Video Element (for restreaming) */}
      {!useIframe && resolvedUrl && (
        <video
          ref={videoRef}
          className={`w-full h-full relative z-10 ${!isPlaying ? 'opacity-0' : 'opacity-100'}`}
          poster={posterUrl}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onError={handleError}
          onWaiting={handleWaiting}
          onCanPlay={handleCanPlay}
          onClick={togglePlay}
          playsInline
          crossOrigin="anonymous"
        />
      )}

      {/* Paused Info Overlay */}
      {!isPlaying && !useIframe && !isLoading && !isResolving && (
        <div className="absolute inset-0 z-20 flex items-center pointer-events-none">
          <div className="flex gap-8 p-8 max-w-5xl mx-auto">
            {/* Poster */}
            {posterUrl && (
              <div className="shrink-0 w-64 aspect-2/3 relative rounded-lg overflow-hidden shadow-2xl">
                <Image 
                  src={posterUrl}
                  alt={title}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            
            {/* Info */}
            <div className="flex flex-col justify-center">
              <h1 className="text-4xl font-bold text-white mb-4">{title}</h1>
              
              {/* Meta info */}
              <div className="flex items-center gap-4 mb-4 text-gray-300">
                {year && <span>{year}</span>}
                {rating !== undefined && rating !== null && (
                  <span className="flex items-center gap-1">
                    Ocena: {Number(rating).toFixed(2)}
                  </span>
                )}
                {currentEpisode && (
                  <span>S{currentEpisode.season_number} E{currentEpisode.episode_number}</span>
                )}
              </div>
              
              {/* Description */}
              {description && (
                <p className="text-gray-300 text-lg mb-6 line-clamp-3 max-w-xl">
                  {description}
                </p>
              )}
              
              {/* Categories */}
              {categoryList.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {categoryList.map((cat, idx) => (
                    <span 
                      key={idx}
                      className="px-3 py-1 bg-red-600 text-white text-sm font-medium rounded"
                    >
                      {cat.toUpperCase()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Iframe (for unsupported hostings) */}
      {useIframe && currentSource && (
        <div className="w-full h-full flex flex-col">
          {/* Top bar for iframe mode */}
          <div className="bg-black p-2 flex items-center justify-between z-10">
            <div className="flex items-center gap-4">
              {onClose && (
                <button 
                  onClick={onClose}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              )}
              <div className="flex flex-col">
                <h1 className="text-white text-lg font-bold">{title}</h1>
                {currentEpisode && (
                  <span className="text-gray-400 text-sm">
                    S{currentEpisode.season_number} E{currentEpisode.episode_number}: {currentEpisode.title}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Source selector */}
              <div className="relative">
                <button
                  onClick={() => setShowSourceMenu(!showSourceMenu)}
                  className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded transition"
                >
                  <Layers className="w-4 h-4 text-white" />
                  <span className="text-white text-sm">{currentSource.hosting}</span>
                </button>

                {showSourceMenu && (
                  <SourceMenu
                    sources={sources}
                    currentIndex={currentSourceIndex}
                    onSelect={handleSourceChange}
                    onClose={() => setShowSourceMenu(false)}
                    direction="down"
                  />
                )}
              </div>

              {/* Episode selector for series */}
              {contentType === 'series' && seasons && (
                <>
                  <select
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(Number(e.target.value))}
                    className="px-3 py-2 bg-white/10 text-white rounded border-0 text-sm"
                  >
                    {seasons.map(season => (
                      <option key={season.season_number} value={season.season_number} className="bg-black">
                        Sezon {season.season_number}
                      </option>
                    ))}
                  </select>
                  
                  <select
                    value={currentEpisode?.id || ''}
                    onChange={(e) => {
                      const ep = seasons
                        .find(s => s.season_number === selectedSeason)
                        ?.episodes.find(ep => ep.id === Number(e.target.value));
                      if (ep) onEpisodeChange?.(ep);
                    }}
                    className="px-3 py-2 bg-white/10 text-white rounded border-0 text-sm max-w-xs"
                  >
                    {seasons
                      .find(s => s.season_number === selectedSeason)
                      ?.episodes.map(episode => (
                        <option key={episode.id} value={episode.id} className="bg-black">
                          E{episode.episode_number}: {episode.title}
                        </option>
                      ))}
                  </select>
                </>
              )}

              <button
                onClick={toggleFullscreen}
                className="p-2 rounded bg-white/10 hover:bg-white/20 transition"
              >
                {isFullscreen ? <Minimize className="w-5 h-5 text-white" /> : <Maximize className="w-5 h-5 text-white" />}
              </button>
            </div>
          </div>

          {/* Iframe content */}
          <iframe
            src={currentSource.url}
            className="flex-1 w-full border-0"
            allowFullScreen
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
          />
        </div>
      )}

      {/* Loading Overlay */}
      {(isLoading || isResolving) && !useIframe && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-16 h-16 text-red-600 animate-spin" />
            <span className="text-white text-lg">
              {isResolving ? 'Przygotowywanie strumienia...' : 'Ładowanie...'}
            </span>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && !useIframe && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
          <div className="flex flex-col items-center gap-4 text-center p-8">
            <AlertCircle className="w-16 h-16 text-red-600" />
            <span className="text-white text-xl">{error}</span>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setUseIframe(true);
                  setError(null);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Użyj odtwarzacza zewnętrznego
              </button>
              {currentSourceIndex < sources.length - 1 && (
                <button
                  onClick={() => {
                    setError(null);
                    setResolvedUrl(null);
                    setCurrentSourceIndex(prev => prev + 1);
                  }}
                  className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                >
                  Następne źródło
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Next Episode Countdown Overlay (Series) */}
      {showNextEpisodeCountdown && contentType === 'series' && getNextEpisode() && !useIframe && (
        <div className="absolute bottom-24 right-4 z-50 animate-in slide-in-from-right duration-300">
          <div className="bg-black/90 rounded-lg p-4 border border-white/20 shadow-2xl min-w-[280px]">
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16 rounded overflow-hidden shrink-0">
                {posterUrl && (
                  <Image 
                    src={posterUrl}
                    alt="Next episode"
                    fill
                    className="object-cover"
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <span className="text-white text-2xl font-bold">{nextEpisodeCountdown}</span>
                </div>
              </div>
              
              <div className="flex-1">
                <p className="text-gray-400 text-xs uppercase">Następny odcinek za</p>
                <p className="text-white font-semibold">
                  S{getNextEpisode()!.season_number} E{getNextEpisode()!.episode_number}
                </p>
                <p className="text-gray-300 text-sm truncate">{getNextEpisode()!.title}</p>
              </div>
            </div>
            
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  setShowNextEpisodeCountdown(false);
                  if (onEpisodeChange && getNextEpisode()) {
                    onEpisodeChange(getNextEpisode()!);
                  }
                }}
                className="flex-1 py-2 bg-white text-black font-semibold rounded hover:bg-gray-200 transition flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Odtwórz teraz
              </button>
              <button
                onClick={() => setShowNextEpisodeCountdown(false)}
                className="px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20 transition"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Suggestions Overlay (Movies) */}
      {showEndSuggestions && (
        <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8">
          <h2 className="text-white text-3xl font-bold mb-8">Co chcesz obejrzeć dalej?</h2>
          
          {suggestedContent.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl w-full">
              {suggestedContent.map((item, index) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleSuggestionClick(item)}
                  className={`relative group rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 hover:ring-2 hover:ring-white ${
                    index === 0 ? 'ring-4 ring-red-500' : ''
                  }`}
                >
                  <div className="aspect-2/3 relative bg-gray-800">
                    <Image
                      src={item.posterPath}
                      alt={item.title}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    {/* Fallback colored background */}
                    <div className="absolute inset-0 bg-linear-to-br from-red-900/50 to-gray-900/80 -z-10" />
                    
                    {index === 0 && movieEndCountdown > 0 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-5xl font-bold text-white">{movieEndCountdown}</div>
                          <div className="text-sm text-gray-300 mt-1">sekund</div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-linear-to-t from-black via-black/80 to-transparent">
                    <p className="text-white font-bold text-sm truncate">{item.title}</p>
                    <p className="text-gray-400 text-xs">{item.type === 'movie' ? 'Film' : 'Serial'}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-lg">Ładowanie sugestii...</div>
          )}
          
          <div className="mt-8 flex items-center gap-4">
            {movieEndCountdown > 0 && (
              <p className="text-gray-400">
                Następny film rozpocznie się za {movieEndCountdown} sekund
              </p>
            )}
            <button
              onClick={cancelAutoPlay}
              className="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
            >
              Anuluj automatyczne odtwarzanie
            </button>
          </div>
        </div>
      )}

      {/* Controls Overlay (only for restream mode) */}
      {!useIframe && (
        <div 
          className={`absolute inset-0 z-40 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Top Gradient */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-linear-to-b from-black/80 to-transparent pointer-events-none" />

          {/* Bottom Gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-linear-to-t from-black/80 to-transparent pointer-events-none" />

          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              {onClose && (
                <button 
                  onClick={onClose}
                  className="p-2 rounded-full bg-black/50 hover:bg-black/70 transition"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              )}
              <div className="flex flex-col">
                <h1 className="text-white text-xl font-bold">{title}</h1>
                {currentEpisode && (
                  <span className="text-gray-300 text-sm">
                    S{currentEpisode.season_number} E{currentEpisode.episode_number}: {currentEpisode.title}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-full bg-black/50 hover:bg-black/70 transition"
              >
                <Settings className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          {/* Center Play Button */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <button
              onClick={togglePlay}
              className="p-6 rounded-full bg-black/50 hover:bg-black/70 transition transform hover:scale-110 pointer-events-auto"
            >
              {isPlaying ? (
                <Pause className="w-16 h-16 text-white" />
              ) : (
                <Play className="w-16 h-16 text-white ml-1" />
              )}
            </button>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
            {/* Progress Bar */}
            <div 
              ref={progressRef}
              className="relative h-1 bg-white/30 rounded-full cursor-pointer group/progress"
              onClick={handleProgressClick}
            >
              <div 
                className="absolute h-full bg-red-600 rounded-full transition-all"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-red-600 rounded-full opacity-0 group-hover/progress:opacity-100 transition"
                style={{ left: `calc(${duration > 0 ? (currentTime / duration) * 100 : 0}% - 8px)` }}
              />
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Play/Pause */}
                <button onClick={togglePlay} className="text-white hover:text-gray-300 transition">
                  {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7" />}
                </button>

                {/* Skip Backward */}
                <button onClick={() => skip(-10)} className="text-white hover:text-gray-300 transition">
                  <RotateCcw className="w-6 h-6" />
                </button>

                {/* Skip Forward */}
                <button onClick={() => skip(10)} className="text-white hover:text-gray-300 transition">
                  <RotateCw className="w-6 h-6" />
                </button>

                {/* Volume */}
                <div className="flex items-center gap-2">
                  <button onClick={toggleMute} className="text-white hover:text-gray-300 transition">
                    {isMuted || volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                  </button>
                </div>

                {/* Time */}
                <span className="text-white text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Previous Episode */}
                {contentType === 'series' && getPrevEpisode() && (
                  <button 
                    onClick={() => onEpisodeChange?.(getPrevEpisode()!)}
                    className="p-1.5 rounded bg-white/10 hover:bg-white/20 transition"
                    title="Poprzedni odcinek"
                  >
                    <SkipBack className="w-5 h-5 text-white" />
                  </button>
                )}

                {/* Next Episode */}
                {contentType === 'series' && getNextEpisode() && (
                  <button 
                    onClick={() => onEpisodeChange?.(getNextEpisode()!)}
                    className="p-1.5 rounded bg-white/10 hover:bg-white/20 transition"
                    title="Następny odcinek"
                  >
                    <SkipForward className="w-5 h-5 text-white" />
                  </button>
                )}

                {/* Episode Selector for series on bottom bar */}
                {contentType === 'series' && seasons && (
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedSeason}
                      onChange={(e) => setSelectedSeason(Number(e.target.value))}
                      className="px-2 py-1 bg-black/70 text-white rounded border border-white/20 text-sm cursor-pointer"
                    >
                      {seasons.map(season => (
                        <option key={season.season_number} value={season.season_number}>
                          S{season.season_number}
                        </option>
                      ))}
                    </select>
                    
                    <select
                      value={currentEpisode?.id || ''}
                      onChange={(e) => {
                        const ep = seasons
                          .find(s => s.season_number === selectedSeason)
                          ?.episodes.find(ep => ep.id === Number(e.target.value));
                        if (ep) onEpisodeChange?.(ep);
                      }}
                      className="px-2 py-1 bg-black/70 text-white rounded border border-white/20 text-sm cursor-pointer max-w-[180px]"
                    >
                      {seasons
                        .find(s => s.season_number === selectedSeason)
                        ?.episodes.map(episode => (
                          <option key={episode.id} value={episode.id}>
                            E{episode.episode_number}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Source Menu Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowSourceMenu(!showSourceMenu)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-black/50 hover:bg-black/70 rounded transition border border-white/20"
                  >
                    <Layers className="w-4 h-4 text-white" />
                    <span className="text-white text-sm">
                      {currentSource?.hosting || 'Źródło'}
                    </span>
                  </button>

                  {showSourceMenu && (
                    <SourceMenu
                      sources={sources}
                      currentIndex={currentSourceIndex}
                      onSelect={handleSourceChange}
                      onClose={() => setShowSourceMenu(false)}
                      direction="up"
                    />
                  )}
                </div>

                {/* Playback Speed */}
                <span className="text-white text-sm px-2 py-1 bg-black/50 rounded border border-white/20">
                  1x
                </span>

                {/* Quality */}
                <span className="text-white text-sm px-2 py-1 bg-black/50 rounded border border-white/20">
                  {currentSource?.quality || 'HD'}
                </span>

                {/* Fullscreen */}
                <button 
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded bg-white/10 hover:bg-white/20 transition"
                >
                  {isFullscreen ? <Minimize className="w-5 h-5 text-white" /> : <Maximize className="w-5 h-5 text-white" />}
                </button>

                {/* Episode List Button */}
                {contentType === 'series' && seasons && (
                  <button
                    onClick={() => setShowEpisodeList(!showEpisodeList)}
                    className="p-1.5 rounded bg-white/10 hover:bg-white/20 transition"
                    title="Lista odcinków"
                  >
                    <List className="w-5 h-5 text-white" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Episode List Panel */}
      {showEpisodeList && seasons && (
        <div className="absolute top-0 right-0 bottom-0 w-96 bg-black/95 overflow-y-auto z-50">
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold">{title}</h3>
              <button 
                onClick={() => setShowEpisodeList(false)}
                className="text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div>
                <label className="text-gray-400 text-xs">Sezon:</label>
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 bg-[#333] text-white rounded border-0 text-sm"
                >
                  {seasons.map(season => (
                    <option key={season.season_number} value={season.season_number}>
                      Sezon {season.season_number}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs">Odcinek:</label>
                <select
                  value={currentEpisode?.id || ''}
                  onChange={(e) => {
                    const ep = seasons
                      .find(s => s.season_number === selectedSeason)
                      ?.episodes.find(ep => ep.id === Number(e.target.value));
                    if (ep) {
                      onEpisodeChange?.(ep);
                      setShowEpisodeList(false);
                    }
                  }}
                  className="w-full mt-1 px-3 py-2 bg-[#333] text-white rounded border-0 text-sm"
                >
                  {seasons
                    .find(s => s.season_number === selectedSeason)
                    ?.episodes.map(episode => (
                      <option key={episode.id} value={episode.id}>
                        E{episode.episode_number}: {episode.title}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {currentEpisode && (
            <div className="p-4 border-b border-white/10">
              <div className="bg-white/5 rounded-lg p-3">
                <span className="text-white font-semibold">
                  S{currentEpisode.season_number}E{currentEpisode.episode_number}: {currentEpisode.title}
                </span>
                <div className="text-gray-400 text-sm mt-1">
                  {sources.length} źródeł
                </div>
              </div>
            </div>
          )}

          <div className="p-4 space-y-2">
            {seasons
              .find(s => s.season_number === selectedSeason)
              ?.episodes.map(episode => (
                <button
                  key={episode.id}
                  onClick={() => {
                    onEpisodeChange?.(episode);
                    setShowEpisodeList(false);
                  }}
                  className={`w-full text-left p-3 rounded transition ${
                    currentEpisode?.id === episode.id
                      ? 'bg-red-600/20 border border-red-600'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span className="text-white/80 text-sm">
                    E{episode.episode_number}: {episode.title}
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && !useIframe && (
        <div className="absolute top-16 right-4 w-64 bg-black/95 rounded-lg overflow-hidden z-50">
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-white font-bold">Ustawienia</h3>
            <button 
              onClick={() => setShowSettings(false)}
              className="text-white/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-3 space-y-3">
            <div>
              <label className="text-white/60 text-sm">Prędkość odtwarzania</label>
              <select
                className="w-full mt-1 px-3 py-2 bg-white/10 text-white rounded border-0"
                onChange={(e) => {
                  if (videoRef.current) {
                    videoRef.current.playbackRate = parseFloat(e.target.value);
                  }
                }}
                defaultValue="1"
              >
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1">1x (Normalna)</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Priority order for language versions (lektor/dubbing first)
const LANGUAGE_PRIORITY: Record<string, number> = {
  'lektor': 1,
  'lektor pl': 1,
  'dubbing': 2,
  'dubbing pl': 2,
  'pl': 3,
  'napisy': 4,
  'napisy pl': 4,
  'eng': 5,
  'en': 5,
};

function getLanguagePriority(language: string | undefined): number {
  if (!language) return 99;
  const normalized = language.toLowerCase().trim();
  return LANGUAGE_PRIORITY[normalized] ?? 50;
}

// Source Menu Component
function SourceMenu({ 
  sources, 
  currentIndex, 
  onSelect, 
  onClose,
  direction = 'down' // 'up' for bottom bar, 'down' for top bar (iframe)
}: { 
  sources: VideoSource[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
  direction?: 'up' | 'down';
}) {
  // Sort sources by language priority (lektor/dubbing first)
  const sortedSources = sources.map((source, index) => ({ source, index }))
    .sort((a, b) => getLanguagePriority(a.source.language) - getLanguagePriority(b.source.language));

  const groupedSources: Record<string, { source: VideoSource; index: number }[]> = {};
  sortedSources.forEach(({ source, index }) => {
    const hosting = source.hosting || 'unknown';
    if (!groupedSources[hosting]) {
      groupedSources[hosting] = [];
    }
    groupedSources[hosting].push({ source, index });
  });

  // Position classes based on direction - using right-0 so menu expands leftward and doesn't overflow screen
  const positionClasses = direction === 'up' 
    ? 'bottom-full right-0 mb-2' // Opens upward (for bottom bar)
    : 'top-full right-0 mt-2';   // Opens downward (for top bar/iframe)

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      
      <div className={`absolute ${positionClasses} w-72 bg-black/95 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto border border-white/20`}>
        <div className="p-3 border-b border-white/10">
          <h4 className="text-white font-semibold">Wybierz źródło</h4>
        </div>
        
        <div className="p-2">
          {Object.entries(groupedSources).map(([hosting, items]) => (
            <div key={hosting} className="mb-2">
              <div className="text-gray-400 text-xs uppercase px-2 py-1 flex items-center gap-2">
                <Monitor className="w-3 h-3" />
                {hosting}
                {isRestreamSupported(hosting) && (
                  <span className="text-green-500 text-[10px]">(Restream)</span>
                )}
              </div>
              
              {items.map(({ source, index }) => (
                <button
                  key={index}
                  onClick={() => onSelect(index)}
                  className={`w-full text-left px-3 py-2 rounded transition flex items-center justify-between ${
                    index === currentIndex
                      ? 'bg-red-600 text-white'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <span className="text-sm">
                    {source.quality || 'Unknown'} • {source.language || 'PL'}
                  </span>
                  {index === currentIndex && (
                    <span className="text-xs">▶</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
