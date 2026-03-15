'use client';
import { motion } from 'framer-motion';
import { TextScramble } from './TextScramble';
import { NavBar } from './NavBar';
import { useLang } from '@/app/context/LanguageContext';

const t = {
  ko: {
    badge: 'AI · 점심 메이트 매칭',
    title: 'LunchChat.',
    subtitle: '사진을 올리면 AI가 찰떡 점심 메이트를 찾아드려요',
    step1Label: '01 · 사진 올리기',
    step1Text: '내 사진을 올려주세요',
    step2Label: '02 · 메뉴 선택',
    step2Text: '오늘 뭐 드실래요?',
    step3Label: '03 · 매칭 완료',
    step3Text: '점심 메이트 추천!',
    cta: '점심 메이트 찾기',
    howTitle: '이렇게 작동해요',
    how1Title: '사진 한 장이면 충분해요',
    how1Desc: '본인 사진을 업로드하면 AI가 분석해서 최적의 점심 메이트를 찾아드려요.',
    how2Title: '먹고 싶은 메뉴를 말해주세요',
    how2Desc: '쌀국수, 국밥, 삼겹살… 오늘 땡기는 메뉴를 입력하면 취향이 비슷한 메이트를 매칭해요.',
    how3Title: '함께 점심 즐기세요',
    how3Desc: 'AI가 추천한 메이트와 근처 맛집 정보까지! 새로운 점심 친구를 만나보세요.',
    ctaTitle: '오늘 점심, 혼자 드시나요?',
    ctaDesc: '사진 한 장과 먹고 싶은 메뉴만 알려주세요. AI가 찰떡 점심 메이트를 찾아드릴게요.',
    ctaButton: '지금 시작하기',
    footer: '© 2026 LunchChat. All rights reserved.',
  },
  en: {
    badge: 'AI · Lunch Mate Matching',
    title: 'LunchChat.',
    subtitle: 'Upload a photo and AI finds your perfect lunch mate',
    step1Label: '01 · Upload',
    step1Text: 'Upload your photo',
    step2Label: '02 · Menu',
    step2Text: "What's for lunch?",
    step3Label: '03 · Match',
    step3Text: 'Lunch mate found!',
    cta: 'Find Lunch Mate Now',
    howTitle: 'How It Works',
    how1Title: 'One Photo Is All You Need',
    how1Desc: 'Upload your photo and AI analyzes it to find your ideal lunch mate.',
    how2Title: 'Tell Us What You Crave',
    how2Desc: 'Enter the menu you want — pho, steak, ramen — and we match you with someone who shares your taste.',
    how3Title: 'Enjoy Lunch Together',
    how3Desc: 'Get matched with a lunch mate plus nearby restaurant recommendations. Meet new lunch friends!',
    ctaTitle: 'Eating Lunch Alone Today?',
    ctaDesc: 'Just share a photo and your preferred menu. AI will find the perfect lunch mate for you.',
    ctaButton: 'Get Started',
    footer: '© 2026 LunchChat. All rights reserved.',
  },
};

