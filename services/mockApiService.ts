

import { Player, Match, Standing, AuditLog, Tournament, PlayerScorecardData, TournamentData, PairingRule, PairingMethod, TieBreakMethod, Division, PostTournamentRating, Class, LastGameInfo, TournamentMode } from '../types';

// --- MOCK DATABASE ---

let MOCK_TOURNAMENTS: Tournament[] = [
    { 
        id: 'wsc-2024', 
        // FIX: Added missing 'slug' property.
        slug: 'wsc-2024',
        name: 'World Scrabble Championship 2024', 
        discipline: 'Scrabble', 
        totalRounds: 12, 
        status: 'In Progress', 
        playerCount: 8, 
        // FIX: Removed 'pairingMethod' as it is no longer part of the Tournament type.
        roundRobinPlaysPerOpponent: 1,
        // FIX: Removed 'pairingSchedule' as it is no longer part of the Tournament type.
        tieBreakOrder: ['cumulativeSpread', 'buchholz', 'rating'], 
        byeAssignmentMethod: 'lowestRankedFewestByes', 
        // FIX: Add missing 'byeSpread' property.
        byeSpread: 50,
        scoring: { win: 1, draw: 0.5, loss: 0 },
        divisionMode: 'multiple',
        classes: [],
        divisions: [
            { id: 1, name: 'Division A', ratingFloor: 2051, ratingCeiling: 9999 },
            { id: 2, name: 'Division B', ratingFloor: 0, ratingCeiling: 2050 }
        ],
        ratingsSystemSettings: { kFactor: 24 },
        tournamentMode: 'individual',
        administrators: [{ username: 'td_admin', role: 'head' }],
        teams: [],
        // FIX: The 'topPlayersCount' property is now valid and other properties are added for completeness.
        teamSettings: { topPlayersCount: 4, displayTeamNames: false, preventTeammatePairings_AllRounds: false, preventTeammatePairings_InitialRounds: 0 },
        publicPortalSettings: { bannerUrl: '', welcomeMessage: '' }
    },
    { 
        id: 'nsc-2023', 
        // FIX: Added missing 'slug' property.
        slug: 'nsc-2023',
        name: 'National Scrabble Championship 2023', 
        discipline: 'Scrabble', 
        totalRounds: 10, 
        status: 'Completed', 
        playerCount: 4, 
        // FIX: Removed 'pairingMethod' as it is no longer part of the Tournament type.
        roundRobinPlaysPerOpponent: 1,
        // FIX: Removed 'pairingSchedule' as it is no longer part of the Tournament type.
        tieBreakOrder: ['cumulativeSpread', 'buchholz', 'rating'], 
        byeAssignmentMethod: 'lowestRankedFewestByes', 
        // FIX: Add missing 'byeSpread' property.
        byeSpread: 50,
        scoring: { win: 1, draw: 0.5, loss: 0 },
        divisionMode: 'single',
        classes: [],
        divisions: [
             { id: 3, name: 'Open Division', ratingFloor: 0, ratingCeiling: 9999 }
        ],
        ratingsSystemSettings: { kFactor: 32 },
        postTournamentRatings: [
            { playerId: 11, playerName: 'Nigel Richards', divisionId: 3, oldRating: 2200, newRating: 2215, change: 15, performanceRating: 2280 },
            { playerId: 12, playerName: 'David Eldar', divisionId: 3, oldRating: 2150, newRating: 2155, change: 5, performanceRating: 2195 },
            { playerId: 13, playerName: 'Will Anderson', divisionId: 3, oldRating: 2100, newRating: 2095, change: -5, performanceRating: 2075 },
            { playerId: 14, playerName: 'Adam Logan', divisionId: 3, oldRating: 2080, newRating: 2065, change: -15, performanceRating: 2005 },
        ],
        tournamentMode: 'individual',
        administrators: [{ username: 'td_admin', role: 'head' }],
        teams: [],
        // FIX: The 'topPlayersCount' property is now valid and other properties are added for completeness.
        teamSettings: { topPlayersCount: 4, displayTeamNames: false, preventTeammatePairings_AllRounds: false, preventTeammatePairings_InitialRounds: 0 },
        publicPortalSettings: { bannerUrl: '', welcomeMessage: '' }
    },
];

