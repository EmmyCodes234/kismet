import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../services/apiService';
import { Tournament } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';
import SkeletonLoader from '../components/SkeletonLoader';

const TrashPageSkeleton: React.FC = () => (
    <div className="max-w-4xl mx-auto">
        <SkeletonLoader className="h-10 w-48 mb-2" />
        <SkeletonLoader className="h-5 w-96 mb-8" />
        <div className="bg-slate-800 rounded-lg">
            <ul className="divide-y divide-slate-700">
                {Array.from({ length: 3 }).map((_, i) => (
                    <li key={i} className="flex justify-between items-center p-4 animate-pulse">
                        <div>
                            <SkeletonLoader className="h-5 w-48 mb-2" />
                            <SkeletonLoader className="h-4 w-64" />
                        </div>
                        <div className="flex gap-2">
                            <SkeletonLoader className="h-9 w-24" />
                            <SkeletonLoader className="h-9 w-24" />
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    </div>
);

const TrashPage: React.FC = () => {
    const [trashed, setTrashed] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalState, setModalState] = useState<{ isOpen: boolean; tournamentId: string | null; action: 'restore' | 'delete' }>({ isOpen: false, tournamentId: null, action: 'restore' });

    const fetchTrashed = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getTrashedTournaments();
            setTrashed(data);
        } catch (error) {
            console.error("Failed to fetch trashed tournaments:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTrashed();
    }, [fetchTrashed]);
    
    const openModal = (tournamentId: string, action: 'restore' | 'delete') => {
        setModalState({ isOpen: true, tournamentId, action });
    };

    const closeModal = () => {
        setModalState({ isOpen: false, tournamentId: null, action: 'restore' });
    };

    const handleConfirm = async () => {
        if (!modalState.tournamentId) return;
        
        if (modalState.action === 'restore') {
            await api.restoreTournament(modalState.tournamentId);
        } else if (modalState.action === 'delete') {
            await api.permanentlyDeleteTournament(modalState.tournamentId);
        }

        closeModal();
        fetchTrashed(); // Refresh list
    };
    
    if (loading) {
        return <div className="p-4 md:p-8"><TrashPageSkeleton /></div>;
    }

    return (
        <div className="p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl md:text-4xl font-bold text-white">Trash</h1>
                <p className="text-gray-400 mt-1 mb-8">Tournaments here will be permanently deleted after 30 days.</p>
                
                <div className="bg-slate-800 rounded-lg">
                   <ul className="divide-y divide-slate-700">
                        {trashed.map(t => (
                            <li key={t.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                <div>
                                    <p className="font-semibold text-white">{t.name}</p>
                                    <p className="text-xs text-gray-400">
                                        Moved to trash on {new Date(t.deleted_at!).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex gap-2 self-end sm:self-center">
                                    <button onClick={() => openModal(t.id, 'restore')} className="px-3 py-1.5 text-sm bg-slate-600 hover:bg-slate-500 rounded-lg">Restore</button>
                                    <button onClick={() => openModal(t.id, 'delete')} className="px-3 py-1.5 text-sm bg-red-800 hover:bg-red-700 rounded-lg">Delete Forever</button>
                                </div>
                            </li>
                        ))}
                   </ul>
                   {trashed.length === 0 && (
                        <div className="text-center p-12">
                            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <h3 className="mt-4 text-xl font-semibold text-white">Trash is Empty</h3>
                            <p className="mt-2 text-gray-400">Deleted tournaments will appear here.</p>
                             <Link to="/dashboard" className="mt-6 inline-block text-sm font-bold text-cool-blue-400 hover:underline">
                                &larr; Back to Dashboard
                            </Link>
                        </div>
                   )}
                </div>
            </div>
            
            <ConfirmationModal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                onConfirm={handleConfirm}
                title={modalState.action === 'restore' ? 'Restore Tournament?' : 'Permanently Delete?'}
                message={
                    modalState.action === 'restore' 
                    ? 'This will move the tournament back to your main dashboard.' 
                    : 'This action cannot be undone. All data for this tournament will be lost forever.'
                }
                confirmText={modalState.action === 'restore' ? 'Restore' : 'Delete Forever'}
                isDestructive={modalState.action === 'delete'}
            />
        </div>
    );
};

export default TrashPage;