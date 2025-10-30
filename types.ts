export type Discipline = 'Scrabble';
export type PairingMethod = 'Swiss' | 'Round Robin' | 'King of the Hill' | 'Australian Draw' | 'Chew Pairings' | 'Initial Fontes' | 'Quartiles';
export type TieBreakMethod = 'cumulativeSpread' | 'buchholz' | 'rating' | 'medianBuchholz';
export type TournamentMode = 'individual' | 'team';
export type UserRole = 'head' | 'assistant';

export interface Administrator {
  username: string;
  role: UserRole;
}

export interface Division {
  id: number;
  name: string;
  ratingFloor: number;
  ratingCeiling: number;
}

export interface Class {
  id: number;
  name: string; // e.g., 'A', 'B', 'C'
  ratingFloor: number;
  ratingCeiling: number;
}

export interface PostTournamentRating {
  playerId: number;
  playerName: string;
  divisionId: number;
  oldRating: number;
  newRating: number;
  change: number;
  performanceRating: number;
}

export interface Team {
  id: number;
  name: string;
}

export interface Player {
  id: number;
  name: string;
  rating: number;
  seed: number;
  byeRounds: number[];
  status: 'active' | 'withdrawn';
  divisionId: number | null;
  classId: number | null;
  teamId: number | null;
}

export interface Match {
  id: number;
  tournamentId: string;
  round: number;
  playerA: Player;
  playerB: Player | null; // null for a bye
  scoreA: number | null;
  scoreB: number | null;
  status: 'pending' | 'completed';
  isForfeit?: boolean;
  forfeitedPlayerId?: number | null;
  firstTurnPlayerId?: number | null;
}

export interface LastGameInfo {
  round: number;
  result: 'W' | 'L' | 'T' | 'B' | 'F'; // Win, Loss, Tie, Bye, Forfeit
  playerScore: number;
  opponentScore: number;
  opponentSeed: number | null;
}


export interface Standing {
  rank: number;
  player: Player;
  score: number;
  wins: number;
  losses: number;
  cumulativeSpread: number;
  buchholz: number;
  medianBuchholz: number;
  lastGame: LastGameInfo | null;
  currentRating?: number;
  ratingChangeSinceStart?: number;
  clinchStatus?: 'clinched';
  teamName?: string;
}

export interface TeamStanding {
  rank: number;
  team: Team;
  totalScore: number;
  contributingPlayers: Standing[];
  totalCumulativeSpread: number;
}

export interface PairingRule {
    id: number;
    startRound: number;
    endRound: number;
    pairingMethod: PairingMethod;
    standingsSource: 'PreviousRound' | 'Lagged' | 'Round0';
    allowedRepeats: number;
    quartilePairingScheme?: '1v3_2v4' | '1v2_3v4';
}


export interface Tournament {
  id:string;
  slug: string;
  name: string;
  discipline: Discipline;
  totalRounds: number;
  status: 'Not Started' | 'In Progress' | 'Completed';
  playerCount: number;
  roundRobinPlaysPerOpponent: number;
  tieBreakOrder: TieBreakMethod[];
  divisionMode: 'single' | 'multiple';
  divisions: Division[];
  classes: Class[];
  byeAssignmentMethod?: string;
  byeSpread: number;
  scoring?: {
    win: number;
    draw: number;
    loss: number;
  };
  ratingsSystemSettings?: {
    kFactor: number;
  };
  postTournamentRatings?: PostTournamentRating[];
  gibsonRounds?: number;
  forfeitWinScore?: number;
  forfeitLossScore?: number;
  // New properties for advanced features
  tournamentMode: TournamentMode;
  administrators: Administrator[];
  teams: Team[];
  teamSettings: {
    topPlayersCount: number;
    displayTeamNames: boolean;
    preventTeammatePairings_AllRounds: boolean;
    preventTeammatePairings_InitialRounds: number;
  };
  publicPortalSettings: {
    bannerUrl: string;
    welcomeMessage: string;
  };
  deleted_at?: string;
}

export interface AuditLog {
  id: number;
  tournamentId: string;
  action: string;
  timestamp: string;
  details: string;
}

export interface PlayerScorecardData {
  player: Player;
  standing: Standing | null;
  matches: Match[];
}

export interface UserProfile {
  displayName: string;
  bio: string;
  countryCode: string; // e.g., 'us', 'ng'
  avatarUrl?: string | null;
}

export interface GlobalStats {
  totalPlayersManaged: number;
  totalMatchesRecorded: number;
  completedTournaments: number;
  tournamentsInProgress: number;
}


// For Gemini Report
export interface TournamentData {
  tournament: Tournament;
  standings: Standing[];
  matches: Match[];
}

export interface PlayerMatchup {
    playerA: Player;
    playerB: Player;
    winsA: number;
    winsB: number;
    draws: number;
    matches: Match[];
}

export interface TournamentLeader {
  title: string;
  value: string | number;
  playerA: Player;
  playerB?: Player | null;
  round?: number;
  details?: string;
}


// For kismet.conf file
export interface KismetConfPlayer {
    name: string;
    rating: number;
    seed: number;
    teamName?: string;
}

export interface KismetConf {
  tournament_metadata: Partial<Tournament>;
  players: KismetConfPlayer[];
  pairing_schedule: Omit<PairingRule, 'id'>[];
}