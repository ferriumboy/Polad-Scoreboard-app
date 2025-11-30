

export interface Team {
  id: string;
  name: string;
  logo?: string; // Base64 string of uploaded image
}

export interface MatchStats {
  homePossession: number;
  awayPossession: number;
  homeShots: number;
  awayShots: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homeFouls: number;
  awayFouls: number;
  homeOffsides: number;
  awayOffsides: number;
  homeCorners: number;
  awayCorners: number;
  homeFreeKicks: number;
  awayFreeKicks: number;
  homePasses: number;
  awayPasses: number;
  homePassesCompleted: number;
  awayPassesCompleted: number;
  homeCrosses: number;
  awayCrosses: number;
  homeInterceptions: number;
  awayInterceptions: number;
  homeTackles: number;
  awayTackles: number;
  homeSaves: number;
  awaySaves: number;
}

export interface Match {
  id: string;
  round: number; // For Cup: 1 = Final, 2 = SF, 3 = QF etc. Or use stage name
  stageName?: string; // 'Final', 'Semi-Final', 'Round of 16', etc.
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  isPlayed: boolean;
  stats?: MatchStats;
  nextMatchId?: string; // ID of the match the winner goes to
  isCupMatch?: boolean;
}

export interface StandingsRow {
  teamId: string;
  teamName: string;
  teamLogo?: string;
  played: number; // O
  won: number;    // Q
  drawn: number;  // H
  lost: number;   // M
  gf: number;     // QV (Qol vurduğu)
  ga: number;     // QB (Qol buraxdığı)
  points: number; // X
}

export type TournamentType = 'league' | 'cup';
export type TournamentMode = 'single' | 'double';

export interface CupResult {
  champion: Team;
  runnerUp: Team;
  thirdPlace?: Team;
}

export type AppState = 'menu' | 'setup' | 'draw' | 'tournament' | 'podium';