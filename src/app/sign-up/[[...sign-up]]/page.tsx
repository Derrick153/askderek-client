'use client'

import { SignUp } from '@clerk/nextjs'
import { Sparkles, Zap, Shield, CheckCircle2, Star, Rocket, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export default function SignUpPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  // Floating orbs animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const orbs: Array<{
      x: number
      y: number
      radius: number
      vx: number
      vy: number
      color: string
    }> = []

    const colors = ['rgba(168, 85, 247, 0.4)', 'rgba(236, 72, 153, 0.4)', 'rgba(59, 130, 246, 0.4)']
    for (let i = 0; i < 5; i++) {
      orbs.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 100 + 50,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        color: colors[i % colors.length],
      })
    }

    function animate() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      orbs.forEach((orb) => {
        orb.x += orb.vx
        orb.y += orb.vy

        if (orb.x < -orb.radius) orb.x = canvas.width + orb.radius
        if (orb.x > canvas.width + orb.radius) orb.x = -orb.radius
        if (orb.y < -orb.radius) orb.y = canvas.height + orb.radius
        if (orb.y > canvas.height + orb.radius) orb.y = -orb.radius

        const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius)
        gradient.addColorStop(0, orb.color)
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

        ctx.beginPath()
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()
      })

      requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
      <div className="absolute inset-0 bg-gradient-to-br from-purple-950/40 via-black to-pink-950/40 z-0"></div>
      <div 
        className="absolute inset-0 opacity-10 z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23a855f7' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
          transition: 'transform 0.3s ease-out'
        }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            
            <div 
              className="space-y-8 text-white"
              style={{
                transform: `translate(${-mousePosition.x * 0.5}px, ${-mousePosition.y * 0.5}px)`,
                transition: 'transform 0.3s ease-out'
              }}
            >
              <div className="space-y-6">
                <div className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-6 py-3 backdrop-blur-xl border border-purple-400/30 shadow-lg shadow-purple-500/20">
                  <Rocket className="h-5 w-5 text-purple-400 animate-bounce" />
                  <span className="text-sm font-semibold bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent">
                    Join 10,000+ Smart Renters
                  </span>
                </div>
                
                <div>
                  <h1 className="text-6xl font-black leading-tight lg:text-7xl mb-4">
                    <span className="block">Your Dream</span>
                    <span className="block">Home Awaits</span>
                    <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent animate-gradient">
                      Start Today
                    </span>
                  </h1>
                  <div className="h-1 w-32 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg shadow-purple-500/50"></div>
                </div>
                
                <p className="text-xl text-purple-100/80 leading-relaxed font-light max-w-xl">
                  Join the revolution in property rental. Create your free account in 30 seconds and unlock a world of verified homes.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { icon: CheckCircle2, text: 'Instant access to 2,000+ verified properties', color: 'emerald' },
                  { icon: Zap, text: 'AI-powered recommendations tailored to you', color: 'blue' },
                  { icon: Shield, text: 'Military-grade security & privacy protection', color: 'purple' },
                  { icon: Star, text: 'Priority support from our expert team 24/7', color: 'amber' },
                  { icon: Users, text: 'Join exclusive community of happy renters', color: 'pink' }
                ].map((benefit, i) => (
                  <div
                    key={i}
                    className="group flex items-start gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-purple-400/30 hover:bg-white/10 transition-all duration-300"
                  >
                    <div className={`flex-shrink-0 rounded-xl bg-${benefit.color}-500/20 p-2.5 group-hover:scale-110 transition-transform duration-300`}>
                      <benefit.icon className={`h-5 w-5 text-${benefit.color}-400`} />
                    </div>
                    <p className="text-base text-white/90 font-medium pt-0.5">{benefit.text}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-8 pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 border-2 border-black"></div>
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-xs text-purple-200/60 mt-1">4.9/5 from 10K+ reviews</p>
                  </div>
                </div>
              </div>
            </div>

            <div 
              className="flex items-center justify-center"
              style={{
                transform: `translate(${mousePosition.x * 0.5}px, ${mousePosition.y * 0.5}px)`,
                transition: 'transform 0.3s ease-out'
              }}
            >
              <div className="w-full max-w-md">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 rounded-3xl blur-2xl opacity-40 group-hover:opacity-60 transition duration-500 animate-pulse"></div>
                  
                  <div className="relative rounded-3xl bg-gradient-to-br from-white/10 to-white/[0.05] p-8 backdrop-blur-2xl border border-white/20 shadow-2xl">
                    <div className="mb-8 text-center space-y-3">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30 mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Sparkles className="h-8 w-8 text-purple-400" />
                      </div>
                      <h2 className="text-3xl font-bold text-white">Create Account</h2>
                      <p className="text-purple-200/60">Start your rental journey in seconds</p>
                    </div>
                    
                    <SignUp 
                      appearance={{
                        elements: {
                          rootBox: "w-full",
                          card: "bg-transparent shadow-none",
                          headerTitle: "hidden",
                          headerSubtitle: "hidden",
                          socialButtonsBlockButton: "bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm hover:scale-105 transition-transform duration-200",
                          formButtonPrimary: "bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 hover:from-purple-500 hover:via-pink-500 hover:to-orange-500 text-white font-bold shadow-lg shadow-pink-500/50 hover:shadow-pink-500/70 hover:scale-105 transition-all duration-200",
                          formFieldInput: "bg-white/10 border-white/20 text-white placeholder:text-purple-200/50 backdrop-blur-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 transition-all",
                          formFieldLabel: "text-white font-semibold text-sm",
                          footerActionLink: "text-purple-400 hover:text-purple-300 font-semibold",
                          identityPreviewText: "text-white",
                          formFieldInputShowPasswordButton: "text-purple-400 hover:text-purple-300",
                          otpCodeFieldInput: "bg-white/10 border-white/20 text-white",
                          formResendCodeLink: "text-purple-400 hover:text-purple-300",
                          dividerLine: "bg-white/20",
                          dividerText: "text-purple-200/70 font-medium",
                          footerActionText: "text-purple-200/70",
                          footer: "hidden"
                        },
                      }}
                      routing="path"
                      path="/sign-up"
                      signInUrl="/sign-in"
                      afterSignUpUrl="/select-role"
                    />
                    
                    <div className="mt-8 space-y-4">
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="bg-transparent px-2 text-purple-200/50">or</span>
                        </div>
                      </div>
                      
                      <p className="text-center text-sm text-purple-200/70">
                        Already have an account?{' '}
                        <a href="/sign-in" className="font-bold text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text hover:from-purple-300 hover:to-pink-300 transition-all">
                          Sign in here →
                        </a>
                      </p>

                      <p className="text-center text-xs text-purple-300/40 pt-2">
                        By signing up, you agree to our{' '}
                        <a href="#" className="underline hover:text-purple-300/60">Terms</a>
                        {' '}and{' '}
                        <a href="#" className="underline hover:text-purple-300/60">Privacy Policy</a>
                      </p>

                      <div className="flex items-center justify-center gap-6 pt-4 border-t border-white/5">
                        <div className="text-center">
                          <Shield className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
                          <p className="text-xs text-purple-200/50">Secure</p>
                        </div>
                        <div className="h-8 w-px bg-white/10"></div>
                        <div className="text-center">
                          <Zap className="h-5 w-5 text-yellow-400 mx-auto mb-1" />
                          <p className="text-xs text-purple-200/50">Instant</p>
                        </div>
                        <div className="h-8 w-px bg-white/10"></div>
                        <div className="text-center">
                          <Star className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                          <p className="text-xs text-purple-200/50">Free</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-center gap-3">
                  <div className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 backdrop-blur-sm">
                    <p className="text-xs font-semibold text-emerald-300">🎉 No credit card required</p>
                  </div>
                  <div className="rounded-full bg-blue-500/10 border border-blue-500/20 px-4 py-2 backdrop-blur-sm">
                    <p className="text-xs font-semibold text-blue-300">⚡ Takes 30 seconds</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-white/5 backdrop-blur-xl bg-black/20">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-purple-200/50">
            <p>© 2050 AskDerek. Building the future of rental housing.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-purple-300 transition-colors">Privacy</a>
              <a href="#" className="hover:text-purple-300 transition-colors">Terms</a>
              <a href="#" className="hover:text-purple-300 transition-colors">Help Center</a>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  )
}