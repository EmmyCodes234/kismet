import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { generateTournamentReport } from '../services/geminiService';
import { Tournament } from '../types';
import PublicTournamentHeader from '../components/PublicTournamentHeader';

const StatsPage: React.FC = () => {
  const { tournament } = useOutletContext<{ tournament: Tournament }>();
  const tournamentId = tournament.id;
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    if (!tournamentId) return;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const generatedReport = await generateTournamentReport(tournamentId);
      setReport(generatedReport);
    } catch (err) {
      setError('Failed to generate report. Please check the console for details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Basic markdown to HTML renderer
  const renderMarkdown = (text: string) => {
    return text
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-6 mb-3 border-b border-slate-700 pb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-8 mb-4">$1</h1>')
      .replace(/\*\*(.*)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-slate-700 text-cool-blue-300 font-mono px-1.5 py-0.5 rounded-md">$1</code>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <PublicTournamentHeader tournament={tournament} />
      
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-4 text-white">AI-Powered Statistical Report</h1>
        <p className="text-center text-gray-400 mb-8">
          Analyzing: <span className="font-bold text-white">{tournament.name}</span>
        </p>
        <div className="text-center mb-8">
          <button
            onClick={handleGenerateReport}
            disabled={loading || !tournamentId}
            className="px-6 py-3 bg-cool-blue-600 text-white font-bold rounded-lg hover:bg-cool-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition duration-200"
          >
            {loading ? 'Analyzing Data...' : 'Generate Gemini Report'}
          </button>
        </div>

        {loading && (
          <div className="flex justify-center items-center space-x-2 text-gray-300">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Generating report with Gemini... This may take a moment.</span>
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {report && (
          <div className="bg-slate-800 rounded-xl shadow-lg p-4 md:p-6 mt-6 border border-slate-700">
            <div 
              className="prose prose-invert max-w-none" 
              dangerouslySetInnerHTML={{ __html: renderMarkdown(report) }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsPage;