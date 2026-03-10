'use client';

import { motion } from 'framer-motion';

export function GlassCard({ 
  children, 
  className = '',
  hover = true,
}: { 
  children: React.ReactNode; 
  className?: string;
  hover?: boolean;
}) {
  return (
    <motion.div
      whileHover={hover ? { scale: 1.02, y: -5 } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`
        relative overflow-hidden rounded-2xl
        bg-white/80 dark:bg-white/5
        backdrop-blur-xl
        border border-black/10 dark:border-white/10
        shadow-xl shadow-black/5 dark:shadow-black/20
        ${className}
      `}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-linear-to-br from-white/50 dark:from-white/10 via-transparent to-transparent pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

export function GlassInput({
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`
        w-full px-4 py-3 rounded-xl
        bg-white/50 dark:bg-white/5
        backdrop-blur-md
        border border-black/10 dark:border-white/10
        text-foreground placeholder:text-muted-foreground
        focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
        transition-all duration-300
        ${className}
      `}
      {...props}
    />
  );
}

interface GlassButtonProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'primary' | 'ghost' | 'outline';
  size?: 'sm' | 'default' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export function GlassButton({
  children,
  className = '',
  variant = 'default',
  size = 'default',
  onClick,
  disabled,
  type = 'button',
}: GlassButtonProps) {
  const variants = {
    default: 'bg-white/10 hover:bg-white/20 border-white/20',
    primary: 'bg-primary/80 hover:bg-primary border-primary/50 text-primary-foreground',
    ghost: 'bg-transparent hover:bg-white/10 border-transparent',
    outline: 'bg-transparent border-white/30 hover:bg-white/10',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    default: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      type={type}
      className={`
        inline-flex items-center justify-center gap-2 rounded-xl
        backdrop-blur-md font-medium
        border transition-all duration-300
        focus:outline-none focus:ring-2 focus:ring-primary/50
        disabled:opacity-50 disabled:pointer-events-none
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
    >
      {children}
    </motion.button>
  );
}

export function GlassContainer({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`
        relative rounded-3xl overflow-hidden
        bg-white/5 dark:bg-white/2
        backdrop-blur-2xl
        border border-black/5 dark:border-white/10
        shadow-2xl
        ${className}
      `}
    >
      {/* Ambient glow effects - black & white */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 dark:bg-white/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-black/5 dark:bg-white/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

export function FloatingOrb({
  className = '',
  color = 'white',
  size = 'md',
}: {
  className?: string;
  color?: 'white' | 'gray' | 'black';
  size?: 'sm' | 'md' | 'lg';
}) {
  const colors = {
    white: 'bg-white/10 dark:bg-white/5',
    gray: 'bg-gray-500/10 dark:bg-gray-400/5',
    black: 'bg-black/5 dark:bg-white/5',
  };

  const sizes = {
    sm: 'w-32 h-32',
    md: 'w-64 h-64',
    lg: 'w-96 h-96',
  };

  return (
    <motion.div
      animate={{
        y: [0, -20, 0],
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className={`
        absolute rounded-full blur-3xl
        ${colors[color]}
        ${sizes[size]}
        ${className}
      `}
    />
  );
}

export function GradientText({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`
        bg-linear-to-r from-foreground via-foreground/80 to-foreground
        bg-clip-text text-transparent
        ${className}
      `}
    >
      {children}
    </span>
  );
}

interface ShimmerButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export function ShimmerButton({
  children,
  className = '',
  onClick,
  disabled,
  type = 'button',
}: ShimmerButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      type={type}
      className={`
        relative inline-flex items-center justify-center
        px-6 py-3 rounded-xl font-semibold
        bg-foreground text-background
        overflow-hidden
        transition-all duration-300
        focus:outline-none focus:ring-2 focus:ring-foreground/50
        disabled:opacity-50 disabled:pointer-events-none
        ${className}
      `}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-linear-to-r from-transparent via-white/20 to-transparent" />
      
      <span className="relative z-10 inline-flex items-center justify-center gap-2">{children}</span>
    </motion.button>
  );
}

export function ParticleBackground() {
  const seeded = (n: number) => {
    const x = Math.sin(n * 9999) * 10000;
    return x - Math.floor(x);
  };

  const particles = Array.from({ length: 50 }, (_, i) => {
    const x = seeded(i + 1) * 100;
    const y = seeded(i + 2) * 100;
    const rise = seeded(i + 3) * 40 + 20; // vh
    const duration = seeded(i + 4) * 3 + 2;
    const delay = seeded(i + 5) * 2;
    const endY = Math.max(y - rise, -20);
    return { i, x, y, endY, duration, delay };
  });

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.i}
          className="absolute w-1 h-1 bg-white/20 rounded-full"
          initial={{
            x: `${p.x}vw`,
            y: `${p.y}vh`,
          }}
          animate={{
            y: [`${p.y}vh`, `${p.endY}vh`],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
}
