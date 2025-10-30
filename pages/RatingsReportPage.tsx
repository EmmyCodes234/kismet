import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import * as api from '../services/apiService';
import { Tournament, PostTournamentRating } from '../types';
import SkeletonLoader from '../components/SkeletonLoader';
import { TDPanelContextType } from '../layouts/TDPanelLayout';

const RatingsReportSkeleton: React.FC = () => (
    <div className="p-4 md:p-8">
        <SkeletonLoader className="h-10 w-72 mb-2" />
        <SkeletonLoader className="h-5 w-96 mb-8" />
        <div className="space-y-8">
            <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
                <div className="p-4 bg-slate-900/50">
                    <SkeletonLoader className="h-8 w-1/3" />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-sm text-gray-400">
                            <tr>
                                <th className="p-3"><SkeletonLoader className="h-5 w-1/2" /></th>
                                <th className="p-3"><SkeletonLoader className="h-5 w-1/4" /></th>
                                <th className="p-3"><SkeletonLoader className="h-5 w-1/4" /></th>
                                <th className="p-3"><SkeletonLoader className="h-5 w-1/4" /></th>
                                <th className="p-3"><SkeletonLoader className="h-5 w-1/4" /></th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="border-t border-slate-700">
                                    <td className="p-3"><SkeletonLoader className="h-6" /></td>
                                    <td className="p-3"><SkeletonLoader className="h-6" /></td>
                                    <td className="p-3"><SkeletonLoader className="h-6" /></td>
                                    <td className="p-3"><SkeletonLoader className="h-6" /></td>
                                    <td className="p-3"><SkeletonLoader className="h-6" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
);

const RatingsReportPage: React.FC = () => {
    const { tournament } = useOutletContext<TDPanelContextType>();
    const [loading, setLoading] = useState(false); // Loading is faster as data comes from context

    if (loading) {
        return <RatingsReportSkeleton />;
    }

    if (!tournament) {
        return <div className="p-8 text-center text-red-400">Tournament not found.</div>;
    }
    
    if (!tournament.postTournamentRatings || tournament.postTournamentRatings.length === 0) {
        return (
            <div className="p-8 text-center">
                 <h1 className="text-3xl md:text-4xl font-bold text-white">Ratings Report</h1>
                 <p className="text-gray-400 mt-1 mb-8">{tournament.name}</p>
                 <div className="bg-slate-800 rounded-lg p-6 text-gray-400">
                    This tournament has not been finalized yet, or no rating changes were calculated.
                 </div>
            </div>
        )
    }

    const ratingsByDivision = tournament.postTournamentRatings.reduce<Record<number, PostTournamentRating[]>>((acc, rating) => {
        const divisionId = rating.divisionId;
        if (!acc[divisionId]) {
            acc[divisionId] = [];
        }
        acc[divisionId].push(rating);
        return acc;
    }, {});


    return (
        <div className="p-4 md:p-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white">Ratings Report</h1>
            <p className="text-gray-400 mt-1 mb-8">{tournament.name}</p>

            <div className="space-y-8">
                {tournament.divisions.map(division => {
                    const ratings = ratingsByDivision[division.id];
                    if (!ratings) return null;

                    return (
                        <div key={division.id} className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
                             <h2 className="text-2xl font-semibold text-white p-4 bg-slate-900/50">{division.name}</h2>
                             <div className="overflow-x-auto">
                                <table className="w-full text-left responsive-table">
                                    <thead className="text-sm text-gray-400">
                                        <tr>
                                            <th className="p-3">Player</th>
                                            <th className="p-3 text-right">Old Rating</th>
                                            <th className="p-3 text-right">New Rating</th>
                                            <th className="p-3 text-right">Change</th>
                                            <th className="p-3 text-right">Perf. Rating</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-gray-200">
                                        {ratings.sort((a,b) => b.newRating - a.newRating).map(r => (
                                            <tr key={r.playerId} className="border-t border-slate-700">
                                                <td data-label="Player" className="p-3 font-medium">{r.playerName}</td>
                                                <td data-label="Old Rating" className="p-3 text-right font-mono text-gray-400">{r.oldRating}</td>
                                                <td data-label="New Rating" className="p-3 text-right font-mono text-white font-bold">{r.newRating}</td>
                                                <td data-label="Change" className={`p-3 text-right font-mono font-bold ${r.change > 0 ? 'text-green-400' : r.change < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                                    {r.change > 0 ? `+${r.change}` : r.change}
                                                </td>
                                                <td data-label="Perf. Rating" className="p-3 text-right font-mono text-cool-blue-300">{r.performanceRating}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

export default RatingsReportPage;
