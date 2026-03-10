'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Play, Plus, ThumbsUp, ChevronDown, ChevronLeft, ChevronRight, Loader2, Search, X, Info, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StreamingNavbar } from '@/components/layout/StreamingNavbar';
import { useAuthStore } from '@/hooks/useAuth';

// Placeholder images
const PLACEHOLDER_POSTER = '/images/imgPoster/placeholder.jpg';
const PLACEHOLDER_BACKGROUND = '/images/backgrounds/placeholder.jpg';

// Types
interface Movie {
  id: number;
  title: string;
  posterPath?: string;
  backgroundPath?: string;
  year?: string;
  rating?: number;
  categories?: string;
  countries?: string;
  description?: string;
}

// Default filter options (fallback)
const defaultGenres = ['Wszystkie gatunki'];
const defaultCountries = ['Wszystkie kraje'];
const defaultYears = ['Wszystkie lata'];

const sortOptions = [
  'Data dodania', 'Rok produkcji', 'Alfabetycznie A-Z', 
  'Alfabetycznie Z-A', 'Ocena: od najwyższej', 'Ocena: od najniższej'
];

// Default hero for fallback
const defaultHero: Movie = {
  id: 64516,
  title: 'Nosferatu',
  description: 'Gotycka opowieść o nawiedzeniu młodej kobiety przez starożytnego transylwańskiego wampira, która sięga ponad granice przerażających namiętności.',
  backgroundPath: '/images/backgrounds/nosferatu_2024_background.jpg',
  posterPath: '/images/imgPoster/64516_Nosferatu.jpg',
  year: '2024',
  rating: 8.5,
};

