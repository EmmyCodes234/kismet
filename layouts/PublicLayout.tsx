import React, { useState, useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import { Tournament } from '../types';
import * as api from '../services/apiService';

const PublicLayout: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTournamentBySlug = async () => {
            if (!slug) return;
            setLoading(true);
            setError(null);
            try {
                const data = await api.getTournamentBySlug(slug);
                if (data) {
                    setTournament(data);
                } else {
                    setError('Tournament not found. Please check the URL.');
                }
            } catch (err) {
                setError('Failed to load tournament data.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchTournamentBySlug();
    }, [slug]);

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen bg-slate-900 text-gray-100">
                <PublicHeader tournament={null} />
                <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
                    <p>Loading Tournament...</p>
                </main>
            </div>
        );
    }
    
    if (error || !tournament) {
         return (
            <div className="flex flex-col min-h-screen bg-slate-900 text-gray-100">
                <PublicHeader tournament={null} />
                <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
                    <p className="text-red-400">{error || 'Could not load tournament.'}</p>
                </main>
            </div>
        );
    }


    return (
        <div className="flex flex-col min-h-screen bg-slate-900 text-gray-100">
            <PublicHeader tournament={tournament} />
            <main className="flex-1 p-4 md:p-8">
                <Outlet context={{ tournament }} />
            </main>
        </div>
    );
};

export default PublicLayout;