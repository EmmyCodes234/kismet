import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import * as api from '../services/apiService';
import { AuditLog, Tournament } from '../types';
import SkeletonLoader from '../components/SkeletonLoader';
import { TDPanelContextType } from '../layouts/TDPanelLayout';

const PAGE_SIZE = 50;

const AuditLogSkeleton: React.FC = () => (
    <div className="p-4 md:p-8">
        <SkeletonLoader className="h-10 w-64 mb-2" />
        <SkeletonLoader className="h-5 w-80 mb-8" />
        <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                    <thead className="bg-slate-900/50 text-sm text-gray-300">
                        <tr>
                            <th className="p-3"><SkeletonLoader className="h-5 w-1/3" /></th>
                            <th className="p-3"><SkeletonLoader className="h-5 w-1/4" /></th>
                            <th className="p-3"><SkeletonLoader className="h-5 w-3/4" /></th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 10 }).map((_, i) => (
                            <tr key={i} className="border-b border-slate-700 last:border-b-0">
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
);


const AuditLogPage: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { tournament } = useOutletContext<TDPanelContextType>();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!tournamentId) return;
      setLoading(true);
      const logsData = await api.getAuditLogs(tournamentId, 0, PAGE_SIZE);
      setLogs(logsData);
      setPage(0);
      setHasMore(logsData.length === PAGE_SIZE);
      setLoading(false);
    };
    fetchLogs();
  }, [tournamentId]);

  const loadMoreLogs = async () => {
      if (!tournamentId || !hasMore || loadingMore) return;
      setLoadingMore(true);
      const nextPage = page + 1;
      const newLogs = await api.getAuditLogs(tournamentId, nextPage, PAGE_SIZE);
      setLogs(prev => [...prev, ...newLogs]);
      setPage(nextPage);
      setHasMore(newLogs.length === PAGE_SIZE);
      setLoadingMore(false);
  }

  if (loading) {
    return <AuditLogSkeleton />;
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">Audit Log</h1>
      <p className="text-gray-400 mb-8">{tournament?.name}</p>
      <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] responsive-table">
            <thead className="bg-slate-900/50 text-sm text-gray-300 uppercase tracking-wider">
              <tr>
                <th className="p-3 text-left">Timestamp</th>
                <th className="p-3 text-left">Action Type</th>
                <th className="p-3 text-left">Details</th>
              </tr>
            </thead>
            <tbody className="text-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-700 last:border-b-0 hover:bg-slate-700/50">
                  <td data-label="Timestamp" className="p-3 font-mono text-gray-400 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                  <td data-label="Action" className="p-3">
                    <span className="px-2 py-1 text-xs font-bold bg-cool-blue-900 text-cool-blue-200 rounded-full">
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td data-label="Details" className="p-3">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && <p className="p-4 text-center text-gray-400">No audit logs found for this tournament.</p>}
        </div>
      </div>
       {hasMore && (
        <div className="mt-6 text-center">
            <button
                onClick={loadMoreLogs}
                disabled={loadingMore}
                className="px-6 py-3 bg-slate-700 text-white font-bold rounded-lg hover:bg-slate-600 transition duration-200 disabled:bg-slate-800 disabled:cursor-wait"
            >
                {loadingMore ? 'Loading...' : 'Load More'}
            </button>
        </div>
      )}
    </div>
  );
};

export default AuditLogPage;