let MOCK_TOURNAMENT_PLAYERS: Record<string, Player[]> = {
    'wsc-2024': [
        { id: 11, name: 'Nigel Richards', rating: 2200, seed: 1, byeRounds: [], status: 'active', divisionId: 1, classId: null, teamId: null },
        { id: 12, name: 'David Eldar', rating: 2150, seed: 2, byeRounds: [], status: 'active', divisionId: 1, classId: null, teamId: null },
        { id: 13, name: 'Will Anderson', rating: 2100, seed: 3, byeRounds: [], status: 'active', divisionId: 1, classId: null, teamId: null },
        { id: 14, name: 'Adam Logan', rating: 2080, seed: 4, byeRounds: [], status: 'active', divisionId: 1, classId: null, teamId: null },
        { id: 15, name: 'Joel Sherman', rating: 2050, seed: 5, byeRounds: [], status: 'active', divisionId: 2, classId: null, teamId: null },
        { id: 16, name: 'Komol Panyasophonlert', rating: 2030, seed: 6, byeRounds: [], status: 'active', divisionId: 2, classId: null, teamId: null },
        { id: 17, name: 'Pakorn Nemitrmansuk', rating: 2020, seed: 7, byeRounds: [], status: 'active', divisionId: 2, classId: null, teamId: null },
        { id: 18, name: 'Goutham Jayaraman', rating: 2000, seed: 8, byeRounds: [], status: 'active', divisionId: 2, classId: null, teamId: null },
    ],
    'nsc-2023': [
        { id: 11, name: 'Nigel Richards', rating: 2200, seed: 1, byeRounds: [], status: 'active', divisionId: 3, classId: null, teamId: null },
        { id: 12, name: 'David Eldar', rating: 2150, seed: 2, byeRounds: [], status: 'active', divisionId: 3, classId: null, teamId: null },
        { id: 13, name: 'Will Anderson', rating: 2100, seed: 3, byeRounds: [], status: 'active', divisionId: 3, classId: null, teamId: null },
        { id: 14, name: 'Adam Logan', rating: 2080, seed: 4, byeRounds: [], status: 'active', divisionId: 3, classId: null, teamId: null },
    ]
};

let nextPlayerId = 100;
let nextMatchId = 300;


let MOCK_MATCHES: Match[] = [
  // Scrabble Tournament Matches
  { id: 201, tournamentId: 'wsc-2024', round: 1, playerA: MOCK_TOURNAMENT_PLAYERS['wsc-2024'][0], playerB: MOCK_TOURNAMENT_PLAYERS['wsc-2024'][1], scoreA: 450, scoreB: 420, status: 'completed' },
  { id: 202, tournamentId: 'wsc-2024', round: 1, playerA: MOCK_TOURNAMENT_PLAYERS['wsc-2024'][2], playerB: MOCK_TOURNAMENT_PLAYERS['wsc-2024'][3], scoreA: 380, scoreB: 480, status: 'completed' },
  { id: 203, tournamentId: 'wsc-2024', round: 1, playerA: MOCK_TOURNAMENT_PLAYERS['wsc-2024'][4], playerB: MOCK_TOURNAMENT_PLAYERS['wsc-2024'][5], scoreA: 400, scoreB: 400, status: 'completed' },
  { id: 204, tournamentId: 'wsc-2024', round: 1, playerA: MOCK_TOURNAMENT_PLAYERS['wsc-2024'][6], playerB: MOCK_TOURNAMENT_PLAYERS['wsc-2024'][7], scoreA: null, scoreB: null, status: 'pending' },
];

