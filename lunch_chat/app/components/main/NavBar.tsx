'use client';
import { motion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { useLang } from '@/app/context/LanguageContext';
import { useRouter } from 'next/navigation';

export function NavBar() {
  const { scrollY } = useScroll();
  const borderOpacity = useTransform(scrollY, [0, 80], [0, 1]);
  const bgOpacity = useTransform(scrollY, [0, 80], [0, 0.85]);
  const { user, loading, signOut } = useAuth();
  const { lang, toggleLang } = useLang();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <motion.nav
      id="navbar"
      style={{
        borderBottomColor: borderOpacity.get() ? `rgba(255,255,255,${borderOpacity.get() * 0.1})` : 'transparent',
      }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-transparent"
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black backdrop-blur-md"
        style={{ opacity: bgOpacity }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Left: Logo */}
          <motion.a
            href="/"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2.5 flex-shrink-0"
          >
            <Image
              src="/uksnote.png"
              alt="LunchChat logo"
              width={42}
              height={42}
              className="object-contain invert"
            />
            <span className="text-white font-semibold text-sm tracking-widest uppercase" style={{ fontFamily: 'var(--font-jua)' }}>
              LunchChat.
            </span>
          </motion.a>

          {/* Right: Lang Toggle + Auth Area */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center gap-3"
          >
            {/* KO / EN 토글 */}
            <motion.button
              onClick={toggleLang}
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1 px-3 py-1.5 border border-white/15 text-xs tracking-widest transition-colors"
              style={{ fontFamily: 'var(--font-jua)' }}
            >
              <span className={lang === 'ko' ? 'text-white' : 'text-white/30'}>KO</span>
              <span className="text-white/15">|</span>
              <span className={lang === 'en' ? 'text-white' : 'text-white/30'}>EN</span>
            </motion.button>

            {!loading && (
              user ? (
                <div className="flex items-center gap-3">
                  <motion.a
                    href="/dashboard"
                    whileHover={{ color: '#ffffff' }}
                    className="text-white/50 text-xs tracking-widest uppercase transition-colors"
                    style={{ fontFamily: 'var(--font-jua)' }}
                  >
                    Dashboard
                  </motion.a>
                  {user.user_metadata?.avatar_url ? (
                    <Link href="/dashboard">
                      <Image
                        src={user.user_metadata.avatar_url}
                        alt="avatar"
                        width={30}
                        height={30}
                        className="rounded-full ring-1 ring-white/20 hover:ring-white/50 transition-all cursor-pointer"
                      />
                    </Link>
                  ) : (
                    <Link href="/dashboard">
                      <div className="w-7 h-7 bg-white/10 hover:bg-white/20 flex items-center justify-center text-[11px] text-white ring-1 ring-white/20 transition-all cursor-pointer">
                        {(user.user_metadata?.full_name?.[0] ?? user.email?.[0] ?? 'U').toUpperCase()}
                      </div>
                    </Link>
                  )}
                  <motion.button
                    onClick={handleSignOut}
                    whileHover={{ color: '#ffffff' }}
                    className="text-white/30 text-xs tracking-widest uppercase transition-colors"
                    style={{ fontFamily: 'var(--font-jua)' }}
                  >
                    Sign Out
                  </motion.button>
                </div>
              ) : (
                <motion.a
                  href="/auth"
                  whileHover={{ scale: 1.04, backgroundColor: '#ffffff', color: '#000000' }}
                  whileTap={{ scale: 0.96 }}
                  className="inline-flex items-center px-5 py-2 bg-white text-black text-xs font-semibold tracking-widest uppercase transition-colors"
                  style={{ fontFamily: 'var(--font-jua)' }}
                >
                  Log In
                </motion.a>
              )
            )}

            {/* Mobile Menu Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="md:hidden text-white/50 hover:text-white transition-colors"
              aria-label="menu"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </motion.button>
          </motion.div>

        </div>
      </div>
    </motion.nav>
  );
}
