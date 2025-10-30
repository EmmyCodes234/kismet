import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../services/apiService';
import { Tournament, UserProfile, GlobalStats } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';

interface UserDashboardProps {
    onLogout: () => void;
}

// --- Skeleton Components for Loading State ---

const StatCardSkeleton: React.FC = () => (
    <div className="bg-slate-800/50 p-4 rounded-lg text-center animate-pulse">
        <div className="h-8 bg-slate-700 rounded w-1/2 mx-auto mb-2"></div>
        <div className="h-4 bg-slate-700 rounded w-3/4 mx-auto"></div>
    </div>
);

const TournamentSnapshotCardSkeleton: React.FC = () => (
    <div className="bg-slate-800 p-5 rounded-lg border border-slate-700 animate-pulse">
        <div className="flex justify-between items-center mb-3">
            <div className="h-5 bg-slate-700 rounded w-3/4"></div>
            <div className="h-5 bg-slate-700 rounded w-1/4"></div>
        </div>
        <div className="space-y-2">
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            <div className="h-4 bg-slate-700 rounded w-1/3"></div>
            <div className="h-4 bg-slate-700 rounded w-1/4"></div>
        </div>
    </div>
);

const TournamentListItemSkeleton: React.FC = () => (
    <li className="flex justify-between items-center p-4 animate-pulse">
        <div>
            <div className="h-5 bg-slate-700 rounded w-48 mb-2"></div>
            <div className="h-4 bg-slate-700 rounded w-24"></div>
        </div>
        <div className="h-5 bg-slate-700 rounded w-32"></div>
    </li>
);

// --- Actual Components ---

const StatCard: React.FC<{ value: string | number, label: string }> = ({ value, label }) => (
    <div className="bg-slate-800/50 p-4 rounded-lg text-center">
        <p className="text-3xl font-bold text-white">{value}</p>
        <p className="text-sm text-gray-400">{label}</p>
    </div>
);

const TournamentSnapshotCard: React.FC<{ tournament: Tournament; onDelete: (e: React.MouseEvent, tournamentId: string) => void; }> = ({ tournament, onDelete }) => (
     <div className="relative group bg-slate-800 rounded-lg border border-slate-700 hover:border-cool-blue-500 transition-colors duration-200">
        <Link to={`/tournament/${tournament.id}/dashboard`} className="block p-5">
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-cool-blue-300 pr-8">{tournament.name}</h3>
                <span className="text-xs font-mono bg-slate-700 px-2 py-1 rounded flex-shrink-0">{tournament.status}</span>
            </div>
            <div className="text-sm text-gray-400 space-y-1">
                <p><strong>{tournament.playerCount}</strong> Players</p>
                <p><strong>{tournament.totalRounds}</strong> Rounds</p>
                <p><strong>Method:</strong> {tournament.pairingMethod}</p>
            </div>
        </Link>
        <button 
            onClick={(e) => onDelete(e, tournament.id)} 
            className="absolute bottom-4 right-4 p-2 rounded-full text-gray-500 hover:bg-red-900/50 hover:text-red-300 transition-colors"
            aria-label={`Move ${tournament.name} to trash`}
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
    </div>
);