let MOCK_AUDIT_LOGS: AuditLog[] = [
  { id: 1, tournamentId: 'wsc-2024', action: "SCORE_EDIT", timestamp: "2023-10-27T10:00:00Z", details: "TD Admin changed Match 201 score from 420-450 to 450-420." },
  { id: 2, tournamentId: 'wsc-2024', action: "MANUAL_PAIR", timestamp: "2023-10-27T09:30:00Z", details: "TD Admin manually paired Player 4 vs Player 5 for Round 1." },
];
let nextAuditLogId = 3;

// --- MOCK API FUNCTIONS ---

const simulateDelay = <T,>(data: T): Promise<T> => {
  return new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(data))), 300));
};

const assignPlayerToDivision = (player: { rating: number }, divisions: Division[]): number | null => {
    const sortedDivisions = [...divisions].sort((a, b) => b.ratingFloor - a.ratingFloor); // check high to low
    for (const division of sortedDivisions) {
        if (player.rating >= division.ratingFloor && player.rating <= division.ratingCeiling) {
            return division.id;
        }
    }
    return null;
}

const assignPlayerToClass = (player: { rating: number }, classes: Class[]): number | null => {
    if (!classes || classes.length === 0) return null;
    const sortedClasses = [...classes].sort((a, b) => b.ratingFloor - a.ratingFloor); // check high to low
    for (const cls of sortedClasses) {
        if (player.rating >= cls.ratingFloor && player.rating <= cls.ratingCeiling) {
            return cls.id;
        }
    }
    return null;
}


// Player Management
export const getPlayers = async (tournamentId: string): Promise<Player[]> => {
    return simulateDelay(MOCK_TOURNAMENT_PLAYERS[tournamentId] || []);
};

export const addPlayer = async (tournamentId: string, playerData: Omit<Player, 'id' | 'byeRounds' | 'status' | 'divisionId' | 'classId' | 'seed' | 'teamId'>): Promise<Player> => {
    const tournament = MOCK_TOURNAMENTS.find(t => t.id === tournamentId);
    if(!tournament) throw new Error("Tournament not found");

    const divisionId = assignPlayerToDivision(playerData, tournament.divisions);
    const classId = tournament.divisionMode === 'single' ? assignPlayerToClass(playerData, tournament.classes) : null;
    const newPlayer: Player = { ...playerData, id: nextPlayerId++, seed: 0, byeRounds: [], status: 'active', divisionId, classId, teamId: null };
    
    if (!MOCK_TOURNAMENT_PLAYERS[tournamentId]) {
        MOCK_TOURNAMENT_PLAYERS[tournamentId] = [];
    }
    MOCK_TOURNAMENT_PLAYERS[tournamentId].push(newPlayer);
    tournament.playerCount = MOCK_TOURNAMENT_PLAYERS[tournamentId].length;
    return simulateDelay(newPlayer);
};

export const addPlayersBulk = async (tournamentId: string, playersData: Omit<Player, 'id' | 'byeRounds' | 'status' | 'divisionId' | 'classId' | 'seed' | 'teamId'>[]): Promise<Player[]> => {
    const tournament = MOCK_TOURNAMENTS.find(t => t.id === tournamentId);
    if(!tournament) throw new Error("Tournament not found");
    const newPlayers: Player[] = [];

    if (!MOCK_TOURNAMENT_PLAYERS[tournamentId]) {
        MOCK_TOURNAMENT_PLAYERS[tournamentId] = [];
    }
    playersData.forEach(playerData => {
        const divisionId = assignPlayerToDivision(playerData, tournament.divisions);
        const classId = tournament.divisionMode === 'single' ? assignPlayerToClass(playerData, tournament.classes) : null;
        const newPlayer: Player = { ...playerData, id: nextPlayerId++, seed: 0, byeRounds: [], status: 'active', divisionId, classId, teamId: null };
        MOCK_TOURNAMENT_PLAYERS[tournamentId].push(newPlayer);
        newPlayers.push(newPlayer);
    });

    tournament.playerCount = MOCK_TOURNAMENT_PLAYERS[tournamentId].length;
    
    return simulateDelay(newPlayers);
};

