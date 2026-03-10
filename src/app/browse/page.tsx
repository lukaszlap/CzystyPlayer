'use client';

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Play, Info, Plus, ThumbsUp, ChevronLeft, ChevronRight, Volume2, VolumeX, Loader2, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
import gsap from 'gsap';
import { Button } from '@/components/ui/button';
import { StreamingNavbar } from '@/components/layout/StreamingNavbar';
import { useAuthStore } from '@/hooks/useAuth';

// Placeholder images
const PLACEHOLDER_POSTER = '/images/imgPoster/placeholder.jpg';
const PLACEHOLDER_BACKGROUND = '/images/backgrounds/placeholder.jpg';
const PLACEHOLDER_SERIES_POSTER = '/images/imgSeriesPoster_final/placeholder.jpg';

// Types
interface ContentItem {
  id: number;
  title: string;
  posterPath?: string;
  backgroundPath?: string;
  year?: string;
  rating?: number;
  description?: string;
  categories?: string;
  countries?: string;
  content_type?: 'movie' | 'series';
  content_id?: number;
  season_number?: number | null;
  episode_number?: number | null;
  progress?: number;
}

interface ContinueItem {
  id: number;
  title: string;
  poster: string;
  progress: number;
  content_type: 'movie' | 'series';
  content_id: number;
  season_number?: number | null;
  episode_number?: number | null;
}

// Hero content interface
interface HeroContent extends ContentItem {
  type: 'movie' | 'series';
}

// Default hero for fallback
const defaultHero: HeroContent = {
  id: 64516,
  title: 'Nosferatu',
  description: 'Gotycka opowieść o nawiedzeniu młodej kobiety przez starożytnego transylwańskiego wampira, która sięga ponad granice przerażających namiętności.',
  backgroundPath: '/images/backgrounds/nosferatu_2024_background.jpg',
  posterPath: '/images/imgPoster/64516_Nosferatu.jpg',
  year: '2024',
  rating: 8.5,
  type: 'movie',
};

// Optimized Movie Card Component with memo
const MovieCard = memo(function MovieCard({ 
  item, 
  showProgress = false, 
  type = 'movie',
  priority = false
}: { 
  item: {
    id: number;
    title: string;
    posterPath?: string;
    poster?: string;
    progress?: number;
    content_type?: 'movie' | 'series';
    content_id?: number;
    season_number?: number | null;
    episode_number?: number | null;
  };
  showProgress?: boolean;
  type?: 'movie' | 'series';
  priority?: boolean;
}) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [imgSrc, setImgSrc] = useState(item.posterPath || item.poster || (type === 'series' ? PLACEHOLDER_SERIES_POSTER : PLACEHOLDER_POSTER));

  const contentType = item.content_type ?? type;
  const contentId = item.content_id ?? item.id;

  const handlePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (contentType === 'series') {
      if (item.season_number && item.episode_number) {
        router.push(`/watch/series/${contentId}?seasonNumber=${item.season_number}&episodeNumber=${item.episode_number}`);
        return;
      }
      router.push(`/watch/series/${contentId}`);
    } else {
      router.push(`/watch/movie/${contentId}`);
    }
  }, [router, contentType, contentId, item.season_number, item.episode_number]);

  const handleCardClick = useCallback(() => {
    if (contentType === 'series') {
      router.push(`/series/${contentId}`);
    } else {
      router.push(`/movies/${contentId}`);
    }
  }, [router, contentType, contentId]);

  const handleImageError = useCallback(() => {
    setImgSrc(type === 'series' ? PLACEHOLDER_SERIES_POSTER : PLACEHOLDER_POSTER);
  }, [type]);

  return (
    <div
      className="shrink-0 relative group cursor-pointer transition-transform duration-200 hover:scale-105 hover:z-10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      <div className="relative w-40 md:w-48 aspect-2/3 rounded-md overflow-hidden bg-gray-800">
        <Image
          src={imgSrc}
          alt={item.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 160px, 192px"
          priority={priority}
          onError={handleImageError}
        />
        
        {/* Progress bar for continue watching */}
        {showProgress && typeof item.progress === 'number' && item.progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
            <div 
              className="h-full bg-[#E50914]" 
              style={{ width: `${item.progress}%` }}
            />
          </div>
        )}

        {/* Hover overlay */}
        {isHovered && (
          <div className="absolute inset-0 bg-linear-to-t from-black via-black/50 to-transparent flex flex-col justify-end p-3">
            <div className="flex gap-2 mb-2">
              <button 
                onClick={handlePlay}
                className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gray-200"
              >
                <Play className="h-4 w-4 text-black fill-black" />
              </button>
              <button className="w-8 h-8 border-2 border-gray-400 rounded-full flex items-center justify-center hover:border-white">
                <Plus className="h-4 w-4" />
              </button>
              <button className="w-8 h-8 border-2 border-gray-400 rounded-full flex items-center justify-center hover:border-white">
                <ThumbsUp className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm font-semibold truncate">{item.title}</p>
          </div>
        )}
      </div>
    </div>
  );
});

