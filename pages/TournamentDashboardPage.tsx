import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate, useOutletContext } from 'react-router-dom';
import * as api from '../services/apiService';
import { Standing, Tournament } from '../types';
import DashboardCard from '../components/DashboardCard';
import ClinchIndicator from '../components/ClinchIndicator';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';
import SkeletonLoader from '../components/SkeletonLoader';
import { TDPanelContextType } from '../layouts/TDPanelLayout';

const DashboardSkeleton: React.FC = () => (
  <>
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
      <div>
        <SkeletonLoader className="h-10 w-72 mb-2" />
        <SkeletonLoader className="h-6 w-48" />
      </div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <DashboardCard title="Live Standings" className="lg:col-span-2">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-sm text-gray-400">
                <th className="p-2 w-16"><SkeletonLoader className="h-5" /></th>
                <th className="p-2"><SkeletonLoader className="h-5" /></th>
                <th className="p-2 w-24"><SkeletonLoader className="h-5" /></th>
                <th className="p-2 w-24"><SkeletonLoader className="h-5" /></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t border-slate-700">
                  <td className="p-2"><SkeletonLoader className="h-6" /></td>
                  <td className="p-2"><SkeletonLoader className="h-6" /></td>
                  <td className="p-2"><SkeletonLoader className="h-6" /></td>
                  <td className="p-2"><SkeletonLoader className="h-6" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>
      <div className="space-y-6">
        <DashboardCard title="Status">
          <div className="space-y-4">
            <SkeletonLoader className="h-7 w-3/4" />
            <SkeletonLoader className="h-7 w-1/2" />
            <SkeletonLoader className="h-7 w-2/3" />
          </div>
        </DashboardCard>
        <DashboardCard title="Actions">
          <div className="space-y-4">
            <SkeletonLoader className="h-12 w-full" />
            <SkeletonLoader className="h-12 w-full" />
            <SkeletonLoader className="h-12 w-full" />
          </div>
        </DashboardCard>
      </div>
    </div>
  </>
);


