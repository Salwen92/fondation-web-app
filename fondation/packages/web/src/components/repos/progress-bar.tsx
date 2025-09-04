'use client';

import * as React from 'react';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

/**
 * Component to display job progress as a progress bar
 * Shows current step, total steps, and percentage completion
 * Note: Displays 1-based step numbers to users (Step 1, 2, 3...) regardless of internal 0-based indexing
 */
function ProgressBarComponent({ currentStep, totalSteps, className = '' }: ProgressBarProps) {
  // Ensure we show at least Step 1 for active jobs, handle 0-based internal values
  const displayStep = Math.max(1, currentStep);
  const percentage = Math.round((displayStep / totalSteps) * 100);

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>
          Étape {displayStep} sur {totalSteps}
        </span>
        <span>{percentage}%</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders during progress updates
export const ProgressBar = React.memo(ProgressBarComponent, (prevProps, nextProps) => {
  return (
    prevProps.currentStep === nextProps.currentStep &&
    prevProps.totalSteps === nextProps.totalSteps &&
    prevProps.className === nextProps.className
  );
});
