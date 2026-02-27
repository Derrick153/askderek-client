'use client'

import { SignIn } from '@clerk/nextjs'
import { useEffect, useRef, useState } from 'react'

export default function SignInPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Kente-inspired animated particles
    const particles: { x: number; y: number; vx: number; vy: number; size: number; color: string; opacity: number }[] = []
    const colors = ['#E05A00', '#F97316', '#FBBF24', '#B45309', '#78350F']

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 3 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.4 + 0.1,
      })
    }

    let animId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.opacity
        ctx.fill()
      })
      ctx.globalAlpha = 1
      animId = requestAnimationFrame(animate)
    }
    animate()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', handleResize) }
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: '#0A0500' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');

        .askderek-page * { font-family: 'DM Sans', sans-serif; }
        .askderek-display { font-family: 'Playfair Display', serif; }

        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(32px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideRight {
          from { opacity: 0; transform: translateX(-32px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(224,90,0,0.3), 0 0 60px rgba(224,90,0,0.1); }
          50% { box-shadow: 0 0 40px rgba(224,90,0,0.5), 0 0 100px rgba(224,90,0,0.2); }
        }
        @keyframes kente {
          0% { background-position: 0% 0%; }
          100% { background-position: 100% 100%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(2deg); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-fade-up { animation: fadeSlideUp 0.8s ease forwards; }
        .animate-fade-right { animation: fadeSlideRight 0.8s ease forwards; }
        .delay-100 { animation-delay: 0.1s; opacity: 0; }
        .delay-200 { animation-delay: 0.2s; opacity: 0; }
        .delay-300 { animation-delay: 0.3s; opacity: 0; }
        .delay-400 { animation-delay: 0.4s; opacity: 0; }
        .delay-500 { animation-delay: 0.5s; opacity: 0; }
        .delay-600 { animation-delay: 0.6s; opacity: 0; }

        .gold-shimmer {
          background: linear-gradient(90deg, #E05A00, #FBBF24, #E05A00, #FBBF24);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }

        .kente-border {
          background: repeating-linear-gradient(
            45deg,
            #E05A00 0px,
            #E05A00 4px,
            #FBBF24 4px,
            #FBBF24 8px,
            #78350F 8px,
            #78350F 12px,
            transparent 12px,
            transparent 16px
          );
          background-size: 22px 22px;
          animation: kente 4s linear infinite;
        }

        .card-glow { animation: pulseGlow 3s ease-in-out infinite; }

        .float-shape { animation: float 6s ease-in-out infinite; }
        .float-shape-2 { animation: float 8s ease-in-out infinite reverse; }

        .spin-ring { animation: spin-slow 20s linear infinite; }

        .stat-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(224,90,0,0.2);
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        }
        .stat-card:hover {
          background: rgba(224,90,0,0.08);
          border-color: rgba(224,90,0,0.5);
          transform: translateY(-4px);
        }

        .sign-in-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(24px);
        }

        /* Override Clerk styles */
        .cl-rootBox { width: 100% !important; }
        .cl-card { background: transparent !important; box-shadow: none !important; padding: 0 !important; }
        .cl-headerTitle, .cl-headerSubtitle { display: none !important; }
        .cl-socialButtonsBlockButton {
          background: rgba(255,255,255,0.06) !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
          color: white !important;
          transition: all 0.2s !important;
        }
        .cl-socialButtonsBlockButton:hover {
          background: rgba(224,90,0,0.15) !important;
          border-color: rgba(224,90,0,0.4) !important;
        }
        .cl-formButtonPrimary {
          background: linear-gradient(135deg, #E05A00, #B45309) !important;
          border: none !important;
          font-weight: 600 !important;
          letter-spacing: 0.02em !important;
          transition: all 0.3s !important;
        }
        .cl-formButtonPrimary:hover {
          background: linear-gradient(135deg, #F97316, #E05A00) !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 8px 24px rgba(224,90,0,0.4) !important;
        }
        .cl-formFieldInput {
          background: rgba(255,255,255,0.06) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: white !important;
          transition: all 0.2s !important;
        }
        .cl-formFieldInput:focus {
          border-color: rgba(224,90,0,0.6) !important;
          box-shadow: 0 0 0 3px rgba(224,90,0,0.15) !important;
        }
        .cl-formFieldLabel { color: rgba(255,255,255,0.7) !important; font-size: 0.8rem !important; }
        .cl-footerActionLink { color: #F97316 !important; }
        .cl-footerActionLink:hover { color: #FBBF24 !important; }
        .cl-dividerLine { background: rgba(255,255,255,0.1) !important; }
        .cl-dividerText { color: rgba(255,255,255,0.4) !important; }
        .cl-footer { display: none !important; }
        .cl-identityPreviewText { color: white !important; }
        .cl-formFieldInputShowPasswordButton { color: #F97316 !important; }
        .cl-internal-b3fm6y { color: white !important; }
        .cl-socialButtonsBlockButtonText { color: white !important; }
      `}</style>

      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Deep kente gradient background layers */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 80% 60% at 20% 50%, rgba(120,53,15,0.25) 0%, transparent 60%)'
      }} />
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 60% 80% at 80% 80%, rgba(224,90,0,0.1) 0%, transparent 60%)'
      }} />

      {/* Decorative geometric shapes — kente-inspired */}
      <div className="absolute top-20 right-20 w-64 h-64 opacity-5 float-shape pointer-events-none">
        <svg viewBox="0 0 200 200" fill="none">
          <polygon points="100,10 190,55 190,145 100,190 10,145 10,55" stroke="#E05A00" strokeWidth="2" fill="rgba(224,90,0,0.1)" />
          <polygon points="100,30 170,65 170,135 100,170 30,135 30,65" stroke="#FBBF24" strokeWidth="1.5" fill="none" />
          <polygon points="100,50 150,75 150,125 100,150 50,125 50,75" stroke="#E05A00" strokeWidth="1" fill="none" />
        </svg>
      </div>
      <div className="absolute bottom-40 left-10 w-40 h-40 opacity-5 float-shape-2 pointer-events-none">
        <svg viewBox="0 0 160 160" fill="none">
          <rect x="10" y="10" width="60" height="60" stroke="#FBBF24" strokeWidth="2" fill="none" transform="rotate(15 40 40)" />
          <rect x="90" y="10" width="60" height="60" stroke="#E05A00" strokeWidth="2" fill="none" transform="rotate(-15 120 40)" />
          <rect x="50" y="90" width="60" height="60" stroke="#FBBF24" strokeWidth="2" fill="none" transform="rotate(30 80 120)" />
        </svg>
      </div>

      {/* Spinning ring top left */}
      <div className="absolute -top-20 -left-20 w-80 h-80 opacity-10 spin-ring pointer-events-none">
        <svg viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="90" stroke="url(#orangeGrad)" strokeWidth="1" strokeDasharray="8 4" />
          <circle cx="100" cy="100" r="70" stroke="#FBBF24" strokeWidth="0.5" strokeDasharray="4 8" />
          <defs>
            <linearGradient id="orangeGrad" x1="0" y1="0" x2="200" y2="200">
              <stop offset="0%" stopColor="#E05A00" />
              <stop offset="100%" stopColor="#FBBF24" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Main layout */}
      <div className={`askderek-page relative z-10 min-h-screen flex items-center justify-center px-6 py-16 ${mounted ? '' : 'invisible'}`}>
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-16 items-center">

          {/* LEFT — Brand story */}
          <div className="space-y-10">

            {/* AD Logo mark */}
            <div className="animate-fade-right delay-100">
              <div className="inline-flex items-center gap-3">
                <div className="relative w-12 h-12 flex items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, #E05A00, #B45309)' }}>
                  <span className="askderek-display text-white font-black text-lg">A</span>
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full" style={{ background: '#FBBF24' }} />
                </div>
                <div>
                  <div className="text-xs font-semibold tracking-[0.3em] uppercase" style={{ color: 'rgba(251,191,36,0.7)' }}>Tarkwa, Ghana</div>
                  <div className="text-white font-semibold text-sm">askderek.com</div>
                </div>
              </div>
            </div>

            {/* Hero text */}
            <div className="space-y-4">
              <div className="animate-fade-right delay-200">
                <h1 className="askderek-display font-black leading-none" style={{ fontSize: 'clamp(3rem, 5vw, 4.5rem)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.9)' }}>Find Your</span>
                  <br />
                  <span className="gold-shimmer">Home in</span>
                  <br />
                  <span style={{ color: 'rgba(255,255,255,0.9)' }}>Tarkwa.</span>
                </h1>
              </div>

              <div className="animate-fade-right delay-300">
                {/* Kente accent bar */}
                <div className="h-2 w-32 rounded-full kente-border" />
              </div>

              <div className="animate-fade-right delay-400">
                <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: '1.8', fontSize: '1rem' }}>
                  Ghana's first rental platform built for mining towns.
                  Real photos. Direct landlords. Zero agent fees.
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 animate-fade-right delay-500">
              {[
                { n: '0', label: 'Agent Fees', icon: '🚫' },
                { n: '5K+', label: 'UMaT Students', icon: '🎓' },
                { n: '3', label: 'Mining Partners', icon: '⛏️' },
              ].map((s, i) => (
                <div key={i} className="stat-card rounded-xl p-4 text-center">
                  <div className="text-xl mb-1">{s.icon}</div>
                  <div className="askderek-display font-bold text-xl" style={{ color: '#F97316' }}>{s.n}</div>
                  <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Trust line */}
            <div className="animate-fade-right delay-600">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {['🧑🏾', '👩🏿', '🧑🏽', '👨🏾'].map((e, i) => (
                    <div key={i} className="w-8 h-8 rounded-full flex items-center justify-center text-sm border-2" style={{ borderColor: '#0A0500', background: 'rgba(224,90,0,0.2)' }}>{e}</div>
                  ))}
                </div>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  <span style={{ color: '#FBBF24' }}>Landlords & tenants</span> trust AskDerek
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT — Sign In card */}
          <div className="animate-fade-up delay-300">
            <div className="sign-in-card card-glow rounded-2xl overflow-hidden">

              {/* Card top accent bar — full kente strip */}
              <div className="h-1.5 w-full kente-border" />

              <div className="p-8">
                {/* Card header */}
                <div className="mb-8">
                  <h2 className="askderek-display font-bold text-2xl text-white mb-1">Welcome back</h2>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem' }}>
                    Sign in to your AskDerek account
                  </p>
                </div>

                {/* Clerk component */}
                <SignIn
                  appearance={{
                    elements: {
                      rootBox: 'w-full',
                      card: 'bg-transparent shadow-none p-0',
                      headerTitle: 'hidden',
                      headerSubtitle: 'hidden',
                      footer: 'hidden',
                      socialButtonsBlockButton: 'transition-all duration-200',
                      formButtonPrimary: 'transition-all duration-300 tracking-wide',
                      formFieldInput: 'transition-all duration-200',
                    },
                  }}
                  routing="path"
                  path="/sign-in"
                  signUpUrl="/sign-up"
                  afterSignInUrl="/search"
                />

                {/* Bottom link */}
                <div className="mt-6 pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    New to AskDerek?{' '}
                    <a href="/sign-up" className="font-semibold transition-colors" style={{ color: '#F97316' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#FBBF24')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#F97316')}>
                      Create free account →
                    </a>
                  </p>
                </div>
              </div>
            </div>

            {/* Below card */}
            <div className="mt-4 text-center">
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                © 2026 AskDerek · Made in Tarkwa, Ghana 🇬🇭
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}