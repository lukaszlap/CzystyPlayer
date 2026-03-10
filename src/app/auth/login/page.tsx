'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StreamingNavbar } from '@/components/layout/StreamingNavbar';
import { loginSchema, type LoginFormData } from '@/lib/validations';
import { useAuthStore } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [shakeError, setShakeError] = useState(false);
  const { login, isLoading, error, clearError } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    clearError();
    const success = await login(data);
    
    if (success) {
      router.push('/browse');
    } else {
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      {/* Background Video */}
      <div className="fixed inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        >
          <source src="/images/assets/loginBG.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <StreamingNavbar variant="auth" />

      {/* Login Form Container */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`w-full max-w-md bg-black/75 rounded-md p-12 md:p-16 ${shakeError ? 'animate-shake' : ''}`}
        >
          <h1 className="text-3xl font-bold mb-8">Zaloguj się</h1>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded bg-[#E87C03]/20 border border-[#E87C03] text-[#E87C03] text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div className="space-y-1">
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="Email lub numer telefonu"
                  className="h-14 bg-[#333] border-0 rounded text-white placeholder:text-gray-400 focus:bg-[#454545] focus:ring-2 focus:ring-white"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-[#E87C03] text-sm">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Hasło"
                  className="h-14 bg-[#333] border-0 rounded text-white placeholder:text-gray-400 pr-12 focus:bg-[#454545] focus:ring-2 focus:ring-white"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-[#E87C03] text-sm">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#E50914] hover:bg-[#f40612] text-white font-semibold text-base rounded mt-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Logowanie...
                </>
              ) : (
                'Zaloguj się'
              )}
            </Button>

            {/* Remember Me & Help */}
            <div className="flex items-center justify-between text-sm text-gray-400 mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 bg-[#333] border-gray-600 rounded" />
                <span>Zapamiętaj mnie</span>
              </label>
              <Link href="#" className="hover:underline">
                Potrzebujesz pomocy?
              </Link>
            </div>
          </form>

          {/* Sign Up Link */}
          <div className="mt-12">
            <p className="text-gray-400">
              Pierwszy raz w CzystyPlayer?{' '}
              <Link href="/auth/register" className="text-white hover:underline">
                Zarejestruj się teraz
              </Link>
            </p>
          </div>

          {/* Captcha Info */}
          <p className="mt-4 text-xs text-gray-500">
            Ta strona jest chroniona przez reCAPTCHA i podlega{' '}
            <a href="#" className="text-blue-500 hover:underline">Polityce prywatności</a> oraz{' '}
            <a href="#" className="text-blue-500 hover:underline">Warunkom korzystania z usługi</a> Google.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
