'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StreamingNavbar } from '@/components/layout/StreamingNavbar';
import { registerSchema, type RegisterFormData } from '@/lib/validations';
import { useAuthStore } from '@/hooks/useAuth';

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1); // 1: email, 2: password
  const { register: registerUser, isLoading, error, clearError } = useAuthStore();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const watchedEmail = watch('email');
  const watchedPassword = watch('password');
  const watchedConfirmPassword = watch('confirmPassword');
  const watchedFirstName = watch('firstName');
  const watchedLastName = watch('lastName');

  // Pre-fill email from URL params
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setValue('email', emailParam);
    }
  }, [searchParams, setValue]);

  const onSubmit = async (data: RegisterFormData) => {
    clearError();
    // Exclude confirmPassword from the data sent to API
    const { confirmPassword, ...registerData } = data;
    const success = await registerUser(registerData);
    
    if (success) {
      router.push('/browse');
    }
  };

  const handleEmailNext = () => {
    if (watchedEmail && !errors.email) {
      setStep(2);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (password: string | undefined) => {
    if (!password) return { strength: 0, text: '', color: '' };
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    if (strength <= 2) return { strength, text: 'Słabe', color: 'bg-red-500' };
    if (strength <= 3) return { strength, text: 'Średnie', color: 'bg-yellow-500' };
    return { strength, text: 'Silne', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(watchedPassword);

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
          <source src="/images/assets/registerBG.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <StreamingNavbar variant="auth" />

      {/* Register Form Container */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md bg-black/75 rounded-md p-12 md:p-16"
        >
          {step === 1 ? (
            <>
              <p className="text-gray-400 mb-2">KROK 1 Z 2</p>
              <h1 className="text-3xl font-bold mb-4">Utwórz hasło</h1>
              <p className="text-gray-300 mb-6">
                Wprowadź swój adres e-mail, aby utworzyć lub zalogować się do konta CzystyPlayer.
              </p>

              {/* Email Input */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <Input
                    type="email"
                    placeholder="Email"
                    className="h-14 bg-[#333] border-0 rounded text-white placeholder:text-gray-400 focus:bg-[#454545] focus:ring-2 focus:ring-white"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-[#E87C03] text-sm">{errors.email.message}</p>
                  )}
                </div>

                <Button
                  type="button"
                  onClick={handleEmailNext}
                  disabled={!watchedEmail}
                  className="w-full h-12 bg-[#E50914] hover:bg-[#f40612] text-white font-semibold text-base rounded"
                >
                  Dalej
                </Button>
              </div>
            </>
          ) : (
            <>
              <button 
                onClick={() => setStep(1)}
                className="text-gray-400 hover:text-white mb-4 flex items-center gap-2"
              >
                ← Wróć
              </button>
              <p className="text-gray-400 mb-2">KROK 2 Z 2</p>
              <h1 className="text-3xl font-bold mb-4">Utwórz hasło</h1>
              <p className="text-gray-300 mb-2">
                Pozostało tylko utworzyć hasło i już możesz korzystać z CzystyPlayer.
              </p>
              <p className="text-gray-400 text-sm mb-6">
                Email: <span className="text-white">{watchedEmail}</span>
              </p>

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
                {/* Username */}
                <div className="space-y-1">
                  <Input
                    type="text"
                    placeholder="Nazwa użytkownika"
                    className="h-14 bg-[#333] border-0 rounded text-white placeholder:text-gray-400 focus:bg-[#454545] focus:ring-2 focus:ring-white"
                    {...register('username')}
                  />
                  {errors.username && (
                    <p className="text-[#E87C03] text-sm">{errors.username.message}</p>
                  )}
                </div>

                {/* First Name */}
                <div className="space-y-1">
                  <Input
                    type="text"
                    placeholder="Imię"
                    className="h-14 bg-[#333] border-0 rounded text-white placeholder:text-gray-400 focus:bg-[#454545] focus:ring-2 focus:ring-white"
                    {...register('firstName')}
                  />
                  {errors.firstName && (
                    <p className="text-[#E87C03] text-sm">{errors.firstName.message}</p>
                  )}
                </div>

                {/* Last Name */}
                <div className="space-y-1">
                  <Input
                    type="text"
                    placeholder="Nazwisko"
                    className="h-14 bg-[#333] border-0 rounded text-white placeholder:text-gray-400 focus:bg-[#454545] focus:ring-2 focus:ring-white"
                    {...register('lastName')}
                  />
                  {errors.lastName && (
                    <p className="text-[#E87C03] text-sm">{errors.lastName.message}</p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Dodaj hasło"
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

                  {/* Password Strength Indicator */}
                  {watchedPassword && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded ${
                              i <= passwordStrength.strength
                                ? passwordStrength.color
                                : 'bg-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-400">
                        Siła hasła: <span className={passwordStrength.strength >= 4 ? 'text-green-500' : passwordStrength.strength >= 3 ? 'text-yellow-500' : 'text-red-500'}>{passwordStrength.text}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Password Requirements */}
                <div className="space-y-2 text-sm">
                  <p className="text-gray-400">Hasło musi zawierać:</p>
                  <div className="flex items-center gap-2">
                    <Check className={`h-4 w-4 ${watchedPassword && watchedPassword.length >= 8 ? 'text-green-500' : 'text-gray-600'}`} />
                    <span className={watchedPassword && watchedPassword.length >= 8 ? 'text-gray-300' : 'text-gray-500'}>
                      Co najmniej 8 znaków
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className={`h-4 w-4 ${watchedPassword && /[A-Z]/.test(watchedPassword) ? 'text-green-500' : 'text-gray-600'}`} />
                    <span className={watchedPassword && /[A-Z]/.test(watchedPassword) ? 'text-gray-300' : 'text-gray-500'}>
                      Co najmniej jedną wielką literę
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className={`h-4 w-4 ${watchedPassword && /[0-9]/.test(watchedPassword) ? 'text-green-500' : 'text-gray-600'}`} />
                    <span className={watchedPassword && /[0-9]/.test(watchedPassword) ? 'text-gray-300' : 'text-gray-500'}>
                      Co najmniej jedną cyfrę
                    </span>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Potwierdź hasło"
                      className="h-14 bg-[#333] border-0 rounded text-white placeholder:text-gray-400 pr-12 focus:bg-[#454545] focus:ring-2 focus:ring-white"
                      {...register('confirmPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-[#E87C03] text-sm">{errors.confirmPassword.message}</p>
                  )}
                  {/* Password match indicator */}
                  {watchedConfirmPassword && watchedPassword && (
                    <div className="flex items-center gap-2 mt-1">
                      <Check className={`h-4 w-4 ${watchedPassword === watchedConfirmPassword ? 'text-green-500' : 'text-gray-600'}`} />
                      <span className={`text-xs ${watchedPassword === watchedConfirmPassword ? 'text-green-500' : 'text-gray-500'}`}>
                        {watchedPassword === watchedConfirmPassword ? 'Hasła są zgodne' : 'Hasła nie są zgodne'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Terms */}
                <label className="flex items-start gap-3 cursor-pointer mt-4">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 mt-0.5 bg-[#333] border-gray-600 rounded"
                  />
                  <span className="text-sm text-gray-400">
                    Tak, chcę otrzymywać e-maile od CzystyPlayer z najnowszymi informacjami i ofertami specjalnymi.
                  </span>
                </label>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading || !watchedPassword || !watchedConfirmPassword || !watchedFirstName || !watchedLastName}
                  className="w-full h-12 bg-[#E50914] hover:bg-[#f40612] text-white font-semibold text-base rounded mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Tworzenie konta...
                    </>
                  ) : (
                    'Utwórz konto'
                  )}
                </Button>
              </form>
            </>
          )}

          {/* Login Link */}
          <div className="mt-8">
            <p className="text-gray-400">
              Masz już konto?{' '}
              <Link href="/auth/login" className="text-white hover:underline">
                Zaloguj się
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

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#E50914]" />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}
