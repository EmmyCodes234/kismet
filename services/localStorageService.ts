import { Tournament, Player, Match, Standing, TieBreakMethod, LastGameInfo, PlayerScorecardData, PostTournamentRating, AuditLog, UserProfile, GlobalStats, TournamentMode, Team, TeamStanding, UserRole, PairingMethod } from '../types';

// --- LOCAL STORAGE STRUCTURE ---

interface AppState {
    tournaments: Record<string, Tournament>;
    players: Record<string, Player[]>;
    matches: Record<string, Match[]>;
    auditLogs: Record<string, AuditLog[]>;
    userProfile: UserProfile;
}

const DB_KEY = 'kismet_db';

// --- REAL-TIME UPDATE BROADCASTER ---
const broadcastUpdate = (tournamentId: string) => {
    const channel = new BroadcastChannel(`tournament-updates-${tournamentId}`);
    channel.postMessage({ type: 'update' });
    channel.close();
};


const getInitialState = (): AppState => ({
    tournaments: {},
    players: {},
    matches: {},
    auditLogs: {},
    userProfile: { displayName: 'Emmanuel Enyi', bio: 'Just another dude with a penchant for the creative.', countryCode: 'ng' },
});

const loadState = (): AppState => {
    try {
        const serializedState = localStorage.getItem(DB_KEY);
        if (serializedState === null) {
            return getInitialState();
        }
        const state = JSON.parse(serializedState);
        // Ensure auditLogs exist for backward compatibility
        if (!state.auditLogs) state.auditLogs = {};
        if (!state.userProfile) state.userProfile = getInitialState().userProfile;

        // Ensure new properties exist for tournaments
        Object.values(state.tournaments).forEach((t: any) => {
            if (!t.tournamentMode) t.tournamentMode = 'individual';
            if (!t.administrators) t.administrators = [{ username: 'td_admin', role: 'head' }];
            if (!t.teams) t.teams = [];
            // FIX: Ensure the teamSettings object is complete for backward compatibility.
            if (!t.teamSettings) t.teamSettings = { topPlayersCount: 4, displayTeamNames: false, preventTeammatePairings_AllRounds: false, preventTeammatePairings_InitialRounds: 0 };
            if (!t.publicPortalSettings) t.publicPortalSettings = { bannerUrl: '', welcomeMessage: '' };
        });

        Object.values(state.players).flat().forEach((p: any) => {
             if (p.teamId === undefined) p.teamId = null;
        });

        return state;
    } catch (err) {
        console.error("Could not load state from local storage", err);
        return getInitialState();
    }
};

const saveState = (state: AppState) => {
    try {
        const serializedState = JSON.stringify(state);
        localStorage.setItem(DB_KEY, serializedState);
    } catch (err) {
        console.error("Could not save state to local storage", err);
    }
};

let state = loadState();
let nextPlayerId = Math.max(0, ...Object.values(state.players).flat().map(p => p.id)) + 1 || 1;
let nextMatchId = Math.max(0, ...Object.values(state.matches).flat().map(m => m.id)) + 1 || 1;
let nextAuditLogId = Math.max(0, ...Object.values(state.auditLogs).flat().map(l => l.id)) + 1 || 1;
let nextTeamId = Math.max(0, ...Object.values(state.tournaments).flatMap(t => t.teams).map(team => team.id)) + 1 || 1;


const _reassignAllPlayers = (tournamentId: string) => {
    const tournament = state.tournaments[tournamentId];
    const players = state.players[tournamentId];
    if (!tournament || !players) return;

    const sortedDivisions = [...tournament.divisions].sort((a, b) => b.ratingFloor - a.ratingFloor);
    const sortedClasses = [...tournament.classes].sort((a, b) => b.ratingFloor - a.ratingFloor);

    players.forEach(player => {
        // Find division
        let assignedDivisionId: number | null = null;
        if (tournament.divisionMode === 'multiple') {
            for (const division of sortedDivisions) {
                if (player.rating >= division.ratingFloor && player.rating <= division.ratingCeiling) {
                    assignedDivisionId = division.id;
                    break;
                }
            }
        } else {
            assignedDivisionId = tournament.divisions[0]?.id || null;
        }
        player.divisionId = assignedDivisionId;

        // Find class if in single division mode
        let assignedClassId: number | null = null;
        if (tournament.divisionMode === 'single') {
             for (const cls of sortedClasses) {
                if (player.rating >= cls.ratingFloor && player.rating <= cls.ratingCeiling) {
                    assignedClassId = cls.id;
                    break;
                }
            }
        }
        player.classId = assignedClassId;
    });
    saveState(state);
};