// Netflix-style Rank Card Component - supports any number
const RankCard = memo(function RankCard({ 
  item, 
  rank, 
  type = 'movie',
  onClick
}: { 
  item: ContentItem; 
  rank: number; 
  type?: 'movie' | 'series';
  onClick: () => void;
}) {
  const [imgSrc, setImgSrc] = useState(item.posterPath || (type === 'series' ? PLACEHOLDER_SERIES_POSTER : PLACEHOLDER_POSTER));
  const cardRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);
  
  const handleImageError = useCallback(() => {
    setImgSrc(type === 'series' ? PLACEHOLDER_SERIES_POSTER : PLACEHOLDER_POSTER);
  }, [type]);

  const handleMouseEnter = useCallback(() => {
    if (cardRef.current && numberRef.current) {
      gsap.to(cardRef.current, {
        scale: 1.08,
        duration: 0.3,
        ease: 'power2.out'
      });
      gsap.to(numberRef.current, {
        scale: 1.1,
        textShadow: '6px 6px 0 #000, 0 0 30px rgba(229, 9, 20, 0.5)',
        duration: 0.3,
        ease: 'power2.out'
      });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (cardRef.current && numberRef.current) {
      gsap.to(cardRef.current, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out'
      });
      gsap.to(numberRef.current, {
        scale: 1,
        textShadow: '3px 3px 0 #000',
        duration: 0.3,
        ease: 'power2.out'
      });
    }
  }, []);

  // Determine font size based on number of digits
  const getFontSize = (num: number) => {
    if (num < 10) return 'text-[8rem] md:text-[10rem]';
    return 'text-[5rem] md:text-[7rem]';
  };

  return (
    <div 
      ref={cardRef}
      className="shrink-0 relative group/card cursor-pointer"
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span 
        ref={numberRef}
        className={`absolute -left-4 md:-left-6 bottom-0 ${getFontSize(rank)} font-black z-20 group-hover/card:z-0 leading-none select-none transition-all`}
        style={{
          WebkitTextStroke: rank < 10 ? '4px #E50914' : '3px #E50914',
          color: 'transparent',
          textShadow: '3px 3px 0 #000',
          fontFamily: 'Arial Black, sans-serif',
        }}
      >
        {rank}
      </span>
      <div className="relative z-10 group-hover/card:z-30 w-32 md:w-40 aspect-2/3 ml-12 md:ml-16 rounded-lg overflow-hidden bg-gray-800 shadow-xl">
        <Image
          src={imgSrc}
          alt={item.title}
          fill
          className="object-cover transition-all duration-300"
          sizes="(max-width: 768px) 128px, 160px"
          onError={handleImageError}
        />
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
          <p className="text-sm font-semibold truncate text-white drop-shadow-lg">{item.title}</p>
        </div>
      </div>
    </div>
  );
});

