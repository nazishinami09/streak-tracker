'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Flame, Trophy, LayoutDashboard, User, 
  LogOut, ShieldAlert, CheckCircle2, XCircle, Award, Clock, Mail
} from 'lucide-react';

export default function App() {
  // Navigation & User State
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Auth Form State
  const [isSignUp, setIsSignUp] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Daily Prompt & Timer State
  const [showDailyPrompt, setShowDailyPrompt] = useState(false);
  const [timeLeft, setTimeLeft] = useState('24:00:00');

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState([]);

  // Check if session exists in local storage
  useEffect(() => {
    const savedUser = localStorage.getItem('streak_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setCurrentUser(parsed);
      checkDailyPromptStatus(parsed);
    }
  }, []);

  // Timer Tick Logic (Counts down 24 hours from last check-in timestamp)
  useEffect(() => {
    if (!currentUser?.last_check_in_time) {
      setShowDailyPrompt(true);
      return;
    }

    const checkInTime = new Date(currentUser.last_check_in_time).getTime();
    const nextCheckInTime = checkInTime + 24 * 60 * 60 * 1000; // 24 hours later

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = nextCheckInTime - now;

      if (diff <= 0) {
        setTimeLeft('00:00:00');
        setShowDailyPrompt(true);
      } else {
        setShowDailyPrompt(false); // Hide banner while timer is active
        const hours = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
        const seconds = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');
        setTimeLeft(`${hours}:${minutes}:${seconds}`);
      }
    };

    updateTimer(); // Initial call
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // Check daily check-in status
  const checkDailyPromptStatus = (user) => {
    if (!user.last_check_in_time) {
      setShowDailyPrompt(true);
      return;
    }
    const checkInTime = new Date(user.last_check_in_time).getTime();
    const nextCheckInTime = checkInTime + 24 * 60 * 60 * 1000;
    if (new Date().getTime() >= nextCheckInTime) {
      setShowDailyPrompt(true);
    } else {
      setShowDailyPrompt(false);
    }
  };

  // Auth Handlers
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (!usernameInput.trim() || !passwordInput.trim()) {
      setAuthError('Please enter both username and password.');
      return;
    }

    if (isSignUp) {
      const { data, error } = await supabase
        .from('profiles')
        .insert([{ username: usernameInput.trim(), password: passwordInput.trim() }])
        .select()
        .single();

      if (error) {
        setAuthError(error.message.includes('unique') ? 'Username already taken.' : error.message);
      } else {
        setCurrentUser(data);
        localStorage.setItem('streak_user', JSON.stringify(data));
        checkDailyPromptStatus(data);
      }
    } else {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', usernameInput.trim())
        .eq('password', passwordInput.trim())
        .single();

      if (error || !data) {
        setAuthError('Invalid username or password.');
      } else {
        setCurrentUser(data);
        localStorage.setItem('streak_user', JSON.stringify(data));
        checkDailyPromptStatus(data);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('streak_user');
    setCurrentUser(null);
  };

  // Daily Check-in Handlers
  const handleDailyResponse = async (keptStreak) => {
    const nowIso = new Date().toISOString();
    const today = nowIso.split('T')[0];
    const newStreak = keptStreak ? (currentUser.streak_count || 0) + 1 : 0;

    // Immediately hide banner locally
    setShowDailyPrompt(false);

    const updatedUser = {
      ...currentUser,
      streak_count: newStreak,
      last_check_in: today,
      last_check_in_time: nowIso
    };

    // Update state immediately
    setCurrentUser(updatedUser);
    localStorage.setItem('streak_user', JSON.stringify(updatedUser));

    // Save to Database
    await supabase
      .from('profiles')
      .update({ 
        streak_count: newStreak, 
        last_check_in: today,
        last_check_in_time: nowIso 
      })
      .eq('id', currentUser.id);
  };

  // Fetch Leaderboard
  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, streak_count')
      .order('streak_count', { ascending: false })
      .limit(10);

    if (data) setLeaderboard(data);
  };

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      fetchLeaderboard();
    }
  }, [activeTab]);

  // Badge Calculator
  const getBadge = (count = 0) => {
    if (count >= 90) return { title: 'God Mode', color: 'text-purple-400 bg-purple-950/60 border-purple-800' };
    if (count >= 75) return { title: 'Legend', color: 'text-amber-400 bg-amber-950/60 border-amber-800' };
    if (count >= 60) return { title: 'Champion', color: 'text-yellow-400 bg-yellow-950/60 border-yellow-800' };
    if (count >= 45) return { title: 'Master', color: 'text-red-400 bg-red-950/60 border-red-800' };
    if (count >= 30) return { title: 'Iron Will', color: 'text-orange-400 bg-orange-950/60 border-orange-800' };
    if (count >= 21) return { title: 'Habit Builder', color: 'text-blue-400 bg-blue-950/60 border-blue-800' };
    if (count >= 15) return { title: 'Committed', color: 'text-cyan-400 bg-cyan-950/60 border-cyan-800' };
    if (count >= 7)  return { title: 'Novice', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800' };
    return { title: 'Noob', color: 'text-slate-400 bg-slate-900 border-slate-800' };
  };

  // 1. LOGIN / SIGNUP SCREEN
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <Flame className="w-12 h-12 text-orange-500 fill-orange-500" />
            </div>
            <h1 className="text-2xl font-bold">Streak Tracker</h1>
            <p className="text-slate-400 text-sm">
              {isSignUp ? 'Create your account to start building habits' : 'Log in to track your daily progress'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authError && (
              <div className="bg-red-950/50 border border-red-800 text-red-400 p-3 rounded-xl text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" /> {authError}
              </div>
            )}

            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Username</label>
              <input
                type="text"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500"
                placeholder="Enter username"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Password</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500"
                placeholder="Enter password"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="text-center text-sm text-slate-400">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); }}
              className="text-orange-400 hover:underline font-medium"
            >
              {isSignUp ? 'Log In' : 'Sign Up'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const badge = getBadge(currentUser.streak_count);
  const currentStreak = Math.min(currentUser.streak_count || 0, 90);
  
  // Calculate Needle Angle: 0 days = -90 deg (left), 90 days = 90 deg (right)
  const needleAngle = -90 + (currentStreak / 90) * 180;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/50 px-6 py-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Flame className="w-7 h-7 text-orange-500 fill-orange-500" />
          <span className="font-bold text-lg">Streak Tracker</span>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
              activeTab === 'dashboard' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
              activeTab === 'leaderboard' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-4 h-4" /> Leaderboard
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
              activeTab === 'about' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" /> About Us
          </button>
        </nav>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="text-slate-400 hover:text-red-400 p-2 rounded-lg transition-colors flex items-center gap-1 text-sm"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Logout</span>
        </button>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6">

        {/* DAILY PROMPT POPUP / BANNER */}
        {showDailyPrompt && (
          <div className="bg-slate-900 border-2 border-orange-500/80 p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <Flame className="w-8 h-8 text-orange-500 fill-orange-500 animate-bounce" />
              <div>
                <h2 className="text-xl font-bold">Daily Streak Check-In</h2>
                <p className="text-slate-400 text-sm">Did you maintain your habit today, @{currentUser.username}?</p>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => handleDailyResponse(true)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <CheckCircle2 className="w-5 h-5" /> Yes, kept my streak!
              </button>
              <button
                onClick={() => handleDailyResponse(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <XCircle className="w-5 h-5" /> No, reset to 0
              </button>
            </div>
          </div>
        )}

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* User Stats Card */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider">Logged in as</span>
                <h2 className="text-2xl font-bold text-white">@{currentUser.username}</h2>
              </div>

              <div className="flex items-center gap-4">
                <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-center">
                  <span className="text-xs text-slate-400 block uppercase tracking-wider">Current Streak</span>
                  <span className="text-2xl font-black text-orange-400 flex items-center justify-center gap-1">
                    <Flame className="w-5 h-5 fill-orange-500 text-orange-500" /> {currentUser.streak_count || 0} Days
                  </span>
                </div>

                <div className={`px-4 py-2 rounded-xl border text-center ${badge.color}`}>
                  <span className="text-xs block uppercase tracking-wider opacity-80">Earned Badge</span>
                  <span className="text-lg font-bold flex items-center justify-center gap-1">
                    <Award className="w-4 h-4" /> {badge.title}
                  </span>
                </div>
              </div>
            </div>

            {/* 90-DAY METER & TIMER SECTION */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col items-center space-y-6">
              <h3 className="font-bold text-lg text-slate-200 w-full text-left">90-Day Streak Meter</h3>

              {/* Gauge Meter Display */}
              <div className="relative w-full max-w-md h-56 flex flex-col items-center justify-end overflow-hidden">
                <svg viewBox="0 0 200 120" className="w-full h-full">
                  {/* 90 Division Ticks (Green when reached, Gray when pending) */}
                  {Array.from({ length: 91 }).map((_, i) => {
                    const angle = -180 + (i * 180) / 90;
                    const rad = (angle * Math.PI) / 180;
                    const isMajor = i % 10 === 0;
                    const r1 = 88;
                    const r2 = isMajor ? 98 : 94;
                    const x1 = 100 + r1 * Math.cos(rad);
                    const y1 = 100 + r2 * Math.sin(rad);
                    const x2 = 100 + (r1 - (isMajor ? 10 : 5)) * Math.cos(rad);
                    const y2 = 100 + (r2 - (isMajor ? 10 : 5)) * Math.sin(rad);

                    return (
                      <line
                        key={i}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={i <= currentStreak ? '#10b981' : '#334155'}
                        strokeWidth={isMajor ? '2' : '1'}
                        className="transition-colors duration-500"
                      />
                    );
                  })}

                  {/* Meter Center Pivot */}
                  <circle cx="100" cy="100" r="7" fill="#f97316" />
                  <circle cx="100" cy="100" r="3" fill="#020617" />

                  {/* Needle */}
                  <g style={{ transform: `rotate(${needleAngle}deg)`, transformOrigin: '100px 100px', transition: 'transform 1s ease-out' }}>
                    <line x1="100" y1="100" x2="100" y2="22" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
                  </g>
                </svg>

                {/* Day Counter under needle pivot */}
                <div className="absolute bottom-2 text-center">
                  <span className="text-3xl font-black text-white">{currentStreak}</span>
                  <span className="text-slate-400 text-xs block">/ 90 Days</span>
                </div>
              </div>

              {/* 24-HOUR COUNTDOWN TIMER BELOW METER */}
              <div className="w-full max-w-xs bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <Clock className="w-4 h-4 text-orange-500" /> Next Check-In Timer
                </span>
                <div className="text-3xl font-mono font-bold text-orange-400 tracking-wider">
                  {timeLeft}
                </div>
                <p className="text-[11px] text-slate-500">
                  {showDailyPrompt ? 'Check-in is active now!' : 'Timer resets after marking today\'s streak'}
                </p>
              </div>

            </div>
          </div>
        )}

        {/* LEADERBOARD TAB */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
              <h3 className="font-bold text-lg text-slate-200 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" /> Top 10 Community Leaderboard
              </h3>

              <div className="divide-y divide-slate-800">
                {leaderboard.length === 0 ? (
                  <p className="text-slate-500 py-4 text-center">Loading rankings...</p>
                ) : (
                  leaderboard.map((user, idx) => {
                    const userBadge = getBadge(user.streak_count);
                    return (
                      <div key={user.id} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className={`w-6 font-bold text-sm text-center ${
                            idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-slate-500'
                          }`}>
                            #{idx + 1}
                          </span>
                          <span className="font-semibold text-slate-100">@{user.username}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-0.5 rounded-md text-xs border font-medium ${userBadge.color}`}>
                            {userBadge.title}
                          </span>
                          <span className="text-orange-400 font-bold flex items-center gap-1 text-sm">
                            <Flame className="w-4 h-4 fill-orange-500" /> {user.streak_count}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
              <h3 className="font-bold text-lg text-slate-200 flex items-center gap-2">
                <Award className="w-5 h-5 text-orange-400" /> Badge Milestones
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                {[
                  { days: '0 Days', title: 'Noob' },
                  { days: '7 Days', title: 'Novice' },
                  { days: '15 Days', title: 'Committed' },
                  { days: '21 Days', title: 'Habit Builder' },
                  { days: '30 Days', title: 'Iron Will' },
                  { days: '45 Days', title: 'Master' },
                  { days: '60 Days', title: 'Champion' },
                  { days: '75 Days', title: 'Legend' },
                  { days: '90 Days', title: 'God Mode' },
                ].map((item) => (
                  <div key={item.title} className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex justify-between items-center">
                    <span className="text-slate-400">{item.days}</span>
                    <span className="font-bold text-slate-200">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ABOUT US TAB */}
        {activeTab === 'about' && (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl space-y-6 text-center">
            <h2 className="text-2xl font-bold text-white">About the Creator</h2>
            
            <img 
              src="/profile.jpg" 
              alt="MD NAZISH INAMI" 
              className="w-32 h-32 rounded-full mx-auto border-2 border-orange-500 object-cover shadow-lg"
            />

            <div className="space-y-4 max-w-lg mx-auto">
              <h3 className="text-lg font-semibold text-orange-400">MD NAZISH INAMI</h3>
              
              <p className="text-slate-300 leading-relaxed">
                Hi, I am Nazish. This website is all about tracking your repetitions because our brain works on that principle. You have to repeat the good habits—only then the brain believes that this is the new norm.
              </p>

              <p className="text-slate-300 leading-relaxed">
                To become more masculine and have greater control over your physical and emotional domains, stay connected with this website.
              </p>

              <div className="pt-4 border-t border-slate-800 text-slate-400 text-sm space-y-1">
                <p>Any suggestions will be welcomed!</p>
                <p className="text-orange-400 font-medium flex items-center justify-center gap-1.5">
                  <Mail className="w-4 h-4" /> nazishwork1@gmail.com
                </p>
              </div>
            </div>
          </div>
        )}

      </main>

    </div>
  );
}