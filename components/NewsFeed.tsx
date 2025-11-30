import React, { useMemo } from 'react';
import { Team, Match, TournamentType } from '../types';
import { Newspaper, TrendingUp, Zap, AlertTriangle, Star, Activity } from 'lucide-react';

interface NewsFeedProps {
  teams: Team[];
  matches: Match[];
  type: TournamentType;
}

interface NewsItem {
  id: string;
  type: 'info' | 'hot' | 'stat' | 'prediction';
  title: string;
  content: string;
  icon: React.ReactNode;
  time: string;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({ teams, matches, type }) => {
  const news = useMemo(() => {
    const items: NewsItem[] = [];
    const playedMatches = matches.filter(m => m.isPlayed);
    
    // 0. INITIAL WELCOME
    if (playedMatches.length === 0) {
      items.push({
        id: 'intro',
        type: 'info',
        title: 'Turnir Başlayır!',
        content: `${teams.length} komanda mübarizəyə qoşulur. Sizcə kuboku kim qaldıracaq? Favoritinizi indidən seçin!`,
        icon: <Star className="w-4 h-4 text-yellow-400" />,
        time: 'İndi'
      });
      return items;
    }

    // 1. STATS ANALYSIS (Aggregated)
    const teamStats: Record<string, { goals: number, shots: number, passes: number, wins: number, points: number, played: number }> = {};
    teams.forEach(t => teamStats[t.id] = { goals: 0, shots: 0, passes: 0, wins: 0, points: 0, played: 0 });

    playedMatches.forEach(m => {
        if (m.homeScore !== null && m.awayScore !== null) {
            // Home
            if(teamStats[m.homeTeamId]) {
                teamStats[m.homeTeamId].goals += m.homeScore;
                teamStats[m.homeTeamId].played++;
                if (m.stats) {
                    teamStats[m.homeTeamId].shots += m.stats.homeShots;
                    teamStats[m.homeTeamId].passes += m.stats.homePassesCompleted;
                }
                if (m.homeScore > m.awayScore) { teamStats[m.homeTeamId].wins++; teamStats[m.homeTeamId].points += 3; }
                else if (m.homeScore === m.awayScore) { teamStats[m.homeTeamId].points += 1; }
            }
            // Away
            if(teamStats[m.awayTeamId]) {
                teamStats[m.awayTeamId].goals += m.awayScore;
                teamStats[m.awayTeamId].played++;
                if (m.stats) {
                    teamStats[m.awayTeamId].shots += m.stats.awayShots;
                    teamStats[m.awayTeamId].passes += m.stats.awayPassesCompleted;
                }
                if (m.awayScore > m.homeScore) { teamStats[m.awayTeamId].wins++; teamStats[m.awayTeamId].points += 3; }
                else if (m.awayScore === m.homeScore) { teamStats[m.awayTeamId].points += 1; }
            }
        }
    });

    // 2. GENERATE STORIES

    // A) Hot Form / Leader (League)
    if (type === 'league') {
        const sortedByPoints = Object.entries(teamStats).sort(([,a], [,b]) => b.points - a.points);
        if (sortedByPoints.length > 0) {
            const [leaderId, leaderStats] = sortedByPoints[0];
            const leaderName = teams.find(t => t.id === leaderId)?.name || 'Naməlum';
            
            if (leaderStats.played > 0) {
                items.push({
                    id: 'leader',
                    type: 'hot',
                    title: 'Turnirin Lideri',
                    content: `${leaderName} hazırda ${leaderStats.points} xalla turnir cədvəlinə başçılıq edir. Onları dayandırmaq çətin olacaq!`,
                    icon: <TrendingUp className="w-4 h-4 text-green-400" />,
                    time: 'Canlı'
                });
            }

            // Struggling Team
            if (sortedByPoints.length > 2) {
                const [lastId, lastStats] = sortedByPoints[sortedByPoints.length - 1];
                const lastName = teams.find(t => t.id === lastId)?.name;
                if (lastName && lastStats.played > 1 && lastStats.points < 2) {
                    items.push({
                        id: 'struggle',
                        type: 'prediction',
                        title: 'Vəziyyət Gərgindir',
                        content: `${lastName} hələ də öz oyununu tapa bilmir. Növbəti oyun onlar üçün həlledici ola bilər.`,
                        icon: <AlertTriangle className="w-4 h-4 text-red-400" />,
                        time: 'Analiz'
                    });
                }
            }
        }
    }

    // B) Offensive Powerhouse (Most Shots)
    let maxShots = 0;
    let shooterTeam = '';
    Object.entries(teamStats).forEach(([id, stats]) => {
        if (stats.shots > maxShots) {
            maxShots = stats.shots;
            shooterTeam = teams.find(t => t.id === id)?.name || '';
        }
    });

    if (maxShots > 10) {
        items.push({
            id: 'shooter',
            type: 'stat',
            title: 'Hücum Futbolu',
            content: `${shooterTeam} rəqib qapılarına ümumilikdə ${maxShots} zərbə endirib. Hücum xətti çox aktivdir!`,
            icon: <Zap className="w-4 h-4 text-amber-400" />,
            time: 'Statistika'
        });
    }

    // C) Tiki-Taka Master (Most Passes)
    let maxPasses = 0;
    let passerTeam = '';
    Object.entries(teamStats).forEach(([id, stats]) => {
        if (stats.passes > maxPasses) {
            maxPasses = stats.passes;
            passerTeam = teams.find(t => t.id === id)?.name || '';
        }
    });

    if (maxPasses > 50) {
         items.push({
            id: 'passer',
            type: 'stat',
            title: 'Topa Nəzarət',
            content: `${passerTeam} dəqiq pasları ilə oyunu idarə edir (${maxPasses} dəqiq pas). Tiki-taka ustaları!`,
            icon: <Activity className="w-4 h-4 text-blue-400" />,
            time: 'Statistika'
        });
    }

    // D) Latest Big Result
    const lastMatch = playedMatches[playedMatches.length - 1];
    if (lastMatch && lastMatch.homeScore !== null && lastMatch.awayScore !== null) {
        const homeName = teams.find(t => t.id === lastMatch.homeTeamId)?.name;
        const awayName = teams.find(t => t.id === lastMatch.awayTeamId)?.name;
        const totalGoals = lastMatch.homeScore + lastMatch.awayScore;
        
        if (totalGoals >= 5) {
             items.push({
                id: 'goal-fest',
                type: 'hot',
                title: 'Qol Yağışı!',
                content: `${homeName} və ${awayName} arasındakı oyunda azarkeşlər tam ${totalGoals} qol izlədilər!`,
                icon: <Zap className="w-4 h-4 text-orange-400" />,
                time: 'Son Oyun'
            });
        } else if (lastMatch.homeScore === lastMatch.awayScore) {
             items.push({
                id: 'draw',
                type: 'info',
                title: 'Bərabərlik',
                content: `${homeName} və ${awayName} xalları bölüşdülər. Hər iki tərəf mübarizədən qopmadı.`,
                icon: <Activity className="w-4 h-4 text-slate-400" />,
                time: 'Son Oyun'
            });
        }
    }

    return items.reverse(); // Newest first
  }, [teams, matches, type]);

  return (
    <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl overflow-hidden ring-1 ring-white/5 flex flex-col h-full max-h-[500px]">
      <div className="p-4 bg-slate-900/80 border-b border-white/5 flex items-center gap-3 sticky top-0 z-10">
        <div className="bg-red-500/20 p-2 rounded-lg animate-pulse">
             <Newspaper className="w-5 h-5 text-red-400" />
        </div>
        <h3 className="font-bold text-white">Xəbərlər Mərkəzi</h3>
      </div>
      
      <div className="overflow-y-auto custom-scrollbar p-4 space-y-4">
         {news.map((item, idx) => (
            <div key={item.id + idx} className="bg-slate-950/50 border border-white/5 p-4 rounded-xl hover:border-indigo-500/30 transition-colors group animate-in slide-in-from-right duration-500" style={{animationDelay: `${idx * 100}ms`}}>
               <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                     {item.icon}
                     <span className={`text-xs font-bold uppercase tracking-wider ${
                        item.type === 'hot' ? 'text-green-400' : 
                        item.type === 'stat' ? 'text-amber-400' :
                        item.type === 'prediction' ? 'text-red-400' : 'text-blue-400'
                     }`}>
                        {item.title}
                     </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{item.time}</span>
               </div>
               <p className="text-sm text-slate-300 leading-relaxed group-hover:text-white transition-colors">
                  {item.content}
               </p>
            </div>
         ))}
         
         {news.length === 0 && (
            <div className="text-center text-slate-500 py-8 text-sm">
               Xəbər lenti yenilənir...
            </div>
         )}
      </div>
    </div>
  );
};
