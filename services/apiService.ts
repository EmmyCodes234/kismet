import { supabase } from './supabaseClient';
import { 
    Tournament, Player, Match, Standing, TieBreakMethod, LastGameInfo, 
    PlayerScorecardData, PostTournamentRating, AuditLog, UserProfile, 
    GlobalStats, TournamentMode, Team, UserRole, Division, PairingMethod, TournamentLeader, PlayerMatchup, TeamStanding, PairingRule 
} from '../types';
import { Tables, TablesInsert, TablesUpdate } from '../types/supabase';

type PlayerRow = Tables<'players'>;
type MatchRow = Tables<'matches'>;
type TournamentRow = Tables<'tournaments'>;

// --- TYPE MAPPERS ---

const parseJsonField = (field: any, defaultValue: any) => {
    if (typeof field === 'string') {
        try {
            return JSON.parse(field);
        } catch (e) {
            console.error('Failed to parse JSON field:', field, e);
            return defaultValue;
        }
    }
    return field ?? defaultValue;
};


const mapPlayerFromDb = (playerRow: PlayerRow): Player => ({
    id: playerRow.id,
    name: playerRow.name,
    rating: playerRow.rating,
    seed: playerRow.seed,
    byeRounds: playerRow.bye_rounds || [],
    status: playerRow.status as 'active' | 'withdrawn',
    divisionId: playerRow.division_id,
    classId: playerRow.class_id,
    teamId: playerRow.team_id,
});

const mapMatchFromDb = (matchRow: MatchRow, playerMap: Map<number, Player>): Match => ({
    id: matchRow.id,
    tournamentId: matchRow.tournament_id,
    round: matchRow.round,
    playerA: playerMap.get(matchRow.player_a_id)!,
    playerB: matchRow.player_b_id ? (playerMap.get(matchRow.player_b_id) ?? null) : null,
    scoreA: matchRow.score_a,
    scoreB: matchRow.score_b,
    status: matchRow.status as 'pending' | 'completed',
    isForfeit: matchRow.is_forfeit ?? false,
    forfeitedPlayerId: matchRow.forfeited_player_id,
    firstTurnPlayerId: matchRow.first_turn_player_id,
});

const mapTournamentFromDb = (tournamentRow: TournamentRow): Tournament => ({
    id: tournamentRow.id,
    slug: tournamentRow.slug,
    name: tournamentRow.name,
    discipline: tournamentRow.discipline as 'Scrabble',
    totalRounds: tournamentRow.total_rounds,
    status: tournamentRow.status as 'Not Started' | 'In Progress' | 'Completed',
    playerCount: tournamentRow.player_count,
    roundRobinPlaysPerOpponent: tournamentRow.round_robin_plays_per_opponent,
    tieBreakOrder: (tournamentRow.tie_break_order || []) as TieBreakMethod[],
    divisionMode: tournamentRow.division_mode as 'single' | 'multiple',
    divisions: parseJsonField(tournamentRow.divisions, []),
    classes: parseJsonField(tournamentRow.classes, []),
    byeAssignmentMethod: tournamentRow.bye_assignment_method || undefined,
    byeSpread: tournamentRow.bye_spread ?? 50,
    scoring: parseJsonField(tournamentRow.scoring, { win: 1, draw: 0.5, loss: 0 }),
    ratingsSystemSettings: parseJsonField(tournamentRow.ratings_system_settings, null),
    postTournamentRatings: parseJsonField(tournamentRow.post_tournament_ratings, null),
    gibsonRounds: tournamentRow.gibson_rounds || undefined,
    forfeitWinScore: tournamentRow.forfeit_win_score || undefined,
    forfeitLossScore: tournamentRow.forfeit_loss_score || undefined,
    tournamentMode: tournamentRow.tournament_mode as TournamentMode,
    administrators: [], // Populated by getTournament
    teams: [], // Populated by getTournament
    teamSettings: parseJsonField(tournamentRow.team_settings, { topPlayersCount: 4, displayTeamNames: false, preventTeammatePairings_AllRounds: false, preventTeammatePairings_InitialRounds: 0 }),
    publicPortalSettings: parseJsonField(tournamentRow.public_portal_settings, { bannerUrl: '', welcomeMessage: '' }),
    deleted_at: tournamentRow.deleted_at || undefined,
});

