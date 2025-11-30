
import { Team, Match, TournamentMode } from '../types';

// Helper to shuffle array
const shuffle = (array: any[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// --- LEAGUE LOGIC ---
export const generateSchedule = (teams: Team[], mode: TournamentMode): Match[] => {
  // Randomize teams first so the schedule isn't based on input order
  let scheduleTeams = shuffle([...teams]);
  
  if (scheduleTeams.length % 2 !== 0) {
    scheduleTeams.push({ id: 'dummy', name: 'Bay' });
  }

  const numTeams = scheduleTeams.length;
  const numRounds = numTeams - 1;
  const halfSize = numTeams / 2;
  const matches: Match[] = [];

  for (let round = 0; round < numRounds; round++) {
    for (let i = 0; i < halfSize; i++) {
      const home = scheduleTeams[i];
      const away = scheduleTeams[numTeams - 1 - i];

      if (home.id === 'dummy' || away.id === 'dummy') continue;

      matches.push({
        id: crypto.randomUUID(),
        round: round + 1,
        homeTeamId: home.id,
        awayTeamId: away.id,
        homeScore: null,
        awayScore: null,
        isPlayed: false,
        stageName: `Tur ${round + 1}`,
        isCupMatch: false
      });
    }

    const movingTeams = scheduleTeams.splice(1);
    const lastTeam = movingTeams.pop();
    if (lastTeam) movingTeams.unshift(lastTeam);
    scheduleTeams = [scheduleTeams[0], ...movingTeams];
  }

  if (mode === 'double') {
    const returnMatches = matches.map((m) => ({
      ...m,
      id: crypto.randomUUID(),
      round: m.round + numRounds,
      stageName: `Tur ${m.round + numRounds}`,
      homeTeamId: m.awayTeamId,
      awayTeamId: m.homeTeamId,
      homeScore: null,
      awayScore: null,
      isPlayed: false,
      isCupMatch: false
    }));
    matches.push(...returnMatches);
  }

  return matches.sort((a, b) => a.round - b.round);
};

// --- CUP LOGIC ---

// Helper to get next power of 2
const nextPowerOf2 = (n: number) => Math.pow(2, Math.ceil(Math.log(n) / Math.log(2)));

export const generateCupSchedule = (teams: Team[], mode: TournamentMode): Match[] => {
  const matches: Match[] = [];
  
  // 1. Normalize teams to power of 2 (add Byes)
  const targetSize = nextPowerOf2(teams.length);
  const teamsWithByes = [...shuffle([...teams])];
  while (teamsWithByes.length < targetSize) {
    teamsWithByes.push({ id: `bye-${teamsWithByes.length}`, name: 'Bay' });
  }

  const numMatches = targetSize / 2;
  const stageName = getStageName(targetSize); // e.g. "1/8 Final"

  for (let i = 0; i < numMatches; i++) {
    const home = teamsWithByes[i * 2];
    const away = teamsWithByes[i * 2 + 1];

    // Check if one is a BYE
    const isHomeBye = home.id.startsWith('bye-');
    const isAwayBye = away.id.startsWith('bye-');

    // If both are real teams
    if (!isHomeBye && !isAwayBye) {
      // First Leg
      matches.push({
        id: crypto.randomUUID(),
        round: 1, // Round 1 of the cup
        stageName: stageName,
        homeTeamId: home.id,
        awayTeamId: away.id,
        homeScore: null,
        awayScore: null,
        isPlayed: false,
        isCupMatch: true
      });

      // If Double Mode, add Second Leg immediately (unless it's already the final, but logic handles initial usually not being final unless 2 teams)
      if (mode === 'double' && targetSize > 2) {
        matches.push({
          id: crypto.randomUUID(),
          round: 1,
          stageName: stageName + " (Cavab)",
          homeTeamId: away.id, // Swap home/away
          awayTeamId: home.id,
          homeScore: null,
          awayScore: null,
          isPlayed: false,
          isCupMatch: true
        });
      }
    } else {
      // Auto advance the real team (Conceptually. In practice, we just don't create a match and let the 'Advance' logic handle it? 
      // Actually, easier to not create match and wait for manual advance? No, user expects schedule.
      // Better strategy: Don't create 'Bay' matches. The Scheduler logic is complex. 
      // SIMPLIFICATION: User manually plays 'Bay' games? No.
      // AUTOMATION: We won't generate matches for Bay. We will treat them as instantly played.
      // However, for this specific request, let's create a match but auto-fill score if one is bye?
      // Let's stick to: Create the match, user sets score 3-0 default or it auto-resolves.
      // Let's create the match. User enters 1-0.
      
      const realTeam = !isHomeBye ? home : away;
      // We will skip creating a match object for Byes to avoid clutter. 
      // But we need to know who advances.
      // For this specific app version, let's create a "Walkover" match that is pre-filled.
      matches.push({
        id: crypto.randomUUID(),
        round: 1,
        stageName: stageName,
        homeTeamId: home.id,
        awayTeamId: away.id,
        homeScore: isHomeBye ? 0 : 3,
        awayScore: isAwayBye ? 0 : 3,
        isPlayed: true, // Auto played
        isCupMatch: true
      });
    }
  }

  return matches;
};

const getStageName = (numTeams: number) => {
  if (numTeams === 2) return "Final";
  if (numTeams === 4) return "Yarımfinal";
  if (numTeams === 8) return "1/4 Final";
  if (numTeams === 16) return "1/8 Final";
  return `1/${numTeams / 2} Final`;
};

// Check if round is complete and generate next round
export const advanceCupTournament = (matches: Match[], teams: Team[], mode: TournamentMode): { newMatches: Match[], completed: boolean, results?: any } => {
  // 1. Find the highest round currently in the matches
  const currentRoundNum = Math.max(...matches.map(m => m.round));
  const currentRoundMatches = matches.filter(m => m.round === currentRoundNum);

  // Check if all matches in this round are played
  const allPlayed = currentRoundMatches.every(m => m.isPlayed);
  if (!allPlayed) return { newMatches: [], completed: false };

  // 2. Determine Winners
  // We need to group matches by the pair of teams involved to handle Double mode
  const winners: string[] = [];
  const losers: string[] = []; // Track losers for 3rd place

  // Helper to find match pair
  const processedMatchIds = new Set<string>();

  for (const match of currentRoundMatches) {
    if (processedMatchIds.has(match.id)) continue;

    // Check if this is the 3rd place match. If so, it doesn't spawn new games.
    if (match.stageName?.includes("3-cü Yer")) {
        processedMatchIds.add(match.id);
        continue;
    }

    let winnerId: string | null = null;
    let loserId: string | null = null;

    // Look for a paired match (Leg 2)
    const leg2 = currentRoundMatches.find(m => 
      m.id !== match.id && 
      !processedMatchIds.has(m.id) &&
      ((m.homeTeamId === match.awayTeamId && m.awayTeamId === match.homeTeamId) ||
       (m.homeTeamId === match.homeTeamId && m.awayTeamId === match.awayTeamId)) // Should be swapped usually
    );

    if (leg2) {
      // Double Leg Logic
      processedMatchIds.add(match.id);
      processedMatchIds.add(leg2.id);

      // Calc Aggregate
      // Match 1: A vs B. Match 2: B vs A.
      // Team A score = Match1.Home + Match2.Away
      // Team B score = Match1.Away + Match2.Home
      
      const teamA = match.homeTeamId;
      const teamB = match.awayTeamId;

      const scoreA = (match.homeScore || 0) + (leg2.awayScore || 0);
      const scoreB = (match.awayScore || 0) + (leg2.homeScore || 0);

      if (scoreA > scoreB) { winnerId = teamA; loserId = teamB; }
      else if (scoreB > scoreA) { winnerId = teamB; loserId = teamA; }
      else {
        // Away goals rule? Or just random? Or first leg winner?
        // Simple logic: Team A advances on tie (User should have managed scores to avoid tie if no PKs)
        // Or better: In a tie, pick Home team of 1st leg (arbitrary).
        winnerId = teamA; 
        loserId = teamB;
      }

    } else {
      // Single Leg Logic
      processedMatchIds.add(match.id);
      if ((match.homeScore || 0) > (match.awayScore || 0)) {
         winnerId = match.homeTeamId;
         loserId = match.awayTeamId;
      } else {
         winnerId = match.awayTeamId;
         loserId = match.homeTeamId;
      }
    }

    if (winnerId) winners.push(winnerId);
    if (loserId) losers.push(loserId);
  }

  // If only 1 winner, tournament over!
  if (winners.length === 1 && currentRoundMatches.length <= 2) { 
    // It was the final
    const champion = teams.find(t => t.id === winners[0]);
    const runnerUp = teams.find(t => t.id === losers[0]);
    
    // Check if 3rd place match happened in this same round (unlikely) or previous
    // Actually, we usually play Final and 3rd Place in the same "Round" block
    
    // Find 3rd place winner if exists
    let thirdPlace: Team | undefined;
    const thirdPlaceMatch = currentRoundMatches.find(m => m.stageName?.includes("3-cü Yer"));
    if (thirdPlaceMatch) {
       const wId = (thirdPlaceMatch.homeScore || 0) > (thirdPlaceMatch.awayScore || 0) 
          ? thirdPlaceMatch.homeTeamId 
          : thirdPlaceMatch.awayTeamId;
       thirdPlace = teams.find(t => t.id === wId);
    }

    return { 
      newMatches: [], 
      completed: true, 
      results: { champion, runnerUp, thirdPlace }
    };
  }

  // 3. Generate Next Round Matches
  const nextRoundMatches: Match[] = [];
  const nextStageName = getStageName(winners.length);
  const nextRoundNum = currentRoundNum + 1;

  // Is next round the Final? (2 winners left)
  const isNextFinal = winners.length === 2;

  for (let i = 0; i < winners.length; i += 2) {
    const homeId = winners[i];
    const awayId = winners[i+1];

    if (!awayId) break; // Should be even

    // Create Match
    nextRoundMatches.push({
      id: crypto.randomUUID(),
      round: nextRoundNum,
      stageName: nextStageName,
      homeTeamId: homeId,
      awayTeamId: awayId,
      homeScore: null,
      awayScore: null,
      isPlayed: false,
      isCupMatch: true
    });

    // If Mode is Double AND it is NOT the Final (User Request: Final is single game)
    if (mode === 'double' && !isNextFinal) {
      nextRoundMatches.push({
        id: crypto.randomUUID(),
        round: nextRoundNum,
        stageName: nextStageName + " (Cavab)",
        homeTeamId: awayId,
        awayTeamId: homeId,
        homeScore: null,
        awayScore: null,
        isPlayed: false,
        isCupMatch: true
      });
    }
  }

  // 4. Handle 3rd Place Match
  // If the round just finished was the Semi-Final (4 teams involved initially, 2 winners produced),
  // then we have 2 losers who play for 3rd place.
  // The 'winners.length' is now 2 (The finalists). So previous round had 4 winners (Quarter finals)? No.
  // Logic: If isNextFinal is true, it means we just finished Semi-Finals.
  if (isNextFinal && losers.length === 2) {
    nextRoundMatches.push({
      id: crypto.randomUUID(),
      round: nextRoundNum, // Same round number as Final roughly
      stageName: "3-cü Yer Uğrunda",
      homeTeamId: losers[0],
      awayTeamId: losers[1],
      homeScore: null,
      awayScore: null,
      isPlayed: false,
      isCupMatch: true
    });
  }

  return { newMatches: nextRoundMatches, completed: false };
};
