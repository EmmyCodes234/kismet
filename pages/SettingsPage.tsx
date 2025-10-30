import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import * as api from '../services/apiService';
import { Tournament, TieBreakMethod, Administrator, KismetConf, PairingRule } from '../types';
import SkeletonLoader from '../components/SkeletonLoader';
import ConfirmationModal from '../components/ConfirmationModal';
import { TDPanelContextType } from '../layouts/TDPanelLayout';

interface AccordionSectionProps {
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({ title, isOpen, onToggle, children }) => (
    <div className="bg-slate-800 rounded-lg shadow-md overflow-hidden border border-slate-700">
        <button
            type="button"
            onClick={onToggle}
            className="w-full flex justify-between items-center p-4 text-left font-semibold text-lg text-white hover:bg-slate-700/50 transition-colors duration-200"
            aria-expanded={isOpen}
        >
            <span>{title}</span>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-6 w-6 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24"
                stroke="currentColor"
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        </button>
        <div
            className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
        >
            <div className="p-6 border-t border-slate-700 bg-slate-800/50">
                {children}
            </div>
        </div>
    </div>
);

const tieBreakerLabels: Record<TieBreakMethod, string> = {
    cumulativeSpread: 'Cumulative Spread',
    buchholz: 'Buchholz Score',
    medianBuchholz: 'Median-Buchholz Score',
    rating: 'Player Rating'
};

const SettingsSkeleton: React.FC = () => (
    <div className="p-4 md:p-8">
        <SkeletonLoader className="h-10 w-72 mb-2" />
        <SkeletonLoader className="h-6 w-96 mb-8" />
        <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-slate-800 rounded-lg shadow-md p-4 border border-slate-700">
                    <SkeletonLoader className="h-7 w-1/3" />
                </div>
            ))}
        </div>
    </div>
);


