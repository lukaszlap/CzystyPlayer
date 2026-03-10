'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, X, Heart, Facebook, Twitter, Instagram, Youtube, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StreamingNavbar } from '@/components/layout/StreamingNavbar';
import { useAuthStore } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

// Type for my list item
interface MyListItem {
  id: number;
  type: 'movie' | 'series';
  title: string;
  posterPath?: string;
  year?: string;
  rating?: number;
}

// TikTok icon component
function TikTokIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  );
}

export default function MyListPage() {
  const router = useRouter();
  const { isAuthenticated, tokens } = useAuthStore();
  const [myList, setMyList] = useState<MyListItem[]>([]);
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  const accessToken = tokens?.accessToken || null;

  // Wait for hydration
  useEffect(() => {
    setAuthChecked(true);
  }, []);

  // Load list from database
  useEffect(() => {
    if (!authChecked) return;

    const loadList = async () => {
      if (!isAuthenticated || !accessToken) {
        setLoading(false);
        return;
      }

      try {
        // Fetch my list
        const listRes = await fetch('/api/user/my-list', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const listData = await listRes.json();

        if (listData.success && listData.items) {
          setMyList(listData.items.map((item: any) => ({
            id: item.content_id,
            type: item.content_type,
            title: item.title,
            posterPath: item.poster_path,
            year: item.year,
            rating: item.rating,
          })));
        }

        // Fetch likes
        const likesRes = await fetch('/api/user/likes', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const likesData = await likesRes.json();

        if (likesData.success && likesData.items) {
          const liked = new Set<string>();
          for (const item of likesData.items) {
            liked.add(`${item.content_type}-${item.content_id}`);
          }
          setLikedItems(liked);
        }
      } catch (err) {
        console.error('Error loading my list:', err);
      } finally {
        setLoading(false);
      }
    };

    loadList();
  }, [authChecked, isAuthenticated, accessToken]);

  const handleRemove = async (id: number, type: 'movie' | 'series') => {
    if (!accessToken) return;

    try {
      await fetch(`/api/user/my-list?contentId=${id}&contentType=${type}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setMyList(myList.filter(item => !(item.id === id && item.type === type)));
    } catch (err) {
      console.error('Error removing from list:', err);
    }
  };

  const isLiked = (id: number, type: 'movie' | 'series') => {
    return likedItems.has(`${type}-${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414] text-white flex items-center justify-center">
        <StreamingNavbar variant="browse" />
        <div className="animate-pulse text-xl">Ładowanie...</div>
      </div>
    );
  }

  // Not authenticated
  if (authChecked && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#141414] text-white">
        <StreamingNavbar variant="browse" />
        <div className="pt-24 px-4 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#E50914]/20 flex items-center justify-center">
              <LogIn className="w-12 h-12 text-[#E50914]" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">Zaloguj się</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto text-center">
              Zaloguj się, aby korzystać z listy ulubionych i mieć do niej dostęp z każdego urządzenia.
            </p>
            <Button
              onClick={() => router.push('/auth/login')}
              className="bg-[#E50914] hover:bg-[#f40612]"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Zaloguj się
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <StreamingNavbar variant="browse" />

      <div className="pt-24 px-4 md:px-12">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-4xl font-bold mb-8"
        >
          Moja lista
        </motion.h1>

        {myList.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="text-gray-400 text-center">
              <p className="text-xl mb-4">Twoja lista jest pusta</p>
              <p className="text-sm mb-6">Dodaj filmy i seriale, które chcesz obejrzeć później</p>
              <div className="flex gap-4">
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
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
          >
            {myList.map((item, index) => (
              <motion.div
                key={`${item.type}-${item.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative"
              >
                <Link href={item.type === 'movie' ? `/movies/${item.id}` : `/series/${item.id}`}>
                  <div className="relative aspect-2/3 rounded-lg overflow-hidden bg-gray-800">
                    {item.posterPath ? (
                      <Image
                        src={item.posterPath.startsWith('/') ? item.posterPath : `/${item.posterPath}`}
                        alt={item.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                        Brak plakatu
                      </div>
                    )}
                    
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-12 h-12 text-white" />
                    </div>

                    {/* Like badge */}
                    {isLiked(item.id, item.type) && (
                      <div className="absolute top-2 left-2 bg-red-500 rounded-full p-1">
                        <Heart className="w-3 h-3 fill-white text-white" />
                      </div>
                    )}

                    {/* Type badge */}
                    <div className="absolute top-2 right-2 bg-black/70 px-2 py-0.5 rounded text-xs">
                      {item.type === 'movie' ? 'Film' : 'Serial'}
                    </div>
                  </div>
                </Link>

                {/* Remove button */}
                <button
                  onClick={() => handleRemove(item.id, item.type)}
                  className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  title="Usuń z listy"
                >
                  <X className="w-4 h-4 text-white" />
                </button>

                {/* Title */}
                <div className="mt-2">
                  <h3 className="text-sm font-medium truncate">{item.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {item.year && <span>{item.year}</span>}
                    {item.rating != null && !isNaN(Number(item.rating)) && (
                      <span className="text-yellow-500">★ {Number(item.rating).toFixed(1)}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <footer className="relative mt-20 bg-linear-to-b from-[#141414] to-[#0a0a0a] border-t border-gray-800/50">
        {/* Decorative top line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-[#E50914] to-transparent opacity-50" />
        
        <div className="max-w-7xl mx-auto px-4 md:px-12 py-12">
          {/* Main footer content */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Treści */}
            <div>
              <h3 className="text-white font-semibold mb-4 text-lg">Treści</h3>
              <ul className="space-y-3">
                <li><Link href="/movies" className="text-gray-400 text-sm hover:text-white transition-colors">Filmy</Link></li>
                <li><Link href="/series" className="text-gray-400 text-sm hover:text-white transition-colors">Seriale</Link></li>
                <li><Link href="/movies?genre=action" className="text-gray-400 text-sm hover:text-white transition-colors">Akcja</Link></li>
                <li><Link href="/movies?genre=comedy" className="text-gray-400 text-sm hover:text-white transition-colors">Komedia</Link></li>
                <li><Link href="/movies?genre=drama" className="text-gray-400 text-sm hover:text-white transition-colors">Dramat</Link></li>
              </ul>
            </div>

            {/* Pomoc */}
            <div>
              <h3 className="text-white font-semibold mb-4 text-lg">Pomoc</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 text-sm hover:text-white transition-colors">Centrum pomocy</a></li>
                <li><a href="#" className="text-gray-400 text-sm hover:text-white transition-colors">Kontakt</a></li>
                <li><a href="#" className="text-gray-400 text-sm hover:text-white transition-colors">Często zadawane pytania</a></li>
                <li><a href="#" className="text-gray-400 text-sm hover:text-white transition-colors">Zgłoś problem</a></li>
              </ul>
            </div>

            {/* O nas */}
            <div>
              <h3 className="text-white font-semibold mb-4 text-lg">O nas</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 text-sm hover:text-white transition-colors">O CzystyPlayer</a></li>
                <li><a href="#" className="text-gray-400 text-sm hover:text-white transition-colors">Kariera</a></li>
                <li><a href="#" className="text-gray-400 text-sm hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="text-gray-400 text-sm hover:text-white transition-colors">Partnerzy</a></li>
              </ul>
            </div>

            {/* Prawne */}
            <div>
              <h3 className="text-white font-semibold mb-4 text-lg">Prawne</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 text-sm hover:text-white transition-colors">Warunki korzystania</a></li>
                <li><a href="#" className="text-gray-400 text-sm hover:text-white transition-colors">Polityka prywatności</a></li>
                <li><a href="#" className="text-gray-400 text-sm hover:text-white transition-colors">Ustawienia cookies</a></li>
                <li><a href="#" className="text-gray-400 text-sm hover:text-white transition-colors">Regulamin</a></li>
              </ul>
            </div>
          </div>

          {/* Social Media Section */}
          <div className="flex flex-col items-center mb-10">
            <h3 className="text-gray-400 text-sm mb-4 tracking-wider uppercase">Obserwuj nas</h3>
            <div className="flex gap-4">
              <a href="#" aria-label="Facebook" className="w-12 h-12 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-[#1877f2] hover:bg-[#1877f2]/20 transition-all">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" aria-label="Twitter" className="w-12 h-12 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-[#1da1f2] hover:bg-[#1da1f2]/20 transition-all">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" aria-label="Instagram" className="w-12 h-12 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-[#e4405f] hover:bg-[#e4405f]/20 transition-all">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" aria-label="YouTube" className="w-12 h-12 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-[#ff0000] hover:bg-[#ff0000]/20 transition-all">
                <Youtube className="w-5 h-5" />
              </a>
              <a href="#" aria-label="TikTok" className="w-12 h-12 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-500 hover:bg-gray-500/20 transition-all">
                <TikTokIcon />
              </a>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-800 pt-8">
            {/* Bottom section */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              {/* Copyright and info */}
              <div className="text-center md:text-left">
                <p className="text-gray-500 text-sm mb-2">
                  © 2025 <span className="text-[#E50914] font-semibold">CzystyPlayer</span>. Wszystkie prawa zastrzeżone.
                </p>
                <p className="text-gray-600 text-xs max-w-md">
                  CzystyPlayer to nowoczesna platforma do oglądania filmów i seriali w najwyższej jakości.
                </p>
              </div>

              {/* Version info */}
              <div className="text-right hidden md:block">
                <p className="text-gray-600 text-xs">
                  Powered by Next.js & Advanced Streaming Technology
                </p>
                <p className="text-gray-700 text-xs mt-1">
                  Version 2.1.0
                </p>
              </div>
            </div>

            {/* Feature badges */}
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#E50914]/30 bg-[#E50914]/10">
                <div className="w-2 h-2 rounded-full bg-[#E50914] animate-pulse" />
                <span className="text-[#E50914] text-xs font-medium">Streaming HD</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10">
                <span className="text-blue-400 text-xs font-medium">Dostęp mobilny</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10">
                <span className="text-green-400 text-xs font-medium">Offline</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