const TournamentDashboardPage: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { tournament, isHeadTd: isUserHeadTd } = useOutletContext<TDPanelContextType>();
  const navigate = useNavigate();
  
  const [standings, setStandings] = useState<Standing[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [pendingMatches, setPendingMatches] = useState(0);
  const [pairedMatchesCount, setPairedMatchesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pairing, setPairing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedDivisionId, setSelectedDivisionId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    if (!tournamentId || !tournament) return;
    try {
      const [standingsData, matchesData] = await Promise.all([
        api.getStandings(tournamentId),
        api.getMatches(tournamentId)
      ]);
      setStandings(standingsData);
      
      const latestRound = matchesData.length > 0 ? Math.max(...matchesData.map(m => m.round)) : 0;
      setCurrentRound(latestRound);
      
      const totalPending = matchesData.filter(m => m.status === 'pending').length;
      setPendingMatches(totalPending);
      setPairedMatchesCount(matchesData.length);

      if (tournament.divisions && tournament.divisions.length > 0 && !selectedDivisionId) {
          setSelectedDivisionId(tournament.divisions[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [tournamentId, tournament, selectedDivisionId]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  useRealtimeUpdates(fetchData);

  const handleManualPairing = async () => {
    if (!tournamentId || !tournament) return;
    const nextRound = currentRound + 1;
    if (window.confirm(`This will manually override the schedule and pair Round ${nextRound}. Are you sure?`)) {
        setPairing(true);
        try {
            await api.manuallyPairRound(tournamentId, nextRound);
            await fetchData();
            navigate(`/tournament/${tournamentId}/pairings`);
        } catch(error) {
            console.error("Failed to pair next round", error);
            alert((error as Error).message || "An error occurred during pairing.");
        } finally {
            setPairing(false);
        }
    }
  };
  
  const handleExport = async () => {
    if (!tournamentId || !tournament) return;
    setExporting(true);
    try {
        for (const division of tournament.divisions) {
            const touContent = await api.generateTouFileContent(tournamentId, division.id);
            const blob = new Blob([touContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const divisionName = division.name.replace(/\s+/g, '_');
            link.download = `${divisionName}.TOU`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    } catch (error) {
        console.error("Failed to generate .TOU file:", error);
        alert(`An error occurred during export: ${(error as Error).message}`);
    } finally {
        setExporting(false);
    }
  };

  const isComplete = (tournament?.totalRounds ?? 0) > 0 && currentRound >= (tournament?.totalRounds || 0) && pendingMatches === 0;
  
  const getEffectiveStatus = () => {
      if (!tournament) return 'Not Started';
      if (isComplete) return 'Completed';
      if (tournament.status === 'In Progress' && currentRound > 0 && pairedMatchesCount > 0 && pendingMatches === pairedMatchesCount) return 'Not Started';
      return tournament.status;
  };

  const tournamentStatus = getEffectiveStatus();
  const isPairingDisabled = !isUserHeadTd || pendingMatches > 0 || isComplete || pairing;
  
  const filteredStandings = standings.filter(s => selectedDivisionId ? s.player.divisionId === selectedDivisionId : true);
  
  const statusPill = (status: ReturnType<typeof getEffectiveStatus>) => {
    if (status === 'In Progress') {
        return (
            <span className="px-3 py-1 text-sm font-semibold rounded-full inline-flex items-center gap-2 bg-green-500/20 text-green-300">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>In Progress
            </span>
        );
    }
    if (status === 'Completed') {
        return (
            <span className="px-3 py-1 text-sm font-semibold rounded-full inline-flex items-center gap-2 bg-cool-blue-500/20 text-cool-blue-300">
                <span className="h-2 w-2 rounded-full bg-cool-blue-400"></span>Completed
            </span>
        );
    }
    return (
        <span className="px-3 py-1 text-sm font-semibold rounded-full inline-flex items-center gap-2 bg-yellow-500/20 text-yellow-300">
            <span className="h-2 w-2 rounded-full bg-yellow-400"></span>Not Started
        </span>
    );
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">{tournament?.name}</h1>
            <p className="text-lg text-gray-400">Tournament Dashboard</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DashboardCard title="Live Standings" className="lg:col-span-2">
            {tournament && tournament.divisions.length > 1 && (
            <div className="flex border-b border-slate-700 mb-4">
                {tournament.divisions.map(div => (
                    <button 
                        key={div.id}
                        onClick={() => setSelectedDivisionId(div.id)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${selectedDivisionId === div.id ? 'border-b-2 border-cool-blue-400 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        {div.name}
                    </button>
                ))}
            </div>
        )}
        <div className="overflow-x-auto">
            <table className="w-full text-left">
            <thead>
                <tr className="text-sm text-gray-400">
                <th className="p-2">Rank</th>
                <th className="p-2">Player</th>
                <th className="p-2 text-center">Record</th>
                <th className="p-2 text-right">Spread</th>
                </tr>
            </thead>
            <tbody className="text-gray-200">
                {filteredStandings.slice(0, 10).map((s) => (
                <tr key={s.player.id} className="border-t border-slate-700">
                    <td className="p-2 font-bold text-cool-blue-400">{s.rank}</td>
                    <td className="p-2 text-white">
                    <div className="flex items-center">
                        <span>{s.player.name}</span>
                        {s.clinchStatus === 'clinched' && <ClinchIndicator />}
                    </div>
                    </td>
                    <td className="p-2 text-center font-mono">{`${s.wins}-${s.losses}`}</td>
                    <td className="p-2 text-right font-mono">{s.cumulativeSpread > 0 ? `+${s.cumulativeSpread}` : s.cumulativeSpread}</td>
                </tr>
                ))}
            </tbody>
            </table>
            {filteredStandings.length === 0 && <p className="p-4 text-center text-gray-400">No players in this division.</p>}
            {standings.length > 10 && <Link to={`/tournament/${tournamentId}/standings`} className="text-cool-blue-400 hover:underline mt-4 block text-center">View All Standings</Link>}
        </div>
        </DashboardCard>

        <div className="space-y-6">
        <DashboardCard title="Status">
            <div className="space-y-4 text-lg">
                <div className="flex items-center gap-3">
                    <strong>Status:</strong>
                    {statusPill(tournamentStatus)}
                </div>
                <p><strong>Last Paired:</strong> <span className="font-mono text-cool-blue-300">Round {currentRound || 0} / {tournament?.totalRounds || 0}</span></p>
                <p><strong>Pending Results:</strong> <span className="font-mono text-yellow-400">{pendingMatches}</span></p>
            </div>
        </DashboardCard>
        <DashboardCard title="Actions">
            <div className="space-y-4">
                {tournamentStatus !== 'Not Started' && 
                    <Link to={`/tournament/${tournamentId}/enter-scores`} className="block w-full text-center bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 px-4 rounded-lg transition duration-200">Enter Scores</Link>
                }
                <div>
                    <button onClick={handleManualPairing} disabled={isPairingDisabled} className="w-full text-center bg-cool-blue-600 hover:bg-cool-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 disabled:bg-slate-700 disabled:cursor-not-allowed">
                        {pairing ? 'Pairing...' : `Manually Pair Round ${currentRound + 1}`}
                    </button>
                    {isPairingDisabled && !isComplete && pendingMatches > 0 && <p className="text-xs text-yellow-400 text-center mt-2">Enter all pending scores before pairing the next round.</p>}
                    {!isUserHeadTd && <p className="text-xs text-yellow-400 text-center mt-2">Only the Head TD can pair rounds.</p>}
                </div>
                <button 
                    onClick={handleExport}
                    disabled={tournamentStatus !== 'Completed' || exporting}
                    className="w-full text-center bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 px-4 rounded-lg transition duration-200 disabled:bg-slate-700 disabled:cursor-not-allowed"
                >
                    {exporting ? 'Exporting...' : 'Export Tournament (.TOU)'}
                </button>
            </div>
        </DashboardCard>
        </div>
      </div>
    </>
  );
};

export default TournamentDashboardPage;
