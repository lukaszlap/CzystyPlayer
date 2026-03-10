'use client';

import { useMemo } from 'react';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  username?: string;
  email?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Generate a consistent color based on the username/email
function generateColor(str: string): string {
  if (!str) return 'bg-gray-600';
  
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ];
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

// Get initials from username or email
function getInitials(username?: string, email?: string): string {
  if (username) {
    const parts = username.split(/[\s._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return username.slice(0, 2).toUpperCase();
  }
  
  if (email) {
    const localPart = email.split('@')[0];
    const parts = localPart.split(/[\s._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return localPart.slice(0, 2).toUpperCase();
  }
  
  return 'U';
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

export function UserAvatar({ username, email, size = 'md', className }: UserAvatarProps) {
  const initials = useMemo(() => getInitials(username, email), [username, email]);
  const colorClass = useMemo(() => generateColor(username || email || ''), [username, email]);
  
  // If no username or email, show default icon
  if (!username && !email) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center rounded-full bg-gray-600 text-white',
          sizeClasses[size],
          className
        )}
      >
        <User className={cn(
          size === 'sm' ? 'w-4 h-4' : 
          size === 'md' ? 'w-5 h-5' : 
          size === 'lg' ? 'w-6 h-6' : 'w-8 h-8'
        )} />
      </div>
    );
  }
  
  return (
    <div 
      className={cn(
        'flex items-center justify-center rounded-full text-white font-semibold',
        sizeClasses[size],
        colorClass,
        className
      )}
      title={username || email}
    >
      {initials}
    </div>
  );
}

export default UserAvatar;
