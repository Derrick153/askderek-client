'use client'

import { SignUp } from '@clerk/nextjs'
import { Building2, Shield, Sparkles, CheckCircle2, TrendingUp, Lock, Users, Clock, Zap } from 'lucide-react'

export default function SignUpPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Subtle background pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/30 via-purple-950/20 to-transparent" />

      {/* Main content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            
            {/* Left side - Professional branding */}
            <div className="space-y-8 text-white">
              {/* Logo & Badge */}
              <div className="space-y-6">
                <div className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 px-5 py-2.5 backdrop-blur-sm border border-blue-400/20">
                  <Sparkles className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-semibold text-blue-200">
                    Join 10,000+ Happy Renters
                  </span>
                </div>
                
                <div>
                  <h1 className="text-5xl font-bold leading-tight lg:text-6xl mb-4">
                    <span className="block text-white">Create Your</span>
                    <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                      AskDerek Account
                    </span>
                  </h1>
                  <div className="h-1 w-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                </div>
                
                <p className="text-lg text-slate-300 leading-relaxed max-w-lg">
                  Start your journey to finding the perfect home in Tarkwa and across Ghana. Join thousands of satisfied renters today.
                </p>
              </div>

              {/* Key Benefits for Sign Up */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { 
                    icon: Zap, 
                    title: 'Instant Access', 
                    desc: 'Browse immediately',
                  },
                  { 
                    icon: Shield, 
                    title: 'Secure & Private', 
                    desc: 'Data protection',
                  },
                  { 
                    icon: CheckCircle2, 
                    title: 'No Credit Card', 
                    desc: 'Completely free',
                  },
                  { 
                    icon: Users, 
                    title: 'Save Favorites', 
                    desc: 'Track your searches',
                  }
                ].map((feature, i) => (
                  <div
                    key={i}
                    className="group rounded-xl bg-white/5 p-5 backdrop-blur-sm border border-white/10 hover:border-blue-400/30 transition-all duration-300 hover:bg-white/10"
                  >
                    <div className="mb-3 inline-flex rounded-lg bg-blue-500/10 p-2.5">
                      <feature.icon className="h-5 w-5 text-blue-400" />
                    </div>
                    <h3 className="text-base font-semibold mb-1 text-white">{feature.title}</h3>
                    <p className="text-sm text-slate-400">{feature.desc}</p>
                  </div>
                ))}
              </div>

              {/* Real Stats */}
              <div className="flex gap-8 pt-4 border-t border-white/10">
                {[
                  { number: '2,500+', label: 'Active Listings' },
                  { number: '10K+', label: 'Happy Renters' },
                  { number: '4.8★', label: 'Average Rating' }
                ].map((stat, i) => (
                  <div key={i}>
                    <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      {stat.number}
                    </div>
                    <div className="text-xs text-slate-400 font-medium mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right side - Clean sign up card */}
            <div className="flex items-center justify-center">
              <div className="w-full max-w-md">
                {/* Card with subtle glow */}
                <div className="relative group">
                  {/* Soft glow effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition duration-300" />
                  
                  {/* Main card */}
                  <div className="relative rounded-2xl bg-white/10 p-8 backdrop-blur-xl border border-white/20 shadow-2xl">
                    {/* Header */}
                    <div className="mb-8 text-center space-y-3">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/30 mb-3">
                        <Sparkles className="h-7 w-7 text-blue-400" />
                      </div>
                      <h2 className="text-2xl font-bold text-white">Create Account</h2>
                      <p className="text-slate-300 text-sm">Join AskDerek in 30 seconds</p>
                    </div>
                    
                    {/* Clerk sign up component with production styling matching sign-in */}
                    <SignUp 
                      appearance={{
                        elements: {
                          rootBox: "w-full",
                          card: "bg-transparent shadow-none",
                          headerTitle: "hidden",
                          headerSubtitle: "hidden",
                          socialButtonsBlockButton: "bg-white/10 border-white/20 text-white hover:bg-white/15 backdrop-blur-sm transition-all duration-200 font-medium",
                          socialButtonsBlockButtonText: "text-white font-medium",
                          formButtonPrimary: "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 h-11",
                          formFieldInput: "bg-white/10 border-white/20 text-white placeholder:text-slate-400 backdrop-blur-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 transition-all h-11",
                          formFieldLabel: "text-white font-medium text-sm",
                          footerActionLink: "text-blue-400 hover:text-blue-300 font-semibold transition-colors",
                          identityPreviewText: "text-white",
                          formFieldInputShowPasswordButton: "text-blue-400 hover:text-blue-300",
                          otpCodeFieldInput: "bg-white/10 border-white/20 text-white",
                          formResendCodeLink: "text-blue-400 hover:text-blue-300 font-medium",
                          dividerLine: "bg-white/20",
                          dividerText: "text-slate-300 font-medium text-xs",
                          footerActionText: "text-slate-300",
                          footer: "hidden",
                          identityPreviewEditButton: "text-blue-400 hover:text-blue-300",
                        },
                      }}
                      routing="path"
                      path="/sign-up"
                      signInUrl="/sign-in"
                      afterSignUpUrl="/select-role"
                    />
                    
                    {/* Footer */}
                    <div className="mt-6 space-y-4">
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="bg-transparent px-2 text-slate-400">or</span>
                        </div>
                      </div>
                      
                      <p className="text-center text-sm text-slate-300">
                        Already have an account?{' '}
                        <a 
                          href="/sign-in" 
                          className="font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Sign in here →
                        </a>
                      </p>

                      {/* Terms */}
                      <p className="text-center text-xs text-slate-400 pt-2">
                        By signing up, you agree to our{' '}
                        <a href="/terms" className="underline hover:text-slate-300">Terms</a>
                        {' '}and{' '}
                        <a href="/privacy" className="underline hover:text-slate-300">Privacy Policy</a>
                      </p>

                      {/* Trust badges */}
                      <div className="flex items-center justify-center gap-4 pt-4 border-t border-white/10">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Shield className="h-3.5 w-3.5 text-green-400" />
                          <span>Secure</span>
                        </div>
                        <div className="h-3 w-px bg-white/10" />
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Clock className="h-3.5 w-3.5 text-blue-400" />
                          <span>30 Seconds</span>
                        </div>
                        <div className="h-3 w-px bg-white/10" />
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <TrendingUp className="h-3.5 w-3.5 text-purple-400" />
                          <span>Free Forever</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-white/5 backdrop-blur-sm bg-black/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-400">
            <p>© 2026 AskDerek. Made in Ghana 🇬🇭</p>
            <div className="flex gap-6">
              <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-white transition-colors">Terms</a>
              <a href="/support" className="hover:text-white transition-colors">Support</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}