// Dropdown Component
function FilterDropdown({ 
  label, 
  options, 
  value, 
  onChange 
}: { 
  label: string; 
  options: string[]; 
  value: string; 
  onChange: (value: string) => void 
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-gray-700 rounded hover:bg-[#2a2a2a] transition-colors min-w-[150px]"
      >
        <span className="text-sm text-gray-400">{label}:</span>
        <span className="text-sm font-medium truncate">{value}</span>
        <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-56 bg-[#1a1a1a] border border-gray-700 rounded-md shadow-xl z-50 max-h-64 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-[#333] transition-colors ${
                  value === option ? 'bg-[#333] text-[#E50914]' : ''
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Movie Card Component
const MovieCard = memo(function MovieCard({ movie, priority = false }: { movie: Movie; priority?: boolean }) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [imgSrc, setImgSrc] = useState(movie.posterPath || PLACEHOLDER_POSTER);

  const handlePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/watch/movie/${movie.id}`);
  }, [router, movie.id]);

  const handleClick = useCallback(() => {
    router.push(`/movies/${movie.id}`);
  }, [router, movie.id]);

  const handleImageError = useCallback(() => {
    setImgSrc(PLACEHOLDER_POSTER);
  }, []);

  return (
    <div
      className="relative group cursor-pointer transition-transform duration-200 hover:scale-105 hover:z-10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <div className="relative aspect-2/3 rounded-md overflow-hidden bg-gray-800">
        <Image
          src={imgSrc}
          alt={movie.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 16vw"
          priority={priority}
          onError={handleImageError}
        />

        {/* Hover overlay */}
        {isHovered && (
          <div className="absolute inset-0 bg-linear-to-t from-black via-black/60 to-transparent flex flex-col justify-end p-4">
            <div className="flex gap-2 mb-3">
              <button 
                onClick={handlePlay}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-200"
              >
                <Play className="h-5 w-5 text-black fill-black" />
              </button>
              <button className="w-10 h-10 border-2 border-gray-400 rounded-full flex items-center justify-center hover:border-white">
                <Plus className="h-5 w-5" />
              </button>
              <button className="w-10 h-10 border-2 border-gray-400 rounded-full flex items-center justify-center hover:border-white">
                <ThumbsUp className="h-5 w-5" />
              </button>
            </div>
            <h3 className="text-sm font-semibold mb-1">{movie.title}</h3>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {movie.rating && <span className="text-green-500">{Math.round(movie.rating * 10)}% zgodność</span>}
              {movie.year && <span>{movie.year}</span>}
              {movie.categories && <span className="px-1 border border-gray-500 truncate max-w-20">{movie.categories.split(',')[0]}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

// Rank Card Component for Top 10
const RankCard = memo(function RankCard({ 
  movie, 
  rank, 
  onClick
}: { 
  movie: Movie; 
  rank: number; 
  onClick: () => void;
}) {
  const [imgSrc, setImgSrc] = useState(movie.posterPath || PLACEHOLDER_POSTER);
  
  const handleImageError = useCallback(() => {
    setImgSrc(PLACEHOLDER_POSTER);
  }, []);

  return (
    <div 
      className="shrink-0 relative group cursor-pointer"
      onClick={onClick}
    >
      <span 
        className="absolute -left-2 bottom-0 text-[6rem] font-black z-10 leading-none select-none"
        style={{
          WebkitTextStroke: '3px #E50914',
          color: 'transparent',
          textShadow: '3px 3px 0 #000',
        }}
      >
        {rank}
      </span>
      <div className="relative w-28 md:w-36 aspect-2/3 ml-10 rounded overflow-hidden bg-gray-800">
        <Image
          src={imgSrc}
          alt={movie.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 112px, 144px"
          onError={handleImageError}
        />
      </div>
    </div>
  );
});

// Carousel Component
const Carousel = memo(function Carousel({ 
  title, 
  items,
  showRank = false
}: { 
  title: string; 
  items: Movie[];
  showRank?: boolean;
}) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollButtons = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  }, []);

  useEffect(() => {
    updateScrollButtons();
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', updateScrollButtons);
      return () => ref.removeEventListener('scroll', updateScrollButtons);
    }
  }, [updateScrollButtons, items]);

  const handleRankCardClick = useCallback((id: number) => {
    router.push(`/movies/${id}`);
  }, [router]);

  if (items.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-xl md:text-2xl font-bold mb-4 px-4 md:px-12">{title}</h2>
      
      <div className="relative group">
        {canScrollLeft && (
          <button 
            className="absolute left-0 top-0 bottom-0 z-20 w-12 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            onClick={() => scroll('left')}
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
        )}

        <div 
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto px-4 md:px-12 pb-4 no-scrollbar scroll-smooth"
        >
          {showRank ? (
            items.slice(0, 10).map((item, idx) => (
              <RankCard 
                key={item.id}
                movie={item}
                rank={idx + 1}
                onClick={() => handleRankCardClick(item.id)}
              />
            ))
          ) : (
            items.map((item, idx) => (
              <div key={item.id} className="shrink-0 w-40 md:w-48">
                <MovieCard movie={item} priority={idx < 6} />
              </div>
            ))
          )}
        </div>

        {canScrollRight && (
          <button 
            className="absolute right-0 top-0 bottom-0 z-20 w-12 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            onClick={() => scroll('right')}
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        )}
      </div>
    </section>
  );
});

// Hero Section Component
function HeroSection({ 
  movie, 
  onPlay, 
  onInfo 
}: { 
  movie: Movie; 
  onPlay: () => void; 
  onInfo: () => void;
}) {
  const [isMuted, setIsMuted] = useState(true);
  const [bgError, setBgError] = useState(false);
  const bgSrc = bgError ? PLACEHOLDER_BACKGROUND : (movie.backgroundPath || PLACEHOLDER_BACKGROUND);

  return (
    <section className="relative h-[70vh] md:h-[80vh]">
      <div className="absolute inset-0">
        <Image
          src={bgSrc}
          alt={movie.title}
          fill
          className="object-cover object-center"
          priority
          onError={() => setBgError(true)}
        />
        <div className="absolute inset-0 bg-linear-to-r from-black via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-t from-[#141414] via-transparent to-transparent" />
      </div>

      <div className="absolute bottom-[15%] left-4 md:left-12 z-10 max-w-xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-6xl font-black mb-4">{movie.title}</h1>
          
          <div className="flex items-center gap-3 mb-4 text-sm">
            {movie.rating && <span className="text-green-500 font-semibold">{Math.round(movie.rating * 10)}% zgodność</span>}
            {movie.year && <span>{movie.year}</span>}
            <span className="px-2 py-0.5 border border-gray-400 text-xs">16+</span>
            <span className="px-2 py-0.5 border border-gray-400 text-xs">HD</span>
          </div>

          <p className="text-gray-200 mb-6 line-clamp-3">
            {movie.description || 'Odkryj tę niesamowitą produkcję na CzystyPlayer.'}
          </p>

          <div className="flex gap-3">
            <Button 
              onClick={onPlay}
              className="bg-white text-black hover:bg-gray-200 text-lg px-8 py-6 font-semibold"
            >
              <Play className="mr-2 h-6 w-6 fill-black" /> Odtwórz
            </Button>
            <Button 
              onClick={onInfo}
              variant="outline" 
              className="bg-gray-500/70 border-0 text-white hover:bg-gray-500 text-lg px-8 py-6 font-semibold"
            >
              <Info className="mr-2 h-6 w-6" /> Więcej informacji
            </Button>
          </div>
        </motion.div>
      </div>

      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute bottom-[15%] right-4 md:right-12 z-10 w-10 h-10 rounded-full border border-white/50 flex items-center justify-center hover:border-white transition-colors"
      >
        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      <div className="absolute bottom-[15%] right-20 md:right-28 z-10 flex items-center gap-2">
        <div className="h-10 w-px bg-gray-400" />
        <span className="text-lg">16+</span>
      </div>
    </section>
  );
}

export default function MoviesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, checkAuth } = useAuthStore();
  const [selectedGenre, setSelectedGenre] = useState('Wszystkie gatunki');
  const [selectedCountry, setSelectedCountry] = useState('Wszystkie kraje');
  const [selectedYear, setSelectedYear] = useState('Wszystkie lata');
  const [selectedSort, setSelectedSort] = useState('Data dodania');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const suggestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // Browse content
  const [heroMovie, setHeroMovie] = useState<Movie>(defaultHero);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroItems, setHeroItems] = useState<Movie[]>([defaultHero]);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [mostWatched2024, setMostWatched2024] = useState<Movie[]>([]);
  const [bestMovies, setBestMovies] = useState<Movie[]>([]);
  const [randomMovies, setRandomMovies] = useState<Movie[]>([]);
  const [actionMovies, setActionMovies] = useState<Movie[]>([]);
  const [dramaMovies, setDramaMovies] = useState<Movie[]>([]);
  const [thrillerMovies, setThrillerMovies] = useState<Movie[]>([]);
  const [crimeMovies, setCrimeMovies] = useState<Movie[]>([]);
  const [scifiMovies, setScifiMovies] = useState<Movie[]>([]);
  const [familyMovies, setFamilyMovies] = useState<Movie[]>([]);
  const [natureMovies, setNatureMovies] = useState<Movie[]>([]);
  const [horrorMovies, setHorrorMovies] = useState<Movie[]>([]);
  const [romanceMovies, setRomanceMovies] = useState<Movie[]>([]);
  const [browseLoading, setBrowseLoading] = useState(true);
  
  // All movies grid (shown below carousels)
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [allMoviesPage, setAllMoviesPage] = useState(1);
  const [allMoviesHasMore, setAllMoviesHasMore] = useState(true);
  const [allMoviesLoading, setAllMoviesLoading] = useState(false);
  const [allMoviesTotal, setAllMoviesTotal] = useState(0);
  const allMoviesLoadMoreRef = useRef<HTMLDivElement>(null);
  const [showFilters, setShowFilters] = useState(true);
  
  // Dynamic filter options from database
  const [genres, setGenres] = useState<string[]>(defaultGenres);
  const [countries, setCountries] = useState<string[]>(defaultCountries);
  const [years, setYears] = useState<string[]>(defaultYears);
  const [filtersLoaded, setFiltersLoaded] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/movies');
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch browse content
  useEffect(() => {
    const fetchBrowseContent = async () => {
      try {
        setBrowseLoading(true);
        const res = await fetch('/api/content/browse?type=movies');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            // Set hero items
            const heroes = (data.hero || []).filter((h: Movie) => h.backgroundPath);
            if (heroes.length > 0) {
              setHeroItems(heroes);
              setHeroMovie(heroes[0]);
            }
            
            setTrendingMovies(data.trending || []);
            setMostWatched2024(data.mostWatched2024 || []);
            setBestMovies(data.best || []);
            setRandomMovies(data.random || []);
            setActionMovies(data.akcja || []);
            setDramaMovies(data.dramat || []);
            setThrillerMovies(data.thriller || []);
            setCrimeMovies(data.kryminal || []);
            setScifiMovies(data.scifi || []);
            setFamilyMovies(data.familijny || []);
            setNatureMovies(data.przyrodniczy || []);
            setHorrorMovies(data.horror || []);
            setRomanceMovies(data.romans || []);
          }
        }
      } catch (err) {
        console.error('Error fetching browse content:', err);
      } finally {
        setBrowseLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchBrowseContent();
    }
  }, [isAuthenticated]);

  // Auto-rotate hero content
  useEffect(() => {
    if (heroItems.length <= 1) return;
    
    const interval = setInterval(() => {
      setHeroIndex(prev => {
        const next = (prev + 1) % heroItems.length;
        setHeroMovie(heroItems[next]);
        return next;
      });
    }, 8000);
    
    return () => clearInterval(interval);
  }, [heroItems]);

  // Fetch filter options from database
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await fetch('/api/content/movies/filters');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setGenres(data.categories || defaultGenres);
            setCountries(data.countries || defaultCountries);
            setYears(data.years || defaultYears);
          }
        }
      } catch (err) {
        console.error('Error fetching filters:', err);
      } finally {
        setFiltersLoaded(true);
      }
    };
    
    if (isAuthenticated) {
      fetchFilters();
    }
  }, [isAuthenticated]);

  // Only fetch filtered results when filters are active
  const hasActiveFilters = searchQuery || selectedGenre !== 'Wszystkie gatunki' || selectedCountry !== 'Wszystkie kraje' || selectedYear !== 'Wszystkie lata';

  // Fetch all movies for grid below carousels
  const fetchAllMovies = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      setAllMoviesLoading(true);
      
      const params = new URLSearchParams();
      params.set('page', pageNum.toString());
      params.set('limit', '24');
      params.set('sortBy', 'created_at');
      params.set('sortOrder', 'DESC');

      const res = await fetch(`/api/content/movies?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const newMovies = data.movies || [];
        if (append) {
          setAllMovies(prev => [...prev, ...newMovies]);
        } else {
          setAllMovies(newMovies);
        }
        setAllMoviesTotal(data.total || 0);
        setAllMoviesHasMore(newMovies.length === 24);
      }
    } catch (err) {
      console.error('Error fetching all movies:', err);
    } finally {
      setAllMoviesLoading(false);
    }
  }, []);

  // Initial fetch for all movies grid
  useEffect(() => {
    if (isAuthenticated && !hasActiveFilters) {
      fetchAllMovies(allMoviesPage, allMoviesPage > 1);
    }
  }, [isAuthenticated, allMoviesPage, fetchAllMovies, hasActiveFilters]);

  // Infinite scroll observer for all movies
  useEffect(() => {
    if (hasActiveFilters) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && allMoviesHasMore && !allMoviesLoading) {
          setAllMoviesPage(p => p + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (allMoviesLoadMoreRef.current) {
      observer.observe(allMoviesLoadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [allMoviesHasMore, allMoviesLoading, hasActiveFilters]);

  // Fetch movies from API (for filtered results)
  const fetchMovies = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      const params = new URLSearchParams();
      params.set('page', pageNum.toString());
      params.set('limit', '24');
      
      if (searchQuery) {
        params.set('search', searchQuery);
      }
      if (selectedGenre !== 'Wszystkie gatunki') {
        params.set('category', selectedGenre);
      }
      if (selectedCountry !== 'Wszystkie kraje') {
        params.set('country', selectedCountry);
      }
      if (selectedYear !== 'Wszystkie lata') {
        params.set('year', selectedYear);
      }

      let sortBy = 'created_at';
      let sortOrder = 'DESC';
      switch (selectedSort) {
        case 'Rok produkcji': sortBy = 'year'; break;
        case 'Alfabetycznie A-Z': sortBy = 'title'; sortOrder = 'ASC'; break;
        case 'Alfabetycznie Z-A': sortBy = 'title'; sortOrder = 'DESC'; break;
        case 'Ocena: od najwyższej': sortBy = 'rating'; sortOrder = 'DESC'; break;
        case 'Ocena: od najniższej': sortBy = 'rating'; sortOrder = 'ASC'; break;
      }
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const res = await fetch(`/api/content/movies?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const newMovies = data.movies || [];
        if (append) {
          setMovies(prev => [...prev, ...newMovies]);
        } else {
          setMovies(newMovies);
        }
        setTotal(data.total || 0);
        setHasMore(newMovies.length === 24);
      }
    } catch (err) {
      console.error('Error fetching movies:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedGenre, selectedCountry, selectedYear, selectedSort, searchQuery]);

  useEffect(() => {
    if (hasActiveFilters) {
      fetchMovies(page, page > 1);
    }
  }, [page, fetchMovies, hasActiveFilters]);

  // Infinite scroll observer
  useEffect(() => {
    if (!hasActiveFilters) return;
    
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          setPage(p => p + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, loadingMore, hasActiveFilters]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
    setMovies([]);
  }, [selectedGenre, selectedCountry, selectedYear, selectedSort, searchQuery]);

  // Debounced suggestions (min 4 chars)
  useEffect(() => {
    const q = searchInput.trim();

    if (suggestTimeoutRef.current) {
      clearTimeout(suggestTimeoutRef.current);
      suggestTimeoutRef.current = null;
    }

    if (q.length < 4) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }

    suggestTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/content/suggestions?type=movies&q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.success) {
          setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
          setSuggestionsOpen(true);
        }
      } catch {
        // ignore
      }
    }, 250);

    return () => {
      if (suggestTimeoutRef.current) {
        clearTimeout(suggestTimeoutRef.current);
        suggestTimeoutRef.current = null;
      }
    };
  }, [searchInput]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setShowFilters(true);
    setSuggestionsOpen(false);
  }, [searchInput]);

  const clearSearch = useCallback(() => {
    setSearchInput('');
    setSearchQuery('');
    setSuggestions([]);
    setSuggestionsOpen(false);
  }, []);

  const handleHeroPlay = useCallback(() => {
    router.push(`/watch/movie/${heroMovie.id}`);
  }, [router, heroMovie.id]);

  const handleHeroInfo = useCallback(() => {
    router.push(`/movies/${heroMovie.id}`);
  }, [router, heroMovie.id]);

  // Show loading state while checking auth
  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#141414] text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <StreamingNavbar variant="browse" />

      {/* Hero Section */}
      {!hasActiveFilters && (
        <>
          <HeroSection 
            movie={heroMovie} 
            onPlay={handleHeroPlay} 
            onInfo={handleHeroInfo} 
          />
          
          {/* Hero Dots */}
          {heroItems.length > 1 && (
            <div className="relative -mt-16 z-20 flex justify-center gap-2 pb-8">
              {heroItems.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setHeroIndex(idx);
                    setHeroMovie(heroItems[idx]);
                  }}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === heroIndex ? 'bg-white' : 'bg-gray-500'
                  }`}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Page Title */}
      <div className="-mt-20 relative z-10 pb-4 px-4 md:px-12">
        <h1 className="text-2xl md:text-3xl font-bold">Filmy</h1>
      </div>

      {/* Carousels */}
      <div className="pb-8">
        {browseLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-red-600" />
          </div>
        ) : (
          <>
            <Carousel title="Filmy na czasie" items={trendingMovies} />
            <Carousel title="Najczęściej oglądane filmy z 2024 i 2025 roku" items={mostWatched2024} />
            <Carousel title="Najlepsze filmy z różnych krajów, gatunków i lat" items={bestMovies} />
            <Carousel title="Losowe filmy" items={randomMovies} />
            <Carousel title="Akcja" items={actionMovies} />
            <Carousel title="Dramat" items={dramaMovies} />
            <Carousel title="Thriller" items={thrillerMovies} />
            <Carousel title="Kryminał" items={crimeMovies} />
            <Carousel title="Sci-Fi" items={scifiMovies} />
            <Carousel title="Familijny" items={familyMovies} />
            <Carousel title="Przyrodniczy" items={natureMovies} />
            <Carousel title="Horror" items={horrorMovies} />
            <Carousel title="Romans" items={romanceMovies} />
          </>
        )}
      </div>

      {/* Search & Filters Section (at bottom, before grid) */}
      <section className="px-4 md:px-12 py-8 border-t border-gray-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl md:text-2xl font-bold">Szukaj filmów</h2>
          
          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Szukaj filmów..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onFocus={() => {
                  if (searchInput.trim().length >= 4 && suggestions.length > 0) {
                    setSuggestionsOpen(true);
                  }
                }}
                onBlur={() => setSuggestionsOpen(false)}
                className="pl-10 bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {suggestionsOpen && suggestions.length > 0 && (
                <div
                  className="absolute left-0 right-0 top-full mt-1 z-50 bg-[#1a1a1a] border border-gray-700 rounded-md shadow-xl overflow-hidden"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        router.push(`/movies/${s.id}`);
                        setSuggestionsOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[#333] transition-colors"
                    >
                      <div className="relative w-8 h-12 rounded overflow-hidden bg-gray-800 shrink-0">
                        <Image
                          src={s.posterPath || PLACEHOLDER_POSTER}
                          alt={s.title}
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{s.title}</div>
                        {s.year && <div className="text-xs text-gray-400">{s.year}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button type="submit" className="bg-[#E50914] hover:bg-[#f40612]">
              Szukaj
            </Button>
          </form>
        </div>

        {/* Toggle filters button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="text-sm text-gray-400 hover:text-white flex items-center gap-1 mb-4"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          {showFilters ? 'Ukryj filtry' : 'Pokaż filtry'}
        </button>

        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 mb-4">
            <FilterDropdown
              label="Gatunek"
              options={genres}
              value={selectedGenre}
              onChange={setSelectedGenre}
            />
            <FilterDropdown
              label="Kraj"
              options={countries}
              value={selectedCountry}
              onChange={setSelectedCountry}
            />
            <FilterDropdown
              label="Rok"
              options={years}
              value={selectedYear}
              onChange={setSelectedYear}
            />
            <FilterDropdown
              label="Sortowanie"
              options={sortOptions}
              value={selectedSort}
              onChange={setSelectedSort}
            />
          </div>
        )}

        {/* Active filters badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-4">
            {searchQuery && (
              <span className="px-3 py-1 bg-[#E50914] rounded-full text-sm flex items-center gap-2">
                &quot;{searchQuery}&quot;
                <button onClick={clearSearch} className="hover:text-gray-300">×</button>
              </span>
            )}
            {selectedGenre !== 'Wszystkie gatunki' && (
              <span className="px-3 py-1 bg-[#E50914] rounded-full text-sm flex items-center gap-2">
                {selectedGenre}
                <button onClick={() => setSelectedGenre('Wszystkie gatunki')} className="hover:text-gray-300">×</button>
              </span>
            )}
            {selectedCountry !== 'Wszystkie kraje' && (
              <span className="px-3 py-1 bg-[#E50914] rounded-full text-sm flex items-center gap-2">
                {selectedCountry}
                <button onClick={() => setSelectedCountry('Wszystkie kraje')} className="hover:text-gray-300">×</button>
              </span>
            )}
            {selectedYear !== 'Wszystkie lata' && (
              <span className="px-3 py-1 bg-[#E50914] rounded-full text-sm flex items-center gap-2">
                {selectedYear}
                <button onClick={() => setSelectedYear('Wszystkie lata')} className="hover:text-gray-300">×</button>
              </span>
            )}
            <button 
              onClick={() => {
                setSelectedGenre('Wszystkie gatunki');
                setSelectedCountry('Wszystkie kraje');
                setSelectedYear('Wszystkie lata');
                setSearchQuery('');
                setSearchInput('');
              }}
              className="px-3 py-1 text-sm text-gray-400 hover:text-white"
            >
              Wyczyść wszystko
            </button>
          </div>
        )}
      </section>

      {/* All Movies Grid / Filtered Results */}
      <section className="px-4 md:px-12 pb-12">
        <h2 className="text-xl md:text-2xl font-bold mb-4">
          {hasActiveFilters ? 'Wyniki wyszukiwania' : 'Wszystkie filmy'}
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          {hasActiveFilters 
            ? (loading ? 'Ładowanie...' : `${total} ${total === 1 ? 'film' : 'filmów'}${searchQuery ? ` dla "${searchQuery}"` : ''}`)
            : `${allMoviesTotal} filmów`
          }
        </p>
        
        {hasActiveFilters ? (
          // Filtered Results
          loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {movies.map((movie, idx) => (
                  <MovieCard key={movie.id} movie={movie} priority={idx < 12} />
                ))}
              </div>

              {movies.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-gray-400 text-lg mb-4">Nie znaleziono filmów spełniających kryteria.</p>
                  <Button 
                    onClick={() => {
                      setSelectedGenre('Wszystkie gatunki');
                      setSelectedCountry('Wszystkie kraje');
                      setSelectedYear('Wszystkie lata');
                      setSearchQuery('');
                      setSearchInput('');
                    }}
                    className="bg-[#E50914] hover:bg-[#f40612]"
                  >
                    Wyczyść filtry
                  </Button>
                </div>
              )}

              <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
                {loadingMore && <Loader2 className="w-6 h-6 animate-spin text-red-600" />}
                {!hasMore && movies.length > 0 && (
                  <p className="text-gray-500 text-sm">To już wszystkie filmy</p>
                )}
              </div>
            </>
          )
        ) : (
          // All Movies Grid
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {allMovies.map((movie, idx) => (
                <MovieCard key={movie.id} movie={movie} priority={idx < 12} />
              ))}
            </div>
            
            <div ref={allMoviesLoadMoreRef} className="h-20 flex items-center justify-center">
              {allMoviesLoading && <Loader2 className="w-6 h-6 animate-spin text-red-600" />}
              {!allMoviesHasMore && allMovies.length > 0 && (
                <p className="text-gray-500 text-sm">To już wszystkie filmy</p>
              )}
            </div>
          </>
        )}
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 md:px-12 border-t border-gray-800">
        <p className="text-gray-600 text-sm">© 2024 CzystyPlayer Polska</p>
      </footer>
    </div>
  );
}
