

import React, { useState, useEffect } from 'react';
import { Users, Trophy, Settings, LogOut, ArrowLeft, Shield, Sparkles, Loader2, Activity, X, Calendar, BarChart3, Crown, Dna, Star, Upload, Image as ImageIcon } from 'lucide-react';
import { Team, Match, AppState, TournamentMode, StandingsRow, MatchStats, TournamentType, CupResult } from './types';
import { generateSchedule, generateCupSchedule, advanceCupTournament } from './services/scheduler';
import { analyzeStandings } from './services/geminiService';
import { Button } from './components/Button';
import { StandingsTable } from './components/StandingsTable';
import { TeamStatsTable } from './components/TeamStatsTable';
import { NewsFeed } from './components/NewsFeed';
import { CupBracket } from './components/CupBracket';

const DEFAULT_STATS: MatchStats = {
  homePossession: 50, awayPossession: 50,
  homeShots: 0, awayShots: 0,
  homeShotsOnTarget: 0, awayShotsOnTarget: 0,
  homeFouls: 0, awayFouls: 0,
  homeOffsides: 0, awayOffsides: 0,
  homeCorners: 0, awayCorners: 0,
  homeFreeKicks: 0, awayFreeKicks: 0,
  homePasses: 0, awayPasses: 0,
  homePassesCompleted: 0, awayPassesCompleted: 0,
  homeCrosses: 0, awayCrosses: 0,
  homeInterceptions: 0, awayInterceptions: 0,
  homeTackles: 0, awayTackles: 0,
  homeSaves: 0, awaySaves: 0,
};