const UserDashboardPage: React.FC<UserDashboardProps> = ({ onLogout }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [modalState, setModalState] = useState<{ isOpen: boolean; tournamentId: string | null }>({ isOpen: false, tournamentId: null });


  const fetchDashboardData = async () => {
      setLoadingDashboard(true);
      try {
        const [tournamentsData, statsData] = await Promise.all([
          api.getTournaments(),
          api.getGlobalUserStats(),
        ]);
        setTournaments(tournamentsData || []);
        setStats(statsData);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoadingDashboard(false);
      }
    };


  useEffect(() => {
    const initialLoad = async () => {
        setLoadingProfile(true);
        try {
            const profileData = await api.getUserProfile();
            setProfile(profileData);
        } catch (error) {
            console.error("Failed to load profile data", error);
        } finally {
            setLoadingProfile(false);
        }

        // Run health check and then fetch dashboard data
        setLoadingDashboard(true);
        try {
            await api.checkAndFixTournamentStatuses(); // The new function call
            // Now fetch the (potentially updated) dashboard data
            await fetchDashboardData();
        } catch (error) {
            console.error("Failed to check statuses or load dashboard data", error);
            setLoadingDashboard(false); // Ensure loader is turned off on error
        }
    };

    initialLoad();
  }, []);

  const handleDeleteClick = (e: React.MouseEvent, tournamentId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setModalState({ isOpen: true, tournamentId });
  };

  const handleConfirmDelete = async () => {
    if (modalState.tournamentId) {
        await api.softDeleteTournament(modalState.tournamentId);
        setModalState({ isOpen: false, tournamentId: null });
        fetchDashboardData(); // Refresh the list
    }
  };

  if (loadingProfile) {
      return <div className="flex items-center justify-center h-screen bg-slate-900 text-white">Loading Profile...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
        <header className="bg-slate-800/80 backdrop-blur-sm p-4 flex items-center justify-between border-b border-slate-700 sticky top-0 z-10">
             <h1 className="text-xl font-bold text-white tracking-wider">Kismet</h1>
             <div className="flex items-center gap-4">
                 <Link to="/profile-settings" title="Profile Settings">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 hover:text-white transition" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                 </Link>
                 <button onClick={onLogout} className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg">Logout</button>
             </div>
        </header>

        <main className="p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                {/* Profile Header */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6 mb-8">
                    <div className="w-24 h-24 rounded-full bg-slate-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
                       {profile?.avatarUrl ? (
                            <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" />
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-slate-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                        )}
                    </div>
                    <div>
                        <div className="flex items-center justify-center sm:justify-start gap-3">
                            <h2 className="text-2xl sm:text-3xl font-bold">{profile?.displayName}</h2>
                            {profile?.countryCode && (
                                <img 
                                    src={`https://flagcdn.com/w40/${profile.countryCode.toLowerCase()}.png`} 
                                    width="30" 
                                    alt={`${profile.countryCode} flag`}
                                    className="rounded-sm"
                                    />
                            )}
                        </div>
                        <p className="text-gray-400 mt-1">{profile?.bio}</p>
                    </div>
                </div>
                
                {/* Stats Grid */}
                {loadingDashboard ? (
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                    </div>
                ) : stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                        <StatCard value={stats.totalPlayersManaged} label="Total Players" />
                        <StatCard value={stats.totalMatchesRecorded} label="Matches Recorded" />
                        <StatCard value={stats.completedTournaments} label="Tournaments Completed" />
                        <StatCard value={stats.tournamentsInProgress} label="Tournaments In Progress" />
                    </div>
                )}

                {/* Recent Tournaments */}
                 <div className="mb-10">
                    <h3 className="text-2xl font-bold mb-4">Recent Tournaments</h3>
                     {loadingDashboard ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <TournamentSnapshotCardSkeleton />
                           <TournamentSnapshotCardSkeleton />
                        </div>
                     ) : tournaments.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {tournaments.slice(0, 4).map(t => <TournamentSnapshotCard key={t.id} tournament={t} onDelete={handleDeleteClick} />)}
                        </div>
                    ) : (
                        <p className="text-gray-500">No tournaments managed yet.</p>
                    )}
                 </div>


                {/* All Tournaments List */}
                 <div>
                     <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-4">
                            <h3 className="text-2xl font-bold">All Tournaments</h3>
                            <Link to="/trash" className="text-sm text-gray-400 hover:text-cool-blue-400 hover:underline">View Trash</Link>
                        </div>
                        <Link
                            to="/create-tournament"
                            className="px-5 py-2 bg-cool-blue-600 text-white font-bold rounded-lg hover:bg-cool-blue-700 transition duration-200 text-center text-sm"
                        >
                            + New Tournament
                        </Link>
                    </div>
                    {loadingDashboard ? (
                        <div className="bg-slate-800 rounded-lg">
                           <ul className="divide-y divide-slate-700">
                                <TournamentListItemSkeleton />
                                <TournamentListItemSkeleton />
                                <TournamentListItemSkeleton />
                           </ul>
                        </div>
                    ) : tournaments.length > 0 ? (
                        <div className="bg-slate-800 rounded-lg">
                           <ul className="divide-y divide-slate-700">
                                {tournaments.map(t => (
                                    <li key={t.id}>
                                        <Link to={`/tournament/${t.id}/dashboard`} className="group flex justify-between items-center p-4 hover:bg-slate-700/50 rounded-lg">
                                            <div>
                                                <p className="font-semibold text-white">{t.name}</p>
                                                <p className="text-xs text-gray-400">{t.playerCount} players</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm font-mono text-gray-500 hidden sm:block">{t.status}</span>
                                                <button onClick={(e) => handleDeleteClick(e, t.id)} className="p-2 rounded-full text-gray-500 hover:bg-red-900/50 hover:text-red-300 transition-colors">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                                <span className="text-gray-600">&rarr;</span>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                           </ul>
                        </div>
                    ) : (
                         <div className="text-center bg-slate-800 p-12 rounded-lg border-2 border-dashed border-slate-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                            </svg>
                            <h3 className="mt-4 text-xl font-semibold text-white">No Tournaments Found</h3>
                            <p className="mt-2 text-gray-400">Get started by creating your first tournament.</p>
                        </div>
                    )}
                 </div>
            </div>
        </main>

        <ConfirmationModal
            isOpen={modalState.isOpen}
            onClose={() => setModalState({ isOpen: false, tournamentId: null })}
            onConfirm={handleConfirmDelete}
            title="Move to Trash?"
            message="This tournament will be moved to the trash. You can restore it for up to 30 days."
            confirmText="Move to Trash"
            isDestructive
        />
    </div>
  );
};

export default UserDashboardPage;