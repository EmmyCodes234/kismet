import React, { useState, useEffect, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import * as api from '../services/apiService';
import { Tournament, TournamentLeader } from '../types';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';
import PublicTournamentHeader from '../components/PublicTournamentHeader';
import SkeletonLoader from '../components/SkeletonLoader';

interface StatCardProps extends TournamentLeader {
    tournament: Tournament;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, playerA, playerB, round, details, tournament }) => {
    return (
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex flex-col">
            <p className="text-sm text-cool-blue-300 font-semibold">{title}</p>
            <p className="text-3xl font-bold text-white my-1">{value}</p>
            <div className="flex-grow">
                <Link to={`/public/t/${tournament.slug}/player/${playerA.id}`} className="text-sm text-gray-200 hover:text-cool-blue-400 hover:underline">{playerA.name}</Link>
                {playerB && <p className="text-sm text-gray-400">vs <Link to={`/public/t/${tournament.slug}/player/${playerB.id}`} className="hover:text-cool-blue-400 hover:underline">{playerB.name}</Link></p>}
            </div>
            {round && details && <p className="text-xs text-gray-500 mt-2">Round {round} - {details}</p>}
            {!round && details && <p className="text-xs text-gray-500 mt-2">{details}</p>}
        </div>
    )
};

interface MobileStatCardProps extends TournamentLeader {
    tournament: Tournament;
}

const MobileStatCard: React.FC<MobileStatCardProps> = ({ title, value, playerA, playerB, round, details, tournament }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div 
            className="md:hidden bg-slate-800 rounded-xl shadow-lg border border-slate-700 mb-4"
            onClick={() => setIsExpanded(!isExpanded)}
        >
            {/* Compact View (Always Visible) */}
            <div className="p-4">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm text-cool-blue-300 font-semibold">{title}</p>
                        <p className="text-2xl font-bold text-white my-1">{value}</p>
                    </div>
                    <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-5 w-5 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
                <div className="mt-2">
                    <Link to={`/public/t/${tournament.slug}/player/${playerA.id}`} className="text-sm text-gray-200 hover:text-cool-blue-400 hover:underline">{playerA.name}</Link>
                    {playerB && <p className="text-sm text-gray-400">vs <Link to={`/public/t/${tournament.slug}/player/${playerB.id}`} className="hover:text-cool-blue-400 hover:underline">{playerB.name}</Link></p>}
                </div>
            </div>

            {/* Expanded View (Hidden by default) */}
            {isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-700 pt-3">
                    {round && details && <p className="text-xs text-gray-500">Round {round} - {details}</p>}
                    {!round && details && <p className="text-xs text-gray-500">{details}</p>}
                </div>
            )}
        </div>
    )
};

const PublicStatsSkeleton: React.FC = () => (
    <div className="min-h-screen bg-slate-900">
        {/* Desktop Skeleton */}
        <div className="hidden md:block max-w-6xl mx-auto px-4 py-6">
            <SkeletonLoader className="h-10 w-80 mb-2" />
            <SkeletonLoader className="h-5 w-96 mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                        <SkeletonLoader className="h-5 w-1/2 mb-2" />
                        <SkeletonLoader className="h-8 w-1/3 mb-3" />
                        <SkeletonLoader className="h-4 w-3/4" />
                    </div>
                ))}
            </div>
        </div>
        
        {/* Mobile Skeleton */}
        <div className="md:hidden max-w-6xl mx-auto px-4 py-6">
            <SkeletonLoader className="h-8 w-64 mb-2" />
            <SkeletonLoader className="h-4 w-80 mb-6" />
            <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-4">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <SkeletonLoader className="h-4 w-32 mb-2" />
                                <SkeletonLoader className="h-6 w-16" />
                            </div>
                            <SkeletonLoader className="h-5 w-5 rounded-full" />
                        </div>
                        <SkeletonLoader className="h-4 w-24" />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const PublicStatsPage: React.FC = () => {
    const { tournament } = useOutletContext<{ tournament: Tournament }>();
    const tournamentId = tournament.id;

    const [leaders, setLeaders] = useState<TournamentLeader[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (tournamentId) {
            setLoading(true);
            try {
                setLeaders(await api.getTournamentLeaders(tournamentId));
            } catch(e) {
                console.error("Failed to get tournament leaders", e);
            } finally {
                setLoading(false);
            }
        }
    }, [tournamentId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useRealtimeUpdates(fetchData);

    if (loading) {
        return <PublicStatsSkeleton />;
    }

    return (
        <div className="min-h-screen bg-slate-900">
            <PublicTournamentHeader tournament={tournament} />
            
            <div className="max-w-6xl mx-auto px-4 py-6">
                <h1 className="text-2xl md:text-3xl font-bold text-white">Tournament Leaders</h1>
                <p className="text-gray-400 mt-1 mb-6">Statistical highlights from {tournament?.name}</p>

                {/* Mobile Cards */}
                <div className="md:hidden">
                    {leaders.map(stat => (
                        <MobileStatCard key={stat.title} {...stat} tournament={tournament} />
                    ))}
                    {leaders.length === 0 && (
                        <div className="bg-slate-800 rounded-xl p-6 text-center text-gray-400 border border-slate-700">
                            <p>Complete the first round to see statistical leaders.</p>
                        </div>
                    )}
                </div>

                {/* Desktop Cards */}
                <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {leaders.map(stat => (
                        <StatCard key={stat.title} {...stat} tournament={tournament} />
                    ))}
                    {leaders.length === 0 && (
                        <div className="bg-slate-800 rounded-lg p-6 text-center text-gray-400 col-span-full">
                            <p>Complete the first round to see statistical leaders.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PublicStatsPage;