const logAction = (tournamentId: string, action: string, details: string) => {
    if (!state.auditLogs[tournamentId]) {
        state.auditLogs[tournamentId] = [];
    }
    const newLog: AuditLog = {
        id: nextAuditLogId++,
        tournamentId,
        action,
        timestamp: new Date().toISOString(),
        details,
    };
    state.auditLogs[tournamentId].push(newLog);
    saveState(state);
};


// --- PERMISSIONS ---
const getCurrentUser = (): { username: string } | null => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

const getCurrentUserRole = (tournamentId: string): UserRole | null => {
    const user = getCurrentUser();
    if (!user) return null;
    const tournament = state.tournaments[tournamentId];
    if (!tournament) return null;
    const admin = tournament.administrators.find(a => a.username === user.username);
    return admin?.role || null;
};

export const isTournamentStaff = (tournamentId: string): boolean => {
    return !!getCurrentUserRole(tournamentId);
};

const checkStaffPermission = (tournamentId: string) => {
    if (!isTournamentStaff(tournamentId)) {
        throw new Error("Permission denied. You are not authorized to manage this tournament.");
    }
};

export const isHeadTd = (tournamentId: string): boolean => {
    return getCurrentUserRole(tournamentId) === 'head';
}

const checkHeadTdPermission = (tournamentId: string) => {
    if (!isHeadTd(tournamentId)) {
        throw new Error("Permission denied. Only the Head TD can perform this action.");
    }
}

// --- SERVICE API ---

// USER PROFILE
export const getUserProfile = (): UserProfile => {
    return state.userProfile || getInitialState().userProfile;
};

export const saveUserProfile = (profile: UserProfile): UserProfile => {
    state.userProfile = profile;
    saveState(state);
    return state.userProfile;
};

// GLOBAL STATS
export const getGlobalUserStats = (): GlobalStats => {
    const allTournaments = Object.values(state.tournaments);
    
    const stats: GlobalStats = {
        totalPlayersManaged: Object.values(state.players).reduce((acc, p) => acc + p.length, 0),
        totalMatchesRecorded: Object.values(state.matches).flat().filter(m => m.status === 'completed').length,
        completedTournaments: allTournaments.filter(t => t.status === 'Completed').length,
        tournamentsInProgress: allTournaments.filter(t => t.status === 'In Progress').length,
    };
    return stats;
}


// TOURNAMENT MANAGEMENT
export const getTournaments = (): Tournament[] => {
    return Object.values(state.tournaments).sort((a, b) => (a.name > b.name ? 1 : -1));
};

export const getTournament = (id: string): Tournament | null => {
    return state.tournaments[id] || null;
};

export const createTournament = (name: string, tournamentMode: TournamentMode): Tournament => {
    const user = getCurrentUser();
    if (!user) throw new Error("No user logged in");

    const newTournamentId = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    const newTournament: Tournament = {
        id: newTournamentId,
        // FIX: Added missing 'slug' property.
        slug: newTournamentId,
        name,
        discipline: 'Scrabble',
        totalRounds: 0,
        status: 'Not Started',
        playerCount: 0,
        // FIX: Removed `pairingMethod` as it no longer exists on the Tournament type.
        roundRobinPlaysPerOpponent: 1,
        tieBreakOrder: ['cumulativeSpread', 'buchholz', 'rating'],
        // FIX: Removed `pairingSchedule` as it no longer exists on the Tournament type.
        byeAssignmentMethod: 'lowestRankedFewestByes',
        // FIX: Add missing 'byeSpread' property.
        byeSpread: 50,
        divisionMode: 'single',
        divisions: [{ id: 1, name: 'Open Division', ratingFloor: 0, ratingCeiling: 9999 }],
        classes: [],
        ratingsSystemSettings: { kFactor: 24 },
        tournamentMode,
        administrators: [{ username: user.username, role: 'head' }],
        teams: [],
        // FIX: The 'topPlayersCount' property is now valid and other properties are added for completeness.
        teamSettings: { topPlayersCount: 4, displayTeamNames: false, preventTeammatePairings_AllRounds: false, preventTeammatePairings_InitialRounds: 0 },
        publicPortalSettings: { bannerUrl: '', welcomeMessage: '' },
    };
    state.tournaments[newTournamentId] = newTournament;
    state.players[newTournamentId] = [];
    state.matches[newTournamentId] = [];
    state.auditLogs[newTournamentId] = [];
    logAction(newTournamentId, 'TOURNAMENT_CREATE', `Tournament "${name}" was created in ${tournamentMode} mode.`);
    saveState(state);
    return newTournament;
};

