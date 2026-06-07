import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const defaultGuard = { disabled: false, confirmBack: false };

const NavigationGuardContext = createContext({
  guard: defaultGuard,
  setNavigationGuard: () => {},
});

export function NavigationGuardProvider({ children }) {
  const [guard, setGuardState] = useState(defaultGuard);

  const setNavigationGuard = useCallback((next) => {
    if (!next) {
      setGuardState(defaultGuard);
      return;
    }
    setGuardState({
      disabled: !!next.disabled,
      confirmBack: !!next.confirmBack,
    });
  }, []);

  const value = useMemo(
    () => ({
      guard,
      setNavigationGuard,
    }),
    [guard, setNavigationGuard]
  );

  return <NavigationGuardContext.Provider value={value}>{children}</NavigationGuardContext.Provider>;
}

export function useNavigationGuard() {
  return useContext(NavigationGuardContext);
}