// Optimized Carousel Component
const Carousel = memo(function Carousel({ 
  title, 
  items, 
  showProgress = false, 
  showRank = false, 
  rankLimit = 10,
  type = 'movie',
  isVisible = true
}: { 
  title: string; 
  items: ContentItem[]; 
  showProgress?: boolean;
  showRank?: boolean;
  rankLimit?: number;
  type?: 'movie' | 'series';
  isVisible?: boolean;
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
    if (type === 'series') {
      router.push(`/series/${id}`);
    } else {
      router.push(`/movies/${id}`);
    }
  }, [router, type]);

  if (!isVisible || items.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-xl md:text-2xl font-bold mb-4 px-4 md:px-12">{title}</h2>
      
      <div className="relative group/carousel">
        {/* Left Arrow */}
        {canScrollLeft && (
          <button 
            className="absolute left-0 top-0 bottom-0 z-20 w-12 bg-black/50 opacity-0 group-hover/carousel:opacity-100 transition-opacity flex items-center justify-center"
            onClick={() => scroll('left')}
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
        )}

        {/* Content */}
        <div 
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto overflow-y-hidden px-4 md:px-12 pb-4 no-scrollbar scroll-smooth"
        >
          {showRank ? (
            // Netflix-style with rank numbers
            items.slice(0, rankLimit).map((item, idx) => (
              <RankCard 
                key={item.id}
                item={item}
                rank={idx + 1}
                type={type}
                onClick={() => handleRankCardClick(item.id)}
              />
            ))
          ) : (
            items.map((item, idx) => (
              <MovieCard 
                key={item.id} 
                item={item} 
                showProgress={showProgress} 
                type={type}
                priority={idx < 6}
              />
            ))
          )}
        </div>

        {/* Right Arrow */}
        {canScrollRight && (
          <button 
            className="absolute right-0 top-0 bottom-0 z-20 w-12 bg-black/50 opacity-0 group-hover/carousel:opacity-100 transition-opacity flex items-center justify-center"
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
  content, 
  onPlay, 
  onInfo 
}: { 
  content: HeroContent; 
  onPlay: () => void; 
  onInfo: () => void;
}) {
  const [isMuted, setIsMuted] = useState(true);
  const [bgError, setBgError] = useState(false);
  const bgSrc = bgError ? PLACEHOLDER_BACKGROUND : (content.backgroundPath || PLACEHOLDER_BACKGROUND);

  return (
    <section className="relative h-[80vh] md:h-[90vh]">
      {/* Background */}
      <div className="absolute inset-0">
        <Image
          src={bgSrc}
          alt={content.title}
          fill
          className="object-cover object-center"
          priority
          onError={() => setBgError(true)}
        />
        <div className="absolute inset-0 bg-linear-to-r from-black via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-t from-[#141414] via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute bottom-[20%] left-4 md:left-12 z-10 max-w-xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-6xl font-black mb-4">{content.title}</h1>
          
          <div className="flex items-center gap-3 mb-4 text-sm">
            {content.rating && <span className="text-green-500 font-semibold">{Math.round(content.rating * 10)}% zgodność</span>}
            {content.year && <span>{content.year}</span>}
            <span className="px-2 py-0.5 border border-gray-400 text-xs">16+</span>
            <span className="px-2 py-0.5 border border-gray-400 text-xs">HD</span>
          </div>

          <p className="text-gray-200 mb-6 line-clamp-3 md:line-clamp-none">
            {content.description || 'Odkryj tę niesamowitą produkcję na CzystyPlayer.'}
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

      {/* Mute button */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute bottom-[20%] right-4 md:right-12 z-10 w-10 h-10 rounded-full border border-white/50 flex items-center justify-center hover:border-white transition-colors"
      >
        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      {/* Age rating badge */}
      <div className="absolute bottom-[20%] right-20 md:right-28 z-10 flex items-center gap-2">
        <div className="h-10 w-px bg-gray-400" />
        <span className="text-lg">16+</span>
      </div>
    </section>
  );
}

// TikTok Icon component
const TikTokIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
  </svg>
);

// Professional Footer with GSAP animations
function StreamingFooter() {
  const footerRef = useRef<HTMLElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);
  const socialRef = useRef<HTMLDivElement>(null);
  const badgesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Animate footer sections on mount
      gsap.fromTo(
        '.footer-section',
        { opacity: 0, y: 30 },
        { 
          opacity: 1, 
          y: 0, 
          duration: 0.6, 
          stagger: 0.1,
          ease: 'power2.out'
        }
      );

      // Animate social icons
      gsap.fromTo(
        '.social-icon',
        { opacity: 0, scale: 0.5 },
        { 
          opacity: 1, 
          scale: 1, 
          duration: 0.4, 
          stagger: 0.08,
          ease: 'back.out(1.7)',
          delay: 0.3
        }
      );

      // Animate badges
      gsap.fromTo(
        '.footer-badge',
        { opacity: 0, x: -20 },
        { 
          opacity: 1, 
          x: 0, 
          duration: 0.5, 
          stagger: 0.1,
          ease: 'power2.out',
          delay: 0.5
        }
      );
    }, footerRef);

    return () => ctx.revert();
  }, []);

  // GSAP hover animations for links
  const handleLinkHover = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    gsap.to(e.currentTarget, {
      x: 8,
      color: '#ffffff',
      duration: 0.2,
      ease: 'power2.out'
    });
  }, []);

  const handleLinkLeave = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    gsap.to(e.currentTarget, {
      x: 0,
      color: '#9ca3af',
      duration: 0.2,
      ease: 'power2.out'
    });
  }, []);

  // GSAP hover for social icons
  const handleSocialHover = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    gsap.to(e.currentTarget, {
      scale: 1.2,
      y: -4,
      duration: 0.2,
      ease: 'power2.out'
    });
    gsap.to(e.currentTarget.querySelector('.social-bg'), {
      opacity: 1,
      duration: 0.2
    });
  }, []);

  const handleSocialLeave = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    gsap.to(e.currentTarget, {
      scale: 1,
      y: 0,
      duration: 0.2,
      ease: 'power2.out'
    });
    gsap.to(e.currentTarget.querySelector('.social-bg'), {
      opacity: 0,
      duration: 0.2
    });
  }, []);

  // GSAP hover for badges
  const handleBadgeHover = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    gsap.to(e.currentTarget, {
      scale: 1.05,
      boxShadow: '0 0 20px rgba(229, 9, 20, 0.3)',
      duration: 0.2,
      ease: 'power2.out'
    });
  }, []);

  const handleBadgeLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    gsap.to(e.currentTarget, {
      scale: 1,
      boxShadow: '0 0 0px rgba(229, 9, 20, 0)',
      duration: 0.2,
      ease: 'power2.out'
    });
  }, []);

  const footerLinks = {
    tresci: [
      { label: 'Filmy', href: '/movies' },
      { label: 'Seriale', href: '/series' },
      { label: 'Akcja', href: '/movies?genre=action' },
      { label: 'Komedia', href: '/movies?genre=comedy' },
      { label: 'Dramat', href: '/movies?genre=drama' },
    ],
    pomoc: [
      { label: 'Centrum pomocy', href: '#' },
      { label: 'Kontakt', href: '#' },
      { label: 'Często zadawane pytania', href: '#' },
      { label: 'Zgłoś problem', href: '#' },
      { label: 'Instrukcje odtwarzacza', href: '#' },
    ],
    oNas: [
      { label: 'O CzystyPlayer', href: '#' },
      { label: 'Kariera', href: '#' },
      { label: 'Nowości', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Partnerzy', href: '#' },
    ],
    prawne: [
      { label: 'Warunki korzystania', href: '#' },
      { label: 'Polityka prywatności', href: '#' },
      { label: 'Ustawienia cookies', href: '#' },
      { label: 'Informacje prawne', href: '#' },
      { label: 'Regulamin', href: '#' },
    ],
  };

  const socialLinks = [
    { icon: Facebook, href: '#', label: 'Facebook', color: '#1877f2' },
    { icon: Twitter, href: '#', label: 'Twitter', color: '#1da1f2' },
    { icon: Instagram, href: '#', label: 'Instagram', color: '#e4405f' },
    { icon: Youtube, href: '#', label: 'YouTube', color: '#ff0000' },
    { icon: TikTokIcon, href: '#', label: 'TikTok', color: '#000000', isCustom: true },
  ];

  return (
    <footer 
      ref={footerRef}
      className="relative mt-20 bg-linear-to-b from-[#141414] to-[#0a0a0a] border-t border-gray-800/50"
    >
      {/* Decorative top line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-[#E50914] to-transparent opacity-50" />
      
      <div className="max-w-7xl mx-auto px-4 md:px-12 py-12">
        {/* Main footer content */}
        <div ref={linksRef} className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Treści */}
          <div className="footer-section">
            <h3 className="text-white font-semibold mb-4 text-lg">Treści</h3>
            <ul className="space-y-3">
              {footerLinks.tresci.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onMouseEnter={handleLinkHover}
                    onMouseLeave={handleLinkLeave}
                    className="text-gray-400 text-sm inline-block transition-colors cursor-pointer"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Pomoc */}
          <div className="footer-section">
            <h3 className="text-white font-semibold mb-4 text-lg">Pomoc</h3>
            <ul className="space-y-3">
              {footerLinks.pomoc.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onMouseEnter={handleLinkHover}
                    onMouseLeave={handleLinkLeave}
                    className="text-gray-400 text-sm inline-block transition-colors cursor-pointer"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* O nas */}
          <div className="footer-section">
            <h3 className="text-white font-semibold mb-4 text-lg">O nas</h3>
            <ul className="space-y-3">
              {footerLinks.oNas.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onMouseEnter={handleLinkHover}
                    onMouseLeave={handleLinkLeave}
                    className="text-gray-400 text-sm inline-block transition-colors cursor-pointer"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Prawne */}
          <div className="footer-section">
            <h3 className="text-white font-semibold mb-4 text-lg">Prawne</h3>
            <ul className="space-y-3">
              {footerLinks.prawne.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onMouseEnter={handleLinkHover}
                    onMouseLeave={handleLinkLeave}
                    className="text-gray-400 text-sm inline-block transition-colors cursor-pointer"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Social Media Section */}
        <div className="flex flex-col items-center mb-10">
          <h3 className="text-gray-400 text-sm mb-4 tracking-wider uppercase">Obserwuj nas</h3>
          <div ref={socialRef} className="flex gap-4">
            {socialLinks.map((social, idx) => (
              <a
                key={social.label}
                href={social.href}
                aria-label={social.label}
                onMouseEnter={handleSocialHover}
                onMouseLeave={handleSocialLeave}
                className="social-icon relative w-12 h-12 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 cursor-pointer overflow-hidden group"
              >
                <div 
                  className="social-bg absolute inset-0 opacity-0 transition-opacity"
                  style={{ backgroundColor: social.color }}
                />
                <span className="relative z-10 group-hover:text-white transition-colors">
                  {social.isCustom ? (
                    <TikTokIcon />
                  ) : (
                    <social.icon className="w-5 h-5" />
                  )}
                </span>
              </a>
            ))}
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
                Ciesz się nieograniczonym dostępem do tysięcy tytułów w jakości HD i 4K.
              </p>
            </div>

            {/* Version info */}
            <div className="text-right hidden md:block">
              <p className="text-gray-600 text-xs flex items-center gap-2">
                <span className="text-gray-500">&lt;/&gt;</span>
                <span>Powered by Next.js & Advanced Streaming Technology</span>
              </p>
              <p className="text-gray-700 text-xs mt-1">
                Version 2.1.0 — Build 12.12.2025
              </p>
            </div>
          </div>

          {/* Feature badges */}
          <div ref={badgesRef} className="flex flex-wrap justify-center gap-3 mt-8">
            <div 
              onMouseEnter={handleBadgeHover}
              onMouseLeave={handleBadgeLeave}
              className="footer-badge flex items-center gap-2 px-4 py-2 rounded-full border border-[#E50914]/30 bg-[#E50914]/10 cursor-pointer transition-all"
            >
              <div className="w-2 h-2 rounded-full bg-[#E50914] animate-pulse" />
              <span className="text-[#E50914] text-xs font-medium">Streaming HD</span>
            </div>
            <div 
              onMouseEnter={handleBadgeHover}
              onMouseLeave={handleBadgeLeave}
              className="footer-badge flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 cursor-pointer transition-all"
            >
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="text-blue-400 text-xs font-medium">Dostęp mobilny</span>
            </div>
            <div 
              onMouseEnter={handleBadgeHover}
              onMouseLeave={handleBadgeLeave}
              className="footer-badge flex items-center gap-2 px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10 cursor-pointer transition-all"
            >
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="text-green-400 text-xs font-medium">Offline</span>
            </div>
            <div 
              onMouseEnter={handleBadgeHover}
              onMouseLeave={handleBadgeLeave}
              className="footer-badge flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 cursor-pointer transition-all"
            >
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-purple-400 text-xs font-medium">Wiele profili</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function BrowsePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, checkAuth, tokens } = useAuthStore();
  const [heroContent, setHeroContent] = useState<HeroContent>(defaultHero);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroItems, setHeroItems] = useState<HeroContent[]>([defaultHero]);
  
  // All content states
  const [continueWatching, setContinueWatching] = useState<ContinueItem[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<ContentItem[]>([]);
  const [trendingSeries, setTrendingSeries] = useState<ContentItem[]>([]);
  const [mostWatchedMovies2024, setMostWatchedMovies2024] = useState<ContentItem[]>([]);
  const [mostWatchedSeries2024, setMostWatchedSeries2024] = useState<ContentItem[]>([]);
  const [randomMovies, setRandomMovies] = useState<ContentItem[]>([]);
  const [randomSeries, setRandomSeries] = useState<ContentItem[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<ContentItem[]>([]);
  
  const [userId, setUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get access token
  const accessToken = tokens?.accessToken || null;

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/browse');
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch AI recommendations from database
  useEffect(() => {
    const fetchAiRecommendations = async () => {
      if (!isAuthenticated || !accessToken) return;
      
      try {
        const res = await fetch('/api/user/ai-recommendations?limit=20', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        
        if (data.success && data.searches) {
          // Get unique recommendations from all searches
          const allRecs: ContentItem[] = [];
          for (const search of data.searches) {
            for (const rec of search.recommendations || []) {
              if (!allRecs.some(r => r.id === rec.content_id && r.content_type === rec.content_type)) {
                allRecs.push({
                  id: rec.content_id,
                  title: rec.title,
                  posterPath: rec.poster_path || '/images/placeholder-poster.jpg',
                  year: rec.year,
                  rating: rec.rating,
                  categories: rec.categories,
                  content_type: rec.content_type,
                });
              }
            }
          }
          setAiRecommendations(allRecs.slice(0, 15));
        }
      } catch (e) {
        console.error('Error loading AI recommendations:', e);
      }
    };
    
    fetchAiRecommendations();
  }, [isAuthenticated, accessToken]);

  // Fetch user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUserId(data.user?.id);
        }
      } catch (err) {
        console.error('Error fetching user:', err);
      }
    };
    fetchUser();
  }, []);

  // Fetch all browse content in one optimized request
  useEffect(() => {
    const fetchContent = async () => {
      try {
        setIsLoading(true);
        
        const res = await fetch('/api/content/browse?type=all');
        if (res.ok) {
          const data = await res.json();
          
          if (data.success) {
            // Set hero items (combine movies and series heroes)
            const heroes: HeroContent[] = [
              ...(data.heroMovies || []).map((m: ContentItem) => ({ ...m, type: 'movie' as const })),
              ...(data.heroSeries || []).map((s: ContentItem) => ({ ...s, type: 'series' as const })),
            ].filter(h => h.backgroundPath);
            
            if (heroes.length > 0) {
              setHeroItems(heroes);
              setHeroContent(heroes[0]);
            }
            
            // Set all content
            setTrendingMovies(data.movies?.trending || []);
            setTrendingSeries(data.series?.trending || []);
            setMostWatchedMovies2024(data.movies?.mostWatched2024 || []);
            setMostWatchedSeries2024(data.series?.mostWatched2024 || []);
            setRandomMovies(data.movies?.random || []);
            setRandomSeries(data.series?.random || []);
          }
        }
      } catch (err) {
        console.error('Error fetching content:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchContent();
    }
  }, [isAuthenticated]);

  // Fetch continue watching (separate request for user-specific data)
  useEffect(() => {
    const fetchContinueWatching = async () => {
      if (!userId) return;
      
      try {
        const watchRes = await fetch(`/api/watch?userId=${userId}&action=continue&limit=10`);
        if (watchRes.ok) {
          const watchData = await watchRes.json();

          type ContinueWatchingSession = {
            id: number;
            content_id: string;
            content_type: 'movie' | 'series';
            season_number: number | null;
            episode_number: number | null;
            watch_time: number;
            total_duration: number;
            watch_percentage: number | string;
            completed: boolean;
            content_title: string | null;
            poster_path: string | null;
          };

          const sessions: ContinueWatchingSession[] = Array.isArray(watchData.data) ? watchData.data : [];
          setContinueWatching(
            sessions.map((item) => {
              const contentIdNum = Number(item.content_id);
              const safeProgress = item.total_duration > 0
                ? Math.round((item.watch_time / item.total_duration) * 100)
                : Math.round(Number(item.watch_percentage) || 0);

              const posterFallback = item.content_type === 'series'
                ? '/images/imgSeriesPoster_final/placeholder.jpg'
                : '/images/imgPoster/placeholder.jpg';

              return {
                id: item.id,
                title: item.content_title || 'Unknown',
                poster: item.poster_path || posterFallback,
                progress: Math.min(Math.max(safeProgress, 0), 100),
                content_type: item.content_type,
                content_id: Number.isFinite(contentIdNum) ? contentIdNum : 0,
                season_number: item.season_number,
                episode_number: item.episode_number,
              };
            })
          );
        }
      } catch (err) {
        console.error('Error fetching continue watching:', err);
      }
    };

    fetchContinueWatching();
  }, [userId]);

  // Auto-rotate hero content every 8 seconds
  useEffect(() => {
    if (heroItems.length <= 1) return;
    
    const interval = setInterval(() => {
      setHeroIndex(prev => {
        const next = (prev + 1) % heroItems.length;
        setHeroContent(heroItems[next]);
        return next;
      });
    }, 8000);
    
    return () => clearInterval(interval);
  }, [heroItems]);

  const handleHeroPlay = useCallback(() => {
    if (heroContent.type === 'series') {
      router.push(`/watch/series/${heroContent.id}`);
    } else {
      router.push(`/watch/movie/${heroContent.id}`);
    }
  }, [router, heroContent]);

  const handleHeroInfo = useCallback(() => {
    if (heroContent.type === 'series') {
      router.push(`/series/${heroContent.id}`);
    } else {
      router.push(`/movies/${heroContent.id}`);
    }
  }, [router, heroContent]);

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
      <HeroSection 
        content={heroContent} 
        onPlay={handleHeroPlay} 
        onInfo={handleHeroInfo} 
      />

      {/* Hero Dots Indicator */}
      {heroItems.length > 1 && (
        <div className="absolute bottom-[25%] left-1/2 transform -translate-x-1/2 z-20 flex gap-2">
          {heroItems.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setHeroIndex(idx);
                setHeroContent(heroItems[idx]);
              }}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === heroIndex ? 'bg-white' : 'bg-gray-500'
              }`}
            />
          ))}
        </div>
      )}

      {/* Content Rows */}
      <div className="-mt-32 relative z-10">
        {/* Continue Watching */}
        {continueWatching.length > 0 && (
          <Carousel 
            title="Kontynuuj oglądanie" 
            items={continueWatching.map(c => ({ 
              id: c.id, 
              title: c.title, 
              posterPath: c.poster,
              content_type: c.content_type,
              content_id: c.content_id,
              season_number: c.season_number,
              episode_number: c.episode_number,
              progress: c.progress
            }))} 
            showProgress 
          />
        )}
        
        {/* Filmy na czasie */}
        <Carousel 
          title="Filmy na czasie" 
          items={trendingMovies} 
          type="movie"
        />
        
        {/* Top 10 Movies */}
        <Carousel 
          title="Top 10 filmów w Polsce" 
          items={trendingMovies.slice(0, 10)} 
          showRank 
          type="movie"
        />
        
        {/* Seriale na czasie */}
        <Carousel 
          title="Seriale na czasie" 
          items={trendingSeries} 
          type="series"
        />
        
        {/* Top 10 Series */}
        <Carousel 
          title="Top 10 seriali w Polsce" 
          items={trendingSeries.slice(0, 10)} 
          showRank 
          type="series"
        />
        
        {/* Najczęściej oglądane filmy z 2024/2025 */}
        <Carousel 
          title="Najczęściej oglądane filmy z 2024 i 2025 roku" 
          items={mostWatchedMovies2024} 
          showRank
          rankLimit={15}
          type="movie"
        />
        
        {/* Najczęściej oglądane seriale z 2024/2025 */}
        <Carousel 
          title="Najczęściej oglądane seriale z 2024 i 2025 roku" 
          items={mostWatchedSeries2024} 
          showRank
          rankLimit={15}
          type="series"
        />
        
        {/* Twoje rekomendacje AI */}
        {aiRecommendations.length > 0 && (
          <div className="relative">
            <div className="flex items-center justify-between mb-4 px-4 md:px-12">
              <div className="flex items-center gap-3">
                <span className="text-2xl"></span>
                <h2 className="text-xl md:text-2xl font-bold text-white">Twoje rekomendacje AI</h2>
              </div>
              <a 
                href="/ai-suggestions" 
                className="text-sm text-[#E50914] hover:text-[#ff0f1f] transition-colors"
              >
                Szukaj więcej →
              </a>
            </div>
            <Carousel 
              title="" 
              items={aiRecommendations} 
              type="movie"
            />
          </div>
        )}
        
        {/* Losowe filmy */}
        <Carousel 
          title="Losowe filmy" 
          items={randomMovies} 
          type="movie"
        />
        
        {/* Losowe seriale */}
        <Carousel 
          title="Losowe seriale" 
          items={randomSeries} 
          type="series"
        />
        
        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="animate-pulse text-gray-400">Ładowanie treści...</div>
          </div>
        )}
      </div>

      {/* Professional Footer with GSAP animations */}
      <StreamingFooter />
    </div>
  );
}