export const updateTournament = (tournamentId: string, updates: Partial<Tournament>): Tournament => {
    if (!state.tournaments[tournamentId]) throw new Error("Tournament not found");
    checkHeadTdPermission(tournamentId);

    const needsReassignment = updates.divisions || updates.classes || updates.divisionMode;
    state.tournaments[tournamentId] = { ...state.tournaments[tournamentId], ...updates };
    
    if (needsReassignment) _reassignAllPlayers(tournamentId);
    if (Object.keys(updates).some(k => !['status', 'postTournamentRatings'].includes(k))) {
      logAction(tournamentId, 'SETTINGS_UPDATE', `Tournament settings were updated.`);
    }
    saveState(state);
    broadcastUpdate(tournamentId);
    return state.tournaments[tournamentId];
};

// PLAYER MANAGEMENT
export const getPlayers = (tournamentId: string): Player[] => {
    return state.players[tournamentId] || [];
};

export const addPlayersBulk = (tournamentId: string, playersData: { name: string, rating: number }[]): Player[] => {
    checkHeadTdPermission(tournamentId);
    const newPlayers: Player[] = [];
    
    const sortedByRating = [...playersData].sort((a,b) => b.rating - a.rating);

    sortedByRating.forEach((playerData, index) => {
        const newPlayer: Player = {
            id: nextPlayerId++,
            name: playerData.name,
            rating: playerData.rating,
            seed: index + 1,
            byeRounds: [],
            status: 'active',
            divisionId: null,
            classId: null,
            teamId: null,
        };
        newPlayers.push(newPlayer);
    });
    state.players[tournamentId] = [...(state.players[tournamentId] || []), ...newPlayers];
    state.tournaments[tournamentId].playerCount = state.players[tournamentId].length;
    
    _reassignAllPlayers(tournamentId); // Assign divisions after adding
    logAction(tournamentId, 'PLAYERS_ADD_BULK', `Added ${newPlayers.length} players to the roster.`);
    saveState(state);
    broadcastUpdate(tournamentId);
    return newPlayers;
};

export const updatePlayer = (tournamentId: string, updatedPlayer: Player): Player => {
    checkHeadTdPermission(tournamentId);
    const playerIndex = state.players[tournamentId].findIndex(p => p.id === updatedPlayer.id);
    if (playerIndex === -1) throw new Error("Player not found");
    
    const originalPlayer = state.players[tournamentId][playerIndex];
    const finalPlayer = { ...originalPlayer, ...updatedPlayer };

    state.players[tournamentId][playerIndex] = finalPlayer;
    
    if (originalPlayer.rating !== finalPlayer.rating || originalPlayer.divisionId !== finalPlayer.divisionId) {
        logAction(tournamentId, 'PLAYER_UPDATE', `Updated player ${finalPlayer.name} (Rating: ${originalPlayer.rating} -> ${finalPlayer.rating}, Division ID: ${originalPlayer.divisionId} -> ${finalPlayer.divisionId})`);
        _reassignAllPlayers(tournamentId);
    }
    
    saveState(state);
    broadcastUpdate(tournamentId);
    return finalPlayer;
}

export const deletePlayer = (tournamentId: string, playerId: number): void => {
    checkHeadTdPermission(tournamentId);
    const player = state.players[tournamentId].find(p => p.id === playerId);
    state.players[tournamentId] = state.players[tournamentId].filter(p => p.id !== playerId);
    state.tournaments[tournamentId].playerCount = state.players[tournamentId].length;
    if (player) {
      logAction(tournamentId, 'PLAYER_DELETE', `Removed player ${player.name} from the roster.`);
    }
    saveState(state);
    broadcastUpdate(tournamentId);
}

export const withdrawPlayer = (tournamentId: string, playerId: number): Player => {
    checkStaffPermission(tournamentId);
    const player = state.players[tournamentId]?.find(p => p.id === playerId);
    if (!player) throw new Error("Player not found");
    player.status = 'withdrawn';
    logAction(tournamentId, 'PLAYER_WITHDRAW', `${player.name} has been withdrawn.`);
    saveState(state);
    broadcastUpdate(tournamentId);
    return player;
};

export const reinstatePlayer = (tournamentId: string, playerId: number): Player => {
    checkStaffPermission(tournamentId);
    const player = state.players[tournamentId]?.find(p => p.id === playerId);
    if (!player) throw new Error("Player not found");
    player.status = 'active';
    logAction(tournamentId, 'PLAYER_REINSTATE', `${player.name} has been reinstated.`);
    saveState(state);
    broadcastUpdate(tournamentId);
    return player;
};

// TEAM MANAGEMENT
export const getTeams = (tournamentId: string): Team[] => {
    return state.tournaments[tournamentId]?.teams || [];
};

export const createTeam = (tournamentId: string, teamName: string): Team => {
    checkHeadTdPermission(tournamentId);
    const tournament = getTournament(tournamentId);
    if (!tournament) throw new Error("Tournament not found");

    const newTeam: Team = { id: nextTeamId++, name: teamName };
    tournament.teams.push(newTeam);
    logAction(tournamentId, 'TEAM_CREATE', `Created team "${teamName}".`);
    saveState(state);
    broadcastUpdate(tournamentId);
    return newTeam;
}

export const assignPlayerToTeam = (tournamentId: string, playerId: number, teamId: number | null): Player => {
    checkHeadTdPermission(tournamentId);
    const player = state.players[tournamentId]?.find(p => p.id === playerId);
    if (!player) throw new Error("Player not found");
    player.teamId = teamId;
    saveState(state);
    broadcastUpdate(tournamentId);
    return player;
}


// PAIRING & MATCH MANAGEMENT
export const getMatches = (tournamentId: string): Match[] => {
    return state.matches[tournamentId] || [];
}

export const getMatchesForRound = (tournamentId: string, round: number): Match[] => {
    return (state.matches[tournamentId] || []).filter(m => m.round === round);
}

const createNewMatch = (tournamentId: string, round: number, playerA: Player, playerB: Player | null): Match => {
    if (playerB === null) { // Bye match
        playerA.byeRounds.push(round);
        // No need to call updatePlayer, just modify in memory for this transaction
        return {
            id: nextMatchId++, tournamentId, round, playerA, playerB: null, scoreA: 1, scoreB: 0, status: 'completed'
        };
    }
    return {
        id: nextMatchId++, tournamentId, round, playerA, playerB, scoreA: null, scoreB: null, status: 'pending'
    };
};

const pairScoreGroup = (
    playerGroup: Player[],
    previousMatches: Match[],
    tournament: Tournament,
    roundNum: number
): Match[] => {
    const newMatches: Match[] = [];
    let unpairedPlayers = [...playerGroup];

    while (unpairedPlayers.length > 0) {
        const playerA = unpairedPlayers.shift()!;
        let opponentFound = false;
        
        // Try to find a valid opponent (no rematch, not teammate)
        for (let i = 0; i < unpairedPlayers.length; i++) {
            const playerB = unpairedPlayers[i];
            
            const hasPlayedBefore = previousMatches.some(m =>
                (m.playerA.id === playerA.id && m.playerB?.id === playerB.id) ||
                (m.playerA.id === playerB.id && m.playerB?.id === playerA.id)
            );
            
            // Avoid pairing teammates in early rounds (e.g., first half of tournament)
            const areTeammates = tournament.tournamentMode === 'team' && playerA.teamId && playerA.teamId === playerB.teamId;
            const isEarlyRound = roundNum <= Math.ceil(tournament.totalRounds / 2);
            
            if (!hasPlayedBefore && (!areTeammates || !isEarlyRound)) {
                newMatches.push(createNewMatch(tournament.id, roundNum, playerA, playerB));
                unpairedPlayers.splice(i, 1);
                opponentFound = true;
                break;
            }
        }
        
        // If no ideal opponent found, relax constraints (allow rematches or teammate pairings if necessary)
        if (!opponentFound && unpairedPlayers.length > 0) {
            const playerB = unpairedPlayers.shift()!;
            newMatches.push(createNewMatch(tournament.id, roundNum, playerA, playerB));
        } else if (!opponentFound && unpairedPlayers.length === 0) {
             console.warn("Player left over after pairing attempts", playerA);
        }
    }
    return newMatches;
};


const _pairSwissForDivision = (tournament: Tournament, roundNum: number, playersInDivision: Player[]): Match[] => {
    const standings = getStandings(tournament.id);
    const previousMatches = getMatches(tournament.id);
    let newMatches: Match[] = [];

    let activePlayersToPair = [...playersInDivision].filter(p => p.status === 'active');
    
    // Assign bye if needed
    if (activePlayersToPair.length % 2 !== 0) {
        const byeMethod = tournament.byeAssignmentMethod || 'lowestRankedFewestByes';
        const ratingSort = (byeMethod === 'lowestRankedFewestByes')
            ? (a: Player, b: Player) => a.rating - b.rating
            : (a: Player, b: Player) => b.rating - a.rating;
        
        const byePlayer = [...activePlayersToPair]
            .sort((a, b) => a.byeRounds.length - b.byeRounds.length || ratingSort(a, b))[0];
        
        if (byePlayer) {
            newMatches.push(createNewMatch(tournament.id, roundNum, byePlayer, null));
            activePlayersToPair = activePlayersToPair.filter(p => p.id !== byePlayer.id);
        }
    }
    
    const applyGibsonization = tournament.gibsonRounds && tournament.gibsonRounds >= roundNum;
    const scoreGroups: Record<number, Player[]> = {};

    activePlayersToPair.forEach(player => {
        const standing = standings.find(s => s.player.id === player.id);
        const score = standing?.score ?? 0;
        if (!scoreGroups[score]) scoreGroups[score] = [];
        scoreGroups[score].push(player);
    });

    for (const score in scoreGroups) {
        const group = scoreGroups[score];
        if (applyGibsonization && group.length >= 2) {
             const sortedGroup = group.sort((a,b) => b.rating - a.rating);
             const mid = Math.ceil(sortedGroup.length / 2);
             const topHalf = sortedGroup.slice(0, mid);
             const bottomHalf = sortedGroup.slice(mid);
             newMatches.push(...pairScoreGroup(topHalf, previousMatches, tournament, roundNum));
             newMatches.push(...pairScoreGroup(bottomHalf, previousMatches, tournament, roundNum));
        } else {
            newMatches.push(...pairScoreGroup(group, previousMatches, tournament, roundNum));
        }
    }

    return newMatches;
};