export const updatePlayer = async (tournamentId: string, updatedPlayer: Omit<Player, 'byeRounds' | 'status' | 'divisionId' | 'classId'>): Promise<Player> => {
    const tournament = MOCK_TOURNAMENTS.find(t => t.id === tournamentId);
    if (!tournament) throw new Error("Tournament not found");

    const playerList = MOCK_TOURNAMENT_PLAYERS[tournamentId];
    const playerIndex = playerList?.findIndex(p => p.id === updatedPlayer.id);
    let finalPlayer: Player;

    if (playerList && playerIndex !== undefined && playerIndex > -1) {
        const divisionId = assignPlayerToDivision(updatedPlayer, tournament.divisions);
        const classId = tournament.divisionMode === 'single' ? assignPlayerToClass(updatedPlayer, tournament.classes) : null;
        // Update player in the main roster
        finalPlayer = { ...playerList[playerIndex], ...updatedPlayer, divisionId, classId };
        playerList[playerIndex] = finalPlayer;

        // Propagate changes to all matches
        MOCK_MATCHES.forEach(match => {
            if (match.tournamentId === tournamentId) {
                if (match.playerA.id === updatedPlayer.id) {
                    match.playerA = { ...match.playerA, ...finalPlayer };
                }
                if (match.playerB?.id === updatedPlayer.id) {
                    match.playerB = { ...match.playerB, ...finalPlayer };
                }
            }
        });

    } else {
        throw new Error("Player not found");
    }
    return simulateDelay(finalPlayer);
};


export const deletePlayer = async (tournamentId: string, playerId: number): Promise<{ success: boolean }> => {
    MOCK_TOURNAMENT_PLAYERS[tournamentId] = MOCK_TOURNAMENT_PLAYERS[tournamentId]?.filter(p => p.id !== playerId);
    const tournament = MOCK_TOURNAMENTS.find(t => t.id === tournamentId);
    if(tournament) tournament.playerCount = MOCK_TOURNAMENT_PLAYERS[tournamentId].length;
    return simulateDelay({ success: true });
};

export const togglePlayerActiveStatus = async (tournamentId: string, playerId: number): Promise<Player> => {
    const playerList = MOCK_TOURNAMENT_PLAYERS[tournamentId];
    const playerIndex = playerList?.findIndex(p => p.id === playerId);

    if (playerList && playerIndex !== undefined && playerIndex > -1) {
        const player = playerList[playerIndex];
        player.status = player.status === 'active' ? 'withdrawn' : 'active';
        return simulateDelay(player);
    }
    throw new Error("Player not found to toggle status");
}


// Tournament Management
export const getTournaments = async (): Promise<Tournament[]> => {
    return simulateDelay(MOCK_TOURNAMENTS);
};

export const getTournament = async (id: string): Promise<Tournament | undefined> => {
    const tournament = MOCK_TOURNAMENTS.find(t => t.id === id);
    if (tournament) {
        tournament.playerCount = (MOCK_TOURNAMENT_PLAYERS[id] || []).length;
        const matches = MOCK_MATCHES.filter(m => m.tournamentId === id);
        if (matches.length > 0) tournament.status = 'In Progress';
        const pendingMatches = matches.filter(m => m.status === 'pending').length;
        const currentRound = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : 0;
        if(currentRound >= tournament.totalRounds && pendingMatches === 0) {
            tournament.status = 'Completed';
        }
    }
    return simulateDelay(tournament);
};