function App() {
  const [appState, setAppState] = useState<AppState>('menu');
  const [tournType, setTournType] = useState<TournamentType>('league');
  const [mode, setMode] = useState<TournamentMode>('single');
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [cupResult, setCupResult] = useState<CupResult | null>(null);
  
  // Draw State
  const [drawQueue, setDrawQueue] = useState<Match[]>([]);
  const [drawnMatches, setDrawnMatches] = useState<Match[]>([]);
  const [drawStep, setDrawStep] = useState<'basket' | 'home_anim' | 'home_revealed' | 'away_anim' | 'away_revealed' | 'pair_finished'>('basket');
  const [currentDrawMatch, setCurrentDrawMatch] = useState<Match | null>(null);
  
  // Temporary state for setup
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamLogo, setNewTeamLogo] = useState<string | undefined>(undefined);
  
  // UI States
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [tempStats, setTempStats] = useState<MatchStats>(DEFAULT_STATS);
  const [menuSelection, setMenuSelection] = useState<'root' | 'league' | 'cup'>('root');
  
  // AI State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const handleStartSetup = (type: TournamentType, selectedMode: TournamentMode) => {
    setTournType(type);
    setMode(selectedMode);
    setAppState('setup');
    setTeams([]);
    setCupResult(null);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewTeamLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addTeam = () => {
    if (!newTeamName.trim()) return;
    setTeams([...teams, { 
        id: crypto.randomUUID(), 
        name: newTeamName.trim(),
        logo: newTeamLogo
    }]);
    setNewTeamName('');
    setNewTeamLogo(undefined);
  };

  const removeTeam = (id: string) => {
    setTeams(teams.filter(t => t.id !== id));
  };

  const startTournament = () => {
    if (teams.length < 2) {
      alert("Ən azı 2 komanda lazımdır!");
      return;
    }
    
    let schedule: Match[] = [];
    if (tournType === 'league') {
      schedule = generateSchedule(teams, mode);
    } else {
      schedule = generateCupSchedule(teams, mode);
    }

    setMatches(schedule);
    
    // Setup Draw Ceremony
    // Get only Round 1 matches for the draw animation
    const round1 = schedule.filter(m => m.round === 1);
    
    // Filter to unique pairs
    const uniquePairs = round1.filter((m, index, self) => 
       index === self.findIndex((t) => (t.homeTeamId === m.homeTeamId && t.awayTeamId === m.awayTeamId) || (t.homeTeamId === m.awayTeamId && t.awayTeamId === m.homeTeamId))
    );

    setDrawQueue(uniquePairs);
    setDrawnMatches([]);
    setDrawStep('basket');
    setAppState('draw');
    setAiAnalysis(null);
  };

  // Helper to prevent crashes if a team is missing (e.g. bye)
  const getTeamNameSafe = (teamId: string | undefined) => {
    if (!teamId) return '???';
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : 'Bay (Rəqibsiz)';
  };
  
  const getTeamLogoSafe = (teamId: string | undefined) => {
      const team = teams.find(t => t.id === teamId);
      return team?.logo;
  };

  // --- DRAW CEREMONY LOGIC ---
  const handleDrawClick = () => {
    if (drawQueue.length === 0) {
      return;
    }

    if (drawStep === 'basket') {
      // Pick next match
      const nextMatch = drawQueue[0];
      if (!nextMatch) {
         setAppState('tournament');
         return;
      }
      setCurrentDrawMatch(nextMatch);
      setDrawStep('home_anim');
      setTimeout(() => setDrawStep('home_revealed'), 1200); 
    } else if (drawStep === 'home_revealed') {
      setDrawStep('away_anim');
      setTimeout(() => {
        setDrawStep('away_revealed');
        // AUTO ADVANCE
        setTimeout(() => {
             setDrawStep('pair_finished');
        }, 2000);
      }, 1200);
    } else if (drawStep === 'pair_finished') {
       // Move to next match
       const finished = drawQueue[0];
       
       if (finished) {
           setDrawnMatches(prev => [...prev, finished]);
       }
       
       const remaining = drawQueue.slice(1);
       setDrawQueue(remaining);
       setCurrentDrawMatch(null);
       
       if (remaining.length === 0) {
         // All pairs drawn. Redirect DIRECTLY to tournament
         setAppState('tournament');
       } else {
         setDrawStep('basket');
       }
    }
  };

  // Manual skip for away reveal if user clicks
  const handleAwayRevealClick = () => {
     if (drawStep === 'away_revealed') {
        setDrawStep('pair_finished');
     }
  };

  const openMatchModal = (match: Match) => {
    setEditingMatch(match);
    setTempStats({ ...DEFAULT_STATS, ...(match.stats || {}) });
  };

  const saveMatchDetails = (homeScoreStr: string, awayScoreStr: string) => {
    if (!editingMatch) return;

    const homeScore = homeScoreStr === '' ? null : parseInt(homeScoreStr);
    const awayScore = awayScoreStr === '' ? null : parseInt(awayScoreStr);
    const isPlayed = homeScore !== null && awayScore !== null;
    
    const updatedMatches = matches.map(m => {
      if (m.id === editingMatch.id) {
        return {
          ...m,
          homeScore,
          awayScore,
          isPlayed,
          stats: tempStats
        };
      }
      return m;
    });

    setMatches(updatedMatches);
    setEditingMatch(null);

    // Trigger Cup Advancement Logic
    if (tournType === 'cup' && isPlayed) {
      setTimeout(() => {
        const { newMatches, completed, results } = advanceCupTournament(updatedMatches, teams, mode);
        if (newMatches.length > 0) {
          setMatches([...updatedMatches, ...newMatches]);
        }
        if (completed && results) {
          setCupResult(results);
          setAppState('podium');
        }
      }, 500);
    }
  };

  const confirmExit = () => {
    setAppState('menu');
    setMenuSelection('root');
    setTeams([]);
    setMatches([]);
    setShowExitConfirm(false);
    setCupResult(null);
  };

  const triggerAIAnalysis = async () => {
    if (tournType === 'cup') {
        alert("AI Analizi hazırda yalnız Liqa rejimi üçün aktivdir.");
        return;
    }

    const stats: Record<string, StandingsRow> = {};
    teams.forEach(t => stats[t.id] = { teamId: t.id, teamName: t.name, points: 0, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 });
    
    matches.forEach(m => {
      if(m.isPlayed && m.homeScore !== null && m.awayScore !== null) {
         if (m.homeScore > m.awayScore) { stats[m.homeTeamId].points += 3; stats[m.homeTeamId].won++; stats[m.homeTeamId].played++; stats[m.awayTeamId].lost++; stats[m.awayTeamId].played++; }
         else if (m.homeScore < m.awayScore) { stats[m.awayTeamId].points += 3; stats[m.awayTeamId].won++; stats[m.awayTeamId].played++; stats[m.homeTeamId].lost++; stats[m.homeTeamId].played++; }
         else { stats[m.homeTeamId].points += 1; stats[m.awayTeamId].points += 1; stats[m.homeTeamId].drawn++; stats[m.awayTeamId].drawn++; stats[m.homeTeamId].played++; stats[m.awayTeamId].played++; }
      }
    });
    
    const sortedStandings = Object.values(stats).sort((a,b) => b.points - a.points);
    
    setIsAnalyzing(true);
    const result = await analyzeStandings(sortedStandings);
    setAiAnalysis(result || "Analiz alınmadı.");
    setIsAnalyzing(false);
  };

  const renderStatRow = (label: string, homeKey: keyof MatchStats, awayKey: keyof MatchStats) => (
    <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors px-2 rounded-lg">
      <input
        type="number" min="0"
        value={tempStats[homeKey]}
        onChange={(e) => setTempStats({...tempStats, [homeKey]: parseInt(e.target.value) || 0})}
        className="w-14 bg-slate-950/50 border border-slate-700 rounded-md p-1.5 text-center text-white text-sm focus:border-indigo-500 outline-none shadow-inner"
      />
      <span className="text-[11px] sm:text-xs text-slate-400 uppercase font-bold tracking-wider text-center flex-1 px-2">{label}</span>
      <input
        type="number" min="0"
        value={tempStats[awayKey]}
        onChange={(e) => setTempStats({...tempStats, [awayKey]: parseInt(e.target.value) || 0})}
        className="w-14 bg-slate-900 border border-slate-700 rounded-md p-1.5 text-center text-white text-sm focus:border-indigo-500 outline-none shadow-inner"
      />
    </div>
  );

  // --- DRAW CEREMONY RENDERER ---
  if (appState === 'draw') {
    // Safely get names to prevent crash if team is missing or is a 'bye'
    const homeName = getTeamNameSafe(currentDrawMatch?.homeTeamId);
    const awayName = getTeamNameSafe(currentDrawMatch?.awayTeamId);
    const homeLogo = getTeamLogoSafe(currentDrawMatch?.homeTeamId);
    const awayLogo = getTeamLogoSafe(currentDrawMatch?.awayTeamId);

    // Ball Component
    const Ball = ({ isAnimating, isRevealed, teamName, teamLogo, type }: { isAnimating: boolean, isRevealed: boolean, teamName: string, teamLogo?: string, type: 'home' | 'away' }) => (
      <div className={`relative w-48 h-48 mx-auto perspective-1000 ${isAnimating ? 'animate-jumpOut' : ''}`}>
        {!isRevealed && (
          <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-white to-slate-200 shadow-[0_0_30px_rgba(255,255,255,0.4)] flex items-center justify-center
            ${isAnimating ? '' : ''}`}>
             <div className="absolute inset-0 opacity-20 bg-slate-300 rounded-full" style={{backgroundImage: 'radial-gradient(circle at 50% 50%, transparent 40%, rgba(0,0,0,0.1) 100%)'}}></div>
          </div>
        )}
        
        {/* Splitting Halves */}
        {isRevealed && (
          <>
            <div className="absolute inset-0 rounded-full overflow-hidden animate-crackLeft bg-gradient-to-br from-white to-slate-200" style={{clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)'}}></div>
            <div className="absolute inset-0 rounded-full overflow-hidden animate-crackRight bg-gradient-to-br from-white to-slate-200" style={{clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)'}}></div>
            
            {/* Paper Name */}
            <div className="absolute inset-0 flex items-center justify-center animate-paperReveal z-10">
               <div className={`bg-white text-slate-900 px-6 py-4 shadow-2xl rotate-[-2deg] border border-slate-200 transform scale-110 flex flex-col items-center
                  ${type === 'home' ? 'border-l-8 border-l-blue-500' : 'border-r-8 border-r-red-500'}
               `}>
                 <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{type === 'home' ? 'Ev Sahibi' : 'Qonaq'}</div>
                 {teamLogo && <img src={teamLogo} className="w-12 h-12 object-contain mb-2" alt="Logo"/>}
                 <h2 className="text-2xl font-black uppercase whitespace-nowrap">{teamName}</h2>
               </div>
            </div>
          </>
        )}
      </div>
    );

    return (
      <div 
        className="min-h-screen bg-slate-950 relative overflow-hidden flex flex-col items-center justify-center p-6"
        onClick={handleAwayRevealClick} // Allow tap to skip away reveal
      >
         {/* Background Spotlights */}
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-indigo-900/30 to-transparent pointer-events-none"></div>
         <div className="absolute top-0 left-1/4 w-[2px] h-[800px] bg-white/5 rotate-[15deg] blur-sm"></div>
         <div className="absolute top-0 right-1/4 w-[2px] h-[800px] bg-white/5 rotate-[-15deg] blur-sm"></div>

         <div className="z-10 w-full max-w-4xl text-center pb-24">
            <h1 className="text-4xl font-black text-white mb-12 uppercase tracking-widest drop-shadow-xl flex items-center justify-center gap-4">
               <Dna className="w-8 h-8 text-indigo-400" />
               Rəsmi Püşkatma
               <Dna className="w-8 h-8 text-indigo-400" />
            </h1>

            <div className="h-[400px] flex items-center justify-center relative mb-4">
               {/* STEP 1: BASKET */}
               {drawStep === 'basket' && (
                 <div 
                   onClick={(e) => { e.stopPropagation(); handleDrawClick(); }}
                   className="cursor-pointer group relative w-64 h-64 flex flex-col items-center justify-center transition-transform active:scale-95 animate-basketShake"
                 >
                   {/* Basket Graphic */}
                   <div className="w-48 h-48 rounded-b-full bg-gradient-to-b from-slate-700 to-slate-900 border-4 border-slate-600 shadow-2xl relative overflow-hidden flex items-end justify-center pb-4 z-10">
                      <div className="text-slate-500 font-bold text-sm mb-6">Polad Arena</div>
                      {/* Balls inside - Pure White */}
                      <div className="absolute bottom-4 w-12 h-12 bg-white rounded-full blur-[1px] shadow-inner left-8"></div>
                      <div className="absolute bottom-6 w-12 h-12 bg-slate-100 rounded-full blur-[1px] shadow-inner right-10"></div>
                      <div className="absolute bottom-10 w-12 h-12 bg-white rounded-full blur-[1px] shadow-inner left-16"></div>
                   </div>
                   <div className="mt-6 bg-indigo-600 text-white px-8 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(79,70,229,0.5)] group-hover:bg-indigo-500 transition-colors animate-pulse">
                      TOPU ÇIXAR
                   </div>
                   <div className="absolute -top-10 text-slate-400 text-sm font-mono">
                      Qalan Cütlüklər: {drawQueue.length}
                   </div>
                 </div>
               )}

               {/* STEP 2: HOME REVEAL */}
               {(drawStep === 'home_anim' || drawStep === 'home_revealed') && (
                 <div className="flex flex-col items-center">
                    <Ball isAnimating={drawStep === 'home_anim'} isRevealed={drawStep === 'home_revealed'} teamName={homeName} teamLogo={homeLogo} type="home" />
                    {drawStep === 'home_revealed' && (
                      <Button onClick={(e) => { e.stopPropagation(); handleDrawClick(); }} className="mt-12 text-xl px-10 py-4 bg-amber-500 hover:bg-amber-400 border-amber-400 animate-in fade-in slide-in-from-bottom-4 duration-500">
                         RƏQİBİ ÖYRƏN
                      </Button>
                    )}
                 </div>
               )}

               {/* STEP 3: AWAY REVEAL */}
               {(drawStep === 'away_anim' || drawStep === 'away_revealed') && (
                 <div className="flex flex-col items-center">
                    <Ball isAnimating={drawStep === 'away_anim'} isRevealed={drawStep === 'away_revealed'} teamName={awayName} teamLogo={awayLogo} type="away" />
                 </div>
               )}

               {/* STEP 4: PAIR FINISHED */}
               {drawStep === 'pair_finished' && (
                  <div className="w-full animate-in zoom-in duration-300">
                     <div className="flex items-center justify-center gap-4 md:gap-12">
                        <div className="bg-blue-600/20 border border-blue-500 p-6 rounded-2xl w-64 text-right flex flex-col items-end">
                           {homeLogo && <img src={homeLogo} className="w-16 h-16 object-contain mb-2" alt="" />}
                           <div className="text-3xl md:text-4xl font-black text-white break-words">{homeName}</div>
                           <div className="text-blue-400 font-bold mt-2">EV SAHİBİ</div>
                        </div>
                        
                        <div className="text-6xl font-black text-white italic opacity-50">VS</div>
                        
                        <div className="bg-red-600/20 border border-red-500 p-6 rounded-2xl w-64 text-left flex flex-col items-start">
                           {awayLogo && <img src={awayLogo} className="w-16 h-16 object-contain mb-2" alt="" />}
                           <div className="text-3xl md:text-4xl font-black text-white break-words">{awayName}</div>
                           <div className="text-red-400 font-bold mt-2">QONAQ</div>
                        </div>
                     </div>
                  </div>
               )}
            </div>

            {/* CONTINUE BUTTON - FIXED BOTTOM WITH GRADIENT BACKDROP */}
            {drawStep === 'pair_finished' && (
               <div className="fixed bottom-0 left-0 w-full flex justify-center z-50 px-4 pb-12 pt-8 bg-gradient-to-t from-slate-950 to-transparent">
                 <Button 
                    onClick={(e) => { e.stopPropagation(); handleDrawClick(); }} 
                    className="text-xl md:text-2xl px-16 py-6 rounded-full shadow-[0_0_50px_rgba(34,197,94,0.6)] animate-bounce font-black tracking-[0.2em] uppercase bg-green-600 hover:bg-green-500 border-4 border-green-400 transition-transform active:scale-95"
                 >
                    {drawQueue.length > 1 ? 'DAVAM ET >>' : 'TURNİRƏ BAŞLA'}
                 </Button>
               </div>
            )}

            {/* Drawn List at bottom */}
            <div className="mt-12 flex gap-4 overflow-x-auto justify-center opacity-50 hover:opacity-100 transition-opacity pb-32">
               {drawnMatches.map((m, i) => {
                  if (!m) return null;
                  const hName = getTeamNameSafe(m.homeTeamId);
                  const aName = getTeamNameSafe(m.awayTeamId);
                  return (
                     <div key={i} className="bg-slate-900 border border-white/10 px-4 py-2 rounded-lg flex gap-2 items-center whitespace-nowrap">
                        <span className="text-slate-300 font-bold">{hName}</span>
                        <span className="text-slate-600 text-xs">vs</span>
                        <span className="text-slate-300 font-bold">{aName}</span>
                     </div>
                  )
               })}
            </div>
         </div>
      </div>
    );
  }

  // --- MENU RENDERER ---
  if (appState === 'menu') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative bg-slate-950 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full">
           <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[150px] animate-pulse" />
           <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-teal-600/20 rounded-full blur-[150px] animate-pulse" style={{animationDelay: '2s'}} />
        </div>
        
        <div className="z-10 text-center max-w-5xl w-full flex flex-col items-center">
          <div className="mb-8 inline-flex items-center justify-center p-5 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl ring-1 ring-white/10">
             <Trophy className="w-16 h-16 text-yellow-400 mr-5 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
             <div className="text-left">
               <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter drop-shadow-lg">
                 POLAD <span className="text-indigo-400">TURNİR</span>
               </h1>
             </div>
          </div>

          <p className="text-slate-400 mb-12 text-xl font-light tracking-wide max-w-2xl leading-relaxed">
             Turnir formatını seçin və oyuna başlayın.
          </p>
          
          {menuSelection === 'root' && (
            <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl px-4 animate-in fade-in zoom-in duration-300">
              {/* CHAMPIONS LEAGUE CARD */}
              <button 
                onClick={() => setMenuSelection('league')}
                className="group relative bg-slate-900/50 backdrop-blur-md border border-white/10 hover:border-indigo-500/50 p-8 rounded-3xl transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-1 text-left overflow-hidden h-64 flex flex-col"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="bg-slate-800/80 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-white/5 group-hover:bg-indigo-600 group-hover:border-indigo-400 transition-all duration-300">
                  <Star className="text-indigo-400 group-hover:text-white w-8 h-8 transition-colors" />
                </div>
                <h3 className="text-3xl font-bold text-white mb-2">Champions League Group</h3>
                <p className="text-slate-400 text-sm leading-relaxed mt-auto">Klassik xal hesabı. Qələbə 3, heç-heçə 1 xal.</p>
              </button>

              {/* CUP CARD */}
              <button 
                onClick={() => setMenuSelection('cup')}
                className="group relative bg-slate-900/50 backdrop-blur-md border border-white/10 hover:border-amber-500/50 p-8 rounded-3xl transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/20 hover:-translate-y-1 text-left overflow-hidden h-64 flex flex-col"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="bg-slate-800/80 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-white/5 group-hover:bg-amber-600 group-hover:border-amber-400 transition-all duration-300">
                  <Trophy className="text-amber-400 group-hover:text-white w-8 h-8 transition-colors" />
                </div>
                <h3 className="text-3xl font-bold text-white mb-2">World Cup 2026</h3>
                <p className="text-slate-400 text-sm leading-relaxed mt-auto">Olimpiya sistemi. Uduzan çıxır. Final həyəcanı.</p>
              </button>
            </div>
          )}

          {menuSelection === 'league' && (
             <div className="w-full max-w-4xl px-4 animate-in slide-in-from-right duration-300">
               <Button onClick={() => setMenuSelection('root')} className="mb-6 bg-transparent border-none text-slate-400 hover:text-white pl-0 justify-start"><ArrowLeft className="w-5 h-5"/> Geri</Button>
               <h2 className="text-2xl font-bold text-white mb-6 text-left">Liqa növünü seçin:</h2>
               <div className="grid md:grid-cols-2 gap-6">
                 <button onClick={() => handleStartSetup('league', 'single')} className="bg-slate-900 hover:bg-slate-800 p-6 rounded-2xl border border-white/10 text-left hover:border-indigo-500 transition-all">
                    <span className="text-xl font-bold text-indigo-400 block mb-2">Tək Matç</span>
                    <span className="text-slate-400 text-sm">Hər rəqiblə 1 oyun.</span>
                 </button>
                 <button onClick={() => handleStartSetup('league', 'double')} className="bg-slate-900 hover:bg-slate-800 p-6 rounded-2xl border border-white/10 text-left hover:border-indigo-500 transition-all">
                    <span className="text-xl font-bold text-indigo-400 block mb-2">Ev - Səfər</span>
                    <span className="text-slate-400 text-sm">Hər rəqiblə 2 oyun (Ev və Səfər).</span>
                 </button>
               </div>
             </div>
          )}

          {menuSelection === 'cup' && (
             <div className="w-full max-w-4xl px-4 animate-in slide-in-from-right duration-300">
               <Button onClick={() => setMenuSelection('root')} className="mb-6 bg-transparent border-none text-slate-400 hover:text-white pl-0 justify-start"><ArrowLeft className="w-5 h-5"/> Geri</Button>
               <h2 className="text-2xl font-bold text-white mb-6 text-left">Kubok növünü seçin:</h2>
               <div className="grid md:grid-cols-2 gap-6">
                 <button onClick={() => handleStartSetup('cup', 'single')} className="bg-slate-900 hover:bg-slate-800 p-6 rounded-2xl border border-white/10 text-left hover:border-amber-500 transition-all">
                    <span className="text-xl font-bold text-amber-400 block mb-2">Tək Matç</span>
                    <span className="text-slate-400 text-sm">Hər mərhələdə 1 oyun. Uduzan dərhal çıxır.</span>
                 </button>
                 <button onClick={() => handleStartSetup('cup', 'double')} className="bg-slate-900 hover:bg-slate-800 p-6 rounded-2xl border border-white/10 text-left hover:border-amber-500 transition-all">
                    <span className="text-xl font-bold text-amber-400 block mb-2">Ev - Səfər</span>
                    <span className="text-slate-400 text-sm">Hər tur 2 oyun. Final və 3-cü yer tək oyun.</span>
                 </button>
               </div>
             </div>
          )}

          <div className="mt-24 flex flex-col items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-slate-500 to-transparent"></div>
            <p className="text-slate-300 font-mono text-xs uppercase tracking-[0.2em]">
              Designed by Polad
            </p>
          </div>
        </div>
      </div>
    );
  }

  // PODIUM VIEW
  if (appState === 'podium' && cupResult) {
     return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-1000">
           <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-0 left-1/4 w-1 h-full bg-gradient-to-b from-yellow-500/20 to-transparent blur-md"></div>
              <div className="absolute top-0 right-1/4 w-1 h-full bg-gradient-to-b from-yellow-500/20 to-transparent blur-md"></div>
           </div>

           <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600 mb-12 drop-shadow-2xl uppercase tracking-widest">
              Turnir Bitdi!
           </h1>

           <div className="flex flex-col-reverse md:flex-row items-end gap-8 mb-16">
              {/* 2nd Place */}
              <div className="flex flex-col items-center animate-in slide-in-from-bottom-20 duration-1000 delay-300">
                 <div className="w-24 h-24 rounded-full bg-slate-300 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(203,213,225,0.4)] border-4 border-slate-100 relative">
                    {cupResult.runnerUp.logo && <img src={cupResult.runnerUp.logo} className="w-16 h-16 object-contain rounded-full" alt="" />}
                    {!cupResult.runnerUp.logo && <span className="text-3xl font-bold text-slate-600">2</span>}
                 </div>
                 <h3 className="text-2xl font-bold text-slate-300">{cupResult.runnerUp.name}</h3>
                 <p className="text-sm text-slate-500 uppercase font-bold tracking-widest mt-1">Gümüş Mükafatçı</p>
                 <div className="h-32 w-24 bg-slate-800/50 mt-4 rounded-t-lg border-t border-slate-600"></div>
              </div>

              {/* 1st Place */}
              <div className="flex flex-col items-center mb-12 animate-in slide-in-from-bottom-32 duration-1000">
                 <Crown className="w-16 h-16 text-yellow-400 mb-4 animate-bounce" />
                 <div className="w-32 h-32 rounded-full bg-yellow-400 flex items-center justify-center mb-4 shadow-[0_0_50px_rgba(250,204,21,0.6)] border-4 border-white relative">
                    {cupResult.champion.logo && <img src={cupResult.champion.logo} className="w-24 h-24 object-contain rounded-full" alt="" />}
                    {!cupResult.champion.logo && <span className="text-5xl font-bold text-yellow-800">1</span>}
                 </div>
                 <h2 className="text-4xl font-black text-white">{cupResult.champion.name}</h2>
                 <p className="text-lg text-yellow-400 uppercase font-bold tracking-widest mt-2">Turnir Çempionu</p>
                 <div className="h-48 w-32 bg-yellow-900/20 mt-4 rounded-t-lg border-t border-yellow-600/50"></div>
              </div>

              {/* 3rd Place */}
              {cupResult.thirdPlace && (
                <div className="flex flex-col items-center animate-in slide-in-from-bottom-20 duration-1000 delay-500">
                   <div className="w-24 h-24 rounded-full bg-amber-700 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(180,83,9,0.4)] border-4 border-amber-600 relative">
                      {cupResult.thirdPlace.logo && <img src={cupResult.thirdPlace.logo} className="w-16 h-16 object-contain rounded-full" alt="" />}
                      {!cupResult.thirdPlace.logo && <span className="text-3xl font-bold text-amber-100">3</span>}
                   </div>
                   <h3 className="text-2xl font-bold text-amber-600">{cupResult.thirdPlace.name}</h3>
                   <p className="text-sm text-amber-800 uppercase font-bold tracking-widest mt-1">Bürünc Mükafatçı</p>
                   <div className="h-24 w-24 bg-amber-900/20 mt-4 rounded-t-lg border-t border-amber-800/50"></div>
                </div>
              )}
           </div>

           <Button onClick={confirmExit} className="bg-white text-black hover:bg-slate-200 px-10 py-4 text-xl rounded-full font-bold">
              Ana Menyuna Qayıt
           </Button>
        </div>
     );
  }

  // SETUP VIEW
  if (appState === 'setup') {
    return (
      <div className="min-h-screen bg-slate-950 relative flex items-center justify-center p-4">
        {/* Ambient background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 pointer-events-none" />
        
        <div className="max-w-3xl w-full relative z-10">
          <Button variant="secondary" onClick={() => setAppState('menu')} className="mb-6 hover:bg-white/5 bg-transparent border-transparent pl-0 text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" /> Geri Qayıt
          </Button>
          
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-[2rem] p-8 md:p-12 border border-white/10 shadow-2xl">
            <div className="flex items-center gap-4 mb-10">
              <div className="bg-indigo-500/20 p-4 rounded-2xl">
                 <Users className="text-indigo-400 w-8 h-8" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">Komanda Qeydiyyatı</h2>
                <p className="text-slate-400 text-sm mt-1">
                   {tournType === 'league' ? 'Liqa' : 'Kubok'} üçün klubları əlavə edin.
                   {tournType === 'cup' && <span className="block text-amber-400 text-xs mt-1">Kubok rejimi üçün cüt sayda komanda məsləhətdir (məs: 4, 8, 16).</span>}
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 mb-8 flex-col sm:flex-row">
              <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTeam()}
                    placeholder="Komanda adı..."
                    className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-2xl px-6 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-lg"
                  />
                  <div className="relative">
                     <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                     <div className={`h-full px-4 rounded-2xl border flex items-center justify-center transition-colors ${newTeamLogo ? 'bg-green-600/20 border-green-500' : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800'}`}>
                        {newTeamLogo ? <ImageIcon className="text-green-400 w-6 h-6"/> : <Upload className="text-slate-400 w-6 h-6"/>}
                     </div>
                  </div>
              </div>
              <Button onClick={addTeam} className="px-8 rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-500 border-indigo-500 w-full sm:w-auto">Əlavə et</Button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar mb-8">
              {teams.length === 0 && (
                <div className="text-center text-slate-500 py-16 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
                  Hələ ki, komanda yoxdur.
                </div>
              )}
              {teams.map(team => (
                <div key={team.id} className="flex justify-between items-center bg-slate-800/40 hover:bg-slate-800/60 p-4 rounded-2xl border border-white/5 transition-all group">
                  <div className="flex items-center gap-4">
                     {team.logo ? (
                        <img src={team.logo} alt={team.name} className="w-10 h-10 object-contain rounded-md" />
                     ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-sm font-bold text-white">
                            {team.name.substring(0, 2).toUpperCase()}
                        </div>
                     )}
                     <span className="font-semibold text-lg text-slate-200">{team.name}</span>
                  </div>
                  <button 
                    onClick={() => removeTeam(team.id)}
                    className="text-slate-500 hover:text-red-400 p-2 rounded-xl hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            <Button 
              onClick={startTournament} 
              className="w-full py-5 text-lg rounded-2xl font-bold shadow-xl shadow-indigo-900/20 transition-transform hover:scale-[1.02] active:scale-[0.98]" 
              variant="success"
              disabled={teams.length < 2}
            >
              Püşk At və Başla ({teams.length} Komanda)
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // TOURNAMENT VIEW
  return (
    <div className="min-h-screen bg-slate-950 font-sans pb-10">

      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-lg border-b border-white/5 px-4 py-3 sm:px-6 mb-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`bg-gradient-to-tr p-2 rounded-xl shadow-lg ${tournType === 'league' ? 'from-indigo-500 to-purple-500 shadow-indigo-500/20' : 'from-amber-500 to-orange-500 shadow-amber-500/20'}`}>
              {tournType === 'league' ? <Shield className="w-5 h-5 text-white" /> : <Trophy className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight text-white">Polad Turnir</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                 {tournType === 'league' ? 'Champions League Group' : 'World Cup 2026'} • {mode === 'single' ? 'Tək Matç' : 'Ev-Səfər'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 sm:gap-3">
            {tournType === 'league' && (
              <Button 
                variant="secondary" 
                className="bg-slate-900 border-slate-700 hover:bg-slate-800 text-xs sm:text-sm px-3 sm:px-4"
                onClick={triggerAIAnalysis}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin"/> : <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400 mr-2" />}
                <span className="hidden sm:inline">AI Analizi</span>
              </Button>
            )}

            <Button variant="danger" onClick={() => setShowExitConfirm(true)} className="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500 hover:text-white px-3">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Grid Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Tables / Bracket */}
        <div className="lg:col-span-8 space-y-8">
          {/* Only show Standings if League */}
          {tournType === 'league' && (
            <section className="animate-slideIn">
              <StandingsTable teams={teams} matches={matches} />
            </section>
          )}

          {/* Cup Bracket Visualization */}
          {tournType === 'cup' && (
            <section className="animate-slideIn">
               <CupBracket matches={matches} teams={teams} />
            </section>
          )}
          
          <section className="animate-slideIn" style={{animationDelay: '100ms'}}>
            <TeamStatsTable teams={teams} matches={matches} />
          </section>
        </div>

        {/* Right Column: Matches List */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl overflow-hidden sticky top-24">
             <div className="p-4 bg-slate-900/80 border-b border-white/5 flex justify-between items-center">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  Oyun Təqvimi
                </h3>
                <span className="text-xs font-mono bg-indigo-500/10 text-indigo-300 px-2 py-1 rounded">
                  {matches.filter(m => m.isPlayed).length}/{matches.length}
                </span>
             </div>

             {/* AI Analysis Box */}
             {aiAnalysis && (
              <div className="m-4 p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-xl relative">
                 <button className="absolute top-2 right-2 text-indigo-400 hover:text-white" onClick={() => setAiAnalysis(null)}><X className="w-4 h-4"/></button>
                 <div className="flex gap-2 items-start">
                   <Sparkles className="w-4 h-4 text-amber-400 mt-1 shrink-0" />
                   <p className="text-sm text-indigo-100 leading-relaxed">{aiAnalysis}</p>
                 </div>
              </div>
            )}

             <div className="p-4 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
                {/* For Cup, we group by stage name or round logic */}
                {Array.from(new Set(matches.map(m => m.round))).map(roundNum => {
                   const roundMatches = matches.filter(m => m.round === roundNum);
                   // Use stage name from first match of round
                   const stageTitle = roundMatches[0]?.stageName || `Tur ${roundNum}`;
                   
                   return (
                    <div key={roundNum} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold uppercase tracking-wider ${tournType === 'cup' ? 'text-amber-500' : 'text-slate-500'}`}>
                           {stageTitle}
                        </span>
                        <div className="h-px bg-slate-800 flex-1"></div>
                      </div>
                      
                      {roundMatches.map(match => {
                        const homeTeam = teams.find(t => t.id === match.homeTeamId) || { id: 'tbd', name: 'TBD', logo: undefined };
                        const awayTeam = teams.find(t => t.id === match.awayTeamId) || { id: 'tbd', name: 'TBD', logo: undefined };

                        return (
                          <div 
                            key={match.id} 
                            onClick={() => openMatchModal(match)}
                            className={`group cursor-pointer rounded-xl border p-3 transition-all duration-200 relative
                              ${match.isPlayed 
                                ? 'bg-slate-800/30 border-slate-800 hover:bg-slate-800/50' 
                                : 'bg-gradient-to-r from-slate-800/50 to-slate-800/30 border-white/5 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/10'
                              }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className={`text-sm font-medium truncate flex-1 text-right flex items-center justify-end gap-2 ${match.isPlayed && match.homeScore! > match.awayScore! ? 'text-green-400' : 'text-slate-300'}`}>
                                {homeTeam.name}
                                {homeTeam.logo && <img src={homeTeam.logo} className="w-4 h-4 object-contain" alt=""/>}
                              </span>
                              
                              <div className={`px-2 py-1 rounded-md min-w-[60px] text-center font-mono font-bold text-sm
                                ${match.isPlayed ? 'bg-slate-950 text-white shadow-inner' : 'bg-slate-800 text-slate-500'}`}>
                                {match.isPlayed ? `${match.homeScore} - ${match.awayScore}` : 'VS'}
                              </div>

                              <span className={`text-sm font-medium truncate flex-1 text-left flex items-center gap-2 ${match.isPlayed && match.awayScore! > match.homeScore! ? 'text-green-400' : 'text-slate-300'}`}>
                                {awayTeam.logo && <img src={awayTeam.logo} className="w-4 h-4 object-contain" alt=""/>}
                                {awayTeam.name}
                              </span>
                            </div>
                            
                            {/* Mini Stats Indicator */}
                            {match.isPlayed && match.stats && (
                              <div className="mt-2 flex justify-center gap-3 border-t border-white/5 pt-2">
                                 <div className="text-[10px] text-slate-500">Poss: <span className="text-slate-300">{match.stats.homePossession}%</span></div>
                                 <div className="text-[10px] text-slate-500">Shots: <span className="text-slate-300">{match.stats.homeShots}</span></div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
             </div>
          </div>
          
          {/* News Feed Section */}
          <section className="animate-slideIn" style={{animationDelay: '200ms'}}>
             <NewsFeed teams={teams} matches={matches} type={tournType} />
          </section>
        </div>
      </main>

      {/* --- MODALS --- */}

      {/* Exit Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-white mb-2">Çıxış etmək?</h3>
            <p className="text-slate-400 mb-6 text-sm">Bütün turnir məlumatları silinəcək.</p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowExitConfirm(false)} className="flex-1 bg-slate-800 border-slate-700">Ləğv</Button>
              <Button variant="danger" onClick={confirmExit} className="flex-1">Bəli, Çıx</Button>
            </div>
          </div>
        </div>
      )}

      {/* Match Details Modal */}
      {editingMatch && (() => {
         const homeTeam = teams.find(t => t.id === editingMatch.homeTeamId);
         const awayTeam = teams.find(t => t.id === editingMatch.awayTeamId);
         if(!homeTeam || !awayTeam) return null;

         return (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col my-auto animate-in slide-in-from-bottom-10 duration-300">
              {/* Modal Header */}
              <div className="p-5 border-b border-white/5 flex justify-between items-center bg-slate-900/50 rounded-t-3xl">
                <div className="flex items-center gap-2">
                   <div className="p-2 bg-indigo-500/20 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-indigo-400"/>
                   </div>
                   <h3 className="font-bold text-white">Oyun Statistikası</h3>
                </div>
                <button onClick={() => setEditingMatch(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                {/* Score Input Section */}
                <div className="flex items-center justify-between bg-slate-950 rounded-2xl border border-slate-800 p-6 mb-8 shadow-inner">
                  <div className="text-center w-1/3 flex flex-col items-center">
                    {homeTeam.logo && <img src={homeTeam.logo} className="w-12 h-12 object-contain mb-2" alt=""/>}
                    <div className="text-sm font-bold text-slate-300 mb-2 truncate px-1 w-full">{homeTeam.name}</div>
                    <input 
                      type="number" min="0" 
                      defaultValue={editingMatch.homeScore ?? ''}
                      id="homeScoreInput"
                      className="w-full h-16 bg-slate-900 border border-slate-700 rounded-xl text-center text-3xl font-bold text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                      placeholder="-"
                    />
                  </div>
                  <div className="text-slate-600 font-bold text-2xl pb-6">:</div>
                  <div className="text-center w-1/3 flex flex-col items-center">
                    {awayTeam.logo && <img src={awayTeam.logo} className="w-12 h-12 object-contain mb-2" alt=""/>}
                    <div className="text-sm font-bold text-slate-300 mb-2 truncate px-1 w-full">{awayTeam.name}</div>
                    <input 
                      type="number" min="0"
                      defaultValue={editingMatch.awayScore ?? ''}
                      id="awayScoreInput"
                      className="w-full h-16 bg-slate-900 border border-slate-700 rounded-xl text-center text-3xl font-bold text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                      placeholder="-"
                    />
                  </div>
                </div>

                {/* Advanced Stats */}
                <div className="space-y-6">
                  <h4 className="flex items-center gap-2 text-xs uppercase text-indigo-400 font-bold tracking-widest pb-2 border-b border-white/5">
                    <Activity className="w-3 h-3" /> Ətraflı Göstəricilər
                  </h4>
                  
                  {/* Possession Special Row */}
                  <div className="bg-slate-950/30 p-4 rounded-xl border border-white/5">
                    <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">
                       <span>Topa Sahiblik (%)</span>
                    </div>
                    <div className="flex gap-3 items-center">
                       <input 
                         type="number" min="0" max="100"
                         value={tempStats.homePossession}
                         onChange={(e) => setTempStats({...tempStats, homePossession: parseInt(e.target.value) || 0, awayPossession: 100 - (parseInt(e.target.value) || 0)})}
                         className="w-14 bg-slate-900 border border-slate-700 rounded-lg p-2 text-center text-white text-sm font-bold"
                       />
                       <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                          <div className="h-full bg-indigo-500 transition-all duration-300" style={{width: `${tempStats.homePossession}%`}}></div>
                          <div className="h-full bg-slate-600 transition-all duration-300" style={{width: `${tempStats.awayPossession}%`}}></div>
                       </div>
                       <input 
                         type="number" min="0" max="100"
                         value={tempStats.awayPossession}
                         readOnly
                         className="w-14 bg-slate-900 border border-slate-700 rounded-lg p-2 text-center text-slate-400 text-sm font-bold"
                       />
                    </div>
                  </div>

                  {/* Standard Rows */}
                  <div className="space-y-1 bg-slate-950/30 p-3 rounded-xl border border-white/5">
                    {renderStatRow("Zərbələr", "homeShots", "awayShots")}
                    {renderStatRow("Çərçivəyə", "homeShotsOnTarget", "awayShotsOnTarget")}
                    {renderStatRow("Follar", "homeFouls", "awayFouls")}
                    {renderStatRow("Ofsaydlar", "homeOffsides", "awayOffsides")}
                    {renderStatRow("Künc Zərbələri", "homeCorners", "awayCorners")}
                    {renderStatRow("Cərimə Zərbələri", "homeFreeKicks", "awayFreeKicks")}
                    {renderStatRow("Paslar", "homePasses", "awayPasses")}
                    {renderStatRow("Dəqiq Paslar", "homePassesCompleted", "awayPassesCompleted")}
                    {renderStatRow("Asmalar", "homeCrosses", "awayCrosses")}
                    {renderStatRow("Top Alma", "homeInterceptions", "awayInterceptions")}
                    {renderStatRow("Müdaxilələr", "homeTackles", "awayTackles")}
                    {renderStatRow("Qurtarışlar", "homeSaves", "awaySaves")}
                  </div>
                </div>
              </div>
              
              <div className="p-5 border-t border-white/5 shrink-0 bg-slate-900/50 rounded-b-3xl">
                <Button 
                  onClick={() => {
                    const hInput = document.getElementById('homeScoreInput') as HTMLInputElement;
                    const aInput = document.getElementById('awayScoreInput') as HTMLInputElement;
                    saveMatchDetails(hInput.value, aInput.value);
                  }} 
                  className="w-full py-4 text-lg bg-indigo-600 hover:bg-indigo-500 border-indigo-500 shadow-lg shadow-indigo-900/20" 
                  variant="success"
                >
                  Yadda Saxla
                </Button>
              </div>

            </div>
          </div>
         );
      })()}

    </div>
  );
}

export default App;