const _generateRoundRobinForDivision = (tournament: Tournament, playersInDivision: Player[]): Match[] => {
    if (playersInDivision.length < 2) return [];

    let players: (Player | {id: number, name: string, seed: number})[] = [...playersInDivision];
    const dummyPlayer = { id: -1, name: "BYE", seed: -1, status: 'active', byeRounds: [], rating: 0, divisionId: null, classId: null, teamId: null };

    if (players.length % 2 !== 0) {
        players.push(dummyPlayer);
    }
    const numPlayers = players.length;
    const roundsPerCycle = numPlayers - 1;

    const allMatches: Match[] = [];
    let playerList = [...players];

    for (let round = 0; round < tournament.totalRounds; round++) {
        const roundNum = round + 1;
        const mid = numPlayers / 2;
        const firstHalf = playerList.slice(0, mid);
        const secondHalf = playerList.slice(mid).reverse();

        for (let i = 0; i < mid; i++) {
            const playerA = firstHalf[i];
            const playerB = secondHalf[i];

            if (playerA.id === dummyPlayer.id || playerB.id === dummyPlayer.id) {
                const realPlayer = (playerA.id === dummyPlayer.id ? playerB : playerA) as Player;
                allMatches.push(createNewMatch(tournament.id, roundNum, realPlayer, null));
            } else {
                 const playsPerOpponent = tournament.roundRobinPlaysPerOpponent || 1;
                const cycleNum = Math.floor(round / roundsPerCycle);
                const shouldAlternate = playsPerOpponent > 1 && cycleNum % 2 === 1;

                if (shouldAlternate) {
                     allMatches.push(createNewMatch(tournament.id, roundNum, playerB as Player, playerA as Player));
                } else {
                     allMatches.push(createNewMatch(tournament.id, roundNum, playerA as Player, playerB as Player));
                }
            }
        }

        const lastPlayer = playerList.pop()!;
        playerList.splice(1, 0, lastPlayer);
    }
    
    return allMatches;
};


const _pairKothForDivision = (tournament: Tournament, roundNum: number, playersInDivision: Player[]): Match[] => {
    const standings = getStandings(tournament.id);
    let newMatches: Match[] = [];

    let activePlayersToPair = [...playersInDivision].filter(p => p.status === 'active');
    
    if (activePlayersToPair.length % 2 !== 0) {
        const byePlayer = [...activePlayersToPair]
            .sort((a, b) => {
                 const byeDiff = a.byeRounds.length - b.byeRounds.length;
                 if (byeDiff !== 0) return byeDiff;
                 const rankA = standings.find(s => s.player.id === a.id)?.rank ?? 999;
                 const rankB = standings.find(s => s.player.id === b.id)?.rank ?? 999;
                 return rankB - rankA; // lowest rank (highest number) first
            })[0];
        
        if (byePlayer) {
            newMatches.push(createNewMatch(tournament.id, roundNum, byePlayer, null));
            activePlayersToPair = activePlayersToPair.filter(p => p.id !== byePlayer.id);
        }
    }
    
    const rankedPlayers = standings
        .filter(s => activePlayersToPair.some(p => p.id === s.player.id))
        .sort((a,b) => a.rank - b.rank)
        .map(s => s.player);
    
    for (let i = 0; i < rankedPlayers.length; i+= 2) {
        const playerA = rankedPlayers[i];
        const playerB = rankedPlayers[i + 1];
        if (playerA && playerB) {
            newMatches.push(createNewMatch(tournament.id, roundNum, playerA, playerB));
        }
    }

    return newMatches;
}

export const generateFullRoundRobinSchedule = (tournamentId: string): void => {
    checkHeadTdPermission(tournamentId);
    const tournament = getTournament(tournamentId);
    if (!tournament) throw new Error("Tournament not found");
    
    const players = getPlayers(tournamentId).filter(p => p.status === 'active');
    const divisions = tournament.divisions;
    let allNewMatches: Match[] = [];

    for (const division of divisions) {
        const playersInDivision = players.filter(p => p.divisionId === division.id);
        const divisionMatches = _generateRoundRobinForDivision(tournament, playersInDivision);
        allNewMatches.push(...divisionMatches);
    }
    
    state.matches[tournamentId] = allNewMatches;
    state.tournaments[tournamentId].status = 'In Progress';
    logAction(tournamentId, 'PAIRING_GENERATE_RR', `Generated full Round Robin schedule for ${tournament.totalRounds} rounds.`);
    saveState(state);
    broadcastUpdate(tournamentId);
};

