import React from 'react';
import { Match, Team } from '../types';
import { Trophy } from 'lucide-react';

interface CupBracketProps {
  matches: Match[];
  teams: Team[];
}

export const CupBracket: React.FC<CupBracketProps> = ({ matches, teams }) => {
  // Group matches by round
  const rounds = (Array.from(new Set(matches.map(m => m.round))) as number[]).sort((a, b) => a - b);
  
  const getTeam = (id: string) => teams.find(t => t.id === id);

  return (
    <div className="w-full overflow-x-auto custom-scrollbar pb-6">
      <div className="bg-gradient-to-b from-blue-900 to-slate-900 rounded-2xl p-6 border border-white/10 shadow-2xl min-w-[800px]">
        <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-white uppercase tracking-widest drop-shadow-lg flex items-center justify-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-400" />
                World Cup 2026 Bracket
            </h2>
        </div>
        
        <div className="flex justify-between items-start gap-8 relative">
          {rounds.map((roundNum, index) => {
            const roundMatches = matches.filter(m => m.round === roundNum && !m.stageName?.includes("3-cü"));
            const stageName = roundMatches[0]?.stageName || `Round ${roundNum}`;
            
            // Special handling to center the final if it's the last round
            const isFinal = index === rounds.length - 1;

            return (
              <div key={roundNum} className={`flex flex-col gap-6 w-64 ${isFinal ? 'justify-center h-full mt-32' : ''}`}>
                <div className="text-center mb-4">
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg border border-blue-400">
                    {stageName}
                  </span>
                </div>
                
                <div className={`flex flex-col ${isFinal ? 'gap-0' : 'gap-8'}`}>
                  {roundMatches.map(match => {
                    const hTeam = getTeam(match.homeTeamId);
                    const aTeam = getTeam(match.awayTeamId);

                    return (
                      <div key={match.id} className="relative group">
                        {/* Connecting Lines (CSS only for simple visualization) */}
                        {!isFinal && (
                            <div className="absolute top-1/2 -right-8 w-8 h-[1px] bg-blue-500/30 hidden md:block"></div>
                        )}

                        <div className="bg-slate-900/90 border border-blue-500/30 rounded-lg overflow-hidden shadow-lg transition-transform hover:scale-105">
                          {/* Home Team */}
                          <div className={`flex justify-between items-center p-2 border-b border-white/5 ${match.homeScore != null && match.awayScore != null && match.homeScore > match.awayScore ? 'bg-green-900/20' : ''}`}>
                            <div className="flex items-center gap-2">
                                {hTeam?.logo ? (
                                    <img src={hTeam.logo} alt={hTeam.name} className="w-6 h-6 object-contain" />
                                ) : (
                                    <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                                        {hTeam?.name.substring(0,1)}
                                    </div>
                                )}
                                <span className="text-sm font-bold text-white truncate max-w-[100px]">{hTeam?.name || 'TBD'}</span>
                            </div>
                            <span className="font-mono font-bold text-white bg-slate-800 px-2 rounded text-sm">
                                {match.homeScore ?? '-'}
                            </span>
                          </div>

                          {/* Away Team */}
                          <div className={`flex justify-between items-center p-2 ${match.homeScore != null && match.awayScore != null && match.awayScore > match.homeScore ? 'bg-green-900/20' : ''}`}>
                            <div className="flex items-center gap-2">
                                {aTeam?.logo ? (
                                    <img src={aTeam.logo} alt={aTeam.name} className="w-6 h-6 object-contain" />
                                ) : (
                                    <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                                        {aTeam?.name.substring(0,1)}
                                    </div>
                                )}
                                <span className="text-sm font-bold text-white truncate max-w-[100px]">{aTeam?.name || 'TBD'}</span>
                            </div>
                            <span className="font-mono font-bold text-white bg-slate-800 px-2 rounded text-sm">
                                {match.awayScore ?? '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}