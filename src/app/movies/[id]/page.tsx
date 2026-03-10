'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Plus, Check, ThumbsUp, Share2, ChevronDown, Star, Clock, Calendar, X, Copy, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StreamingNavbar } from '@/components/layout/StreamingNavbar';
import { isInMyList, toggleMyList, isLiked, toggleLike } from '@/lib/myList';

interface Movie {
  id: number;
  title: string;
  slug: string;
  year?: string;
  description?: string;
  rating?: number;
  duration?: number;
  posterPath?: string;
  backgroundPath?: string;
  categories?: string;
  countries?: string;
  directors?: string;
  screenplay?: string;
  source_count?: number;
}

interface MovieSource {
  id: number;
  url: string;
  hosting: string;
  quality: string;
  language: string;
}

export default function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const movieId = params.id as string;

  const [movie, setMovie] = useState<Movie | null>(null);
  const [sources, setSources] = useState<MovieSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllSources, setShowAllSources] = useState(false);
  
  // My List and Like state
  const [inMyList, setInMyList] = useState(false);
  const [liked, setLiked] = useState(false);
  
  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/content/movies/${movieId}`);
        
        if (!res.ok) {
          throw new Error('Movie not found');
        }

        const data = await res.json();
        setMovie(data.movie);
        setSources(data.sources || []);
        
        // Check if movie is in my list or liked
        setInMyList(isInMyList(data.movie.id, 'movie'));
        setLiked(isLiked(data.movie.id, 'movie'));
      } catch (err) {
        console.error('Error fetching movie:', err);
        setError(err instanceof Error ? err.message : 'Failed to load movie');
      } finally {
        setLoading(false);
      }
    };

    if (movieId) {
      fetchMovie();
    }
  }, [movieId]);

  const handlePlay = () => {
    router.push(`/watch/movie/${movieId}`);
  };

  const handleToggleMyList = () => {
    if (!movie) return;
    const added = toggleMyList({
      id: movie.id,
      type: 'movie',
      title: movie.title,
      posterPath: movie.posterPath,
      year: movie.year,
      rating: movie.rating,
    });
    setInMyList(added);
  };

  const handleToggleLike = () => {
    if (!movie) return;
    const nowLiked = toggleLike(movie.id, 'movie');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414] text-white flex items-center justify-center">
        <div className="animate-pulse text-xl">Loading...</div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="min-h-screen bg-[#141414] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-4">{error || 'Movie not found'}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <StreamingNavbar variant="browse" />

      {/* Hero Section */}
      <section className="relative h-[70vh] md:h-[80vh]">
        {/* Background */}
        <div className="absolute inset-0">
          {movie.backgroundPath ? (
            <Image
              src={movie.backgroundPath.startsWith('/') ? movie.backgroundPath : `/${movie.backgroundPath}`}
              alt={movie.title}
              fill
              className="object-cover object-center"
              priority
            />
          ) : movie.posterPath ? (
            <Image
              src={movie.posterPath.startsWith('/') ? movie.posterPath : `/${movie.posterPath}`}
              alt={movie.title}
              fill
              className="object-contain object-center"
              priority
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
            <h1 className="text-4xl md:text-6xl font-black mb-4">{movie.title}</h1>
            
            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
              {movie.rating != null && !isNaN(Number(movie.rating)) && (
                <span className="flex items-center gap-1 text-yellow-500">
                  <Star className="w-4 h-4 fill-yellow-500" />
                  {Number(movie.rating).toFixed(1)}
                </span>
              )}
              {movie.year && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {movie.year}
                </span>
              )}
              {movie.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {Math.floor(movie.duration / 60)}h {movie.duration % 60}min
                </span>
              )}
              <span className="px-2 py-0.5 border border-gray-400 text-xs">HD</span>
              <span className="px-2 py-0.5 border border-gray-400 text-xs">16+</span>
            </div>

            {/* Description */}
            {movie.description && (
              <p className="text-gray-200 mb-6 line-clamp-4 md:line-clamp-none max-w-2xl">
                {movie.description}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 mb-6">
              <Button 
                onClick={handlePlay}
                className="bg-white text-black hover:bg-gray-200 text-lg px-8 py-6 font-semibold"
                disabled={sources.length === 0}
              >
                <Play className="mr-2 h-6 w-6 fill-black" /> Odtwórz
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

            {/* Categories/Genre */}
            {movie.categories && (
              <div className="flex flex-wrap gap-2 text-sm text-gray-300">
                {movie.categories.split(',').map((cat, idx) => (
                  <span key={idx} className="bg-white/10 px-3 py-1 rounded-full">
                    {cat.trim()}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Details Section */}
      <div className="px-4 md:px-12 py-8 -mt-20 relative z-10">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Left - Poster */}
          <div className="hidden md:block">
            {movie.posterPath && (
              <div className="relative w-64 aspect-2/3 rounded-lg overflow-hidden shadow-2xl">
                <Image
                  src={movie.posterPath.startsWith('/') ? movie.posterPath : `/${movie.posterPath}`}
                  alt={movie.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}
          </div>

          {/* Right - Info */}
          <div className="md:col-span-2 space-y-6">
            {/* Credits */}
            <div className="grid sm:grid-cols-2 gap-4">
              {movie.directors && (
                <div>
                  <h4 className="text-gray-400 text-sm mb-1">Reżyser</h4>
                  <p className="text-white">{movie.directors}</p>
                </div>
              )}
              {movie.screenplay && (
                <div>
                  <h4 className="text-gray-400 text-sm mb-1">Scenariusz</h4>
                  <p className="text-white">{movie.screenplay}</p>
                </div>
              )}
              {movie.countries && (
                <div>
                  <h4 className="text-gray-400 text-sm mb-1">Kraj produkcji</h4>
                  <p className="text-white">{movie.countries}</p>
                </div>
              )}
            </div>

            {/* Sources Info */}
            {sources.length > 0 && (
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="text-lg font-semibold mb-3 flex items-center justify-between">
                  <span>Dostępne źródła ({sources.length})</span>
                  {sources.length > 3 && (
                    <button
                      onClick={() => setShowAllSources(!showAllSources)}
                      className="text-sm text-gray-400 hover:text-white flex items-center"
                    >
                      {showAllSources ? 'Pokaż mniej' : 'Pokaż wszystkie'}
                      <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showAllSources ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </h4>
                <div className="grid gap-2">
                  {(showAllSources ? sources : sources.slice(0, 3)).map((source, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between bg-white/5 rounded px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                          {source.hosting?.toUpperCase() || 'VOE'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {source.quality || 'HD'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {source.language || 'PL'}
                        </span>
                      </div>
                      <Button 
                        size="sm"
                        onClick={handlePlay}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Play className="w-4 h-4 mr-1" /> Odtwórz
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sources.length === 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-yellow-500">
                Brak dostępnych źródeł dla tego filmu. Sprawdź później.
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
      <footer className="py-8 px-4 md:px-12 mt-16 border-t border-gray-800">
        <p className="text-gray-600 text-sm">© 2024 CzystyPlayer Polska</p>
      </footer>
    </div>
  );
}