export const generatePairingsForRound = (tournamentId: string, roundNum: number): Match[] => {
    checkHeadTdPermission(tournamentId);
    const tournament = getTournament(tournamentId);
    if (!tournament) throw new Error("Tournament not found");
    
    if (roundNum > tournament.totalRounds) {
        throw new Error(`Cannot pair round ${roundNum} as it exceeds the total of ${tournament.totalRounds} rounds.`);
    }
    // FIX: The `pairingMethod` property was removed from the Tournament type.
    // Defaulting to 'Swiss' as it was the default in `createTournament`.
    const pairingMethod = 'Swiss' as PairingMethod;

    const players = getPlayers(tournamentId); // All players, status check happens inside
    const divisions = tournament.divisions;
    let allNewMatches: Match[] = [];

    if (pairingMethod === 'King of the Hill') {
        for (const division of divisions) {
            const playersInDivision = players.filter(p => p.divisionId === division.id);
            const divisionMatches = _pairKothForDivision(tournament, roundNum, playersInDivision);
            allNewMatches.push(...divisionMatches);
        }
    } else if (pairingMethod === 'Swiss') {
        for (const division of divisions) {
            const playersInDivision = players.filter(p => p.divisionId === division.id);
            const divisionMatches = _pairSwissForDivision(tournament, roundNum, playersInDivision);
            allNewMatches.push(...divisionMatches);
        }
    } else {
         throw new Error(`Pairing method "${pairingMethod}" is not supported by this function.`);
    }
    
    state.matches[tournamentId] = [...(state.matches[tournamentId] || []), ...allNewMatches];
    state.tournaments[tournamentId].status = 'In Progress';
    logAction(tournamentId, 'PAIRING_GENERATE_METHOD', `Generated ${pairingMethod} pairings for round ${roundNum}.`);
    saveState(state);
    broadcastUpdate(tournamentId);
    return allNewMatches;
};

export const submitScores = (tournamentId: string, scores: Record<number, { scoreA: number; scoreB: number }>): void => {
    checkStaffPermission(tournamentId);
    const matches = state.matches[tournamentId];
    let count = 0;
    Object.entries(scores).forEach(([matchIdStr, result]) => {
        const matchId = parseInt(matchIdStr, 10);
        const match = matches.find(m => m.id === matchId);
        if (match) {
            match.scoreA = result.scoreA;
            match.scoreB = result.scoreB;
            match.status = 'completed';
            count++;
        }
    });
    const round = matches.find(m => m.id === parseInt(Object.keys(scores)[0]))?.round || 'N/A';
    logAction(tournamentId, 'SCORES_SUBMIT', `Submitted ${count} results for round ${round}.`);
    saveState(state);
    broadcastUpdate(tournamentId);
};

export const editMatchScore = (tournamentId: string, matchId: number, scoreA: number, scoreB: number): Match => {
    checkHeadTdPermission(tournamentId);
    const match = state.matches[tournamentId]?.find(m => m.id === matchId);
    if (!match) throw new Error("Match not found");

    const oldScoreA = match.scoreA;
    const oldScoreB = match.scoreB;
    
    match.scoreA = scoreA;
    match.scoreB = scoreB;

    logAction(tournamentId, 'SCORE_EDIT', `TD edited Match #${matchId} (R${match.round}: ${match.playerA.name} vs ${match.playerB?.name}). Score changed from ${oldScoreA}-${oldScoreB} to ${scoreA}-${scoreB}.`);
    saveState(state);
    broadcastUpdate(tournamentId);
    return match;
};

export const markAsForfeit = (tournamentId: string, matchId: number, forfeitedPlayerId: number): Match => {
    checkHeadTdPermission(tournamentId);
    const tournament = getTournament(tournamentId);
    const match = state.matches[tournamentId]?.find(m => m.id === matchId);
    if (!match || !tournament) throw new Error("Match or tournament not found");
    
    const forfeitWin = tournament.forfeitWinScore ?? 1;
    const forfeitLoss = tournament.forfeitLossScore ?? 0;

    const isPlayerAForfeit = match.playerA.id === forfeitedPlayerId;

    match.status = 'completed';
    match.isForfeit = true;
    match.forfeitedPlayerId = forfeitedPlayerId;
    match.scoreA = isPlayerAForfeit ? forfeitLoss : forfeitWin;
    match.scoreB = isPlayerAForfeit ? forfeitWin : forfeitLoss;
    
    logAction(tournamentId, 'MATCH_FORFEIT', `Match #${match.id} marked as forfeit for ${isPlayerAForfeit ? match.playerA.name : match.playerB?.name}.`);
    saveState(state);
    broadcastUpdate(tournamentId);
    return match;
};

