'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, ChevronRight, Check, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
import gsap from 'gsap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StreamingNavbar } from '@/components/layout/StreamingNavbar';

// TikTok Icon Component
const TikTokIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
  </svg>
);

// Animated Typewriter Text Component
function AnimatedHeroTitle() {
  const containerRef = useRef<HTMLHeadingElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const [displayText, setDisplayText] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  
  const phrases = [
    'Nieograniczone filmy,',
    'seriale i wiele więcej'
  ];
  
  useEffect(() => {
    const fullText = phrases.join('\n');
    let currentIndex = 0;
    let currentText = '';
    
    // Cursor blinking animation
    const cursorTl = gsap.timeline({ repeat: -1 });
    cursorTl.to(cursorRef.current, {
      opacity: 0,
      duration: 0.5,
      ease: 'power2.inOut'
    }).to(cursorRef.current, {
      opacity: 1,
      duration: 0.5,
      ease: 'power2.inOut'
    });
    
    // Typewriter effect
    const typeInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        currentText += fullText[currentIndex];
        setDisplayText(currentText);
        currentIndex++;
        
        // Add a small shake effect on each letter
        if (containerRef.current) {
          gsap.fromTo(containerRef.current, 
            { x: 1 }, 
            { x: 0, duration: 0.1, ease: 'power2.out' }
          );
        }
      } else {
        clearInterval(typeInterval);
        setIsTypingComplete(true);
        
        // Animate glow effect after typing is complete
        if (containerRef.current) {
          gsap.to(containerRef.current, {
            textShadow: '0 0 40px rgba(229, 9, 20, 0.5), 0 0 80px rgba(229, 9, 20, 0.3)',
            duration: 1,
            ease: 'power2.out'
          });
        }
        
        // Hide cursor after typing
        setTimeout(() => {
          if (cursorRef.current) {
            cursorTl.kill();
            gsap.to(cursorRef.current, { opacity: 0, duration: 0.3 });
          }
        }, 1500);
      }
    }, 50);
    
    return () => {
      clearInterval(typeInterval);
      cursorTl.kill();
    };
  }, []);
  
  const lines = displayText.split('\n');
  
  return (
    <h1 
      ref={containerRef}
      className="text-4xl md:text-6xl font-black mb-4 leading-tight relative"
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 50%, #e0e0e0 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
    >
      {lines.map((line, index) => (
        <span key={index} className="block">
          {line.split('').map((char, charIndex) => (
            <span
              key={`${index}-${charIndex}`}
              className="inline-block"
              style={{
                animationName: isTypingComplete ? 'none' : 'letterPop',
                animationDuration: '0.1s',
                animationTimingFunction: 'ease-out',
                animationDelay: `${(index * 30 + charIndex) * 50}ms`,
                animationFillMode: 'both',
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </span>
      ))}
      <span 
        ref={cursorRef}
        className="inline-block w-[3px] h-[1em] bg-[#E50914] ml-1 align-middle"
        style={{ verticalAlign: 'middle' }}
      />
      
      <style jsx>{`
        @keyframes letterPop {
          0% {
            opacity: 0;
            transform: translateY(10px) scale(0.8);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </h1>
  );
}

// Sample movie data for Top 10
const top10Movies = [
  { id: 1, title: 'Nosferatu', poster: '/images/imgPoster/64516_Nosferatu.jpg', rank: 1 },
  { id: 2, title: 'Mufasa: Król Lew', poster: '/images/imgPoster/64382_Mufasa__Król_Lew___Mufasa__The_Lion_King.jpg', rank: 2 },
  { id: 3, title: 'Twoja wina', poster: '/images/imgPoster/64478_Twoja_wina___Culpa_Tuya.jpg', rank: 3 },
  { id: 4, title: 'Znowu w akcji', poster: '/images/imgPoster/64652_Znowu_w_akcji___Back_in_Action.jpg', rank: 4 },
  { id: 5, title: 'Kontrola bezpieczeństwa', poster: '/images/imgPoster/64322_Kontrola_bezpieczeństwa___Carry-On.jpg', rank: 5 },
  { id: 6, title: 'Gladiator II', poster: '/images/imgPoster/64086_Gladiator_II.jpg', rank: 6 },
  { id: 7, title: 'Wicked', poster: '/images/imgPoster/64181_Wicked.jpg', rank: 7 },
  { id: 8, title: 'Sonic 3', poster: '/images/imgPoster/64390_Sonic_3__Szybki_jak_błyskawica___Sonic_the_Hedgeho.jpg', rank: 8 },
  { id: 9, title: 'Venom 3', poster: '/images/imgPoster/63913_Venom_3__Ostatni_taniec___Venom__The_Last_Dance.jpg', rank: 9 },
  { id: 10, title: 'Substancja', poster: '/images/imgPoster/63612_Substancja___The_Substance.jpg', rank: 10 },
];

const pricingPlans = [
  {
    name: 'Free',
    subtitle: 'Start bez karty • zawsze 0 zł',
    price: '0',
    features: [
      'Jakość 720p',
      '1 urządzenie',
      'Sporadyczne reklamy',
      'Autoodtwarzanie',
      'Autosugestie',
      'Zapamiętywanie stanu oglądania',
      'Przeglądanie opinii o serialu',
      'Podstawowe rekomendacje',
    ],
    buttonText: 'Aktywuj darmowy plan',
    buttonVariant: 'outline' as const,
  },
  {
    name: 'Premium',
    subtitle: 'Rodzina i znajomi • do 4 ekranów',
    price: '10',
    popular: true,
    features: [
      'Jakość 4K HDR',
      'Zaawansowane rekomendacje',
      'Analiza treści AI',
      'Wirtualny asystent',
      'Przeglądanie opinii o serialu',
      'Informacje o najnowszych artykułach i nowinkach',
      'Pobieranie offline',
      'Max 4 oglądania jednocześnie',
      'Brak reklam',
      'Autosugestie',
      'Priorytetowy support',
    ],
    buttonText: 'Wybierz Premium',
    buttonVariant: 'primary' as const,
  },
  {
    name: 'Standard',
    subtitle: 'Dwie osoby • max 2 oglądania',
    price: '6',
    features: [
      'Full HD (wybrane 4K)',
      'Rekomendacje',
      'Przeglądanie opinii o serialu',
      'Najnowsze artykuły i nowinki',
      'Max 2 oglądania jednocześnie',
      'Brak reklam',
      'Autosugestie',
      'Priorytetowy support',
    ],
    buttonText: 'Wybierz Standard',
    buttonVariant: 'outline' as const,
  },
];

const faqs = [
  {
    question: 'Czym jest CzystyPlayer?',
    answer: 'CzystyPlayer to nowoczesna platforma streamingowa oferująca szeroki wybór filmów, seriali, anime i dokumentów. Dzięki zaawansowanej technologii streamingu możesz oglądać w jakości do 4K HDR na dowolnym urządzeniu połączonym z Internetem.',
  },
  {
    question: 'Ile kosztuje CzystyPlayer?',
    answer: 'Oferujemy trzy plany: Darmowy (0 zł/mies. z reklamami), Standard (6 zł/mies. z Full HD i 2 urządzeniami) oraz Premium (10 zł/mies. z 4K HDR, 4 urządzeniami i wszystkimi funkcjami). Przy płatności za cały rok oszczędzasz 15% i odblokowujesz wcześniejszy dostęp do nowych funkcji.',
  },
  {
    question: 'Gdzie mogę oglądać?',
    answer: 'Oglądaj na Smart TV, PlayStation, Xbox, komputerze, tablecie, telefonie i wielu innych urządzeniach. Wystarczy zalogować się na swoje konto, aby natychmiast rozpocząć oglądanie. Plan Premium pozwala również na pobieranie treści do oglądania offline.',
  },
  {
    question: 'Jak anulować subskrypcję?',
    answer: 'CzystyPlayer jest elastyczny - brak umów i zobowiązań. Możesz anulować lub zmienić plan w dowolnym momencie w ustawieniach konta. Po anulowaniu masz dostęp do końca opłaconego okresu.',
  },
  {
    question: 'Czym różnią się plany?',
    answer: 'Plan Darmowy oferuje jakość 720p z reklamami. Standard to Full HD, 2 urządzenia i brak reklam. Premium daje 4K HDR, 4 urządzenia, pobieranie offline, wirtualnego asystenta AI i priorytetowy support.',
  },
  {
    question: 'Czy mogę oglądać z rodziną?',
    answer: 'Tak! Plan Standard pozwala na oglądanie na 2 urządzeniach jednocześnie, a Premium na 4 urządzeniach. Każdy członek rodziny może mieć własny profil z personalizowanymi rekomendacjami.',
  },
];

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <StreamingNavbar variant="landing" />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Video */}
        <div className="absolute inset-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="/images/assets/heroBG.mp4" type="video/mp4" />
          </video>
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-linear-to-t from-[#141414] via-transparent to-[#141414]/60" />
          <div className="absolute inset-0 bg-black/40" />
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 text-center pt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto"
          >
            <AnimatedHeroTitle />
            <p className="text-xl md:text-2xl text-gray-200 mb-6">
              Oglądaj gdziekolwiek. Anuluj w dowolnym momencie.
            </p>
            <p className="text-lg text-gray-300 mb-8">
              Gotowy do oglądania? Wpisz adres e-mail, aby utworzyć konto lub zalogować się.
            </p>

            {/* Email CTA */}
            <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
              <Input
                type="email"
                placeholder="Adres e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 h-14 bg-black/60 border-gray-600 text-white placeholder:text-gray-400 text-lg px-4"
              />
              <Link href={email ? `/auth/register?email=${encodeURIComponent(email)}` : '/auth/register'}>
                <Button className="h-14 px-8 bg-[#E50914] hover:bg-[#f40612] text-white text-xl font-semibold w-full sm:w-auto">
                  Rozpocznij <ChevronRight className="ml-2 h-6 w-6" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Divider */}
      <div className="h-2 bg-[#232323]" />

      {/* Top 10 Section */}
      <section className="py-16 bg-[#141414]">
        <div className="px-4 md:px-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">
            Top 10 filmów w Polsce dziś
          </h2>
          
          <div className="flex gap-4 overflow-x-auto overflow-y-hidden pb-4 no-scrollbar">
            {top10Movies.map((movie, index) => (
              <motion.div
                key={movie.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="shrink-0 relative group cursor-pointer"
              >
                {/* Rank Number */}
                <span className="absolute -left-4 bottom-0 text-[8rem] font-black z-0 leading-none select-none"
                  style={{
                    WebkitTextStroke: '4px #E50914',
                    color: 'transparent',
                    textShadow: '4px 4px 0 #000',
                  }}
                >
                  {movie.rank}
                </span>
                
                {/* Poster */}
                <div className="relative w-32 md:w-40 aspect-2/3 ml-12 rounded overflow-hidden z-10 transition-transform duration-300 group-hover:scale-110">
                  <Image
                    src={movie.poster}
                    alt={movie.title}
                    fill
                    className="object-cover"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="h-2 bg-[#232323]" />

      {/* Features Section */}
      <section className="py-16 bg-[#141414]">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 items-center max-w-6xl mx-auto">
            {/* TV Feature */}
            <div className="text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Oglądaj na telewizorze
              </h2>
              <p className="text-lg text-gray-300">
                Oglądaj na Smart TV, PlayStation, Xbox, Chromecast, Apple TV, 
                odtwarzaczach Blu-ray i innych urządzeniach.
              </p>
            </div>
            <div className="relative">
              <div className="aspect-video bg-linear-to-br from-[#E50914]/20 to-transparent rounded-lg flex items-center justify-center">
                <Play className="h-20 w-20 text-white/80" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="h-2 bg-[#232323]" />

      {/* Download Feature */}
      <section className="py-16 bg-[#141414]">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 items-center max-w-6xl mx-auto">
            <div className="order-2 md:order-1 relative">
              <div className="aspect-video bg-linear-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-2 bg-[#E50914] rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-400">Pobieranie...</p>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2 text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Pobieraj i oglądaj offline
              </h2>
              <p className="text-lg text-gray-300">
                Zapisuj ulubione tytuły i zawsze miej coś do oglądania.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="h-2 bg-[#232323]" />

      {/* Pricing Section */}
      <section className="py-16 bg-[#141414]">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Wybierz plan dla siebie
          </h2>
          <p className="text-gray-400 text-center mb-4 max-w-2xl mx-auto">
            Przy płatności za cały rok oszczędzasz 15% i odblokowujesz wcześniejszy dostęp do nowych funkcji (Features Preview).
          </p>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mt-12">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15, duration: 0.5 }}
                whileHover={{ 
                  scale: plan.popular ? 1.02 : 1.05,
                  transition: { duration: 0.2 }
                }}
                className={`
                  rounded-2xl p-6 relative border transition-all duration-300
                  ${plan.popular 
                    ? 'border-[#E50914] bg-linear-to-b from-[#1a1a1a] to-[#0d0d0d] shadow-[0_0_30px_rgba(229,9,20,0.3)]' 
                    : 'border-gray-700/50 bg-[#1a1a1a] hover:border-gray-600'
                  }
                `}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-[#E50914] text-white text-xs font-bold px-4 py-2 rounded-full whitespace-nowrap shadow-lg">
                      Najczęściej wybierany
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-6 pt-2">
                  <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
                  {plan.subtitle && (
                    <p className="text-gray-500 text-sm">{plan.subtitle}</p>
                  )}
                </div>
                
                <div className="text-center mb-6">
                  <span className="text-5xl font-black">{plan.price} zł</span>
                  <span className="text-gray-400 text-lg">/mies</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-[#E50914] shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/auth/register" className="block">
                  <Button 
                    variant={plan.buttonVariant === 'primary' ? 'default' : 'outline'}
                    className={`w-full py-3 font-semibold transition-all duration-300 ${
                      plan.popular 
                        ? 'bg-[#E50914] hover:bg-[#f40612] text-white shadow-lg hover:shadow-[0_0_20px_rgba(229,9,20,0.4)]' 
                        : 'border-gray-600 text-white hover:bg-white/10 hover:border-white'
                    }`}
                  >
                    {plan.buttonText}
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="h-2 bg-[#232323]" />

      {/* FAQ Section */}
      <section className="py-16 bg-[#141414]">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Często zadawane pytania
          </h2>

          <div className="max-w-3xl mx-auto space-y-2">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-[#2d2d2d] hover:bg-[#3d3d3d] transition-colors">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left"
                >
                  <span className="text-lg font-medium">{faq.question}</span>
                  <svg
                    className={`h-6 w-6 transition-transform ${openFaq === index ? 'rotate-45' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-5 text-gray-300">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <p className="text-lg text-gray-300 mb-6">
              Gotowy do oglądania? Wpisz adres e-mail, aby utworzyć konto.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
              <Input
                type="email"
                placeholder="Adres e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 h-14 bg-black/60 border-gray-600 text-white placeholder:text-gray-400"
              />
              <Link href={email ? `/auth/register?email=${encodeURIComponent(email)}` : '/auth/register'}>
                <Button className="h-14 px-8 bg-[#E50914] hover:bg-[#f40612] text-white text-lg font-semibold w-full sm:w-auto">
                  Rozpocznij <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Professional Footer with GSAP animations */}
      <StreamingFooter />
    </div>
  );
}

// Professional Footer Component with GSAP animations
function StreamingFooter() {
  const footerRef = useRef<HTMLElement>(null);

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
          ease: 'power2.out',
          scrollTrigger: {
            trigger: footerRef.current,
            start: 'top 90%',
          }
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
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
          <div className="flex gap-4">
            {socialLinks.map((social) => (
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
                Version 2.1.0 — Build 14.12.2025
              </p>
            </div>
          </div>

          {/* Feature badges */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
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
