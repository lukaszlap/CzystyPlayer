'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';

interface MovieSource {
  id: number;
  url: string;
  hosting: string;
  quality: string;
  language: string;
}

interface Movie {
  id: number;
  title: string;
  slug: string;
  posterPath?: string;
  backgroundPath?: string;
  year?: string;
  rating?: number;
  description?: string;
  categories?: string;
}

export default function WatchMoviePage() {
  const params = useParams();
  const router = useRouter();
  const movieId = params.id as string;

  const [movie, setMovie] = useState<Movie | null>(null);
  const [sources, setSources] = useState<MovieSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | undefined>();
  const [initialProgress, setInitialProgress] = useState(0);

  // Get current user
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

  // Fetch movie data
  useEffect(() => {
    const fetchMovie = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/content/movies/${movieId}`);
        
        if (!res.ok) {
          throw new Error('Movie not found');
        }

        const data = await res.json();
        setMovie(data.movie);
        setSources(data.sources || []);
      } catch (err) {
        console.error('Error fetching movie:', err);
        setError(err instanceof Error ? err.message : 'Failed to load movie');
      } finally {
        setLoading(false);
      }
    };

    if (movieId) {
      fetchMovie();
    }
  }, [movieId]);
  
  // Fetch watch progress separately when userId is available
  useEffect(() => {
    const fetchProgress = async () => {
      if (!userId || !movieId) return;
      
      try {
        const watchRes = await fetch(
          `/api/watch?userId=${userId}&action=progress&contentId=${movieId}&contentType=movie`
        );
        if (watchRes.ok) {
          const watchData = await watchRes.json();
          if (watchData.success && watchData.data) {
            // watch_time is the saved position in seconds
            setInitialProgress(watchData.data.watch_time || 0);
          }
        }
      } catch (err) {
        console.error('Error fetching watch progress:', err);
      }
    };
    
    fetchProgress();
  }, [userId, movieId]);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="animate-pulse text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-4">{error || 'Movie not found'}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-yellow-500 text-xl mb-4">No video sources available for this movie</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      <VideoPlayer
        title={movie.title}
        contentType="movie"
        contentId={movie.id}
        sources={sources}
        posterUrl={movie.posterPath}
        backgroundUrl={movie.backgroundPath}
        description={movie.description}
        year={movie.year}
        rating={movie.rating}
        categories={movie.categories}
        userId={userId}
        initialProgress={initialProgress}
        onClose={handleClose}
      />
    </div>
  );
}
