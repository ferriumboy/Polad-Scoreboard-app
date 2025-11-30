import React, { useMemo } from 'react';
import { Team, Match, StandingsRow } from '../types';
import { Trophy, Shield } from 'lucide-react';

interface StandingsTableProps {
  teams: Team[];
  matches: Match[];
}

export const StandingsTable: React.FC<StandingsTableProps> = ({ teams, matches }) => {
  const standings = useMemo(() => {
    const stats: Record<string, StandingsRow> = {};

    // Initialize
    teams.forEach(team => {
      stats[team.id] = {
        teamId: team.id,
        teamName: team.name,
        teamLogo: team.logo,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0,
        ga: 0,
        points: 0,
      };
    });

    // Calculate
    matches.forEach(match => {
      if (match.isPlayed && match.homeScore !== null && match.awayScore !== null) {
        const home = stats[match.homeTeamId];
        const away = stats[match.awayTeamId];

        // Played
        home.played++;
        away.played++;

        // Goals
        home.gf += match.homeScore;
        home.ga += match.awayScore;
        away.gf += match.awayScore;
        away.ga += match.homeScore;

        // Result
        if (match.homeScore > match.awayScore) {
          home.won++;
          home.points += 3;
          away.lost++;
        } else if (match.homeScore < match.awayScore) {
          away.won++;
          away.points += 3;
          home.lost++;
        } else {
          home.drawn++;
          home.points += 1;
          away.drawn++;
          away.points += 1;
        }
      }
    });

    // Convert to array and sort
    return Object.values(stats).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points; // Points
      const gdA = a.gf - a.ga;
      const gdB = b.gf - b.ga;
      if (gdB !== gdA) return gdB - gdA; // Goal Difference
      return b.gf - a.gf; // Goals For
    });
  }, [teams, matches]);

  return (
    <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-xl border border-white/5 overflow-hidden ring-1 ring-white/5">
      <div className="p-5 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
        <h2 className="text-xl font-bold text-white flex items-center gap-3">
          <div className="bg-amber-500/20 p-1.5 rounded-lg">
             <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          Turnir Cədvəli
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead className="bg-slate-950/50 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <tr>
              <th className="p-4 text-center w-12">#</th>
              <th className="p-4">Komanda</th>
              <th className="p-4 text-center">O</th>
              <th className="p-4 text-center text-green-400">Q</th>
              <th className="p-4 text-center text-slate-400">H</th>
              <th className="p-4 text-center text-red-400">M</th>
              <th className="p-4 text-center text-slate-500">QV</th>
              <th className="p-4 text-center text-slate-500">QB</th>
              <th className="p-4 text-center">QF</th>
              <th className="p-4 text-center text-white bg-white/5">Xal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm font-medium">
            {standings.map((row, index) => (
              <tr 
                key={row.teamId} 
                className={`group transition-all hover:bg-white/5 ${index < 1 ? 'bg-indigo-900/10' : ''} ${index < 3 ? 'border-l-2 border-indigo-500' : 'border-l-2 border-transparent'}`}
              >
                <td className="p-4 text-center text-slate-500">{index + 1}</td>
                <td className="p-4 text-white flex items-center gap-3">
                  {index === 0 && <Trophy className="w-3.5 h-3.5 text-amber-400 drop-shadow-md" />}
                  {row.teamLogo ? (
                     <img src={row.teamLogo} alt={row.teamName} className="w-6 h-6 object-contain rounded-sm bg-white/10" />
                  ) : (
                     <Shield className="w-6 h-6 text-slate-600" />
                  )}
                  {row.teamName}
                </td>
                <td className="p-4 text-center text-slate-300">{row.played}</td>
                <td className="p-4 text-center text-green-400 bg-green-900/5">{row.won}</td>
                <td className="p-4 text-center text-slate-400">{row.drawn}</td>
                <td className="p-4 text-center text-red-400 bg-red-900/5">{row.lost}</td>
                <td className="p-4 text-center text-slate-500">{row.gf}</td>
                <td className="p-4 text-center text-slate-500">{row.ga}</td>
                <td className="p-4 text-center text-slate-300 font-mono">
                  {row.gf - row.ga > 0 ? `+${row.gf - row.ga}` : row.gf - row.ga}
                </td>
                <td className="p-4 text-center font-bold text-white bg-white/5 text-base shadow-inner">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};