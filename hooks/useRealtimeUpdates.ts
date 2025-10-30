import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { useParams } from 'react-router-dom';

export const useRealtimeUpdates = (refetchCallback: () => void) => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const callbackRef = useRef(refetchCallback);

  useEffect(() => {
    callbackRef.current = refetchCallback;
  }, [refetchCallback]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const debouncedCallback = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            console.log(`Realtime update received for tournament ${tournamentId}. Refetching data.`);
            callbackRef.current();
        }, 500);
    };

    if (!tournamentId) return;

    const channel = supabase.channel(`realtime-updates:${tournamentId}`);

    const subscription = channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments', filter: `id=eq.${tournamentId}` }, debouncedCallback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `tournament_id=eq.${tournamentId}` }, debouncedCallback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${tournamentId}` }, debouncedCallback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `tournament_id=eq.${tournamentId}` }, debouncedCallback)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(timeoutId);
    };
  }, [tournamentId]);
};
