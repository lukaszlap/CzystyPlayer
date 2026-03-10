'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { StreamingNavbar } from '@/components/layout/StreamingNavbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sparkles,
  Search,
  Film,
  Tv,
  Layers,
  Star,
  Clock,
  Trash2,
  ChevronDown,
  Loader2,
  Wand2,
  History,
  X,
  Shuffle,
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

type ContentType = 'all' | 'movies' | 'series';

const STORAGE_KEY = 'ai-recommendations-history';
const MAX_HISTORY_ITEMS = 20;

// Helper to get auth token from zustand persist storage
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const authStore = localStorage.getItem('auth-storage');
    if (authStore) {
      const parsed = JSON.parse(authStore);
      // Zustand persist stores data in state.tokens.accessToken
      return parsed?.state?.tokens?.accessToken || null;
    }
  } catch {
    return null;
  }
  return null;
}

// Example searches for inspiration
const exampleSearches = [
  'Harry Potter',
  'Breaking Bad',
  'Stranger Things',
  'Władca Pierścieni',
  'Game of Thrones',
  'Interstellar',
  'The Witcher',
  'Inception',
];

export default function AIRecommendationsPage() {
  const [query, setQuery] = useState('');
  const [contentType, setContentType] = useState<ContentType>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<ContentRecommendation[]>([]);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isContentTypeOpen, setIsContentTypeOpen] = useState(false);
  const [currentSearchId, setCurrentSearchId] = useState<string | null>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SearchHistoryItem[];
        setHistory(parsed);
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  }, []);

  // Save history to localStorage and database
  const saveHistory = useCallback(async (newHistory: SearchHistoryItem[]) => {
    try {
      // Always save to localStorage as fallback
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory.slice(0, MAX_HISTORY_ITEMS)));
      setHistory(newHistory.slice(0, MAX_HISTORY_ITEMS));
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  }, []);

  // Save to database for authenticated users
  const saveToDatabase = useCallback(async (
    searchQuery: string, 
    searchType: ContentType, 
    recs: ContentRecommendation[], 
    message: string | null
  ) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      await fetch('/api/user/ai-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: searchQuery,
          contentType: searchType,
          aiMessage: message,
          recommendations: recs.map(rec => ({
            id: rec.id,
            type: rec.type,
            title: rec.title,
            posterPath: rec.posterPath,
            year: rec.year,
            rating: rec.rating,
            categories: rec.categories,
            matchScore: rec.matchScore,
            matchReason: rec.matchReason,
          })),
        }),
      });
    } catch (e) {
      console.error('Failed to save to database:', e);
    }
  }, []);

  // Handle search
  const handleSearch = async (searchQuery?: string, searchType?: ContentType) => {
    const q = searchQuery || query;
    const type = searchType || contentType;

    if (!q.trim()) {
      setError('Wpisz tytuł filmu lub serialu');
      return;
    }

    setIsLoading(true);
    setError(null);
    setRecommendations([]);
    setAiMessage(null);

    try {
      const response = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, contentType: type }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Wystąpił błąd');
      }

      setRecommendations(data.recommendations || []);
      setAiMessage(data.aiMessage || null);
      setCurrentSearchId(data.searchId);

      // Save to database for authenticated users
      await saveToDatabase(q, type, data.recommendations || [], data.aiMessage || null);

      // Save to history (localStorage)
      const historyItem: SearchHistoryItem = {
        id: data.searchId,
        query: q,
        contentType: type,
        timestamp: Date.now(),
        recommendations: data.recommendations || [],
        aiMessage: data.aiMessage,
      };

      // Check if same query exists, update it
      const existingIndex = history.findIndex(
        h => h.query.toLowerCase() === q.toLowerCase() && h.contentType === type
      );

      let newHistory: SearchHistoryItem[];
      if (existingIndex >= 0) {
        newHistory = [historyItem, ...history.filter((_, i) => i !== existingIndex)];
      } else {
        newHistory = [historyItem, ...history];
      }

      saveHistory(newHistory);
    } catch (e) {
      console.error('Search error:', e);
      setError(e instanceof Error ? e.message : 'Wystąpił nieoczekiwany błąd');
    } finally {
      setIsLoading(false);
    }
  };

  // Load from history
  const loadFromHistory = (item: SearchHistoryItem) => {
    setQuery(item.query);
    setContentType(item.contentType);
    setRecommendations(item.recommendations);
    setAiMessage(item.aiMessage || null);
    setCurrentSearchId(item.id);
    setShowHistory(false);
    setError(null);
  };

  // Delete history item
  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newHistory = history.filter(h => h.id !== id);
    saveHistory(newHistory);
  };

  // Clear all history
  const clearHistory = () => {
    saveHistory([]);
    setShowHistory(false);
  };

  // Random example
  const setRandomExample = () => {
    const random = exampleSearches[Math.floor(Math.random() * exampleSearches.length)];
    setQuery(random);
  };

  // Content type labels
  const contentTypeLabels: Record<ContentType, string> = {
    all: 'Filmy i Seriale',
    movies: 'Tylko Filmy',
    series: 'Tylko Seriale',
  };

  const contentTypeIcons: Record<ContentType, React.ReactNode> = {
    all: <Layers className="w-4 h-4" />,
    movies: <Film className="w-4 h-4" />,
    series: <Tv className="w-4 h-4" />,
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <StreamingNavbar variant="browse" />

      <main className="pt-20 pb-16">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-b from-red-900/20 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-red-500/10 via-transparent to-transparent" />

          <div className="relative max-w-4xl mx-auto px-4 py-12 md:py-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E50914]/20 border border-[#E50914]/30 mb-6">
                <Sparkles className="w-4 h-4 text-[#E50914]" />
                <span className="text-sm text-red-300">Napędzane przez AI</span>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Rekomendacje <span className="text-[#E50914]">AI</span>
              </h1>

              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Podaj tytuł swojego ulubionego filmu lub serialu, a zaproponuję Ci podobne materiały
              </p>
            </motion.div>

            {/* Search Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800 p-6 shadow-xl"
            >
              {/* Query Input */}
              <div className="mb-4">
                <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <Search className="w-4 h-4" />
                  Czego szukasz?
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSearch()}
                    placeholder="np. Harry Potter, Breaking Bad..."
                    className="w-full h-14 pl-4 pr-12 text-lg bg-gray-800/50 border-gray-700 focus:border-purple-500 rounded-xl"
                    disabled={isLoading}
                  />
                  <button
                    onClick={setRandomExample}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white transition-colors"
                    title="Losowy przykład"
                    type="button"
                  >
                    <Shuffle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content Type Selector */}
              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <Layers className="w-4 h-4" />
                  Typ treści
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsContentTypeOpen(!isContentTypeOpen)}
                    className="w-full h-12 px-4 flex items-center justify-between bg-gray-800/50 border border-gray-700 hover:border-gray-600 rounded-xl transition-colors"
                    disabled={isLoading}
                  >
                    <span className="flex items-center gap-3">
                      {contentTypeIcons[contentType]}
                      {contentTypeLabels[contentType]}
                    </span>
                    <ChevronDown className={`w-5 h-5 transition-transform ${isContentTypeOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isContentTypeOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-20 w-full mt-2 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-xl"
                      >
                        {(Object.keys(contentTypeLabels) as ContentType[]).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              setContentType(type);
                              setIsContentTypeOpen(false);
                            }}
                            className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-700/50 transition-colors ${
                              contentType === type ? 'bg-[#E50914]/20 text-red-300' : ''
                            }`}
                          >
                            {contentTypeIcons[type]}
                            {contentTypeLabels[type]}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => handleSearch()}
                  disabled={isLoading || !query.trim()}
                  className="flex-1 h-14 text-lg bg-[#E50914] hover:bg-[#f40612] border-0 rounded-xl"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Szukam...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5 mr-2" />
                      Szukaj z AI
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setShowHistory(!showHistory)}
                  className="h-14 px-6 border-gray-700 hover:bg-gray-800 rounded-xl"
                  disabled={history.length === 0}
                >
                  <History className="w-5 h-5 mr-2" />
                  Historia ({history.length})
                </Button>
              </div>

              {/* Example tags */}
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-sm text-gray-500">Przykłady:</span>
                {exampleSearches.slice(0, 6).map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => {
                      setQuery(example);
                    }}
                    className="px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* History Panel */}
            <AnimatePresence>
              {showHistory && history.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800 overflow-hidden"
                >
                  <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-400" />
                      Ostatnio szukałeś
                    </h3>
                    <button
                      onClick={clearHistory}
                      className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Wyczyść
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => loadFromHistory(item)}
                        className="px-4 py-3 hover:bg-gray-800/50 cursor-pointer flex items-center justify-between group transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {item.contentType === 'movies' ? (
                            <Film className="w-4 h-4 text-gray-500" />
                          ) : item.contentType === 'series' ? (
                            <Tv className="w-4 h-4 text-gray-500" />
                          ) : (
                            <Layers className="w-4 h-4 text-gray-500" />
                          )}
                          <div>
                            <span className="text-white">{item.query}</span>
                            <span className="ml-2 text-xs text-gray-500">
                              {item.recommendations.length} wyników
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {new Date(item.timestamp).toLocaleDateString('pl-PL')}
                          </span>
                          <button
                            onClick={(e) => deleteHistoryItem(item.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto px-4 mb-8"
            >
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-center text-red-300">
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Section */}
        <AnimatePresence mode="wait">
          {recommendations.length > 0 && (
            <motion.div
              key={currentSearchId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-7xl mx-auto px-4"
            >
              {/* Results Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#E50914]/20 border border-[#E50914]/30">
                    <Sparkles className="w-4 h-4 text-[#E50914]" />
                    <span className="text-red-300">
                      ZNALEZIONO: {recommendations.length} ({Math.max(...recommendations.map(r => r.matchScore || 0))}%)
                    </span>
                  </div>
                </div>

                {aiMessage && (
                  <p className="text-gray-400 text-sm max-w-md hidden md:block">
                    {aiMessage}
                  </p>
                )}
              </div>

              {/* AI Message on mobile */}
              {aiMessage && (
                <p className="text-gray-400 text-sm mb-6 md:hidden">
                  {aiMessage}
                </p>
              )}

              {/* Results Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {recommendations.map((item, index) => (
                  <motion.div
                    key={`${item.type}-${item.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={item.type === 'movie' ? `/movies/${item.id}` : `/series/${item.id}`}
                      className="block group relative"
                    >
                      {/* Match Score Badge */}
                      {item.matchScore && (
                        <div className="absolute top-2 right-2 z-10 px-2 py-1 rounded bg-[#E50914] text-white text-xs font-bold shadow-lg">
                          {item.matchScore}% match
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
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
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

        {/* Empty State */}
        {!isLoading && recommendations.length === 0 && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-md mx-auto px-4 py-16 text-center"
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#E50914]/20 flex items-center justify-center">
              <Wand2 className="w-12 h-12 text-[#E50914]" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Odkryj nowe treści</h2>
            <p className="text-gray-400">
              Wpisz tytuł filmu lub serialu który lubisz, a AI znajdzie dla Ciebie podobne rekomendacje.
            </p>
          </motion.div>
        )}

        {/* Loading State */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-md mx-auto px-4 py-16 text-center"
          >
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full bg-[#E50914]/30 animate-pulse" />
              <div className="absolute inset-2 rounded-full bg-gray-900 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-[#E50914] animate-spin" />
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-2">AI analizuje Twoje preferencje...</h2>
            <p className="text-gray-400">
              Przeszukuję bazę danych i dobieram najlepsze rekomendacje
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
