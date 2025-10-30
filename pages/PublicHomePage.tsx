import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Tournament } from '../types';

interface NavCardProps {
    to: string;
    title: string;
    description: string;
    iconPath: string;
}

const NavCard: React.FC<NavCardProps> = ({ to, title, description, iconPath }) => (
    <Link to={to} className="bg-slate-800 rounded-lg shadow-lg p-6 flex flex-col items-start hover:ring-2 hover:ring-cool-blue-500 hover:bg-slate-700/50 transition-all duration-200">
        <div className="bg-cool-blue-600/20 p-3 rounded-lg mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-cool-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
            </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
        <p className="text-gray-400 flex-grow">{description}</p>
        <div className="mt-4 text-sm font-semibold text-cool-blue-400">View Details &rarr;</div>
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

    return (
        <div className="max-w-5xl mx-auto">
            {publicPortalSettings?.bannerUrl && (
                <div className="mb-10 rounded-lg overflow-hidden shadow-lg">
                    <img src={publicPortalSettings.bannerUrl} alt={`${tournament.name} Banner`} className="w-full h-48 object-cover" />
                </div>
            )}
            <div className="text-center mb-10">
                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">{tournament.name}</h1>
                <p className="text-lg text-gray-400 mt-2">Public Information Portal</p>
            </div>

            {publicPortalSettings?.welcomeMessage && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-10 text-center">
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(publicPortalSettings.welcomeMessage) }} className="text-gray-300" />
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <NavCard 
                    to={`/public/t/${tournament.slug}/standings`}
                    title="Live Standings"
                    description="View the up-to-the-minute official rankings, scores, and tie-breaker stats for all players."
                    iconPath="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
                 <NavCard 
                    to={`/public/t/${tournament.slug}/players`}
                    title="Player Roster & Scorecards"
                    description="See the full list of competitors. Click a player's name to view their detailed round-by-round scorecard."
                    iconPath="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a3.001 3.001 0 015.644 0M11 14a3 3 0 11-6 0 3 3 0 016 0zm10 0a3 3 0 11-6 0 3 3 0 016 0z"
                />
                 <NavCard 
                    to={`/public/t/${tournament.slug}/pairings`}
                    title="Pairings & Results"
                    description="Browse round-by-round pairings and check the final scores for every match played."
                    iconPath="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
                <NavCard 
                    to={`/public/t/${tournament.slug}/leaders`}
                    title="Tournament Leaders"
                    description="Discover top performances including high scores, biggest wins, and top rating gainers."
                    iconPath="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
                <NavCard 
                    to={`/public/t/${tournament.slug}/matchup`}
                    title="Head-to-Head"
                    description="Compare any two players and see their direct match history and win/loss record."
                    iconPath="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21v-1a6 6 0 00-5.197-5.197"
                />
                <NavCard 
                    to={`/public/t/${tournament.slug}/stats`}
                    title="AI Stats Report"
                    description="Get an in-depth statistical analysis and summary of the tournament, powered by Gemini."
                    iconPath="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547a2 2 0 00-.547 1.806l.443 2.216a2 2 0 002.164 1.78l.28.035a6 6 0 003.86-.517l.318-.158a6 6 0 013.86-.517l.28-.035a2 2 0 002.164-1.78l.443-2.216a2 2 0 00-.547-1.806z"
                />
            </div>
        </div>
    );
};

export default PublicHomePage;