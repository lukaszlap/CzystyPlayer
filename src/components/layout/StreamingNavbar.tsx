'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bell, ChevronDown, Menu, X, LogOut } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/hooks/useAuth';
import { UserAvatar } from '@/components/UserAvatar';

interface StreamingNavbarProps {
  variant?: 'landing' | 'browse' | 'auth';
}

interface SearchSuggestion {
  id: number;
  title: string;
  year?: string;
  posterPath: string;
}

const navLinks = [
  { href: '/browse', label: 'Strona główna' },
  { href: '/series', label: 'Seriale' },
  { href: '/movies', label: 'Filmy' },
  { href: '/ai-suggestions', label: 'Rekomendacje AI' },
  { href: '/my-recommendations', label: 'Moje Rekomendacje' },
  { href: '/my-list', label: 'Moja lista' },
];

export function StreamingNavbar({ variant = 'landing' }: StreamingNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuthStore();
  
  // Logout confirmation state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'movies' | 'series'>('movies');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close search on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when search opens
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Debounced search for suggestions
  const fetchSuggestions = useCallback(async (query: string, type: 'movies' | 'series') => {
    if (query.length < 4) {
      setSuggestions([]);
      return;
    }
    
    setIsLoadingSuggestions(true);
    try {
      const res = await fetch(`/api/content/suggestions?q=${encodeURIComponent(query)}&type=${type}&limit=6`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSuggestions(data.suggestions || []);
        }
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuggestions(searchQuery, searchType);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchType, fetchSuggestions]);

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    const path = searchType === 'movies' ? `/movies/${suggestion.id}` : `/series/${suggestion.id}`;
    router.push(path);
    setIsSearchOpen(false);
    setSearchQuery('');
    setSuggestions([]);
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push('/');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  // Landing page navbar (for non-authenticated users)
  if (variant === 'landing') {
    return (
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`
          fixed top-0 left-0 right-0 z-50
          transition-all duration-300
          ${isScrolled ? 'bg-black/90 backdrop-blur-sm' : 'bg-linear-to-b from-black/80 to-transparent'}
        `}
      >
        <nav className="container mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-[#E50914] text-3xl md:text-4xl font-black tracking-tight">
              CzystyPlayer
            </span>
          </Link>

          {/* Right section */}
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button 
                className="bg-[#E50914] hover:bg-[#f40612] text-white font-semibold px-4 py-2 rounded"
              >
                Zaloguj się
              </Button>
            </Link>
          </div>
        </nav>
      </motion.header>
    );
  }

  // Auth page navbar
  if (variant === 'auth') {
    return (
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 bg-transparent"
      >
        <nav className="container mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-[#E50914] text-3xl md:text-4xl font-black tracking-tight">
              CzystyPlayer
            </span>
          </Link>
        </nav>
      </motion.header>
    );
  }

  // Browse page navbar (for authenticated users)
  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`
        fixed top-0 left-0 right-0 z-50
        transition-all duration-300
        ${isScrolled ? 'bg-[#141414]' : 'bg-linear-to-b from-black/80 to-transparent'}
      `}
    >
      <nav className="px-4 md:px-12 h-16 flex items-center">
        {/* Left section - Logo & Nav */}
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link href="/browse" className="flex items-center">
            <span className="text-[#E50914] text-2xl font-black tracking-tight">
              CzystyPlayer
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  text-sm font-medium transition-colors
                  ${pathname === link.href 
                    ? 'text-white font-semibold' 
                    : 'text-gray-300 hover:text-white'
                  }
                `}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile Navigation Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="lg:hidden flex items-center gap-1 text-sm font-medium text-white">
              Menu <ChevronDown className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-black/95 border-gray-800 w-56">
              {navLinks.map((link) => (
                <DropdownMenuItem key={link.href} asChild>
                  <Link
                    href={link.href}
                    className={`
                      w-full text-center py-2
                      ${pathname === link.href ? 'text-white' : 'text-gray-300'}
                    `}
                  >
                    {link.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-4 ml-auto">
          {/* Search */}
          <div ref={searchContainerRef} className="relative">
            <AnimatePresence>
              {isSearchOpen ? (
                <motion.div
                  initial={{ width: 40, opacity: 0 }}
                  animate={{ width: 320, opacity: 1 }}
                  exit={{ width: 40, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center bg-black/90 border border-gray-600 rounded-md overflow-hidden"
                >
                  <Search className="h-5 w-5 text-gray-400 ml-3 shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Szukaj filmów lub seriali..."
                    className="w-full bg-transparent text-white text-sm px-3 py-2 outline-none placeholder:text-gray-500"
                  />
                  <div className="flex items-center gap-1 pr-2">
                    <button
                      onClick={() => setSearchType('movies')}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        searchType === 'movies' 
                          ? 'bg-[#E50914] text-white' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Filmy
                    </button>
                    <button
                      onClick={() => setSearchType('series')}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        searchType === 'series' 
                          ? 'bg-[#E50914] text-white' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Seriale
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSearchQuery('');
                      setSuggestions([]);
                    }}
                    className="p-2 text-gray-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              ) : (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white hover:text-gray-300"
                  onClick={() => setIsSearchOpen(true)}
                >
                  <Search className="h-5 w-5" />
                </Button>
              )}
            </AnimatePresence>

            {/* Suggestions dropdown */}
            <AnimatePresence>
              {isSearchOpen && (suggestions.length > 0 || isLoadingSuggestions) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full right-0 mt-2 w-80 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-2xl overflow-hidden z-50"
                >
                  {isLoadingSuggestions ? (
                    <div className="p-4 text-center text-gray-400 text-sm">
                      Szukam...
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-white/10 transition-colors text-left"
                        >
                          <div className="relative w-12 h-16 rounded overflow-hidden bg-gray-800 shrink-0">
                            {suggestion.posterPath ? (
                              <Image
                                src={suggestion.posterPath.startsWith('/') ? suggestion.posterPath : `/${suggestion.posterPath}`}
                                alt={suggestion.title}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xs">
                                Brak
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">
                              {suggestion.title}
                            </p>
                            <p className="text-gray-400 text-xs">
                              {suggestion.year && <span>{suggestion.year}</span>}
                              <span className="ml-2 text-gray-500">
                                {searchType === 'movies' ? 'Film' : 'Serial'}
                              </span>
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchQuery.length >= 4 && suggestions.length === 0 && !isLoadingSuggestions && (
                    <div className="p-4 text-center text-gray-400 text-sm">
                      Nie znaleziono wyników
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="text-white hover:text-gray-300">
            <Bell className="h-5 w-5" />
          </Button>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 outline-none">
              <UserAvatar 
                username={user?.username} 
                email={user?.email} 
                size="sm" 
              />
              <ChevronDown className="h-4 w-4 text-white" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-black/95 border-gray-800 w-48">
              <DropdownMenuItem className="text-gray-300 hover:text-white">
                <Link href="/profile#settings" className="w-full">Konto</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-800" />
              <DropdownMenuItem 
                className="text-red-400 hover:text-red-300 cursor-pointer"
                onClick={handleLogoutClick}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Wyloguj się
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-100 p-4"
            onClick={handleLogoutCancel}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a1a1a] rounded-lg p-6 max-w-sm w-full border border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <LogOut className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Wyloguj się</h3>
                  <p className="text-gray-400 text-sm">Czy na pewno chcesz się wylogować?</p>
                </div>
              </div>
              
              <p className="text-gray-400 text-sm mb-6">
                Zostaniesz wylogowany z tego urządzenia i przekierowany na stronę główną.
              </p>
              
              <div className="flex gap-3">
                <Button
                  onClick={handleLogoutCancel}
                  variant="outline"
                  className="flex-1 border-gray-600 text-white hover:bg-white/10"
                  disabled={isLoggingOut}
                >
                  Anuluj
                </Button>
                <Button
                  onClick={handleLogoutConfirm}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? 'Wylogowywanie...' : 'Wyloguj'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