export function Hero() {
  const { lang } = useLang();
  const txt = t[lang];
  
  return (
    <main className="min-h-screen bg-black text-white">
      <NavBar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black pt-16">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:72px_72px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,transparent_30%,#000_100%)]" />

        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col items-center gap-10">

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 border border-white/10 bg-white/[0.03]"
              style={{ fontFamily: 'var(--font-jua)' }}
            >
              <motion.svg
                width="8" height="8" viewBox="0 0 8 8" fill="none"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <circle cx="4" cy="4" r="3.5" fill="#FF6B35"/>
              </motion.svg>
              <span className="text-white/35 text-[10px] tracking-[0.25em] uppercase">
                {txt.badge}
              </span>
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-center space-y-3"
            >
              <TextScramble
                key={`title-${lang}`}
                as="h1"
                className="text-5xl sm:text-6xl md:text-8xl text-white leading-tight"
                duration={1.4}
                speed={0.05}
                style={{ fontFamily: 'var(--font-jua)' }}
              >
                {txt.title}
              </TextScramble>
              <TextScramble
                key={`subtitle-${lang}`}
                as="p"
                className="text-sm sm:text-base text-white/35 tracking-[0.2em] uppercase"
                duration={1.1}
                speed={0.04}
                style={{ fontFamily: 'var(--font-jua)' }}
              >
                {txt.subtitle}
              </TextScramble>
            </motion.div>

            {/* Visual Flow */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.9 }}
              className="w-full flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3"
            >
              {/* Step 1: Upload Photo */}
              <div className="flex flex-col items-center gap-2.5">
                <span className="text-[9px] text-white/20 tracking-[0.25em] uppercase" style={{ fontFamily: 'var(--font-jua)' }}>
                  {txt.step1Label}
                </span>
                <motion.div
                  whileHover={{ borderColor: 'rgba(255,255,255,0.3)' }}
                  className="w-52 h-36 border border-dashed border-white/15 bg-white/[0.02] flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group"
                >
                  <svg width="38" height="38" viewBox="0 0 38 38" fill="none" className="text-white/25 group-hover:text-white/50 transition-colors">
                    <circle cx="19" cy="15" r="6" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M7 33C7 27 12 23 19 23C26 23 31 27 31 33" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <rect x="1" y="1" width="36" height="36" rx="2" stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" strokeOpacity="0.3"/>
                  </svg>
                  <span className="text-[10px] text-white/25 tracking-widest uppercase group-hover:text-white/45 transition-colors" style={{ fontFamily: 'var(--font-jua)' }}>
                    {txt.step1Text}
                  </span>
                </motion.div>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center mt-6">
                <motion.svg width="48" height="14" viewBox="0 0 48 14" fill="none"
                  className="hidden md:block"
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <path d="M0 7H40M40 7L33 1M40 7L33 13" stroke="white" strokeOpacity="0.18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </motion.svg>
                <motion.svg width="14" height="32" viewBox="0 0 14 32" fill="none"
                  className="block md:hidden"
                  animate={{ y: [0, 4, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <path d="M7 0V24M7 24L1 17M7 24L13 17" stroke="white" strokeOpacity="0.18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </motion.svg>
              </div>

              {/* Step 2: Menu Selection */}
              <div className="flex flex-col items-center gap-2.5">
                <span className="text-[9px] text-white/20 tracking-[0.25em] uppercase" style={{ fontFamily: 'var(--font-jua)' }}>
                  {txt.step2Label}
                </span>
                <div className="w-52 h-36 border border-white/15 bg-white/[0.02] flex flex-col items-center justify-center gap-3">
                  <svg width="42" height="42" viewBox="0 0 42 42" fill="none" className="text-white/35">
                    <circle cx="21" cy="24" r="14" stroke="currentColor" strokeWidth="1.2"/>
                    <ellipse cx="21" cy="24" rx="14" ry="5" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M14 16C14 16 17 12 21 12C25 12 28 16 28 16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    <line x1="21" y1="6" x2="21" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    <line x1="16" y1="7" x2="17" y2="11" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.5"/>
                    <line x1="26" y1="7" x2="25" y2="11" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.5"/>
                  </svg>
                  <span className="text-[10px] text-white/25 tracking-widest uppercase" style={{ fontFamily: 'var(--font-jua)' }}>
                    {txt.step2Text}
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center mt-6">
                <motion.svg width="48" height="14" viewBox="0 0 48 14" fill="none"
                  className="hidden md:block"
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                >
                  <path d="M0 7H40M40 7L33 1M40 7L33 13" stroke="white" strokeOpacity="0.18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </motion.svg>
                <motion.svg width="14" height="32" viewBox="0 0 14 32" fill="none"
                  className="block md:hidden"
                  animate={{ y: [0, 4, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                >
                  <path d="M7 0V24M7 24L1 17M7 24L13 17" stroke="white" strokeOpacity="0.18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </motion.svg>
              </div>

              {/* Step 3: Match Result */}
              <div className="flex flex-col items-center gap-2.5">
                <span className="text-[9px] text-white/20 tracking-[0.25em] uppercase" style={{ fontFamily: 'var(--font-jua)' }}>
                  {txt.step3Label}
                </span>
                <div className="w-52 h-36 border border-white/20 bg-white/[0.02] relative overflow-hidden flex flex-col items-center justify-center gap-2">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                      <circle cx="18" cy="20" r="8" stroke="white" strokeOpacity="0.35" strokeWidth="1.5"/>
                      <circle cx="34" cy="20" r="8" stroke="white" strokeOpacity="0.35" strokeWidth="1.5"/>
                      <ellipse cx="16" cy="19" rx="1.2" ry="1.5" fill="white" fillOpacity="0.5"/>
                      <ellipse cx="20" cy="19" rx="1.2" ry="1.5" fill="white" fillOpacity="0.5"/>
                      <path d="M15 23C15 23 16 25 18 25C20 25 21 23 21 23" stroke="white" strokeOpacity="0.5" strokeWidth="1" strokeLinecap="round"/>
                      <ellipse cx="32" cy="19" rx="1.2" ry="1.5" fill="white" fillOpacity="0.5"/>
                      <ellipse cx="36" cy="19" rx="1.2" ry="1.5" fill="white" fillOpacity="0.5"/>
                      <path d="M31 23C31 23 32 25 34 25C36 25 37 23 37 23" stroke="white" strokeOpacity="0.5" strokeWidth="1" strokeLinecap="round"/>
                      <path d="M22 36L26 32L30 36" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <motion.path
                        d="M26 40L23.5 37.5C20 34 18 32 18 29.5C18 27.5 19.5 26 21.5 26C22.7 26 23.8 26.6 24.5 27.5L26 29.5L27.5 27.5C28.2 26.6 29.3 26 30.5 26C32.5 26 34 27.5 34 29.5C34 32 32 34 28.5 37.5L26 40Z"
                        fill="white" fillOpacity="0.15"
                        stroke="white" strokeOpacity="0.4" strokeWidth="1"
                        animate={{ scale: [1, 1.1, 1], fillOpacity: [0.15, 0.25, 0.15] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    </svg>
                  </motion.div>
                  <span className="text-[10px] text-white/25 tracking-widest uppercase" style={{ fontFamily: 'var(--font-jua)' }}>
                    {txt.step3Text}
                  </span>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent -skew-x-12"
                    animate={{ x: ['-120%', '220%'] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'linear', repeatDelay: 2.5 }}
                  />
                </div>
              </div>
            </motion.div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.7 }}
              className="flex items-center"
            >
              <motion.a
                href="/dashboard"
                whileHover={{ scale: 1.04, backgroundColor: '#FF6B35', color: '#ffffff' }}
                whileTap={{ scale: 0.96 }}
                className="px-8 py-3 bg-white text-black text-sm tracking-widest uppercase transition-colors inline-block"
                style={{ fontFamily: 'var(--font-jua)' }}
              >
                {txt.cta}
              </motion.a>
            </motion.div>

          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.4, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-white/20"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
            </svg>
          </motion.div>
        </motion.div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 px-4 bg-black border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-3xl md:text-4xl font-bold text-center mb-16 text-white tracking-tight"
            style={{ fontFamily: 'var(--font-jua)' }}
          >
            {txt.howTitle}
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10">
            {[
              {
                title: txt.how1Title,
                description: txt.how1Desc,
                icon: '📸',
              },
              {
                title: txt.how2Title,
                description: txt.how2Desc,
                icon: '🍱',
              },
              {
                title: txt.how3Title,
                description: txt.how3Desc,
                icon: '🤝',
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                whileHover={{ backgroundColor: '#ffffff0d' }}
                className="p-10 bg-black transition-colors"
              >
                <div className="text-3xl mb-5">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-3 text-white tracking-tight" style={{ fontFamily: 'var(--font-jua)' }}>
                  {feature.title}
                </h3>
                <p className="text-white/50 text-sm leading-relaxed" style={{ fontFamily: 'var(--font-jua)' }}>{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-black border-t border-white/10">
        <div className="max-w-3xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-4xl md:text-5xl font-bold mb-6 text-white tracking-tight"
            style={{ fontFamily: 'var(--font-jua)' }}
          >
            {txt.ctaTitle}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg text-white/50 mb-10"
            style={{ fontFamily: 'var(--font-jua)' }}
          >
            {txt.ctaDesc}
          </motion.p>
          <motion.a
            href="/dashboard"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-block px-10 py-4 bg-white text-black rounded-none font-semibold text-sm tracking-widest uppercase hover:bg-white/90 transition-colors"
            style={{ fontFamily: 'var(--font-jua)' }}
          >
            {txt.ctaButton}
          </motion.a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-black border-t border-white/10">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-white/30 text-sm tracking-widest uppercase">
            {txt.footer}
          </p>
        </div>
      </footer>
    </main>
  );
}
