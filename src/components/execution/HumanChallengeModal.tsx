import React from 'react';
import { UserCheck, ShieldAlert, ArrowRight, X } from 'lucide-react';
import { useExecution } from '../../context/ExecutionContext.js';

export const HumanChallengeModal: React.FC = () => {
  const { status, humanVerificationReason, resumePausedExecution, cancelActiveExecution } = useExecution();

  if (status !== 'PAUSED') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl shadow-2xl border-2 border-amber-500/80 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center border border-amber-500/20 animate-bounce">
            <UserCheck className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-base font-bold text-surface-900 dark:text-white">
              Human Verification Required
            </h2>
            <p className="text-xs text-surface-600 dark:text-surface-300 mt-1">
              {humanVerificationReason || 'A CAPTCHA, Cloudflare check, or MFA challenge was detected on the target website.'}
            </p>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 rounded-xl text-left text-xs text-amber-800 dark:text-amber-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>What should you do?</span>
            </div>
            <p className="text-[11px] text-surface-600 dark:text-surface-400">
              1. Look at the open browser window on your screen.<br />
              2. Complete the CAPTCHA or verification challenge manually.<br />
              3. Click "Resume Automation" below to continue the workflow.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={cancelActiveExecution}
              className="flex-1 py-2 px-3 rounded-xl border border-surface-300 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 text-xs font-semibold transition-colors"
            >
              Cancel Run
            </button>
            <button
              onClick={resumePausedExecution}
              className="flex-2 py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all"
            >
              <span>Resume Automation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
