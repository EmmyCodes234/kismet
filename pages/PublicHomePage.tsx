import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Tournament } from '../types';
import PublicTournamentHeader from '../components/PublicTournamentHeader';

interface FeatureCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    to: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon, to }) => (
    <Link 
        to={to} 
        className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700 hover:border-cool-blue-500 transition-all duration-200 group"
    >
        <div className="flex items-start gap-4">
            <div className="flex-shrink-0 p-3 bg-cool-blue-600/20 rounded-lg">
                {icon}
            </div>
            <div>
                <h3 className="text-lg font-bold text-white group-hover:text-cool-blue-300 transition-colors">{title}</h3>
                <p className="text-gray-400 mt-1 text-sm">{description}</p>
            </div>
        </div>
        <div className="mt-4 flex items-center text-cool-blue-400 text-sm font-medium">
            <span>View details</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
        </div>
    </Link>
);

const PublicHomePage: React.FC = () => {
    const { tournament } = useOutletContext<{ tournament: Tournament }>();
    
    // Basic markdown to HTML renderer
    const renderMarkdown = (text: string) => {
        return text
        .replace(/\*\*(.*)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-cool-blue-400 hover:underline">$1</a>')
        .replace(/\n/g, '<br />');
    };

    if (!tournament) {
        return <div className="p-8 text-center text-red-400">Tournament data could not be loaded.</div>;
    }

    const { publicPortalSettings } = tournament;

    // Icons for feature cards
    const standingsIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cool-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    );

    const pairingsIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cool-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
    );

    const playersIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cool-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21v-1a6 6 0 00-5.197-5.197" />
        </svg>
    );

    const statsIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cool-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
    );

    const matchupIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cool-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
    );

    const leadersIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cool-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
    );

    return (
        <div className="min-h-screen bg-slate-900">
            <PublicTournamentHeader tournament={tournament} />
            
            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Welcome Message */}
                {publicPortalSettings?.welcomeMessage && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-8">
                        <div 
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(publicPortalSettings.welcomeMessage) }} 
                            className="text-gray-300 prose prose-invert max-w-none"
                        />
                    </div>
                )}
                
                {/* Main Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FeatureCard 
                        title="Live Standings"
                        description="View the up-to-the-minute official rankings, scores, and tie-breaker stats for all players."
                        icon={standingsIcon}
                        to={`/public/t/${tournament.slug}/standings`}
                    />
                    
                    <FeatureCard 
                        title="Pairings & Results"
                        description="Browse round-by-round pairings and check the final scores for every match played."
                        icon={pairingsIcon}
                        to={`/public/t/${tournament.slug}/pairings`}
                    />
                    
                    <FeatureCard 
                        title="Player Roster"
                        description="See the full list of competitors. Click a player's name to view their detailed scorecard."
                        icon={playersIcon}
                        to={`/public/t/${tournament.slug}/players`}
                    />
                    
                    <FeatureCard 
                        title="Tournament Leaders"
                        description="Discover top performances including high scores, biggest wins, and top rating gainers."
                        icon={leadersIcon}
                        to={`/public/t/${tournament.slug}/leaders`}
                    />
                    
                    <FeatureCard 
                        title="Head-to-Head"
                        description="Compare any two players and see their direct match history and win/loss record."
                        icon={matchupIcon}
                        to={`/public/t/${tournament.slug}/matchup`}
                    />
                    
                    <FeatureCard 
                        title="AI Stats Report"
                        description="Get an in-depth statistical analysis and summary of the tournament, powered by AI."
                        icon={statsIcon}
                        to={`/public/t/${tournament.slug}/stats`}
                    />
                </div>
            </div>
        </div>
    );
};

export default PublicHomePage;