// FIX: Update signature to match usage and add missing 'slug' property.
export const createTournament = async (name: string, tournamentMode: TournamentMode): Promise<Tournament> => {
    const newTournamentId = name.toLowerCase().replace(/\s+/g, '-') + '-' + new Date().getFullYear();
    const newTournament: Tournament = {
        id: newTournamentId,
        slug: newTournamentId,
        name,
        discipline: 'Scrabble',
        totalRounds: 0,
        playerCount: 0,
        status: 'Not Started',
        // FIX: Removed 'pairingMethod' as it is no longer part of the Tournament type.
        roundRobinPlaysPerOpponent: 1,
        // FIX: Removed 'pairingSchedule' as it is no longer part of the Tournament type.
        tieBreakOrder: ['cumulativeSpread', 'buchholz', 'rating'],
        byeAssignmentMethod: 'lowestRankedFewestByes',
        // FIX: Add missing 'byeSpread' property.
        byeSpread: 50,
        scoring: { win: 1, draw: 0.5, loss: 0 },
        divisionMode: 'single',
        classes: [],
        divisions: [{ id: 1, name: 'Open Division', ratingFloor: 0, ratingCeiling: 9999 }],
        ratingsSystemSettings: { kFactor: 24 },
        tournamentMode: tournamentMode,
        administrators: [{ username: 'td_admin', role: 'head' }],
        teams: [],
        // FIX: The 'topPlayersCount' property is now valid and other properties are added for completeness.
        teamSettings: { topPlayersCount: 4, displayTeamNames: false, preventTeammatePairings_AllRounds: false, preventTeammatePairings_InitialRounds: 0 },
        publicPortalSettings: { bannerUrl: '', welcomeMessage: '' }
    };
    MOCK_TOURNAMENTS.push(newTournament);
    MOCK_TOURNAMENT_PLAYERS[newTournamentId] = [];
    return simulateDelay(newTournament);
};

export const updateTournamentSettings = async (tournamentId: string, settings: Partial<Tournament>): Promise<Tournament> => {
    const tournament = MOCK_TOURNAMENTS.find(t => t.id === tournamentId);
    if (!tournament) throw new Error("Tournament not found");

    Object.assign(tournament, settings);
    
    // Re-assign players to divisions if divisions changed
    if(settings.divisions) {
        MOCK_TOURNAMENT_PLAYERS[tournamentId].forEach(p => {
            p.divisionId = assignPlayerToDivision(p, tournament.divisions);
        });
    }

    return simulateDelay(tournament);
}

// FIX: Add missing functions that were causing import errors
// FIX: Removed setPairingSchedule as it uses an outdated data model.
// The app has moved to using PairingRule[] which is handled by apiService.
// export const setPairingSchedule = ...

export const getTournamentStatus = async (tournamentId: string): Promise<{ currentRound: number; pendingMatches: number; isComplete: boolean }> => {
    const matches = MOCK_MATCHES.filter(m => m.tournamentId === tournamentId);
    const tournament = MOCK_TOURNAMENTS.find(t => t.id === tournamentId);
    const currentRound = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : 0;
    const pendingMatches = matches.filter(m => m.status === 'pending').length;
    const isComplete = tournament ? currentRound >= tournament.totalRounds && pendingMatches === 0 : false;
    return simulateDelay({ currentRound, pendingMatches, isComplete });
};

export const generatePairingsForRound = async (tournamentId: string, roundNum: number): Promise<Match[]> => {
    console.log(`Mock generating pairings for round ${roundNum} of tournament ${tournamentId}`);
    // This is complex, just return empty for mock
    return simulateDelay([]);
};

export const finalizeTournamentRatings = async (tournamentId:string): Promise<Tournament> => {
    const tournament = MOCK_TOURNAMENTS.find(t => t.id === tournamentId);
    if (!tournament) throw new Error("Tournament not found");
    tournament.status = 'Completed';
    console.log(`Mock finalizing ratings for tournament ${tournamentId}`);
    return simulateDelay(tournament);
};


