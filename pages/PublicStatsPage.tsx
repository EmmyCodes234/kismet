import React, { useState, useEffect, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import * as api from '../services/apiService';
import { Tournament, TournamentLeader } from '../types';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';
import SkeletonLoader from '../components/SkeletonLoader';

const StatCard: React.FC<TournamentLeader> = ({ title, value, playerA, playerB, round, details }) => {
    const { tournament } = useOutletContext<{ tournament: Tournament }>();
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

const PublicStatsSkeleton: React.FC = () => (
    <div className="max-w-6xl mx-auto">
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
        <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-white">Tournament Leaders</h1>
            <p className="text-gray-400 mt-1 mb-8">Statistical highlights from {tournament?.name}</p>

            {leaders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {leaders.map(stat => <StatCard key={stat.title} {...stat} />)}
                </div>
            ) : (
                <div className="bg-slate-800 rounded-lg p-6 text-center text-gray-400">
                    <p>Complete the first round to see statistical leaders.</p>
                </div>
            )}
        </div>
    );
};

export default PublicStatsPage;