import React, { useState, useEffect, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from './services/supabaseClient';

// Layouts
import TDPanelLayout from './layouts/TDPanelLayout';
import PublicLayout from './layouts/PublicLayout';

// Core Pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignUpPage = lazy(() => import('./pages/SignUpPage'));
const UserDashboardPage = lazy(() => import('./pages/UserDashboardPage'));
const TrashPage = lazy(() => import('./pages/TrashPage'));

// Tournament Setup Flow Pages
const CreateTournamentPage = lazy(() => import('./pages/CreateTournamentPage'));
const AddPlayersPage = lazy(() => import('./pages/AddPlayersPage'));
const ManageTeamsPage = lazy(() => import('./pages/ManageTeamsPage'));
const PairingWizardPage = lazy(() => import('./pages/PairingWizardPage'));

// Tournament Management Pages
const TournamentDashboardPage = lazy(() => import('./pages/TournamentDashboardPage'));
const PlayersPage = lazy(() => import('./pages/PlayersPage'));
const PairingsPage = lazy(() => import('./pages/PairingsPage'));
const StandingsPage = lazy(() => import('./pages/StandingsPage'));
const BatchScoreEntryPage = lazy(() => import('./pages/BatchScoreEntryPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'));
const RatingsReportPage = lazy(() => import('./pages/RatingsReportPage'));
const ProfileSettingsPage = lazy(() => import('./pages/ProfileSettingsPage'));
const WallChartPage = lazy(() => import('./pages/WallChartPage'));

// Public Pages
const PublicHomePage = lazy(() => import('./pages/PublicHomePage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const PublicStatsPage = lazy(() => import('./pages/PublicStatsPage'));
const PlayerScorecardPage = lazy(() => import('./pages/PlayerScorecardPage'));
const PlayerMatchupPage = lazy(() => import('./pages/PlayerMatchupPage'));

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const PrivateRoutes: React.FC = () => {
    return session ? <Outlet /> : <Navigate to="/login" />;
  };

  const LoadingFallback: React.FC = () => (
    <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
      Loading...
    </div>
  );

  if (loading) {
    return <LoadingFallback />;
  }

  return (
    <div className="dark">
      <HashRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={session ? <Navigate to="/dashboard" /> : <LoginPage />} />
            <Route path="/signup" element={session ? <Navigate to="/dashboard" /> : <SignUpPage />} />
            <Route path="/public/t/:slug" element={<PublicLayout />}>
              <Route index element={<PublicHomePage />} />
              <Route path="players" element={<PlayersPage isPublic />} />
              <Route path="player/:playerId" element={<PlayerScorecardPage isPublic />} />
              <Route path="pairings" element={<PairingsPage isPublic />} />
              <Route path="standings" element={<StandingsPage isPublic />} />
              <Route path="stats" element={<StatsPage />} />
              <Route path="matchup" element={<PlayerMatchupPage />} />
              <Route path="leaders" element={<PublicStatsPage />} />
            </Route>

            {/* Private Routes */}
            <Route element={<PrivateRoutes />}>
              <Route path="/dashboard" element={<UserDashboardPage onLogout={handleLogout} />} />
              <Route path="/trash" element={<TrashPage />} />
              <Route path="/profile-settings" element={<ProfileSettingsPage />} />
              <Route path="/create-tournament" element={<CreateTournamentPage />} />
              
              {/* Tournament Setup Flow - No Sidebar Layout */}
              <Route path="/tournament/:tournamentId/add-players" element={<AddPlayersPage />} />
              <Route path="/tournament/:tournamentId/manage-teams" element={<ManageTeamsPage />} />
              <Route path="/tournament/:tournamentId/pairing-scheduler" element={<PairingWizardPage />} />

              {/* Main Tournament Management - With Sidebar Layout */}
              <Route path="/tournament/:tournamentId" element={<TDPanelLayout onLogout={handleLogout} />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<TournamentDashboardPage />} />
                <Route path="players" element={<PlayersPage />} />
                <Route path="pairings" element={<PairingsPage />} />
                <Route path="standings" element={<StandingsPage />} />
                <Route path="enter-scores" element={<BatchScoreEntryPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="audit-log" element={<AuditLogPage />} />
                <Route path="ratings-report" element={<RatingsReportPage />} />
                <Route path="wall-chart" element={<WallChartPage />} />
                <Route path="player/:playerId" element={<PlayerScorecardPage />} />
              </Route>
            </Route>

            <Route path="/" element={<Navigate to={session ? '/dashboard' : '/login'} />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </div>
  );
};

export default App;
