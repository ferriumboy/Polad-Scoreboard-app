import React, { useMemo } from 'react';
import { Team, Match, MatchStats } from '../types';
import { BarChart3, Shield } from 'lucide-react';

interface TeamStatsTableProps {
  teams: Team[];
  matches: Match[];
}

interface AggregatedStats {
  teamId: string;
  teamName: string;
  teamLogo?: string;
  shots: number;
  shotsOnTarget: number;
  fouls: number;
  offsides: number;
  corners: number;
  freeKicks: number;
  passes: number;
  passesCompleted: number;
  crosses: number;
  interceptions: number;
  tackles: number;
  saves: number;
}

export const TeamStatsTable: React.FC<TeamStatsTableProps> = ({ teams, matches }) => {
  const stats = useMemo(() => {
    const teamStats: Record<string, AggregatedStats> = {};

    // Initialize
    teams.forEach(team => {
      teamStats[team.id] = {
        teamId: team.id,
        teamName: team.name,
        teamLogo: team.logo,
        shots: 0,
        shotsOnTarget: 0,
        fouls: 0,
        offsides: 0,
        corners: 0,
        freeKicks: 0,
        passes: 0,
        passesCompleted: 0,
        crosses: 0,
        interceptions: 0,
        tackles: 0,
        saves: 0,
      };
    });

    // Calculate
    matches.forEach(match => {
      if (match.isPlayed && match.stats) {
        const home = teamStats[match.homeTeamId];
        const away = teamStats[match.awayTeamId];

        if (home) {
          home.shots += match.stats.homeShots;
          home.shotsOnTarget += match.stats.homeShotsOnTarget;
          home.fouls += match.stats.homeFouls;
          home.offsides += match.stats.homeOffsides;
          home.corners += match.stats.homeCorners;
          home.freeKicks += match.stats.homeFreeKicks;
          home.passes += match.stats.homePasses;
          home.passesCompleted += match.stats.homePassesCompleted;
          home.crosses += match.stats.homeCrosses;
          home.interceptions += match.stats.homeInterceptions;
          home.tackles += match.stats.homeTackles;
          home.saves += match.stats.homeSaves;
        }

        if (away) {
          away.shots += match.stats.awayShots;
          away.shotsOnTarget += match.stats.awayShotsOnTarget;
          away.fouls += match.stats.awayFouls;
          away.offsides += match.stats.awayOffsides;
          away.corners += match.stats.awayCorners;
          away.freeKicks += match.stats.awayFreeKicks;
          away.passes += match.stats.awayPasses;
          away.passesCompleted += match.stats.awayPassesCompleted;
          away.crosses += match.stats.awayCrosses;
          away.interceptions += match.stats.awayInterceptions;
          away.tackles += match.stats.awayTackles;
          away.saves += match.stats.awaySaves;
        }
      }
    });

    return Object.values(teamStats).sort((a, b) => b.shots - a.shots); // Default sort by shots
  }, [teams, matches]);

  const StatHeader = ({ title, label }: { title: string, label: string }) => (
    <th className="p-3 font-semibold text-center whitespace-nowrap text-slate-400 text-xs uppercase tracking-wider" title={title}>
      {label}
    </th>
  );

  return (
    <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-xl border border-white/5 overflow-hidden ring-1 ring-white/5">
      <div className="p-5 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
        <h2 className="text-xl font-bold text-white flex items-center gap-3">
          <div className="bg-indigo-500/20 p-1.5 rounded-lg">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
          </div>
          Komanda Statistikası (Ümumi)
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1200px]">
          <thead className="bg-slate-950/50">
            <tr>
              <th className="p-4 font-bold text-white sticky left-0 bg-slate-900 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] border-r border-white/5 text-xs uppercase">Komanda</th>
              <StatHeader title="Zərbələr" label="Zərbə" />
              <StatHeader title="Dəqiq Zərbələr" label="Çərçivə" />
              <StatHeader title="Follar" label="Follar" />
              <StatHeader title="Ofsaydlar" label="Ofsayd" />
              <StatHeader title="Künc Zərbələri" label="Künc Z." />
              <StatHeader title="Cərimə Zərbələri" label="Cərimə Z." />
              <StatHeader title="Paslar" label="Pas" />
              <StatHeader title="Dəqiq Paslar" label="D.Pas" />
              <StatHeader title="Asmalar" label="Asma" />
              <StatHeader title="Top Alma" label="Top Alma" />
              <StatHeader title="Müdaxilələr" label="Müdaxilə" />
              <StatHeader title="Qurtarışlar" label="Qurtarış" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm">
            {stats.map((row) => (
              <tr 
                key={row.teamId} 
                className="hover:bg-white/5 transition-colors group"
              >
                <td className="p-4 font-medium text-white sticky left-0 bg-slate-900 group-hover:bg-slate-800 transition-colors z-10 border-r border-white/5 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] flex items-center gap-2">
                  {row.teamLogo ? <img src={row.teamLogo} className="w-5 h-5 object-contain" alt="" /> : <Shield className="w-5 h-5 text-slate-600"/>}
                  {row.teamName}
                </td>
                <td className="p-3 text-center text-indigo-300 font-bold bg-indigo-900/10">{row.shots}</td>
                <td className="p-3 text-center text-slate-300">{row.shotsOnTarget}</td>
                <td className="p-3 text-center text-red-300">{row.fouls}</td>
                <td className="p-3 text-center text-slate-400">{row.offsides}</td>
                <td className="p-3 text-center text-slate-300">{row.corners}</td>
                <td className="p-3 text-center text-slate-300">{row.freeKicks}</td>
                <td className="p-3 text-center text-teal-300">{row.passes}</td>
                <td className="p-3 text-center text-teal-400/70">{row.passesCompleted}</td>
                <td className="p-3 text-center text-slate-400">{row.crosses}</td>
                <td className="p-3 text-center text-slate-300">{row.interceptions}</td>
                <td className="p-3 text-center text-slate-300">{row.tackles}</td>
                <td className="p-3 text-center text-amber-300">{row.saves}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};