export const swapPlayersInPairings = (tournamentId: string, round: number, playerAId: number, playerBId: number): void => {
    checkHeadTdPermission(tournamentId);
    const matches = getMatchesForRound(tournamentId, round);
    const matchA = matches.find(m => m.playerA.id === playerAId || m.playerB?.id === playerAId);
    const matchB = matches.find(m => m.playerA.id === playerBId || m.playerB?.id === playerBId);

    if (!matchA || !matchB || matchA.id === matchB.id) {
        throw new Error("Could not find two distinct matches for the selected players to swap.");
    }

    const playerAOriginal = (matchA.playerA.id === playerAId) ? matchA.playerA : matchA.playerB!;
    const playerBOriginal = (matchB.playerA.id === playerBId) ? matchB.playerA : matchB.playerB!;

    // Perform the swap
    if (matchA.playerA.id === playerAId) {
        matchA.playerA = playerBOriginal;
    } else {
        matchA.playerB = playerBOriginal;
    }

    if (matchB.playerA.id === playerBId) {
        matchB.playerA = playerAOriginal;
    } else {
        matchB.playerB = playerAOriginal;
    }
    
    logAction(tournamentId, 'PAIRING_SWAP', `Manually swapped ${playerAOriginal.name} and ${playerBOriginal.name} in round ${round}.`);
    saveState(state);
    broadcastUpdate(tournamentId);
};

