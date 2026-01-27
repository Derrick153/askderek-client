'use client';

import { useUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Search, Heart, Home, TrendingUp, MapPin, Zap, Sparkles, Globe, Shield, Award } from 'lucide-react';

export default function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser();

  if (isLoaded && !isSignedIn) {
    redirect('/');
  }

  if (!isLoaded) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'>
        <div className='relative'>
          <div className='w-20 h-20 border-4 border-t-orange-500 border-r-orange-400 border-b-transparent border-l-transparent rounded-full animate-spin'></div>
          <Sparkles className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-orange-400 animate-pulse' />
        </div>
      </div>
    );
  }

  const stats = [
    { icon: Search, label: 'Properties Viewed', value: '24', trend: '+12%', color: 'from-blue-500 to-cyan-500' },
    { icon: Heart, label: 'Saved Favorites', value: '8', trend: '+3', color: 'from-pink-500 to-rose-500' },
    { icon: Home, label: 'Applications', value: '3', trend: 'Active', color: 'from-purple-500 to-indigo-500' },
    { icon: TrendingUp, label: 'Market Trends', value: '↑ 5%', trend: 'This week', color: 'from-green-500 to-emerald-500' }
  ];

  const quickActions = [
    {
      icon: Search,
      title: 'AI-Powered Search',
      description: 'Find your dream home with intelligent recommendations',
      href: '/search',
      gradient: 'from-blue-600 via-blue-500 to-cyan-500',
      glow: 'group-hover:shadow-blue-500/50'
    },
    {
      icon: Heart,
      title: 'Saved Favorites',
      description: 'Your curated collection of perfect properties',
      href: '/tenants/favorites',
      gradient: 'from-pink-600 via-rose-500 to-orange-500',
      glow: 'group-hover:shadow-pink-500/50'
    },
    {
      icon: Home,
      title: 'My Residences',
      description: 'Manage your current and past rentals',
      href: '/tenants/residences',
      gradient: 'from-purple-600 via-violet-500 to-indigo-500',
      glow: 'group-hover:shadow-purple-500/50'
    }
  ];

  const features = [
    { icon: Shield, text: 'Verified Landlords Only' },
    { icon: Zap, text: 'Instant Notifications' },
    { icon: Globe, text: 'Virtual 3D Tours' },
    { icon: Award, text: 'Premium Support' }
  ];

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pt-20 overflow-hidden'>
      {/* Animated Background */}
      <div className='fixed inset-0 opacity-30'>
        <div className='absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob'></div>
        <div className='absolute top-0 -right-4 w-96 h-96 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000'></div>
        <div className='absolute -bottom-8 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000'></div>
      </div>

      {/* Content */}
      <div className='relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
        {/* Welcome Header */}
        <div className='mb-12 text-center'>
          <div className='inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20 backdrop-blur-sm'>
            <Sparkles className='w-4 h-4 text-orange-400 animate-pulse' />
            <span className='text-sm font-medium bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent'>
              Welcome to the Future of Rental
            </span>
          </div>
          <h1 className='text-5xl md:text-7xl font-black mb-4'>
            <span className='bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 bg-clip-text text-transparent animate-gradient'>
              Hello, {user?.firstName}! 👋
            </span>
          </h1>
          <p className='text-xl text-slate-400 max-w-2xl mx-auto'>
            Your AI-powered journey to finding the perfect home in <span className='text-orange-400 font-semibold'>Tarkwa</span> starts here
          </p>
        </div>

        {/* Stats Cards */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12'>
          {stats.map((stat, index) => (
            <div
              key={index}
              className='group relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl'
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-500`}></div>
              <div className='relative'>
                <div className='flex items-center justify-between mb-4'>
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                    <stat.icon className='w-6 h-6 text-white' />
                  </div>
                  <span className='text-sm font-semibold text-green-400'>{stat.trend}</span>
                </div>
                <div className='text-3xl font-black text-white mb-1'>{stat.value}</div>
                <div className='text-sm text-slate-400'>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className='mb-12'>
          <h2 className='text-3xl font-bold text-white mb-8 flex items-center gap-3'>
            <Zap className='w-8 h-8 text-orange-400' />
            Quick Actions
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {quickActions.map((action, index) => (
              <Link
                key={index}
                href={action.href}
                className={`group relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl ${action.glow} overflow-hidden`}
              >
                {/* Gradient Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500`}></div>
                
                {/* Shine Effect */}
                <div className='absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000'>
                  <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000'></div>
                </div>

                <div className='relative'>
                  <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${action.gradient} mb-6 shadow-lg group-hover:shadow-2xl transition-shadow`}>
                    <action.icon className='w-8 h-8 text-white' />
                  </div>
                  <h3 className='text-2xl font-bold text-white mb-3 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-orange-400 group-hover:to-pink-400 group-hover:bg-clip-text transition-all'>
                    {action.title}
                  </h3>
                  <p className='text-slate-400 group-hover:text-slate-300 transition-colors'>
                    {action.description}
                  </p>
                  <div className='mt-6 flex items-center gap-2 text-orange-400 font-semibold group-hover:gap-4 transition-all'>
                    <span>Explore</span>
                    <svg className='w-5 h-5 group-hover:translate-x-2 transition-transform' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 7l5 5m0 0l-5 5m5-5H6' />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Features Banner */}
        <div className='bg-gradient-to-r from-slate-800/50 via-slate-900/50 to-slate-800/50 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50'>
          <div className='flex flex-wrap items-center justify-center gap-8'>
            {features.map((feature, index) => (
              <div key={index} className='flex items-center gap-3 text-slate-300 hover:text-white transition-colors group'>
                <div className='p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-pink-500/20 group-hover:from-orange-500/30 group-hover:to-pink-500/30 transition-all'>
                  <feature.icon className='w-5 h-5 text-orange-400' />
                </div>
                <span className='font-medium'>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        
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
  );
}