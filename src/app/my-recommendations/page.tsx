'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StreamingNavbar } from '@/components/layout/StreamingNavbar';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/hooks/useAuth';
import {
  Sparkles,
  Film,
  Tv,
  Star,
  Clock,
  Trash2,
  X,
  Wand2,
  ChevronRight,
  LogIn,
} from 'lucide-react';

// Types
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

interface SearchHistoryItem {
  id: string;
  query: string;
  contentType: 'movies' | 'series' | 'all';
  timestamp: number;
  recommendations: ContentRecommendation[];
  aiMessage?: string;
}

export default function MyRecommendationsPage() {
  const router = useRouter();
  const { isAuthenticated, tokens } = useAuthStore();
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [selectedSearch, setSelectedSearch] = useState<SearchHistoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get access token
  const accessToken = tokens?.accessToken || null;

  // Load recommendations from database
  useEffect(() => {
    // Wait for hydration
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    if (!authChecked) return;

    const loadRecommendations = async () => {
      if (isAuthenticated && accessToken) {
        // Load from database for authenticated users
        try {
          const res = await fetch('/api/user/ai-recommendations?limit=50', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const data = await res.json();
          
          if (data.success && data.searches) {
            const mapped: SearchHistoryItem[] = data.searches.map((search: any) => ({
              id: String(search.id),
              query: search.query,
              contentType: search.content_type,
              timestamp: new Date(search.searched_at).getTime(),
              aiMessage: search.ai_message,
              recommendations: search.recommendations.map((rec: any) => ({
                id: rec.content_id,
                title: rec.title,
                year: rec.year,
                rating: rec.rating,
                categories: rec.categories,
                posterPath: rec.poster_path || '/images/placeholder-poster.jpg',
                type: rec.content_type,
                matchScore: rec.match_score,
                matchReason: rec.match_reason,
                countries: null,
                description: null,
              })),
            }));
            setHistory(mapped);
            if (mapped.length > 0) {
              setSelectedSearch(mapped[0]);
            }
          }
        } catch (e) {
          console.error('Failed to load from database:', e);
          setError('Błąd ładowania rekomendacji');
        }
      }
      
      setIsLoading(false);
    };

    loadRecommendations();
  }, [authChecked, isAuthenticated, accessToken]);

  // Delete history item
  const deleteHistoryItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isAuthenticated && accessToken) {
      // Delete from database
      try {
        await fetch(`/api/user/ai-recommendations?searchId=${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } catch (e) {
        console.error('Error deleting from database:', e);
      }
    } else {
      // Delete from localStorage
      const stored = localStorage.getItem('ai-recommendations-history');
      if (stored) {
        const parsed = JSON.parse(stored);
        const filtered = parsed.filter((h: any) => h.id !== id);
        localStorage.setItem('ai-recommendations-history', JSON.stringify(filtered));
      }
    }
    
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    
    if (selectedSearch?.id === id) {
      setSelectedSearch(newHistory.length > 0 ? newHistory[0] : null);
    }
  };

  // Clear all history
  const clearAllHistory = async () => {
    if (isAuthenticated && accessToken) {
      // Clear from database
      try {
        await fetch('/api/user/ai-recommendations?clearAll=true', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } catch (e) {
        console.error('Error clearing database:', e);
      }
    }
    
    setHistory([]);
    setSelectedSearch(null);
  };

  // Get all unique recommendations from all searches
  const allRecommendations = history.reduce<ContentRecommendation[]>((acc, item) => {
    item.recommendations.forEach(rec => {
      if (!acc.some(r => r.id === rec.id && r.type === rec.type)) {
        acc.push(rec);
      }
    });
    return acc;
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#141414] text-white">
        <StreamingNavbar variant="browse" />
        <div className="pt-24 flex justify-center">
          <div className="animate-pulse text-gray-400">Ładowanie...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <StreamingNavbar variant="browse" />

      <main className="pt-20 pb-16">
        {/* Header */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-[#E50914]/20">
                  <Sparkles className="w-6 h-6 text-[#E50914]" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold">Moje Rekomendacje</h1>
              </div>
              <p className="text-gray-400">
                Twoje spersonalizowane rekomendacje wygenerowane przez AI
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => router.push('/ai-suggestions')}
                className="bg-[#E50914] hover:bg-[#f40612]"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Nowe wyszukiwanie
              </Button>
              {history.length > 0 && (
                <Button
                  variant="outline"
                  onClick={clearAllHistory}
                  className="border-gray-700 hover:bg-gray-800 text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Wyczyść wszystko
                </Button>
              )}
            </div>
          </div>

          {/* Not authenticated message - only show when user is NOT authenticated and auth was checked */}
          {authChecked && !isAuthenticated && history.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#E50914]/20 flex items-center justify-center">
                <LogIn className="w-12 h-12 text-[#E50914]" />
              </div>
              <h2 className="text-2xl font-semibold mb-3">Zaloguj się</h2>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Zaloguj się, aby zapisywać swoje rekomendacje AI i mieć do nich dostęp z każdego urządzenia.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => router.push('/auth/login')}
                  className="bg-[#E50914] hover:bg-[#f40612]"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Zaloguj się
                </Button>
                <Button
                  onClick={() => router.push('/ai-suggestions')}
                  variant="outline"
                  className="border-gray-700"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  Szukaj bez logowania
                </Button>
              </div>
            </motion.div>
          )}

          {/* Empty state for authenticated users */}
          {authChecked && isAuthenticated && history.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#E50914]/20 flex items-center justify-center">
                <Wand2 className="w-12 h-12 text-[#E50914]" />
              </div>
              <h2 className="text-2xl font-semibold mb-3">Brak rekomendacji</h2>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Nie masz jeszcze żadnych zapisanych rekomendacji. Użyj naszego AI, aby odkryć nowe filmy i seriale!
              </p>
              <Button
                onClick={() => router.push('/ai-suggestions')}
                className="bg-[#E50914] hover:bg-[#f40612]"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Rozpocznij wyszukiwanie AI
              </Button>
            </motion.div>
          )}

          {/* Content */}
          {history.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Sidebar - Search History */}
              <div className="lg:col-span-1">
                <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden sticky top-24">
                  <div className="p-4 border-b border-gray-800">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#E50914]" />
                      Historia wyszukiwań
                    </h3>
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedSearch(item)}
                        className={`px-4 py-3 cursor-pointer flex items-center justify-between group transition-colors ${
                          selectedSearch?.id === item.id
                            ? 'bg-[#E50914]/20 border-l-2 border-[#E50914]'
                            : 'hover:bg-gray-800/50'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {item.contentType === 'movies' ? (
                              <Film className="w-3 h-3 text-gray-500 flex-shrink-0" />
                            ) : item.contentType === 'series' ? (
                              <Tv className="w-3 h-3 text-gray-500 flex-shrink-0" />
                            ) : (
                              <Sparkles className="w-3 h-3 text-gray-500 flex-shrink-0" />
                            )}
                            <span className="text-sm font-medium truncate">{item.query}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {item.recommendations.length} wyników • {new Date(item.timestamp).toLocaleDateString('pl-PL')}
                          </div>
                        </div>
                        <button
                          onClick={(e) => deleteHistoryItem(item.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main Content - Recommendations */}
              <div className="lg:col-span-3">
                <AnimatePresence mode="wait">
                  {selectedSearch && (
                    <motion.div
                      key={selectedSearch.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      {/* Selected search header */}
                      <div className="mb-6">
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                          <span>Rekomendacje dla:</span>
                          <span className="text-white font-medium">&quot;{selectedSearch.query}&quot;</span>
                        </div>
                        {selectedSearch.aiMessage && (
                          <p className="text-gray-400 text-sm">{selectedSearch.aiMessage}</p>
                        )}
                      </div>

                      {/* Recommendations Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {selectedSearch.recommendations.map((item, index) => (
                          <motion.div
                            key={`${item.type}-${item.id}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                          >
                            <Link
                              href={item.type === 'movie' ? `/movies/${item.id}` : `/series/${item.id}`}
                              className="block group relative"
                            >
                              {/* Match Score Badge */}
                              {item.matchScore && (
                                <div className="absolute top-2 right-2 z-10 px-2 py-1 rounded bg-[#E50914] text-white text-xs font-bold shadow-lg">
                                  {item.matchScore}%
                                </div>
                              )}

                              {/* Content Type Badge */}
                              <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded bg-black/70 text-white text-xs flex items-center gap-1">
                                {item.type === 'movie' ? (
                                  <>
                                    <Film className="w-3 h-3" />
                                    Film
                                  </>
                                ) : (
                                  <>
                                    <Tv className="w-3 h-3" />
                                    Serial
                                  </>
                                )}
                              </div>

                              {/* Poster */}
                              <div className="aspect-2/3 relative rounded-lg overflow-hidden bg-gray-800 mb-2">
                                <Image
                                  src={item.posterPath}
                                  alt={item.title}
                                  fill
                                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/images/placeholder-poster.jpg';
                                  }}
                                />
                                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>

                              {/* Title & Info */}
                              <div className="space-y-1">
                                <h3 className="font-medium text-sm line-clamp-2 group-hover:text-[#E50914] transition-colors">
                                  {item.title}
                                </h3>

                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  {item.year && <span>{item.year}</span>}
                                  {item.rating && (
                                    <span className="flex items-center gap-1 text-yellow-500">
                                      <Star className="w-3 h-3 fill-current" />
                                      {Number(item.rating).toFixed(1)}
                                    </span>
                                  )}
                                </div>

                                {item.matchReason && (
                                  <p className="text-xs text-gray-500 line-clamp-2">
                                    {item.matchReason}
                                  </p>
                                )}
                              </div>
                            </Link>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* All Recommendations Section */}
                {allRecommendations.length > 0 && (
                  <div className="mt-12">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-[#E50914]" />
                        Wszystkie Twoje rekomendacje
                        <span className="text-sm text-gray-500 font-normal">
                          ({allRecommendations.length})
                        </span>
                      </h2>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {allRecommendations.slice(0, 15).map((item, index) => (
                        <motion.div
                          key={`all-${item.type}-${item.id}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                        >
                          <Link
                            href={item.type === 'movie' ? `/movies/${item.id}` : `/series/${item.id}`}
                            className="block group relative"
                          >
                            <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded bg-black/70 text-white text-xs flex items-center gap-1">
                              {item.type === 'movie' ? <Film className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
                            </div>

                            <div className="aspect-2/3 relative rounded-lg overflow-hidden bg-gray-800 mb-2">
                              <Image
                                src={item.posterPath}
                                alt={item.title}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                sizes="20vw"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/images/placeholder-poster.jpg';
                                }}
                              />
                            </div>

                            <h3 className="font-medium text-sm line-clamp-1 group-hover:text-[#E50914] transition-colors">
                              {item.title}
                            </h3>
                          </Link>
                        </motion.div>
                      ))}
                    </div>

                    {allRecommendations.length > 15 && (
                      <div className="text-center mt-6">
                        <Button variant="outline" className="border-gray-700">
                          Zobacz więcej ({allRecommendations.length - 15} pozostało)
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