// STANDINGS CALCULATION
export const getStandings = (tournamentId: string): Standing[] => {
    const tournament = getTournament(tournamentId);
    const players = getPlayers(tournamentId);
    const allMatches = getMatches(tournamentId) || [];

    if (!tournament || players.length === 0) return [];

    const completedMatches = allMatches
        .filter(m => m.status === 'completed')
        .sort((a,b) => a.round - b.round || a.id - b.id);

    type PlayerStats = {
        score: number; wins: number; losses: number;
        cumulativeSpread: number; opponents: { id: number, score: number }[]; lastGame: LastGameInfo | null;
        ratingChange: number;
    };
    const playerStats = new Map<number, PlayerStats>();
    const playerMap = new Map<number, Player>();
    players.forEach(p => playerMap.set(p.id, p));


    players.forEach(p => {
        const byeWins = p.byeRounds.length;
        playerStats.set(p.id, {
            score: byeWins, wins: byeWins, losses: 0,
            cumulativeSpread: 0, opponents: [], lastGame: null,
            ratingChange: 0,
        });
    });
    
    completedMatches.forEach(match => {
        if (!match.playerB) {
            const statsA = playerStats.get(match.playerA.id);
            if (statsA) {
                const byeGame: LastGameInfo = {
                    round: match.round, result: 'B', playerScore: 1, opponentScore: 0, opponentSeed: null
                };
                 if (!statsA.lastGame || match.round >= statsA.lastGame.round) {
                    statsA.lastGame = byeGame;
                }
            }
            return;
        }

        const statsA = playerStats.get(match.playerA.id);
        const statsB = playerStats.get(match.playerB.id);

        if (!statsA || !statsB) return;
        
        if (match.scoreA! > match.scoreB!) {
            statsA.score += 1; statsA.wins += 1; statsB.losses += 1;
        } else if (match.scoreB! > match.scoreA!) {
            statsB.score += 1; statsB.wins += 1; statsA.losses += 1;
        } else {
            statsA.score += 0.5; statsB.score += 0.5;
            statsA.wins += 0.5; statsA.losses += 0.5;
            statsB.wins += 0.5; statsB.losses += 0.5;
        }
        statsA.cumulativeSpread += match.scoreA! - match.scoreB!;
        statsB.cumulativeSpread += match.scoreB! - match.scoreA!;
        
        const kFactor = tournament.ratingsSystemSettings?.kFactor || 24;
        const playerA_base = playerMap.get(match.playerA.id)!;
        const playerB_base = playerMap.get(match.playerB!.id)!;
        const ratingA = playerA_base.rating + statsA.ratingChange;
        const ratingB = playerB_base.rating + statsB.ratingChange;
        const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
        let actualA = 0.5;
        if (match.scoreA! > match.scoreB!) actualA = 1;
        if (match.scoreA! < match.scoreB!) actualA = 0;
        const changeA = kFactor * (actualA - expectedA);
        statsA.ratingChange += changeA;
        statsB.ratingChange -= changeA;
        
        const resultForA: LastGameInfo['result'] = match.isForfeit ? 'F' : (match.scoreA! > match.scoreB! ? 'W' : match.scoreA! < match.scoreB! ? 'L' : 'T');
        const gameA: LastGameInfo = {
            round: match.round, result: resultForA, playerScore: match.scoreA!, opponentScore: match.scoreB!, opponentSeed: match.playerB.seed
        };
        if (!statsA.lastGame || match.round >= statsA.lastGame.round) statsA.lastGame = gameA;

        const resultForB: LastGameInfo['result'] = match.isForfeit ? 'F' : (match.scoreB! > match.scoreA! ? 'W' : match.scoreB! < match.scoreA! ? 'L' : 'T');
        const gameB: LastGameInfo = {
            round: match.round, result: resultForB, playerScore: match.scoreB!, opponentScore: match.scoreA!, opponentSeed: match.playerA.seed
        };
        if (!statsB.lastGame || match.round >= statsB.lastGame.round) statsB.lastGame = gameB;
    });
    
    // Defer opponent score lookup until all scores are calculated
    completedMatches.forEach(match => {
        if(!match.playerB) return;
        const statsA = playerStats.get(match.playerA.id)!;
        const statsB = playerStats.get(match.playerB.id)!;
        statsA.opponents.push({id: match.playerB.id, score: statsB.score });
        statsB.opponents.push({id: match.playerA.id, score: statsA.score });
    });

    const standingsData = players.map(player => {
        const stats = playerStats.get(player.id)!;
        const buchholz = stats.opponents.reduce((acc, opp) => acc + (playerStats.get(opp.id)?.score || 0), 0);
        
        const opponentScores = stats.opponents.map(opp => playerStats.get(opp.id)?.score || 0).sort((a,b) => a - b);
        let medianBuchholz = buchholz;
        if (opponentScores.length >= 3) {
            medianBuchholz = opponentScores.slice(1, -1).reduce((acc, score) => acc + score, 0);
        }

        const ratingChange = Math.round(stats.ratingChange);
        
        return {
            player, score: stats.score, wins: stats.wins, losses: stats.losses,
            cumulativeSpread: stats.cumulativeSpread, buchholz, medianBuchholz, lastGame: stats.lastGame,
            ratingChangeSinceStart: ratingChange,
            currentRating: player.rating + ratingChange
        };
    });

    const finalRankedStandings: Standing[] = [];
    const divisions = tournament.divisions;
    
    const maxRoundPlayed = allMatches.length > 0 ? Math.max(...allMatches.map(m => m.round)) : 0;
    const roundsRemaining = tournament.totalRounds - maxRoundPlayed;

    for (const division of divisions) {
        // FIX: Explicitly type divisionStandings as Standing[] to allow adding clinchStatus property later.
        let divisionStandings: Standing[] = standingsData
            .filter(s => s.player.divisionId === division.id)
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                const tieBreakOrder = tournament.tieBreakOrder || [];
                for (const tieBreaker of tieBreakOrder) {
                    switch (tieBreaker) {
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
            })
            .map((s, index) => ({ ...s, rank: index + 1 }));
        
        // --- Clinch Logic ---
        if (roundsRemaining > 0 && divisionStandings.length >= 2) {
            const p1 = divisionStandings[0]; // Leader
            const p2 = divisionStandings[1]; // Contender
            
            const p2MaxWins = p2.wins + roundsRemaining;

            // Check A: Clinch by wins
            if (p2MaxWins<p1.wins) {
                p1.clinchStatus = 'clinched';
            }
        } else if (roundsRemaining === 0 && divisionStandings.length >= 1) {
             const p1 = divisionStandings[0];
             p1.clinchStatus = 'clinched';
        }
        
        finalRankedStandings.push(...divisionStandings);
    }

    return finalRankedStandings;
};


// ... More functions
export const getPlayerScorecard = (tournamentId: string, playerId: number): PlayerScorecardData | null => {
    const players = getPlayers(tournamentId);
    const player = players.find(p => p.id === playerId);
    if (!player) return null;

    const standings = getStandings(tournamentId);
    const standing = standings.find(s => s.player.id === playerId) || null;
    
    const allMatches = getMatches(tournamentId);
    const matches = allMatches
        .filter(m => m.playerA.id === playerId || m.playerB?.id === playerId)
        .sort((a,b) => a.round - b.round);
    
    return { player, standing, matches };
};

export const getFullTournamentDataForReport = (tournamentId: string): { tournament: Tournament, standings: Standing[], matches: Match[] } | null => {
    const tournament = getTournament(tournamentId);
    if (!tournament) return null;
    const standings = getStandings(tournamentId);
    const matches = getMatches(tournamentId);
    return { tournament, standings, matches };
};

export const getAuditLogs = (tournamentId: string): AuditLog[] => {
    return state.auditLogs[tournamentId] || [];
};