import React, { useState, useEffect } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import * as api from '../services/apiService';
import { Tournament } from '../types';
import SkeletonLoader from '../components/SkeletonLoader';

interface TDPanelLayoutProps {
    onLogout: () => void;
}

export type TDPanelContextType = {
    tournament: Tournament | null;
    isHeadTd: boolean;
};

const TDPanelLayout: React.FC<TDPanelLayoutProps> = ({ onLogout }) => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const { tournamentId } = useParams<{ tournamentId: string }>();
    const navigate = useNavigate();

    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [isHeadTd, setIsHeadTd] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tournamentId) {
            setLoading(false);
            return;
        }

        const fetchLayoutData = async () => {
            setLoading(true);
            try {
                const [tData, isHead] = await Promise.all([
                    api.getTournament(tournamentId),
                    api.isHeadTd(tournamentId)
                ]);

                if (!tData) {
                    navigate('/dashboard'); // Redirect if tournament not found or not authorized
                    return;
                }
                
                setTournament(tData);
                setIsHeadTd(isHead);
            } catch (error) {
                console.error("Failed to fetch layout data", error);
                navigate('/dashboard');
            } finally {
                setLoading(false);
            }
        };

        fetchLayoutData();
    }, [tournamentId, navigate]);
    
    return (
        <div className="flex h-screen bg-slate-900 text-gray-100">
            <div className="no-print">
                <Sidebar 
                    isOpen={isSidebarOpen} 
                    setIsOpen={setSidebarOpen} 
                    onLogout={onLogout}
                    tournament={tournament}
                    userIsHeadTd={isHeadTd}
                />
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="no-print">
                    <Header toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
                </div>
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    {loading ? (
                        <div className="p-4 md:p-8">
                            <SkeletonLoader className="h-10 w-72 mb-2" />
                            <SkeletonLoader className="h-6 w-96 mb-8" />
                        </div>
                    ) : (
                        <Outlet context={{ tournament, isHeadTd }} />
                    )}
                </main>
            </div>
        </div>
    );
};

export default TDPanelLayout;