// FIX: Re-implement truncated `getStandings` function to resolve type error
export const getStandings = async (tournamentId: string, divisionId?: number): Promise<Standing[]> => {
    const allPlayers = await getPlayers(tournamentId);
    const tournament = await getTournament(tournamentId);
    const allMatches = MOCK_MATCHES.filter(m => m.tournamentId === tournamentId);

    if (!tournament || !allPlayers) return [];
    
    const scoringRules = tournament.scoring || { win: 1, draw: 0.5, loss: 0 };
    const kFactor = tournament.ratingsSystemSettings?.kFactor || 24;
    
    const allPlayerStats = new Map<number, { score: number, opponents: number[] }>();
    allPlayers.forEach(p => {
        let score = p.byeRounds.length * scoringRules.win;
        allPlayerStats.set(p.id, { score: score, opponents: [] });
    });

    allMatches.filter(m => m.status === 'completed').forEach(m => {
        if (!m.playerB || m.scoreA === null || m.scoreB === null) return;
        
        const statsA = allPlayerStats.get(m.playerA.id);
        const statsB = allPlayerStats.get(m.playerB.id);

        if (statsA) statsA.opponents.push(m.playerB.id);
        if (statsB) statsB.opponents.push(m.playerA.id);

        let scoreChangeA = scoringRules.draw;
        if (m.scoreA > m.scoreB) scoreChangeA = scoringRules.win;
        else if (m.scoreB > m.scoreA) scoreChangeA = scoringRules.loss;
        
        if (statsA) statsA.score += scoreChangeA;
        if (statsB) statsB.score += (scoringRules.win - scoreChangeA);
    });
    
    const allPlayerScores = new Map<number, number>();
    allPlayerStats.forEach((stats, playerId) => allPlayerScores.set(playerId, stats.score));

    const playersForStandings = divisionId ? allPlayers.filter(p => p.divisionId === divisionId) : allPlayers;
    const completedMatches = allMatches.filter(m => m.status === 'completed');

    const standingsMap = new Map<number, { score: number, wins: number, losses: number, cumulativeSpread: number, buchholz: number, medianBuchholz: number, ratingChange: number }>();
    
    playersForStandings.forEach(p => {
        standingsMap.set(p.id, { score: p.byeRounds.length * (scoringRules.win || 1), wins: p.byeRounds.length, losses: 0, cumulativeSpread: 0, buchholz: 0, medianBuchholz: 0, ratingChange: 0 });
    });

    completedMatches.forEach(m => {
        const statsA = standingsMap.get(m.playerA.id);
        
        if (!m.playerB) { 
             // This case is for byes or other single-player scenarios, but byes are handled above.
             // We can ignore this for now as playerB null check already exists.
            return;
        }

        const statsB = standingsMap.get(m.playerB.id);
        if (!statsA && !statsB) return;
        if(m.scoreA === null || m.scoreB === null) return;

        let scoreChangeA = scoringRules.draw;
        if (m.scoreA > m.scoreB) scoreChangeA = scoringRules.win;
        else if (m.scoreB > m.scoreA) scoreChangeA = scoringRules.loss;

        if (statsA) {
            statsA.score += scoreChangeA;
            if (scoreChangeA === scoringRules.win) {
                statsA.wins +=1;
            } else if (scoreChangeA === scoringRules.loss) {
                statsA.losses +=1;
            } else { // for draws
                statsA.wins += 0.5;
                statsA.losses += 0.5;
            }
            statsA.cumulativeSpread += m.scoreA - m.scoreB;
        }
        if (statsB) {
            const scoreChangeB = scoringRules.win - scoreChangeA;
            statsB.score += scoreChangeB;
            if (scoreChangeB === scoringRules.win) {
                statsB.wins +=1;
            } else if (scoreChangeB === scoringRules.loss) {
                statsB.losses +=1;
            } else { // for draws
                statsB.wins += 0.5;
                statsB.losses += 0.5;
            }
            statsB.cumulativeSpread += m.scoreB - m.scoreA;
        }

        const ratingA = m.playerA.rating;
        const ratingB = m.playerB.rating;
        const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
        let actualA = 0.5;
        if (m.scoreA > m.scoreB) actualA = 1;
        if (m.scoreA < m.scoreB) actualA = 0;
        const ratingChange = kFactor * (actualA - expectedA);
        
        if(statsA) statsA.ratingChange += ratingChange;
        if(statsB) statsB.ratingChange -= ratingChange;
    });

    playersForStandings.forEach(p => {
        const playerAllStats = allPlayerStats.get(p.id);
        const playerStandings = standingsMap.get(p.id);
        if (!playerAllStats || !playerStandings) return;
        
        const opponentScores = playerAllStats.opponents
            .map(opponentId => allPlayerScores.get(opponentId) || 0)
            .sort((a, b) => a - b);
        
        const buchholzScore = opponentScores.reduce((sum, score) => sum + score, 0);
        playerStandings.buchholz = buchholzScore;

        let medianBuchholzScore = buchholzScore;
        if (opponentScores.length >= 3) {
            medianBuchholzScore = opponentScores.slice(1, -1).reduce((sum, score) => sum + score, 0);
        }
        playerStandings.medianBuchholz = medianBuchholzScore;
    });

    const finalStandings: Omit<Standing, 'rank'>[] = playersForStandings.map(player => {
        const stats = standingsMap.get(player.id)!;
        const ratingChange = Math.round(stats.ratingChange);

        const playerMatches = completedMatches
            .filter(m => m.playerA.id === player.id || m.playerB?.id === player.id)
            .sort((a,b) => b.round - a.round);
        
        let lastGame: LastGameInfo | null = null;
        if (playerMatches.length > 0) {
            const lastM = playerMatches[0];
            const isPlayerA = lastM.playerA.id === player.id;
            const pScore = isPlayerA ? lastM.scoreA : lastM.scoreB;
            const oScore = isPlayerA ? lastM.scoreB : lastM.scoreA;
            const opp = isPlayerA ? lastM.playerB : lastM.playerA;

            if (pScore !== null && oScore !== null && opp) {
                let result: LastGameInfo['result'] = 'T';
                if (lastM.isForfeit) result = 'F';
                else if (pScore > oScore) result = 'W';
                else if (oScore > pScore) result = 'L';
                
                lastGame = {
                    round: lastM.round,
                    result: result,
                    playerScore: pScore,
                    opponentScore: oScore,
                    opponentSeed: opp.seed,
                };
            }
        }
        
        return {
            player,
            score: stats.score,
            wins: stats.wins,
            losses: stats.losses,
            cumulativeSpread: stats.cumulativeSpread,
            buchholz: stats.buchholz,
            medianBuchholz: stats.medianBuchholz,
            lastGame,
            currentRating: player.rating + ratingChange,
            ratingChangeSinceStart: ratingChange,
        };
    });
    
    const sortedStandings = finalStandings.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const order = tournament.tieBreakOrder || [];
        for (const tieBreaker of order) {
            switch(tieBreaker) {
                case 'cumulativeSpread':
                    if (b.cumulativeSpread !== a.cumulativeSpread) return b.cumulativeSpread - a.cumulativeSpread;
                    break;
                case 'buchholz':
                    if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
                    break;
                case 'medianBuchholz':
                    if (b.medianBuchholz !== a.medianBuchholz) return b.medianBuchholz - a.medianBuchholz;
                    break;
                case 'rating':
                    if (b.player.rating !== a.player.rating) return b.player.rating - a.player.rating;
                    break;
            }
        }
        return b.player.rating - a.player.rating;
    });

    const rankedStandings: Standing[] = sortedStandings.map((s, index) => ({
        ...s,
        rank: index + 1
    }));
    
    return simulateDelay(rankedStandings);
};