// --- HELPER FUNCTIONS ---
const generateSlug = (name: string): string => {
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${baseSlug}-${randomSuffix}`;
};

// FIX: Export logAction to be used in other parts of the application.
export const logAction = async (tournamentId: string, action: string, details: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('audit_logs').insert({
        tournament_id: tournamentId,
        user_id: user?.id || null,
        action,
        details,
    });
};

const assignPlayerToDivision = (player: { rating: number }, divisions: Division[]): number | null => {
    const sortedDivisions = [...divisions].sort((a, b) => b.ratingFloor - a.ratingFloor); // check high to low
    for (const division of sortedDivisions) {
        if (player.rating >= division.ratingFloor && player.rating <= division.ratingCeiling) {
            return division.id;
        }
    }
    return divisions[0]?.id || null;
}

// --- PERMISSIONS ---

export const getCurrentUserRole = async (tournamentId: string): Promise<UserRole | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: adminData, error: adminError } = await supabase
        .from('administrators')
        .select('role')
        .eq('tournament_id', tournamentId)
        .eq('user_id', user.id)
        .single();

    if (!adminError && adminData) {
        return adminData.role as UserRole;
    }
    
    // Fallback to check if they are the original owner
    const { data: tournamentData } = await supabase
        .from('tournaments')
        .select('user_id')
        .eq('id', tournamentId)
        .single();

    return tournamentData?.user_id === user.id ? 'head' : null;
};

export const isHeadTd = async (tournamentId: string): Promise<boolean> => {
    const role = await getCurrentUserRole(tournamentId);
    return role === 'head';
}

export const addAdministrator = async (tournamentId: string, username: string): Promise<void> => {
    const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('display_name', username)
        .single();

    if (profileError || !profile) {
        throw new Error(`User "${username}" not found.`);
    }

    const { error: insertError } = await supabase
        .from('administrators')
        .insert({
            tournament_id: tournamentId,
            user_id: profile.id,
            role: 'assistant',
        });

    if (insertError) {
        if (insertError.code === '23505') { // unique constraint violation
            throw new Error(`User "${username}" is already an administrator for this tournament.`);
        }
        console.error('Error adding administrator:', insertError);
        throw new Error('Could not add administrator.');
    }

    await logAction(tournamentId, 'ADMIN_ADD', `Added ${username} as an assistant TD.`);
};

export const removeAdministrator = async (tournamentId: string, username: string): Promise<void> => {
    const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('display_name', username)
        .single();
    
    if (profileError || !profile) {
        throw new Error(`User "${username}" not found.`);
    }

    const { error: deleteError } = await supabase
        .from('administrators')
        .delete()
        .eq('tournament_id', tournamentId)
        .eq('user_id', profile.id)
        .eq('role', 'assistant');

    if (deleteError) {
        console.error('Error removing administrator:', deleteError);
        throw new Error('Could not remove administrator.');
    }
    
    await logAction(tournamentId, 'ADMIN_REMOVE', `Removed ${username} as an assistant TD.`);
};

// --- API FUNCTIONS ---

// User Profile, Global Stats... (omitted for brevity, no changes needed)
export const getUserProfile = async (): Promise<UserProfile | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase.from('user_profiles').select('*').eq('id', user.id).single();
    if (error && error.code !== 'PGRST116') { console.error('Error fetching profile:', error.message); return null; }
    if (!data) return null;
    return { displayName: data.display_name, bio: data.bio || '', countryCode: data.country_code || '', avatarUrl: data.avatar_url, };
};
export const saveUserProfile = async (profile: UserProfile): Promise<UserProfile | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase.from('user_profiles').upsert({ id: user.id, display_name: profile.displayName, bio: profile.bio, country_code: profile.countryCode, }).select().single();
    if (error) { console.error('Error saving profile:', error.message); throw error; }
    return { displayName: data.display_name, bio: data.bio || '', countryCode: data.country_code || '', avatarUrl: data.avatar_url, };
};
export const uploadAvatar = async (file: File): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { throw new Error("You must be logged in to upload an avatar."); }
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
    if (uploadError) { console.error("Error uploading avatar:", uploadError); throw uploadError; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const finalUrl = `${data.publicUrl}?t=${new Date().getTime()}`;
    const { error: updateUserError } = await supabase.from('user_profiles').update({ avatar_url: finalUrl }).eq('id', user.id);
    if (updateUserError) { console.error("Error updating user profile with avatar url:", updateUserError); throw updateUserError; }
    return finalUrl;
};
export const getGlobalUserStats = async (): Promise<GlobalStats | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: adminTournamentIdsData } = await supabase.from('administrators').select('tournament_id').eq('user_id', user.id);
    const adminOfTournamentIds = adminTournamentIdsData?.map(a => a.tournament_id) || [];
    const ownedByCurrentUser = `user_id.eq.${user.id}`;
    const isAdminOf = `id.in.(${adminOfTournamentIds.join(',')})`;
    let filterString = `or(${ownedByCurrentUser}${adminOfTournamentIds.length > 0 ? `,${isAdminOf}` : ''})`;
    const { data: userTournaments, error: tournamentsError } = await supabase.from('tournaments').select('id, status').or(filterString);
    if (tournamentsError) { console.error("Error fetching user tournaments for stats:", tournamentsError); return null; }
    const tournamentIds = userTournaments.map(t => t.id);
    if (tournamentIds.length === 0) { return { totalPlayersManaged: 0, totalMatchesRecorded: 0, completedTournaments: 0, tournamentsInProgress: 0, }; }
    const [{ count: totalPlayersManaged, error: pError }, { count: totalMatchesRecorded, error: mError }] = await Promise.all([
        supabase.from('players').select('*', { count: 'exact', head: true }).in('tournament_id', tournamentIds),
        supabase.from('matches').select('*', { count: 'exact', head: true }).in('tournament_id', tournamentIds).eq('status', 'completed')
    ]);
    if (pError || mError) { console.error("Error fetching player/match counts for stats:", pError || mError); return null; }
    return { totalPlayersManaged: totalPlayersManaged ?? 0, totalMatchesRecorded: totalMatchesRecorded ?? 0, completedTournaments: userTournaments.filter(t => t.status === 'Completed').length, tournamentsInProgress: userTournaments.filter(t => t.status === 'In Progress').length, };
};


// Tournaments
export const getTournaments = async (): Promise<Tournament[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data: adminTournamentIdsData, error: adminError } = await supabase.from('administrators').select('tournament_id').eq('user_id', user.id);
    if (adminError) { console.error('Error fetching admin tournament IDs:', adminError.message); return []; }
    const adminOfTournamentIds = adminTournamentIdsData.map(a => a.tournament_id);
    const ownedByCurrentUser = `user_id.eq.${user.id}`;
    const isAdminOf = `id.in.(${adminOfTournamentIds.join(',')})`;
    let filterString = `or(${ownedByCurrentUser}${adminOfTournamentIds.length > 0 ? `,${isAdminOf}` : ''})`;
    const { data, error } = await supabase.from('tournaments').select('*').or(filterString).is('deleted_at', null).order('created_at', { ascending: false });
    if (error) { console.error('Error fetching tournaments:', error.message); return []; }
    return data.map(mapTournamentFromDb);
};

export const getTrashedTournaments = async (): Promise<Tournament[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data: adminTournamentIdsData, error: adminError } = await supabase.from('administrators').select('tournament_id').eq('user_id', user.id);
    if (adminError) { console.error('Error fetching admin tournament IDs for trash:', adminError.message); return []; }
    const adminOfTournamentIds = adminTournamentIdsData.map(a => a.tournament_id);
    const ownedByCurrentUser = `user_id.eq.${user.id}`;
    const isAdminOf = `id.in.(${adminOfTournamentIds.join(',')})`;
    let filterString = `or(${ownedByCurrentUser}${adminOfTournamentIds.length > 0 ? `,${isAdminOf}` : ''})`;
    const { data, error } = await supabase.from('tournaments').select('*').or(filterString).not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
    if (error) { console.error('Error fetching trashed tournaments:', error.message); return []; }
    return data.map(mapTournamentFromDb);
};

export const getTournament = async (id: string): Promise<Tournament | null> => {
    const { data: tournamentData, error: tournamentError } = await supabase.from('tournaments').select('*').eq('id', id).single();
    if (tournamentError) { console.error(`Error fetching tournament ${id}:`, tournamentError.message); return null; }
    const tournament = mapTournamentFromDb(tournamentData);
    const { data: adminsData, error: adminError } = await supabase.from('administrators').select('user_id, role').eq('tournament_id', id);
    if (!adminError && adminsData && adminsData.length > 0) {
        const adminUserIds = adminsData.map(a => a.user_id);
        const { data: profilesData, error: profilesError } = await supabase.from('user_profiles').select('id, display_name').in('id', adminUserIds);
        if (!profilesError) {
            const profileMap = new Map(profilesData.map(p => [p.id, p.display_name]));
            tournament.administrators = adminsData.map(a => ({ username: profileMap.get(a.user_id) || 'Unknown User', role: a.role as UserRole }));
        }
    }
    const { data: teamsData, error: teamError } = await supabase.from('teams').select('*').eq('tournament_id', id);
    if (!teamError && teamsData) { tournament.teams = teamsData.map(t => ({ id: t.id, name: t.name })); }
    return tournament;
};

export const getTournamentBySlug = async (slug: string): Promise<Tournament | null> => {
    const { data, error } = await supabase.from('tournaments').select('*').eq('slug', slug).single();
    if (error) { console.error(`Error fetching tournament by slug ${slug}:`, error.message); return null; }
    return mapTournamentFromDb(data);
};

export const createTournament = async (name: string, tournamentMode: TournamentMode): Promise<Tournament> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not found");
    const newTournamentData: TablesInsert<'tournaments'> = {
        id: crypto.randomUUID(), user_id: user.id, name: name, slug: generateSlug(name), discipline: 'Scrabble',
        total_rounds: 0, status: 'Not Started', player_count: 0, round_robin_plays_per_opponent: 1,
        division_mode: 'single', divisions: JSON.stringify([{ id: 1, name: 'Open Division', ratingFloor: 0, ratingCeiling: 9999 }]),
        classes: JSON.stringify([]), tournament_mode: tournamentMode,
        team_settings: JSON.stringify({ topPlayersCount: 4, displayTeamNames: false, preventTeammatePairings_AllRounds: false, preventTeammatePairings_InitialRounds: 0 }),
        public_portal_settings: JSON.stringify({ bannerUrl: '', welcomeMessage: '' }),
        tie_break_order: ['cumulativeSpread', 'buchholz', 'rating'], bye_spread: 50,
        scoring: JSON.stringify({ win: 1, draw: 0.5, loss: 0 }),
    };
    const { data, error } = await supabase.from('tournaments').insert(newTournamentData).select().single();
    if (error) { console.error("Error creating tournament:", error); throw error; }
    await supabase.from('administrators').insert({ tournament_id: data.id, user_id: user.id, role: 'head' });
    await logAction(data.id, 'TOURNAMENT_CREATE', `Tournament "${name}" was created.`);
    return mapTournamentFromDb(data);
};

export const updateTournament = async (tournamentId: string, updates: Partial<Tournament>): Promise<Tournament> => {
    const updatePayload: TablesUpdate<'tournaments'> = {};
    if (updates.name) updatePayload.name = updates.name;
    if (updates.slug) updatePayload.slug = updates.slug;
    if (updates.totalRounds) updatePayload.total_rounds = updates.totalRounds;
    if (updates.tieBreakOrder) updatePayload.tie_break_order = updates.tieBreakOrder;
    if (updates.publicPortalSettings) updatePayload.public_portal_settings = JSON.stringify(updates.publicPortalSettings);
    if (updates.teamSettings) updatePayload.team_settings = JSON.stringify(updates.teamSettings);
    if (updates.byeSpread) updatePayload.bye_spread = updates.byeSpread;
    if (updates.divisions) updatePayload.divisions = JSON.stringify(updates.divisions);
    if (updates.classes) updatePayload.classes = JSON.stringify(updates.classes);
    if (updates.divisionMode) updatePayload.division_mode = updates.divisionMode;
    if (updates.tournamentMode) updatePayload.tournament_mode = updates.tournamentMode;

    const { data, error } = await supabase.from('tournaments').update(updatePayload).eq('id', tournamentId).select().single();
    if (error) { console.error("Error updating tournament:", error); throw error; }
    await logAction(tournamentId, 'SETTINGS_UPDATE', `Tournament settings were updated.`);
    return mapTournamentFromDb(data);
};

// Soft delete and restore... (omitted for brevity, no changes needed)
export const softDeleteTournament = async (tournamentId: string): Promise<void> => { const { error } = await supabase.from('tournaments').update({ deleted_at: new Date().toISOString() }).eq('id', tournamentId); if (error) throw error; };
export const restoreTournament = async (tournamentId: string): Promise<void> => { const { error } = await supabase.from('tournaments').update({ deleted_at: null }).eq('id', tournamentId); if (error) throw error; };
export const permanentlyDeleteTournament = async (tournamentId: string): Promise<void> => { const { error } = await supabase.from('tournaments').delete().eq('id', tournamentId); if (error) throw error; };

// Players, Teams... (omitted for brevity, no changes needed)
export const getPlayers = async (tournamentId: string): Promise<Player[]> => {
    const { data, error } = await supabase.from('players').select('*').eq('tournament_id', tournamentId).order('name');
    if (error) { console.error("Error fetching players:", error); return []; }
    return data.map(mapPlayerFromDb);
};
export const addPlayersBulk = async (tournamentId: string, playersData: { name: string, rating: number, seed?: number, teamName?: string }[]): Promise<Player[]> => {
    const tournament = await getTournament(tournamentId);
    if (!tournament) throw new Error("Tournament not found");
    const teamNameToIdMap = new Map<string, number>();
    tournament.teams.forEach(t => teamNameToIdMap.set(t.name.toLowerCase(), t.id));
    for (const p of playersData) {
        if (p.teamName && !teamNameToIdMap.has(p.teamName.toLowerCase())) {
            const { data: newTeam, error } = await supabase.from('teams').insert({ tournament_id: tournamentId, name: p.teamName }).select().single();
            if (error) throw error;
            teamNameToIdMap.set(newTeam.name.toLowerCase(), newTeam.id);
        }
    }
    
    const useProvidedSeeds = playersData.length > 0 && playersData[0].seed !== undefined;
    
    let playersWithSeeds = playersData;
    if (!useProvidedSeeds) {
        playersWithSeeds = [...playersData]
            .sort((a,b) => b.rating - a.rating)
            .map((p, index) => ({ ...p, seed: index + 1 }));
    }

    const newPlayers: TablesInsert<'players'>[] = playersWithSeeds.map(p => ({
        tournament_id: tournamentId, 
        name: p.name, 
        rating: p.rating, 
        seed: p.seed!,
        status: 'active',
        bye_rounds: [], 
        team_id: p.teamName ? teamNameToIdMap.get(p.teamName.toLowerCase()) : null,
        division_id: assignPlayerToDivision(p, tournament.divisions),
    }));

    const { data, error } = await supabase.from('players').insert(newPlayers).select();
    if (error) { console.error("Error bulk inserting players:", error); throw error; }
    await logAction(tournamentId, 'PLAYERS_ADD_BULK', `Added ${data.length} players to the roster.`);
    return data.map(mapPlayerFromDb);
};
export const updatePlayer = async (player: Player): Promise<Player> => {
    const { data, error } = await supabase.from('players').update({ name: player.name, rating: player.rating, division_id: player.divisionId }).eq('id', player.id).select().single();
    if (error) throw error; return mapPlayerFromDb(data);
};
export const deletePlayer = async (playerId: number): Promise<void> => { const { error } = await supabase.from('players').delete().eq('id', playerId); if (error) throw error; };

export const deleteAllPlayersForTournament = async (tournamentId: string): Promise<void> => {
    const { error } = await supabase.from('players').delete().eq('tournament_id', tournamentId);
    if (error) {
        console.error("Error deleting players for tournament:", error);
        throw error;
    }
};

export const deleteAllTeamsForTournament = async (tournamentId: string): Promise<void> => {
    const { error } = await supabase.from('teams').delete().eq('tournament_id', tournamentId);
    if (error) {
        console.error("Error deleting teams for tournament:", error);
        throw error;
    }
};

export const withdrawPlayer = async (playerId: number): Promise<Player> => {
    const { data, error } = await supabase.from('players').update({ status: 'withdrawn' }).eq('id', playerId).select().single();
    if (error) throw error; return mapPlayerFromDb(data);
};
export const reinstatePlayer = async (playerId: number): Promise<Player> => {
    const { data, error } = await supabase.from('players').update({ status: 'active' }).eq('id', playerId).select().single();
    if (error) throw error; return mapPlayerFromDb(data);
};
export const getTeams = async (tournamentId: string): Promise<Team[]> => { const { data, error } = await supabase.from('teams').select('*').eq('tournament_id', tournamentId); if (error) return []; return data.map(t => ({ id: t.id, name: t.name })); };
export const createTeam = async (tournamentId: string, teamName: string): Promise<Team> => { const { data, error } = await supabase.from('teams').insert({ tournament_id: tournamentId, name: teamName }).select().single(); if (error) throw error; return { id: data.id, name: data.name }; };
export const assignPlayerToTeam = async (playerId: number, teamId: number | null): Promise<Player> => { const { data, error } = await supabase.from('players').update({ team_id: teamId }).eq('id', playerId).select().single(); if (error) throw error; return mapPlayerFromDb(data); };
export const editMatchScore = async (matchId: number, scoreA: number, scoreB: number): Promise<void> => { const { error } = await supabase.from('matches').update({ score_a: scoreA, score_b: scoreB }).eq('id', matchId); if (error) throw error; };
export const swapPlayersInPairings = async (round: number, tournamentId: string, playerAId: number, playerBId: number): Promise<void> => { const { error } = await supabase.rpc('swap_players_in_round', { p_round: round, p_tournament_id: tournamentId, p_player_a_id: playerAId, p_player_b_id: playerBId }); if (error) throw error; };
export const getTeamStandings = async (tournamentId: string): Promise<TeamStanding[]> => { return []; };

export const getStandings = async (tournamentId: string): Promise<Standing[]> => {
    const tournament = await getTournament(tournamentId);
    if (!tournament) return [];

    // Fetch all players for the tournament once
    const players = await getPlayers(tournamentId);
    if (players.length === 0) return [];
    const playerMap = new Map(players.map(p => [p.id, p]));

    // Query the fast materialized view
    const { data: viewData, error } = await supabase
        .from('v_standings')
        .select('*')
        .eq('tournament_id', tournamentId);

    if (error) {
        console.error("Error fetching materialized standings:", error);
        throw error;
    }
    
    const standingsData = viewData.map(row => {
        const player = playerMap.get(row.player_id);
        if (!player) return null; // Should not happen if data is consistent
        return {
            player: player,
            score: row.score ?? 0,
            wins: (row.wins ?? 0),
            losses: row.losses ?? 0,
            cumulativeSpread: row.cumulative_spread ?? 0,
            buchholz: row.buchholz ?? 0,
            medianBuchholz: 0, // Not calculated in this optimized view for performance
            lastGame: null,      // Can be calculated on client if needed, but omitted for speed
        };
    }).filter((s): s is Exclude<typeof s, null> => s !== null);


    const finalRankedStandings: Standing[] = [];
    for (const division of tournament.divisions) {
        let divisionStandings = standingsData
            .filter(s => s.player.divisionId === division.id)
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                const tieBreakOrder = tournament.tieBreakOrder || [];
                for (const tieBreaker of tieBreakOrder) {
                    if (b[tieBreaker] !== a[tieBreaker]) return b[tieBreaker]! - a[tieBreaker]!;
                }
                return b.player.rating - a.player.rating;
            })
            .map((s, index) => ({ ...s, rank: index + 1 }));
        
        finalRankedStandings.push(...divisionStandings);
    }

    return finalRankedStandings;
};

export const getPlayerScorecard = async (tournamentId: string, playerId: number): Promise<PlayerScorecardData> => { const [player, matches, standings] = await Promise.all([ supabase.from('players').select('*').eq('id', playerId).single(), getMatches(tournamentId), getStandings(tournamentId) ]); if (player.error) throw player.error; const standing = standings.find(s => s.player.id === playerId) || null; const playerMatches = matches.filter(m => m.playerA.id === playerId || m.playerB?.id === playerId); return { player: mapPlayerFromDb(player.data), standing, matches: playerMatches }; };
export const getFullTournamentDataForReport = async (tournamentId: string): Promise<{ tournament: Tournament, standings: Standing[], matches: Match[] } | null> => { const tournament = await getTournament(tournamentId); if (!tournament) return null; const standings = await getStandings(tournamentId); const matches = await getMatches(tournamentId); return { tournament, standings, matches }; };

export const getAuditLogs = async (tournamentId: string, page: number, pageSize: number): Promise<AuditLog[]> => {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) {
        console.error("Error fetching audit logs:", error);
        return [];
    }
    return data.map(l => ({ id: l.id, tournamentId: l.tournament_id, action: l.action, timestamp: l.created_at, details: l.details }));
};

export const getPlayerVsPlayerHistory = async (tournamentId: string, playerAId: number, playerBId: number): Promise<PlayerMatchup | null> => { return null; };
export const getTournamentLeaders = async (tournamentId: string): Promise<TournamentLeader[]> => { return []; };
export const generateTouFileContent = async (tournamentId: string, divisionId: number): Promise<string> => {
    const tournament = await getTournament(tournamentId);
    const allPlayers = await getPlayers(tournamentId);
    const allMatches = await getMatches(tournamentId);
    if (!tournament) throw new Error("Tournament not found.");
    const division = tournament.divisions.find(d => d.id === divisionId);
    if (!division) throw new Error(`Division with ID ${divisionId} not found.`);
    const divisionPlayers = allPlayers.filter(p => p.divisionId === divisionId);
    const orderedPlayers = divisionPlayers.sort((a, b) => a.seed - b.seed);
    const playerIdMap = new Map<number, number>();
    orderedPlayers.forEach((p, index) => playerIdMap.set(p.id, index + 1));
    let output = "";
    const dbDate = (await supabase.from('tournaments').select('created_at').eq('id', tournamentId).single()).data?.created_at;
    const date = new Date(dbDate || Date.now()).toISOString().split('T')[0];
    output += `*M${date} ${tournament.name}\n`;
    const divisionLetter = division.name.length === 1 ? division.name : division.name.split(' ').pop()?.charAt(0) || 'A';
    output += `*${divisionLetter.toUpperCase()}\n`;
    output += ' '.repeat(39) + '0\n';
    const formatPlayerNameForTou = (name: string): string => { const parts = name.split(',').map(p => p.trim()); return (parts.length === 2 && parts[0] && parts[1]) ? `${parts[1]} ${parts[0]}` : name; };
    for (const player of orderedPlayers) {
        let playerLine = formatPlayerNameForTou(player.name);
        for (let roundNum = 1; roundNum <= tournament.totalRounds; roundNum++) {
            const isBye = player.byeRounds.includes(roundNum);
            const game = allMatches.find(m => m.round === roundNum && (m.playerA.id === player.id || m.playerB?.id === player.id));
            if (isBye) {
                const encodedScore = (300 + tournament.byeSpread) + 1300;
                playerLine += ` ${encodedScore} ${playerIdMap.get(player.id)}`;
            } else if (game) {
                if (!game.playerB) continue;
                const isPlayerA = game.playerA.id === player.id;
                const pScore = (isPlayerA ? game.scoreA : game.scoreB) ?? 0;
                const oScore = (isPlayerA ? game.scoreB : game.scoreA) ?? 0;
                const opponent = isPlayerA ? game.playerB : game.playerA;
                let encodedScore = pScore;
                if (pScore > oScore) encodedScore += 2000;
                else if (pScore === oScore) encodedScore += 1000;
                let encodedOpponent = playerIdMap.get(opponent.id)?.toString() || "0";
                if(game.firstTurnPlayerId === player.id) encodedOpponent = `+${encodedOpponent}`;
                playerLine += ` ${encodedScore} ${encodedOpponent}`;
            } else { break; }
        }
        output += playerLine + '\n';
    }
    output += '*** END OF FILE ***';
    return output;
};
// FIX: Implement finalizeTournamentRatings to resolve compilation errors.
export const finalizeTournamentRatings = async (tournamentId: string): Promise<void> => {
    const standings = await getStandings(tournamentId);
    const tournament = await getTournament(tournamentId);
    if (!tournament) throw new Error("Tournament not found");

    if (standings.length === 0) {
        await supabase.from('tournaments').update({ status: 'Completed' }).eq('id', tournamentId);
        return;
    }

    const finalRatings: PostTournamentRating[] = standings.map(s => ({
        playerId: s.player.id,
        playerName: s.player.name,
        divisionId: s.player.divisionId!,
        oldRating: s.player.rating,
        newRating: s.currentRating ?? s.player.rating,
        change: s.ratingChangeSinceStart ?? 0,
        performanceRating: s.currentRating ?? s.player.rating, // Placeholder
    }));

    await supabase.from('tournaments').update({
        status: 'Completed',
        post_tournament_ratings: JSON.stringify(finalRatings)
    }).eq('id', tournamentId);

    await logAction(tournamentId, 'TOURNAMENT_FINALIZE', 'Tournament results and ratings have been finalized.');
};
export const checkAndFixTournamentStatuses = async (): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: adminTournamentIdsData } = await supabase.from('administrators').select('tournament_id').eq('user_id', user.id);
    const adminOfTournamentIds = adminTournamentIdsData?.map(a => a.tournament_id) || [];
    const ownedByCurrentUser = `user_id.eq.${user.id}`;
    const isAdminOf = `id.in.(${adminOfTournamentIds.join(',')})`;
    let filterString = `and(status.eq.In Progress,or(${ownedByCurrentUser}${adminOfTournamentIds.length > 0 ? `,${isAdminOf}` : ''}))`;
    const { data: tournamentsToCheck, error: tournamentsError } = await supabase.from('tournaments').select('id, total_rounds').or(filterString);
    if (tournamentsError || !tournamentsToCheck || tournamentsToCheck.length === 0) return;
    const tournamentIds = tournamentsToCheck.map(t => t.id);
    const { data: matches, error: matchesError } = await supabase.from('matches').select('tournament_id, round, status').in('tournament_id', tournamentIds);
    if (matchesError) { console.error("Error fetching matches for status check:", matchesError); return; }
    const matchesByTournament = new Map<string, { round: number, status: string }[]>();
    matches.forEach(m => { if (!matchesByTournament.has(m.tournament_id)) { matchesByTournament.set(m.tournament_id, []); } matchesByTournament.get(m.tournament_id)!.push(m); });
    const tournamentsToFinalize: string[] = [];
    for (const tournament of tournamentsToCheck) {
        const tournamentMatches = matchesByTournament.get(tournament.id) || [];
        if (tournamentMatches.length === 0) continue;
        const pendingCount = tournamentMatches.filter(m => m.status === 'pending').length;
        const maxRound = Math.max(0, ...tournamentMatches.map(m => m.round));
        if (pendingCount === 0 && tournament.total_rounds > 0 && maxRound >= tournament.total_rounds) { tournamentsToFinalize.push(tournament.id); }
    }
    if (tournamentsToFinalize.length > 0) { console.log(`Found ${tournamentsToFinalize.length} completed tournaments to finalize automatically.`); await Promise.all(tournamentsToFinalize.map(id => finalizeTournamentRatings(id))); }
};


// Matches
export const getMatches = async (tournamentId: string): Promise<Match[]> => {
    try {
        const { data: playersData, error: playersError } = await supabase.from('players').select('*').eq('tournament_id', tournamentId);
        if (playersError) throw playersError;
        const playerMap = new Map<number, Player>(playersData.map(p => [p.id, mapPlayerFromDb(p)]));
        const { data: matchesData, error: matchesError } = await supabase.from('matches').select('*').eq('tournament_id', tournamentId).order('round').order('id');
        if (matchesError) throw matchesError;
        return matchesData.map(matchRow => mapMatchFromDb(matchRow, playerMap));
    } catch (error: any) {
        console.error("Error fetching matches:", error.message || error);
        return [];
    }
};

// --- NEW/REFACTORED FUNCTIONS FOR DECLARATIVE PAIRING ---

export const getPairingRules = async (tournamentId: string): Promise<PairingRule[]> => {
    const { data, error } = await supabase
        .from('pairing_rules')
        .select('id, start_round, end_round, pairing_method, standings_source, allowed_repeats, quartile_pairing_scheme')
        .eq('tournament_id', tournamentId)
        .order('start_round');
        
    if (error) {
        console.error("Error fetching pairing rules:", error);
        throw new Error(`Failed to fetch pairing rules: ${error.message}`);
    }
    return data.map(r => ({
        id: r.id,
        startRound: r.start_round,
        endRound: r.end_round,
        pairingMethod: r.pairing_method as PairingMethod,
        standingsSource: r.standings_source as PairingRule['standingsSource'],
        allowedRepeats: r.allowed_repeats,
        quartilePairingScheme: r.quartile_pairing_scheme as PairingRule['quartilePairingScheme']
    }));
};

export const savePairingRules = async (tournamentId: string, rules: PairingRule[]): Promise<void> => {
    const { error: deleteError } = await supabase.from('pairing_rules').delete().eq('tournament_id', tournamentId);
    if (deleteError) throw deleteError;
    
    if (rules.length === 0) {
        await logAction(tournamentId, 'PAIRING_SCHEDULE_UPDATE', 'Pairing schedule was cleared.');
        return;
    }

    const rulesToInsert = rules.map(({ id, ...rest }) => ({
        tournament_id: tournamentId,
        start_round: rest.startRound,
        end_round: rest.endRound,
        pairing_method: rest.pairingMethod,
        standings_source: rest.standingsSource,
        allowed_repeats: rest.allowedRepeats,
        quartile_pairing_scheme: rest.quartilePairingScheme,
    }));

    const { error: insertError } = await supabase.from('pairing_rules').insert(rulesToInsert);
    if (insertError) throw insertError;

    await logAction(tournamentId, 'PAIRING_SCHEDULE_UPDATE', `Pairing schedule was updated with ${rules.length} rules.`);
};

const saveStandingsSnapshot = async (tournamentId: string, round: number): Promise<void> => {
    const standings = await getStandings(tournamentId);
    const { error } = await supabase.from('standings_snapshots').upsert(
        { tournament_id: tournamentId, round: round, standings_data: JSON.stringify(standings) },
        { onConflict: 'tournament_id, round' }
    );
    if (error) {
        console.error(`Error saving standings snapshot for round ${round}:`, error);
        throw error;
    }
};

const getStandingsForRound = async (tournamentId: string, source: PairingRule['standingsSource'], currentRound: number): Promise<Standing[]> => {
     if (source === 'Round0') {
        const players = await getPlayers(tournamentId);
        return players.sort((a,b) => b.rating - a.rating).map((p, i) => ({
            rank: i + 1, player: p, score: 0, wins: 0, losses: 0, cumulativeSpread: 0,
            buchholz: 0, medianBuchholz: 0, lastGame: null
        }));
    }

    let roundToFetch = currentRound - 1;
    if (source === 'Lagged') {
        roundToFetch = currentRound - 2;
    }

    if (roundToFetch <= 0) {
        return getStandingsForRound(tournamentId, 'Round0', currentRound);
    }

    const { data, error } = await supabase
        .from('standings_snapshots')
        .select('standings_data')
        .eq('tournament_id', tournamentId)
        .eq('round', roundToFetch)
        .single();
    
    if (error || !data) {
        console.warn(`Could not find standings snapshot for round ${roundToFetch}. Calculating on the fly.`);
        // Fallback: This is complex. For now, we return the *current* standings as a fallback.
        // A full implementation would calculate historical standings.
        return getStandings(tournamentId);
    }
    
    return JSON.parse(data.standings_data as string) as Standing[];
};

export const submitScores = async (tournamentId: string, scores: Record<number, { scoreA: number; scoreB: number }>): Promise<void> => {
    const updates = Object.entries(scores).map(([matchId, result]) => 
        supabase.from('matches').update({ score_a: result.scoreA, score_b: result.scoreB, status: 'completed' }).eq('id', parseInt(matchId))
    );
    const results = await Promise.all(updates);
    const firstError = results.find(res => res.error);
    if (firstError) throw firstError.error;

    const matches = await getMatches(tournamentId);
    
    try {
        const completedRound = matches.find(m => m.id === parseInt(Object.keys(scores)[0]))?.round;
        if (!completedRound) return;

        const pendingInRound = matches.some(m => m.round === completedRound && m.status === 'pending');
        if (pendingInRound) return; 
        
        // FIX: Swapped arguments to match the function signature `saveStandingsSnapshot(tournamentId, round)`.
        await saveStandingsSnapshot(tournamentId, completedRound);
        
        console.log(`Round ${completedRound} is complete. Running automated pairing engine.`);
        
        const nextRoundToPair = completedRound + 1;
        const rules = await getPairingRules(tournamentId);
        
        const ruleToExecute = rules.find(r => nextRoundToPair >= r.startRound && nextRoundToPair <= r.endRound);

        if (ruleToExecute) {
            console.log(`Found pairing rule to execute for target round ${nextRoundToPair}.`);
            await generatePairingForRound(tournamentId, ruleToExecute, nextRoundToPair);
        } else {
            console.log(`No pairing rule found for round ${nextRoundToPair}.`);
        }
    } catch (error) {
        console.error('Error during automated pairing after score submission:', error);
        throw new Error(`Scores submitted successfully, but the automated pairing for the next round failed: ${(error as Error).message}`);
    }
};

export const manuallyPairRound = async (tournamentId: string, roundNum: number): Promise<Match[]> => {
    const tournament = await getTournament(tournamentId);
    if (!tournament) throw new Error("Tournament not found");

    const tempRule: PairingRule = {
        id: 0,
        startRound: roundNum,
        endRound: roundNum,
        pairingMethod: 'Swiss', 
        standingsSource: 'PreviousRound',
        allowedRepeats: 0,
    };
    
    await logAction(tournamentId, 'MANUAL_PAIRING', `Manually triggered pairing for round ${roundNum}.`);

    return generatePairingForRound(tournamentId, tempRule, roundNum);
};

const _pairKoth = async (tournamentId: string, roundToPair: number, playersToPair: Player[], standings: Standing[]): Promise<TablesInsert<'matches'>[]> => {
    const rankedPlayers = [...playersToPair].sort((a,b) => {
        const rankA = standings.find(s => s.player.id === a.id)?.rank ?? 999;
        const rankB = standings.find(s => s.player.id === b.id)?.rank ?? 999;
        return rankA - rankB;
    });

    const matchesToInsert: TablesInsert<'matches'>[] = [];
    for(let i = 0; i < rankedPlayers.length; i += 2) {
        if(rankedPlayers[i+1]) {
            matchesToInsert.push({ tournament_id: tournamentId, round: roundToPair, player_a_id: rankedPlayers[i].id, player_b_id: rankedPlayers[i+1].id, status: 'pending' });
        }
    }
    return matchesToInsert;
};

const _pairSwiss = async (tournamentId: string, roundToPair: number, playersToPair: Player[], standings: Standing[], rule: PairingRule): Promise<TablesInsert<'matches'>[]> => {
    const matchesToInsert: TablesInsert<'matches'>[] = [];
    const playerStandings = new Map(standings.map(s => [s.player.id, s]));
    const previousMatches = await getMatches(tournamentId);

    const scoreGroups = new Map<number, Player[]>();
    for (const player of playersToPair) {
        const score = playerStandings.get(player.id)?.score ?? 0;
        if (!scoreGroups.has(score)) scoreGroups.set(score, []);
        scoreGroups.get(score)!.push(player);
    }
    
    const sortedScores = Array.from(scoreGroups.keys()).sort((a,b) => b - a);
    let floater: Player | null = null;

    for (const score of sortedScores) {
        const group = [...scoreGroups.get(score)!].sort((a, b) => (playerStandings.get(a.id)?.rank ?? 999) - (playerStandings.get(b.id)?.rank ?? 999));
        if (floater) group.unshift(floater); // Add floater to the top of the next group
        
        if (group.length % 2 !== 0) {
            floater = group.pop()!;
        } else {
            floater = null;
        }

        const mid = group.length / 2;
        const topHalf = group.slice(0, mid);
        let bottomHalf = group.slice(mid);

        for (const playerA of topHalf) {
            let opponentFound = false;
            for (let i = 0; i < bottomHalf.length; i++) {
                const playerB = bottomHalf[i];
                const hasPlayed = previousMatches.some(m => (m.playerA.id === playerA.id && m.playerB?.id === playerB.id) || (m.playerA.id === playerB.id && m.playerB?.id === playerA.id));
                
                if (!hasPlayed) {
                    matchesToInsert.push({ tournament_id: tournamentId, round: roundToPair, player_a_id: playerA.id, player_b_id: playerB.id, status: 'pending' });
                    bottomHalf.splice(i, 1);
                    opponentFound = true;
                    break;
                }
            }
            if (!opponentFound && bottomHalf.length > 0) {
                 const playerB = bottomHalf.shift()!;
                 matchesToInsert.push({ tournament_id: tournamentId, round: roundToPair, player_a_id: playerA.id, player_b_id: playerB.id, status: 'pending' });
            }
        }
    }
    // If there is a final floater, it means they couldn't be paired and should get a bye.
    // This case is handled by the initial bye assignment logic. If we get here, something is off.
    if (floater) {
        console.error("A player was left unpaired after all groups were processed. This should not happen if byes are handled correctly.", floater);
    }
    return matchesToInsert;
};

const _pairAustralianDraw = async (tournamentId: string, roundToPair: number, playersToPair: Player[], rule: PairingRule): Promise<TablesInsert<'matches'>[]> => {
    // Sort players by rating descending to establish quartiles
    const sortedPlayers = [...playersToPair].sort((a, b) => b.rating - a.rating);

    const n = sortedPlayers.length;
    const qSize = Math.floor(n / 4);
    const remainder = n % 4;

    const q1End = qSize + (remainder > 0 ? 1 : 0);
    const q2End = q1End + qSize + (remainder > 1 ? 1 : 0);
    const q3End = q2End + qSize + (remainder > 2 ? 1 : 0);

    // Shuffle within quartiles for randomness
    const shuffle = (arr: Player[]) => arr.sort(() => Math.random() - 0.5);

    const q1 = shuffle(sortedPlayers.slice(0, q1End));
    const q2 = shuffle(sortedPlayers.slice(q1End, q2End));
    const q3 = shuffle(sortedPlayers.slice(q2End, q3End));
    const q4 = shuffle(sortedPlayers.slice(q3End));

    const matchesToInsert: TablesInsert<'matches'>[] = [];
    let unpaired: Player[] = [];

    const pairQuartiles = (quartileA: Player[], quartileB: Player[]) => {
        const smallerGroup = quartileA.length <= quartileB.length ? quartileA : quartileB;
        const largerGroup = quartileA.length <= quartileB.length ? quartileB : quartileA;

        for (let i = 0; i < smallerGroup.length; i++) {
            matchesToInsert.push({
                tournament_id: tournamentId,
                round: roundToPair,
                player_a_id: quartileA[i].id,
                player_b_id: quartileB[i].id,
                status: 'pending'
            });
        }
        // Collect leftover players from the larger group
        unpaired.push(...largerGroup.slice(smallerGroup.length));
    };

    if (rule.quartilePairingScheme === '1v2_3v4') {
        pairQuartiles(q1, q2);
        pairQuartiles(q3, q4);
    } else { // Default to '1v3_2v4'
        pairQuartiles(q1, q3);
        pairQuartiles(q2, q4);
    }
    
    // Pair any remaining players (from uneven quartiles)
    if (unpaired.length > 1) {
        for (let i = 0; i < unpaired.length; i += 2) {
            if (unpaired[i+1]) {
                matchesToInsert.push({
                    tournament_id: tournamentId,
                    round: roundToPair,
                    player_a_id: unpaired[i].id,
                    player_b_id: unpaired[i+1].id,
                    status: 'pending'
                });
            }
        }
    }
    
    return matchesToInsert;
};

const _pairChew = async (
    tournamentId: string, 
    roundToPair: number, 
    playersToPair: Player[], 
    standings: Standing[], 
    rule: PairingRule
): Promise<TablesInsert<'matches'>[]> => {
    const tournament = await getTournament(tournamentId);
    if (!tournament) return [];

    const roundsRemaining = tournament.totalRounds - (roundToPair - 1);
    const winScore = tournament.scoring?.win ?? 1;
    const maxPossibleScoreIncrease = roundsRemaining * winScore;
    
    const divisionStandings = standings.filter(s => playersToPair.some(p => p.id === s.player.id));
    const leaderScore = divisionStandings.length > 0 ? divisionStandings[0].score : 0;
    
    const playerStandings = new Map(divisionStandings.map(s => [s.player.id, s]));

    const contenders: Player[] = [];
    const nonContenders: Player[] = [];

    for (const player of playersToPair) {
        const standing = playerStandings.get(player.id);
        const playerScore = standing?.score ?? 0;
        if (playerScore + maxPossibleScoreIncrease >= leaderScore) {
            contenders.push(player);
        } else {
            nonContenders.push(player);
        }
    }
    
    // Sort contenders by rank to determine who to float down
    contenders.sort((a,b) => {
        const rankA = playerStandings.get(a.id)?.rank ?? 999;
        const rankB = playerStandings.get(b.id)?.rank ?? 999;
        return rankA - rankB;
    });

    // If contenders are an odd number, move the lowest ranked contender to non-contenders
    if (contenders.length % 2 !== 0 && contenders.length > 1) {
        const floater = contenders.pop()!;
        nonContenders.push(floater);
    }

    const contenderMatches = await _pairKoth(tournamentId, roundToPair, contenders, standings);
    const nonContenderMatches = await _pairSwiss(tournamentId, roundToPair, nonContenders, standings, rule);
    
    return [...contenderMatches, ...nonContenderMatches];
};


export const generatePairingForRound = async (tournamentId: string, rule: PairingRule, roundToPair: number): Promise<Match[]> => {
    const tournament = await getTournament(tournamentId);
    if (!tournament || roundToPair > tournament.totalRounds) return [];

    const allPlayers = await getPlayers(tournamentId);
    let activePlayers = allPlayers.filter(p => p.status === 'active');
    if (activePlayers.length < 2) return [];

    const standings = await getStandingsForRound(tournamentId, rule.standingsSource, roundToPair);
    let matchesToInsert: TablesInsert<'matches'>[] = [];

    for (const division of tournament.divisions) {
        let divisionPlayers = activePlayers.filter(p => p.divisionId === division.id);
        if (divisionPlayers.length === 0) continue;

        if (divisionPlayers.length % 2 !== 0) {
            // Assign bye to lowest ranked player in the division who has had the fewest byes
             const byePlayer = divisionPlayers
                .sort((a,b) => {
                    const byeDiff = a.byeRounds.length - b.byeRounds.length;
                    if (byeDiff !== 0) return byeDiff;
                    const rankA = standings.find(s => s.player.id === a.id)?.rank ?? 999;
                    const rankB = standings.find(s => s.player.id === b.id)?.rank ?? 999;
                    return rankB - rankA; // Higher rank number (lower rank) gets bye
                })[0];

            if (byePlayer) {
                 matchesToInsert.push({ tournament_id: tournamentId, round: roundToPair, player_a_id: byePlayer.id, status: 'completed', score_a: 1, score_b: 0 });
                 // Update player's bye rounds in DB
                 await supabase.from('players').update({ bye_rounds: [...byePlayer.byeRounds, roundToPair] }).eq('id', byePlayer.id);
                 divisionPlayers = divisionPlayers.filter(p => p.id !== byePlayer.id);
            }
        }

        let divisionMatches: TablesInsert<'matches'>[] = [];
        switch (rule.pairingMethod) {
            case 'Chew Pairings':
                divisionMatches = await _pairChew(tournamentId, roundToPair, divisionPlayers, standings, rule);
                break;
            case 'Swiss':
                divisionMatches = await _pairSwiss(tournamentId, roundToPair, divisionPlayers, standings, rule);
                break;
            case 'King of the Hill':
                divisionMatches = await _pairKoth(tournamentId, roundToPair, divisionPlayers, standings);
                break;
            case 'Australian Draw':
            case 'Quartiles':
                divisionMatches = await _pairAustralianDraw(tournamentId, roundToPair, divisionPlayers, rule);
                break;
            // ... other cases for other algorithms
            default:
                console.warn(`Pairing method "${rule.pairingMethod}" not implemented, using Swiss as fallback.`);
                divisionMatches = await _pairSwiss(tournamentId, roundToPair, divisionPlayers, standings, rule);
        }
        matchesToInsert.push(...divisionMatches);
    }
    
    if (matchesToInsert.length === 0) return [];
    
    const { data, error } = await supabase.from('matches').insert(matchesToInsert).select();
    if (error) { console.error("Error inserting new matches:", error); throw error; }
    
    const playerMap = new Map<number, Player>(allPlayers.map(p => [p.id, p]));
    return data.map(row => mapMatchFromDb(row, playerMap));
};