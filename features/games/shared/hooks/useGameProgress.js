import { useMemo } from 'react';

export function useGameProgress(currentIndex, totalSteps) {
  const safeTotal = totalSteps > 0 ? totalSteps : 0;
  const safeCurrent = currentIndex >= 0 ? currentIndex : 0;

  const progress = useMemo(() => {
    if (!safeTotal) return 0;
    return Math.min(((safeCurrent + 1) / safeTotal) * 100, 100);
  }, [safeCurrent, safeTotal]);

  return {
    progress,
    currentStep: safeTotal ? safeCurrent + 1 : 0,
    totalSteps: safeTotal,
    isLastStep: safeTotal ? safeCurrent + 1 >= safeTotal : false,
  };
}
