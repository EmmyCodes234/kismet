
import React from 'react';

interface LowScoreDetail {
  playerName: string;
  score: number;
}

interface LowScoreConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  lowScoreDetails: LowScoreDetail[];
}

const LowScoreConfirmationModal: React.FC<LowScoreConfirmationModalProps> = ({ isOpen, onClose, onConfirm, lowScoreDetails }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-900/50 sm:mx-0 sm:h-10 sm:w-10">
              <svg className="h-6 w-6 text-yellow-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-4 text-left">
              <h3 className="text-lg leading-6 font-bold text-white">Confirm Low Score(s)</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-300">
                  The following scores seem unusually low. Please confirm they are correct before submitting.
                </p>
                <ul className="list-disc list-inside mt-3 text-sm text-yellow-200 space-y-1">
                  {lowScoreDetails.map((detail, index) => (
                    <li key={index}><strong>{detail.playerName}:</strong> {detail.score} points</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-slate-700/50 px-6 py-4 flex flex-col sm:flex-row-reverse gap-3 rounded-b-lg">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-cool-blue-600 text-base font-medium text-white hover:bg-cool-blue-700"
          >
            Confirm & Submit
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto inline-flex justify-center rounded-md border border-slate-500 shadow-sm px-4 py-2 bg-slate-600 text-base font-medium text-white hover:bg-slate-500"
          >
            Cancel & Edit
          </button>
        </div>
      </div>
    </div>
  );
};

export default LowScoreConfirmationModal;
