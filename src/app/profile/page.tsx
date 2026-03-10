'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Film, Tv, Heart, ListPlus, Eye, Calendar, Mail, Shield, ChevronRight, Check, X, Facebook, Twitter, Instagram, Youtube, Settings, CreditCard, HelpCircle, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StreamingNavbar } from '@/components/layout/StreamingNavbar';
import { useAuthStore } from '@/hooks/useAuth';
import { getMyList, getLikedItems } from '@/lib/myList';
import Link from 'next/link';

// TikTok icon component
function TikTokIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  );
}

interface UserStats {
  moviesOnList: number;
  seriesOnList: number;
  likedMovies: number;
  likedSeries: number;
  totalWatchTime: number;
}

// Netflix-style avatar colors
const avatarColors = [
  'from-red-600 to-red-800',
  'from-blue-600 to-blue-800', 
  'from-green-600 to-green-800',
  'from-yellow-600 to-yellow-800',
  'from-purple-600 to-purple-800',
];

// Safe date formatter
function formatDate(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return 'Nie podano';
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'Nie podano';
    return date.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return 'Nie podano';
  }
}

// Safe days calculation
function getDaysSince(dateValue: string | Date | null | undefined): number {
  if (!dateValue) return 0;
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 0;
    return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'password' | 'stats'>('overview');
  const [stats, setStats] = useState<UserStats>({
    moviesOnList: 0,
    seriesOnList: 0,
    likedMovies: 0,
    likedSeries: 0,
    totalWatchTime: 0,
  });
  const [mounted, setMounted] = useState(false);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Mount check for localStorage
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check authentication
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Load stats from localStorage
  useEffect(() => {
    if (!mounted) return;
    
    const myList = getMyList();
    const likedItems = getLikedItems();
    
    setStats({
      moviesOnList: myList.filter(item => item.type === 'movie').length,
      seriesOnList: myList.filter(item => item.type === 'series').length,
      likedMovies: likedItems.filter(item => item.type === 'movie').length,
      likedSeries: likedItems.filter(item => item.type === 'series').length,
      totalWatchTime: 0,
    });
  }, [mounted]);

  const handlePasswordChange = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Wszystkie pola są wymagane');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Nowe hasło musi mieć co najmniej 8 znaków');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Nowe hasła nie są identyczne');
      return;
    }

    setIsChangingPassword(true);
    
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(data.error || 'Nie udało się zmienić hasła');
      }
    } catch {
      setPasswordError('Wystąpił błąd podczas zmiany hasła');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (authLoading || !mounted) {
    return (
      <div className="min-h-screen bg-[#141414] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#E50914] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Ładowanie profilu...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userInitial = (user.username || user.email || 'U')[0].toUpperCase();
  const avatarColor = avatarColors[userInitial.charCodeAt(0) % avatarColors.length];
  const daysSinceCreation = getDaysSince(user.created_at);

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <StreamingNavbar variant="browse" />

      {/* Hero Section - Netflix Style */}
      <div className="relative pt-16">
        {/* Background gradient */}
        <div className="absolute inset-0 h-72 bg-linear-to-b from-[#E50914]/20 via-[#141414] to-[#141414]" />
        
        <div className="relative max-w-6xl mx-auto px-4 md:px-8 pt-12 pb-8">
          {/* Profile Header */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative group"
            >
              <div className={`w-32 h-32 md:w-40 md:h-40 rounded-md bg-linear-to-br ${avatarColor} flex items-center justify-center text-5xl md:text-6xl font-bold shadow-2xl`}>
                {userInitial}
              </div>
              <button className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                <Edit3 className="w-8 h-8" />
              </button>
            </motion.div>

            {/* User Info */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex-1 text-center md:text-left"
            >
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                {user.username || 'Użytkownik'}
              </h1>
              <p className="text-gray-400 mb-4 flex items-center justify-center md:justify-start gap-2">
                <Mail className="w-4 h-4" />
                {user.email || 'Brak adresu email'}
              </p>
              
              {/* Quick Stats Pills */}
              <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-4">
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                  <ListPlus className="w-4 h-4 text-[#E50914]" />
                  <span className="text-sm font-medium">{stats.moviesOnList + stats.seriesOnList} na liście</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                  <Heart className="w-4 h-4 text-pink-500" />
                  <span className="text-sm font-medium">{stats.likedMovies + stats.likedSeries} polubionych</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium">{daysSinceCreation} dni z nami</span>
                </div>
              </div>

              {/* Member since */}
              <p className="text-gray-500 text-sm">
                Członek od {formatDate(user.created_at)}
              </p>
            </motion.div>

            {/* Settings Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Button 
                variant="outline" 
                className="border-gray-600 text-white hover:bg-white/10"
                onClick={() => setActiveTab('password')}
              >
                <Settings className="w-4 h-4 mr-2" />
                Ustawienia
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-800 sticky top-16 bg-[#141414] z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <nav className="flex gap-1">
            {[
              { id: 'overview', label: 'Przegląd', icon: User },
              { id: 'password', label: 'Bezpieczeństwo', icon: Lock },
              { id: 'stats', label: 'Statystyki', icon: Eye },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`
                  relative px-6 py-4 text-sm font-medium transition-colors flex items-center gap-2
                  ${activeTab === tab.id ? 'text-white' : 'text-gray-400 hover:text-gray-200'}
                `}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeProfileTab"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-[#E50914]"
                  />
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        <AnimatePresence mode="wait">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid md:grid-cols-3 gap-6"
            >
              {/* Account Details */}
              <div className="md:col-span-2 space-y-6">
                <div className="bg-[#1a1a1a] rounded-lg overflow-hidden">
                  <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <User className="w-5 h-5 text-[#E50914]" />
                      Informacje o koncie
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-800">
                    <div className="p-4 flex justify-between items-center hover:bg-white/5 transition-colors">
                      <div>
                        <p className="text-gray-400 text-sm">Nazwa użytkownika</p>
                        <p className="font-medium mt-1">{user.username || 'Nie ustawiono'}</p>
                      </div>
                    </div>
                    <div className="p-4 flex justify-between items-center hover:bg-white/5 transition-colors">
                      <div>
                        <p className="text-gray-400 text-sm">Adres email</p>
                        <p className="font-medium mt-1">{user.email || 'Nie ustawiono'}</p>
                      </div>
                    </div>
                    <div className="p-4 flex justify-between items-center hover:bg-white/5 transition-colors">
                      <div>
                        <p className="text-gray-400 text-sm">Status konta</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className={`w-2 h-2 rounded-full ${user.is_active !== false ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="font-medium">{user.is_active !== false ? 'Aktywne' : 'Nieaktywne'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 flex justify-between items-center hover:bg-white/5 transition-colors">
                      <div>
                        <p className="text-gray-400 text-sm">Data rejestracji</p>
                        <p className="font-medium mt-1">{formatDate(user.created_at)}</p>
                      </div>
                    </div>
                    <div className="p-4 flex justify-between items-center hover:bg-white/5 transition-colors">
                      <div>
                        <p className="text-gray-400 text-sm">Ostatnia aktywność</p>
                        <p className="font-medium mt-1">{formatDate(user.last_login) || 'Właśnie teraz'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Membership Card */}
                <div className="bg-linear-to-r from-[#E50914]/20 to-[#B20710]/20 border border-[#E50914]/30 rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-xl mb-1">CzystyPlayer Premium</h3>
                      <p className="text-gray-400 text-sm mb-4">
                        Nieograniczony dostęp do wszystkich treści w jakości HD i 4K
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <span className="bg-[#E50914] px-3 py-1 rounded text-xs font-medium">
                          Aktywna subskrypcja
                        </span>
                        <span className="bg-white/10 px-3 py-1 rounded text-xs">
                          Odnowienie: Automatyczne
                        </span>
                      </div>
                    </div>
                    <CreditCard className="w-10 h-10 text-[#E50914]" />
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-400 text-sm uppercase tracking-wider">Szybkie akcje</h3>
                
                <Link href="/my-list" className="block">
                  <div className="bg-[#1a1a1a] rounded-lg p-4 hover:bg-[#222] transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-blue-600/20 flex items-center justify-center">
                          <ListPlus className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium">Moja lista</p>
                          <p className="text-sm text-gray-400">{stats.moviesOnList + stats.seriesOnList} pozycji</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </Link>

                <button onClick={() => setActiveTab('stats')} className="w-full text-left">
                  <div className="bg-[#1a1a1a] rounded-lg p-4 hover:bg-[#222] transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-purple-600/20 flex items-center justify-center">
                          <Eye className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <p className="font-medium">Statystyki</p>
                          <p className="text-sm text-gray-400">Twoja aktywność</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </button>

                <button onClick={() => setActiveTab('password')} className="w-full text-left">
                  <div className="bg-[#1a1a1a] rounded-lg p-4 hover:bg-[#222] transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-green-600/20 flex items-center justify-center">
                          <Lock className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium">Zmień hasło</p>
                          <p className="text-sm text-gray-400">Bezpieczeństwo</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </button>

                <div className="bg-[#1a1a1a] rounded-lg p-4 hover:bg-[#222] transition-colors cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-yellow-600/20 flex items-center justify-center">
                        <HelpCircle className="w-5 h-5 text-yellow-400" />
                      </div>
                      <div>
                        <p className="font-medium">Centrum pomocy</p>
                        <p className="text-sm text-gray-400">FAQ i wsparcie</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <motion.div
              key="password"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-xl mx-auto"
            >
              <div className="bg-[#1a1a1a] rounded-lg overflow-hidden">
                <div className="p-6 border-b border-gray-800">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Lock className="w-5 h-5 text-[#E50914]" />
                    Zmień hasło
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">
                    Upewnij się, że Twoje hasło ma co najmniej 8 znaków
                  </p>
                </div>
                
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-medium mb-2">Obecne hasło</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-[#333] border border-gray-700 rounded px-4 py-3 text-white outline-none focus:border-white transition-colors"
                      placeholder="Wpisz obecne hasło"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Nowe hasło</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-[#333] border border-gray-700 rounded px-4 py-3 text-white outline-none focus:border-white transition-colors"
                      placeholder="Minimum 8 znaków"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Potwierdź nowe hasło</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-[#333] border border-gray-700 rounded px-4 py-3 text-white outline-none focus:border-white transition-colors"
                      placeholder="Powtórz nowe hasło"
                    />
                  </div>

                  {passwordError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 p-4 rounded"
                    >
                      <X className="w-5 h-5 shrink-0" />
                      <span className="text-sm">{passwordError}</span>
                    </motion.div>
                  )}

                  {passwordSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-green-400 bg-green-500/10 border border-green-500/20 p-4 rounded"
                    >
                      <Check className="w-5 h-5 shrink-0" />
                      <span className="text-sm">Hasło zostało zmienione pomyślnie!</span>
                    </motion.div>
                  )}

                  <Button
                    onClick={handlePasswordChange}
                    className="w-full bg-[#E50914] hover:bg-[#f40612] py-3 text-base font-semibold"
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Zmienianie...
                      </span>
                    ) : (
                      'Zapisz nowe hasło'
                    )}
                  </Button>
                </div>
              </div>

              {/* Security Tips */}
              <div className="mt-6 bg-[#1a1a1a] rounded-lg p-6">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  Wskazówki bezpieczeństwa
                </h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    Używaj unikalnego hasła dla każdego konta
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    Łącz wielkie i małe litery, cyfry oraz znaki specjalne
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    Unikaj oczywistych haseł jak daty urodzenia
                  </li>
                </ul>
              </div>
            </motion.div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Main Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-linear-to-br from-blue-600/30 to-blue-900/30 rounded-xl p-6 border border-blue-500/20"
                >
                  <Film className="w-8 h-8 text-blue-400 mb-3" />
                  <p className="text-4xl font-bold">{stats.moviesOnList}</p>
                  <p className="text-gray-400 text-sm mt-1">Filmów na liście</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-linear-to-br from-purple-600/30 to-purple-900/30 rounded-xl p-6 border border-purple-500/20"
                >
                  <Tv className="w-8 h-8 text-purple-400 mb-3" />
                  <p className="text-4xl font-bold">{stats.seriesOnList}</p>
                  <p className="text-gray-400 text-sm mt-1">Seriali na liście</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-linear-to-br from-pink-600/30 to-pink-900/30 rounded-xl p-6 border border-pink-500/20"
                >
                  <Heart className="w-8 h-8 text-pink-400 mb-3" />
                  <p className="text-4xl font-bold">{stats.likedMovies}</p>
                  <p className="text-gray-400 text-sm mt-1">Polubionych filmów</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-linear-to-br from-red-600/30 to-red-900/30 rounded-xl p-6 border border-red-500/20"
                >
                  <Heart className="w-8 h-8 text-red-400 mb-3" />
                  <p className="text-4xl font-bold">{stats.likedSeries}</p>
                  <p className="text-gray-400 text-sm mt-1">Polubionych seriali</p>
                </motion.div>
              </div>

              {/* Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-[#1a1a1a] rounded-xl p-6"
              >
                <h3 className="text-xl font-bold mb-6">Podsumowanie aktywności</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-black/40 rounded-lg p-5 text-center">
                    <p className="text-3xl font-bold text-[#E50914]">{stats.moviesOnList + stats.seriesOnList}</p>
                    <p className="text-gray-400 text-sm mt-2">Wszystko na liście</p>
                  </div>
                  <div className="bg-black/40 rounded-lg p-5 text-center">
                    <p className="text-3xl font-bold text-pink-500">{stats.likedMovies + stats.likedSeries}</p>
                    <p className="text-gray-400 text-sm mt-2">Wszystkie polubienia</p>
                  </div>
                  <div className="bg-black/40 rounded-lg p-5 text-center">
                    <p className="text-3xl font-bold text-green-500">{daysSinceCreation}</p>
                    <p className="text-gray-400 text-sm mt-2">Dni z nami</p>
                  </div>
                  <div className="bg-black/40 rounded-lg p-5 text-center">
                    <p className="text-3xl font-bold text-yellow-500">∞</p>
                    <p className="text-gray-400 text-sm mt-2">Godzin streamingu</p>
                  </div>
                </div>
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-8 text-center"
              >
                <p className="text-gray-400 mb-4">Chcesz odkryć więcej treści?</p>
                <div className="flex justify-center gap-4">
                  <Link href="/movies">
                    <Button className="bg-[#E50914] hover:bg-[#f40612]">
                      Przeglądaj filmy
                    </Button>
                  </Link>
                  <Link href="/series">
                    <Button variant="outline" className="border-gray-600 text-white hover:bg-white/10">
                      Przeglądaj seriale
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="relative mt-20 bg-linear-to-b from-[#141414] to-[#0a0a0a] border-t border-gray-800/50">
        <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-[#E50914] to-transparent opacity-50" />
        
        <div className="max-w-7xl mx-auto px-4 md:px-12 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h3 className="text-white font-semibold mb-4 text-lg">Treści</h3>
              <ul className="space-y-3">
                <li><Link href="/movies" className="text-gray-400 text-sm hover:text-white transition-colors">Filmy</Link></li>
                <li><Link href="/series" className="text-gray-400 text-sm hover:text-white transition-colors">Seriale</Link></li>
                <li><Link href="/my-list" className="text-gray-400 text-sm hover:text-white transition-colors">Moja lista</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4 text-lg">Konto</h3>
              <ul className="space-y-3">
                <li><Link href="/profile" className="text-gray-400 text-sm hover:text-white transition-colors">Profil</Link></li>
                <li><button onClick={() => setActiveTab('password')} className="text-gray-400 text-sm hover:text-white transition-colors">Zmień hasło</button></li>
                <li><button onClick={() => setActiveTab('stats')} className="text-gray-400 text-sm hover:text-white transition-colors">Statystyki</button></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4 text-lg">Pomoc</h3>
              <ul className="space-y-3">
                <li><span className="text-gray-400 text-sm hover:text-white transition-colors cursor-pointer">Centrum pomocy</span></li>
                <li><span className="text-gray-400 text-sm hover:text-white transition-colors cursor-pointer">Kontakt</span></li>
                <li><span className="text-gray-400 text-sm hover:text-white transition-colors cursor-pointer">FAQ</span></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4 text-lg">Prawne</h3>
              <ul className="space-y-3">
                <li><span className="text-gray-400 text-sm hover:text-white transition-colors cursor-pointer">Regulamin</span></li>
                <li><span className="text-gray-400 text-sm hover:text-white transition-colors cursor-pointer">Prywatność</span></li>
                <li><span className="text-gray-400 text-sm hover:text-white transition-colors cursor-pointer">Cookies</span></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center mb-10">
            <h3 className="text-gray-400 text-sm mb-4 tracking-wider uppercase">Obserwuj nas</h3>
            <div className="flex gap-4">
              <a href="#" className="w-12 h-12 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-[#1877f2] hover:bg-[#1877f2]/20 transition-all">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-12 h-12 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-[#1da1f2] hover:bg-[#1da1f2]/20 transition-all">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-12 h-12 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-[#e4405f] hover:bg-[#e4405f]/20 transition-all">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-12 h-12 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-[#ff0000] hover:bg-[#ff0000]/20 transition-all">
                <Youtube className="w-5 h-5" />
              </a>
              <a href="#" className="w-12 h-12 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-500 hover:bg-gray-500/20 transition-all">
                <TikTokIcon />
              </a>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-500 text-sm">
              © 2025 <span className="text-[#E50914] font-semibold">CzystyPlayer</span>. Wszystkie prawa zastrzeżone.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