const SettingsPage: React.FC = () => {
    const { tournamentId } = useParams<{ tournamentId: string }>();
    const { tournament, isHeadTd: isUserHeadTd } = useOutletContext<TDPanelContextType>();
    
    const [settings, setSettings] = useState<Partial<Tournament>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const [openSection, setOpenSection] = useState<string | null>('general');
    const [draggedItem, setDraggedItem] = useState<TieBreakMethod | null>(null);
    const [newAdminUsername, setNewAdminUsername] = useState('');
    const [adminActionStatus, setAdminActionStatus] = useState<{ type: 'adding' | 'removing' | 'error' | 'idle'; message?: string }>({ type: 'idle' });
    const [copySuccess, setCopySuccess] = useState(false);
    const [importModalState, setImportModalState] = useState<{ isOpen: boolean; confData: KismetConf | null }>({ isOpen: false, confData: null });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isEditingDisabled = tournament?.status !== 'Not Started';

    const fetchTournamentForSettings = useCallback(async () => {
        if (!tournament) return;
        setSettings(JSON.parse(JSON.stringify(tournament)));
        setLoading(false);
    }, [tournament]);

    useEffect(() => {
        fetchTournamentForSettings();
    }, [fetchTournamentForSettings]);

    const toggleSection = (section: string) => {
        setOpenSection(prev => (prev === section ? null : section));
    };
    
    const handleSettingsChange = (key: keyof Tournament, value: any) => {
        setSettings(prev => ({...prev, [key]: value}));
    }

    const handleTeamSettingsChange = (key: keyof Tournament['teamSettings'], value: any) => {
        setSettings(prev => ({ ...prev, teamSettings: { ...prev.teamSettings!, [key]: value } }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tournamentId) return;
        setSaving(true);
        try {
            await api.updateTournament(tournamentId, settings);
            setShowSaveSuccess(true);
            setTimeout(() => setShowSaveSuccess(false), 2500);
            // Data will be re-fetched by the layout, no need to manually refetch here
        } catch (error) {
            console.error("Failed to save settings:", error);
            alert((error as Error).message);
        } finally {
            setSaving(false);
        }
    };
    
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: TieBreakMethod) => {
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetItem: TieBreakMethod) => {
        if (!draggedItem) return;
        const currentItems = settings.tieBreakOrder || [];
        const draggedItemIndex = currentItems.indexOf(draggedItem);
        const targetItemIndex = currentItems.indexOf(targetItem);
        const newItems = [...currentItems];
        newItems.splice(draggedItemIndex, 1);
        newItems.splice(targetItemIndex, 0, draggedItem);
        handleSettingsChange('tieBreakOrder', newItems);
        setDraggedItem(null);
    };

    const addAssistant = async () => {
        if (!tournamentId || !newAdminUsername.trim()) return;
        setAdminActionStatus({ type: 'adding' });
        try {
            await api.addAdministrator(tournamentId, newAdminUsername.trim());
            setNewAdminUsername('');
            await fetchTournamentForSettings(); // Refetch to update list
        } catch (error: any) {
            setAdminActionStatus({ type: 'error', message: error.message });
        } finally {
            setTimeout(() => setAdminActionStatus({ type: 'idle' }), 3000);
        }
    }

    const removeAdministrator = async (username: string) => {
        if (!tournamentId) return;
        if (window.confirm(`Are you sure you want to remove ${username} as an assistant TD?`)) {
            setAdminActionStatus({ type: 'removing' });
            try {
                await api.removeAdministrator(tournamentId, username);
                await fetchTournamentForSettings(); // Refetch to update list
            } catch (error: any) {
                setAdminActionStatus({ type: 'error', message: error.message });
            } finally {
                setTimeout(() => setAdminActionStatus({ type: 'idle' }), 3000);
            }
        }
    }

    const handleCopyLink = () => {
        if (settings.slug) {
            const url = `${window.location.origin}${window.location.pathname}#/public/t/${settings.slug}`;
            navigator.clipboard.writeText(url);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }
    };

    const handleExport = async () => {
        if (!tournament || !tournamentId) return;
        setSaving(true);
        try {
            const [players, rules, teams] = await Promise.all([
                api.getPlayers(tournamentId),
                api.getPairingRules(tournamentId),
                api.getTeams(tournamentId)
            ]);
            const teamMap = new Map(teams.map(t => [t.id, t.name]));

            const metadata = { ...tournament };
            delete (metadata as any).id;
            delete (metadata as any).administrators;
            delete (metadata as any).teams;
            delete (metadata as any).playerCount;
            delete (metadata as any).deleted_at;

            const conf: KismetConf = {
                tournament_metadata: metadata,
                players: players.map(p => ({
                    name: p.name,
                    rating: p.rating,
                    seed: p.seed,
                    teamName: p.teamId ? teamMap.get(p.teamId) : undefined
                })),
                pairing_schedule: rules.map(({ id, ...rest }) => rest)
            };

            const dataStr = JSON.stringify(conf, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'kismet.conf.json';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export failed:", error);
            alert(`An error occurred during export: ${(error as Error).message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const result = event.target?.result;
                const parsedData = JSON.parse(result as string) as KismetConf;
                if (parsedData.tournament_metadata && parsedData.players && parsedData.pairing_schedule) {
                    setImportModalState({ isOpen: true, confData: parsedData });
                } else {
                    throw new Error("Invalid kismet.conf file structure.");
                }
            } catch (error) {
                alert(`Error parsing file: ${(error as Error).message}`);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleConfirmImport = async () => {
        if (!importModalState.confData || !tournamentId) return;
        setSaving(true);
        setImportModalState({ isOpen: false, confData: null });
        try {
            const { tournament_metadata, players, pairing_schedule } = importModalState.confData;

            await api.deleteAllPlayersForTournament(tournamentId);
            await api.deleteAllTeamsForTournament(tournamentId);
            await api.updateTournament(tournamentId, tournament_metadata);
            await api.addPlayersBulk(tournamentId, players);
            const fullRules = pairing_schedule.map(r => ({ ...r, id: 0 }));
            await api.savePairingRules(tournamentId, fullRules as PairingRule[]);
            
            await api.logAction(tournamentId, 'CONFIG_IMPORT', `Imported settings, ${players.length} players, and ${pairing_schedule.length} pairing rules from kismet.conf file.`);

            setShowSaveSuccess(true);
            setTimeout(() => setShowSaveSuccess(false), 2500);

        } catch (error) {
            console.error("Import failed:", error);
            alert(`An error occurred during import: ${(error as Error).message}`);
        } finally {
            setSaving(false);
            fetchTournamentForSettings();
        }
    };


    if (loading) return <SettingsSkeleton />;
    if (!isUserHeadTd) return <div className="p-8 text-center text-red-400">Permission Denied. Only the Head TD can access tournament settings.</div>;
    if (!tournament || !settings) return <div className="p-8 text-center text-red-400">Tournament not found.</div>;

    return (
        <div className="p-4 md:p-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white">Tournament Settings</h1>
            <p className="text-gray-400 mt-1 mb-8">{tournament.name}</p>

            <form onSubmit={handleSave} className="space-y-4">
                <AccordionSection title="General Settings" isOpen={openSection === 'general'} onToggle={() => toggleSection('general')}>
                   <div className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-bold text-gray-300 mb-2">Tournament Name</label>
                            <input type="text" id="name" value={settings.name || ''} onChange={e => handleSettingsChange('name', e.target.value)} className="w-full p-2 bg-slate-700 rounded-md" />
                        </div>
                         <div>
                            <label htmlFor="totalRounds" className="block text-sm font-bold text-gray-300 mb-2">Total Rounds</label>
                            <input type="number" id="totalRounds" min="1" value={settings.totalRounds || ''} onChange={e => handleSettingsChange('totalRounds', parseInt(e.target.value))} disabled={isEditingDisabled} className="w-full p-2 bg-slate-700 rounded-md disabled:bg-slate-600" />
                         </div>
                         <div>
                            <label htmlFor="byeSpread" className="block text-sm font-bold text-gray-300 mb-2">Bye Spread</label>
                            <input type="number" id="byeSpread" min="0" value={settings.byeSpread ?? 50} onChange={e => handleSettingsChange('byeSpread', parseInt(e.target.value))} className="w-full p-2 bg-slate-700 rounded-md" />
                            <p className="text-xs text-gray-400 mt-1">Point spread awarded to a player receiving a bye.</p>
                         </div>
                    </div>
                </AccordionSection>
                
                {tournament.tournamentMode === 'team' && (
                  <AccordionSection title="Team Play Settings" isOpen={openSection === 'team'} onToggle={() => toggleSection('team')}>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <label htmlFor="displayTeamNames" className="text-sm font-medium text-gray-300">Display team names in pairings/standings</label>
                            <button type="button" onClick={() => handleTeamSettingsChange('displayTeamNames', !settings.teamSettings?.displayTeamNames)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.teamSettings?.displayTeamNames ? 'bg-cool-blue-600' : 'bg-slate-600'}`}>
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.teamSettings?.displayTeamNames ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <label htmlFor="preventTeammatePairings_AllRounds" className="text-sm font-medium text-gray-300">Prevent teammate pairings (all rounds)</label>
                            <button type="button" onClick={() => handleTeamSettingsChange('preventTeammatePairings_AllRounds', !settings.teamSettings?.preventTeammatePairings_AllRounds)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.teamSettings?.preventTeammatePairings_AllRounds ? 'bg-cool-blue-600' : 'bg-slate-600'}`}>
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.teamSettings?.preventTeammatePairings_AllRounds ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                         <div>
                            <label htmlFor="preventTeammatePairings_InitialRounds" className="block text-sm font-medium text-gray-300 mb-2">Prevent teammate pairings for the first N rounds</label>
                            <input 
                                type="number" id="preventTeammatePairings_InitialRounds" min="0" 
                                value={settings.teamSettings?.preventTeammatePairings_InitialRounds ?? 0}
                                onChange={e => handleTeamSettingsChange('preventTeammatePairings_InitialRounds', parseInt(e.target.value))} 
                                disabled={settings.teamSettings?.preventTeammatePairings_AllRounds}
                                className="w-full p-2 bg-slate-700 rounded-md disabled:bg-slate-600 disabled:cursor-not-allowed" />
                                {settings.teamSettings?.preventTeammatePairings_AllRounds && <p className="text-xs text-yellow-400 mt-1">Disabled because "all rounds" is selected.</p>}
                         </div>
                    </div>
                  </AccordionSection>
                )}

                 <AccordionSection title="Tie-Breaking Rules" isOpen={openSection === 'tiebreak'} onToggle={() => toggleSection('tiebreak')}>
                     <div className="space-y-2">
                        {settings.tieBreakOrder?.map((item, index) => (
                            <div key={item} draggable onDragStart={(e) => handleDragStart(e, item)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, item)}
                                className={`flex items-center p-3 bg-slate-700 rounded-md cursor-grab active:cursor-grabbing transition-opacity ${draggedItem === item ? 'opacity-50' : 'opacity-100'}`}>
                                <span className="font-mono text-cool-blue-400 mr-4">{index + 1}</span>
                                <span className="text-white">{tieBreakerLabels[item]}</span>
                            </div>
                        ))}
                     </div>
                </AccordionSection>

                 <AccordionSection title="Tournament Staff" isOpen={openSection === 'staff'} onToggle={() => toggleSection('staff')}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-300 mb-2">Add Assistant TD</label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input type="text" value={newAdminUsername} onChange={e => setNewAdminUsername(e.target.value)} placeholder="User's Display Name" className="flex-grow p-2 bg-slate-700 rounded-md" />
                                <button type="button" onClick={addAssistant} disabled={adminActionStatus.type === 'adding'} className="px-4 py-2 bg-slate-600 hover:bg-slate-500 font-bold rounded-lg text-sm disabled:opacity-50">
                                    {adminActionStatus.type === 'adding' ? 'Adding...' : 'Add'}
                                </button>
                            </div>
                             {adminActionStatus.type === 'error' && <p className="text-xs text-red-400 mt-2">{adminActionStatus.message}</p>}
                        </div>
                         <div>
                            <label className="block text-sm font-bold text-gray-300 mb-2">Current Staff</label>
                             <div className="space-y-2">
                                {settings.administrators?.map(admin => (
                                    <div key={admin.username} className="flex justify-between items-center bg-slate-700 p-2 rounded-md">
                                        <div>
                                            <span className="font-semibold">{admin.username}</span>
                                            <span className="ml-2 text-xs uppercase bg-cool-blue-800 text-cool-blue-200 px-2 py-0.5 rounded-full">{admin.role}</span>
                                        </div>
                                        {admin.role !== 'head' && <button type="button" onClick={() => removeAdministrator(admin.username)} className="text-red-400 text-xs hover:text-red-300">Remove</button>}
                                    </div>
                                ))}
                             </div>
                         </div>
                    </div>
                 </AccordionSection>

                 <AccordionSection title="Public Portal Customization" isOpen={openSection === 'public'} onToggle={() => toggleSection('public')}>
                     <div className="space-y-6">
                        <div>
                            <label htmlFor="slug" className="block text-sm font-bold text-gray-300 mb-2">Public URL Slug</label>
                            <div className="flex items-center bg-slate-700 rounded-md focus-within:ring-2 focus-within:ring-cool-blue-500">
                                <span className="px-3 text-gray-400">.../public/t/</span>
                                <input 
                                    type="text" id="slug" value={settings.slug || ''} 
                                    onChange={e => handleSettingsChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                    className="flex-grow p-2 bg-transparent focus:outline-none"
                                    disabled={isEditingDisabled} 
                                />
                            </div>
                            {!isEditingDisabled && <p className="text-xs text-gray-400 mt-1">Use only lowercase letters, numbers, and hyphens.</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-300 mb-2">Full Public Link</label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input 
                                    type="text" 
                                    readOnly 
                                    value={`${window.location.origin}${window.location.pathname}#/public/t/${settings.slug || ''}`}
                                    className="w-full p-2 bg-slate-900 rounded-md text-gray-400 cursor-copy"
                                    onClick={handleCopyLink}
                                />
                                <button type="button" onClick={handleCopyLink} className="px-4 py-2 bg-slate-600 hover:bg-slate-500 font-bold rounded-lg text-sm sm:w-24 flex-shrink-0">
                                    {copySuccess ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="bannerUrl" className="block text-sm font-bold text-gray-300 mb-2">Banner Image URL</label>
                            <input type="text" id="bannerUrl" value={settings.publicPortalSettings?.bannerUrl || ''} onChange={e => handleSettingsChange('publicPortalSettings', { ...settings.publicPortalSettings, bannerUrl: e.target.value })} className="w-full p-2 bg-slate-700 rounded-md" />
                        </div>
                        <div>
                            <label htmlFor="welcomeMessage" className="block text-sm font-bold text-gray-300 mb-2">Welcome Message</label>
                            <textarea id="welcomeMessage" rows={4} value={settings.publicPortalSettings?.welcomeMessage || ''} onChange={e => handleSettingsChange('publicPortalSettings', { ...settings.publicPortalSettings, welcomeMessage: e.target.value })} className="w-full p-2 bg-slate-700 rounded-md" placeholder="Welcome players! Round 1 begins at 9 AM." />
                            <p className="text-xs text-gray-400 mt-1">Basic markdown is supported.</p>
                        </div>
                     </div>
                 </AccordionSection>

                 <AccordionSection title="Configuration Management" isOpen={openSection === 'config'} onToggle={() => toggleSection('config')}>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-400">Export the entire tournament setup to a file, or import a file to configure this tournament. This is a powerful tool for archiving, sharing, and quickly setting up events.</p>
                        <div className="flex flex-col sm:flex-row gap-4">
                             <button type="button" onClick={handleExport} disabled={saving} className="flex-1 px-4 py-3 bg-slate-600 hover:bg-slate-500 font-bold rounded-lg transition duration-200 disabled:opacity-50">
                                Export to .conf
                            </button>
                             <button type="button" onClick={handleImportClick} disabled={isEditingDisabled || saving} className="flex-1 px-4 py-3 bg-slate-600 hover:bg-slate-500 font-bold rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                                Import from .conf
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".json,.conf" onChange={handleFileSelected} />
                        </div>
                        {isEditingDisabled && (
                            <p className="text-xs text-yellow-400 text-center mt-2">Import is disabled because the tournament has already started.</p>
                        )}
                    </div>
                 </AccordionSection>
                
                <div className="flex justify-end items-center gap-4 pt-4">
                    <div className={`flex items-center gap-2 bg-green-500/20 text-green-300 px-4 py-2 rounded-lg text-sm font-medium transition-opacity duration-300 ${showSaveSuccess ? 'opacity-100' : 'opacity-0'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Settings Saved!</span>
                    </div>
                    <button type="submit" disabled={saving} className="px-8 py-3 bg-cool-blue-600 text-white font-bold rounded-lg hover:bg-cool-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition duration-200">
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>

            <ConfirmationModal
                isOpen={importModalState.isOpen}
                onClose={() => setImportModalState({ isOpen: false, confData: null })}
                onConfirm={handleConfirmImport}
                title="Confirm Configuration Import"
                message="This will completely overwrite the current tournament's settings, players, teams, and pairing schedule with the data from the selected file. This action cannot be undone."
                confirmText="Overwrite and Import"
                isDestructive
            />
        </div>
    );
};

export default SettingsPage;
