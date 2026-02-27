'use client'

import { SignUp } from '@clerk/nextjs'
import { useEffect, useRef, useState } from 'react'

export default function SignUpPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mounted, setMounted] = useState(false)
  const [activeRole, setActiveRole] = useState<'tenant' | 'landlord'>('tenant')

  useEffect(() => {
    setMounted(true)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles: { x: number; y: number; vx: number; vy: number; size: number; color: string; opacity: number; shape: string }[] = []
    const colors = ['#E05A00', '#F97316', '#FBBF24', '#B45309', '#FCD34D']
    const shapes = ['circle', 'square', 'diamond']

    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 4 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.3 + 0.05,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
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
        ctx.globalAlpha = p.opacity
        ctx.fillStyle = p.color
        if (p.shape === 'circle') {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
        } else if (p.shape === 'square') {
          ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2)
        } else {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.PI / 4)
          ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2); ctx.restore()
        }
      })
      ctx.globalAlpha = 1
      animId = requestAnimationFrame(animate)
    }
    animate()

    const handleResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    window.addEventListener('resize', handleResize)
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', handleResize) }
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: '#050300' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');

        .askderek-page * { font-family: 'DM Sans', sans-serif; }
        .askderek-display { font-family: 'Playfair Display', serif; }

        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(32px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideLeft {
          from { opacity: 0; transform: translateX(32px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 24px rgba(224,90,0,0.25), 0 0 80px rgba(224,90,0,0.08); }
          50% { box-shadow: 0 0 48px rgba(224,90,0,0.45), 0 0 120px rgba(224,90,0,0.15); }
        }
        @keyframes kente {
          0% { background-position: 0% 0%; }
          100% { background-position: 100% 100%; }
        }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes rolePulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }

        .animate-fade-up { animation: fadeSlideUp 0.8s ease forwards; }
        .animate-fade-left { animation: fadeSlideLeft 0.8s ease forwards; }
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
            #E05A00 0px, #E05A00 4px,
            #FBBF24 4px, #FBBF24 8px,
            #78350F 8px, #78350F 12px,
            transparent 12px, transparent 16px
          );
          background-size: 22px 22px;
          animation: kente 4s linear infinite;
        }

        .card-glow { animation: pulseGlow 3s ease-in-out infinite; }
        .float-el { animation: float 7s ease-in-out infinite; }
        .spin-ring { animation: spin-slow 25s linear infinite; }

        .role-btn {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          cursor: pointer;
          transition: all 0.3s ease;
          padding: 1rem;
          border-radius: 0.75rem;
          text-align: center;
        }
        .role-btn:hover { background: rgba(224,90,0,0.08); border-color: rgba(224,90,0,0.3); }
        .role-btn.active {
          background: rgba(224,90,0,0.12);
          border-color: rgba(224,90,0,0.6);
          box-shadow: 0 0 20px rgba(224,90,0,0.15);
        }

        .benefit-row {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          transition: all 0.2s;
        }
        .benefit-row:last-child { border-bottom: none; }

        .sign-up-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(24px);
        }

        /* Clerk overrides */
        .cl-rootBox { width: 100% !important; }
        .cl-card { background: transparent !important; box-shadow: none !important; padding: 0 !important; }
        .cl-headerTitle, .cl-headerSubtitle { display: none !important; }
        .cl-socialButtonsBlockButton {
          background: rgba(255,255,255,0.06) !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
          color: white !important; transition: all 0.2s !important;
        }
        .cl-socialButtonsBlockButton:hover {
          background: rgba(224,90,0,0.15) !important;
          border-color: rgba(224,90,0,0.4) !important;
        }
        .cl-formButtonPrimary {
          background: linear-gradient(135deg, #E05A00, #B45309) !important;
          border: none !important; font-weight: 600 !important;
          letter-spacing: 0.02em !important; transition: all 0.3s !important;
        }
        .cl-formButtonPrimary:hover {
          background: linear-gradient(135deg, #F97316, #E05A00) !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 8px 24px rgba(224,90,0,0.4) !important;
        }
        .cl-formFieldInput {
          background: rgba(255,255,255,0.06) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: white !important; transition: all 0.2s !important;
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
        .cl-socialButtonsBlockButtonText { color: white !important; }
      `}</style>

      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 50% at 80% 30%, rgba(120,53,15,0.2) 0%, transparent 60%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 50% 70% at 20% 80%, rgba(224,90,0,0.08) 0%, transparent 60%)' }} />

      {/* Decorative shapes */}
      <div className="absolute top-10 right-10 w-72 h-72 opacity-5 float-el pointer-events-none">
        <svg viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="85" stroke="#FBBF24" strokeWidth="1.5" strokeDasharray="12 6" />
          <circle cx="100" cy="100" r="65" stroke="#E05A00" strokeWidth="1" strokeDasharray="6 12" />
          <polygon points="100,20 175,62 175,138 100,180 25,138 25,62" stroke="#FBBF24" strokeWidth="1" fill="none" />
        </svg>
      </div>

      <div className="absolute bottom-20 -left-16 w-64 h-64 opacity-8 spin-ring pointer-events-none">
        <svg viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="90" stroke="#E05A00" strokeWidth="1" strokeDasharray="6 8" />
        </svg>
      </div>

      {/* Main layout */}
      <div className={`askderek-page relative z-10 min-h-screen flex items-center justify-center px-6 py-16 ${mounted ? '' : 'invisible'}`}>
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-14 items-start">

          {/* LEFT — Sign Up card */}
          <div className="animate-fade-up delay-200">
            <div className="sign-up-card card-glow rounded-2xl overflow-hidden">

              <div className="h-1.5 w-full kente-border" />

              <div className="p-8">
                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #E05A00, #B45309)' }}>
                      <span className="askderek-display text-white font-black text-sm">A</span>
                    </div>
                    <span className="text-xs tracking-widest uppercase font-semibold" style={{ color: 'rgba(251,191,36,0.6)' }}>AskDerek</span>
                  </div>
                  <h2 className="askderek-display font-bold text-2xl text-white mb-1">Join AskDerek</h2>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Free to join. No credit card needed.</p>
                </div>

                {/* Role selector */}
                <div className="mb-6">
                  <p className="text-xs font-semibold tracking-wider uppercase mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>I am joining as</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setActiveRole('tenant')}
                      className={`role-btn ${activeRole === 'tenant' ? 'active' : ''}`}
                    >
                      <div className="text-2xl mb-1">🏠</div>
                      <div className="text-white font-semibold text-sm">Tenant</div>
                      <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Looking to rent</div>
                    </button>
                    <button
                      onClick={() => setActiveRole('landlord')}
                      className={`role-btn ${activeRole === 'landlord' ? 'active' : ''}`}
                    >
                      <div className="text-2xl mb-1">🔑</div>
                      <div className="text-white font-semibold text-sm">Landlord</div>
                      <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>I have property</div>
                    </button>
                  </div>
                </div>

                {/* Clerk SignUp */}
                <SignUp
                  appearance={{
                    elements: {
                      rootBox: 'w-full',
                      card: 'bg-transparent shadow-none p-0',
                      headerTitle: 'hidden',
                      headerSubtitle: 'hidden',
                      footer: 'hidden',
                    },
                  }}
                  routing="path"
                  path="/sign-up"
                  signInUrl="/sign-in"
                  afterSignUpUrl="/select-role"
                />

                <div className="mt-5 pt-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Already have an account?{' '}
                    <a href="/sign-in" className="font-semibold transition-colors" style={{ color: '#F97316' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#FBBF24')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#F97316')}>
                      Sign in →
                    </a>
                  </p>
                  <p className="text-center text-xs mt-3" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    By signing up you agree to our{' '}
                    <a href="/terms" style={{ color: 'rgba(249,115,22,0.6)' }}>Terms</a> &{' '}
                    <a href="/privacy" style={{ color: 'rgba(249,115,22,0.6)' }}>Privacy Policy</a>
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>© 2026 AskDerek · Tarkwa, Ghana 🇬🇭</p>
            </div>
          </div>

          {/* RIGHT — Why join */}
          <div className="space-y-10 animate-fade-left delay-300 lg:pt-8">

            <div className="space-y-3">
              <div className="text-xs tracking-[0.3em] uppercase font-semibold" style={{ color: 'rgba(251,191,36,0.6)' }}>
                {activeRole === 'tenant' ? 'For Renters' : 'For Landlords'}
              </div>
              <h2 className="askderek-display font-black text-white" style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', lineHeight: 1.15 }}>
                {activeRole === 'tenant' ? (
                  <>Find Your<br /><span className="gold-shimmer">Perfect Room</span><br />in Tarkwa</>
                ) : (
                  <>List Your<br /><span className="gold-shimmer">Property</span><br />Get Tenants</>
                )}
              </h2>
              <div className="h-1.5 w-20 rounded-full kente-border" />
            </div>

            <div className="space-y-0">
              {(activeRole === 'tenant' ? [
                { icon: '🔍', title: 'Search by neighbourhood', desc: 'New Atuabo, UMaT area, Tamso, Kwabedu — find exactly where you want to live' },
                { icon: '📸', title: 'Real photos, no lies', desc: 'See bedroom, kitchen, bathroom before you visit. What you see is what you get' },
                { icon: '💳', title: 'Pay rent via MoMo', desc: 'MTN MoMo, Vodafone Cash or card — no cash, no stress, digital receipt always' },
                { icon: '🚫', title: 'Zero agent fees', desc: 'Apply directly to landlords. Never pay an agent again' },
              ] : [
                { icon: '📱', title: 'List in 5 minutes', desc: 'Upload photos, set price, go live. Your property in front of serious tenants fast' },
                { icon: '✅', title: 'Verified tenants only', desc: 'Every applicant has a verified account. Choose who lives in your property' },
                { icon: '💰', title: 'Collect rent online', desc: 'Payments come straight to your account. No chasing, no cash, clean records' },
                { icon: '📊', title: 'Dashboard & records', desc: 'Track leases, payments and applications all in one place on any phone' },
              ]).map((b, i) => (
                <div key={i} className="benefit-row">
                  <div className="text-xl flex-shrink-0 mt-0.5">{b.icon}</div>
                  <div>
                    <div className="text-white font-semibold text-sm">{b.title}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom proof */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(224,90,0,0.07)', border: '1px solid rgba(224,90,0,0.15)' }}>
              <div className="flex items-start gap-3">
                <div className="text-2xl">⛏️</div>
                <div>
                  <div className="text-white font-semibold text-sm">Built for Tarkwa</div>
                  <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Serving UMaT students, Goldfields workers, and the entire Tarkwa community. Ghana's first rental platform built for mining towns.
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}