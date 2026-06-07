/** Params that distinguish two instances of the same screen. Language is ignored. */
export const ROUTE_ID_PARAM_KEYS = [
  'sessionId',
  'studentId',
  'institutionId',
  'majorId',
  'majorKey',
  'gameId',
  'levelId',
  'level',
  'subjectId',
  'personalitySessionId',
  'abilitySessionId',
  'id',
  'token',
  'code',
  'email',
];

export function normalizeRouteParams(params = {}, language = 'ar') {
  const next = { ...params };
  const lang = String(language || '').toLowerCase().startsWith('he') ? 'he' : 'ar';
  if (!next.language) {
    next.language = lang;
  } else {
    next.language = String(next.language).toLowerCase().startsWith('he') ? 'he' : 'ar';
  }
  return next;
}

export function cloneRouteEntry(entry) {
  if (!entry) return null;
  return {
    screen: entry.screen,
    params: { ...(entry.params || {}) },
  };
}

/**
 * Compare two routes by screen name and identity-bearing params.
 */
export function areSameRoute(a, b) {
  if (!a || !b) return false;
  if (a.screen !== b.screen) return false;

  const paramsA = a.params || {};
  const paramsB = b.params || {};

  for (const key of ROUTE_ID_PARAM_KEYS) {
    const valA = paramsA[key];
    const valB = paramsB[key];
    const hasA = valA !== undefined && valA !== null && valA !== '';
    const hasB = valB !== undefined && valB !== null && valB !== '';
    if (hasA || hasB) {
      if (String(valA ?? '') !== String(valB ?? '')) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Push current route onto back stack unless it duplicates the stack top.
 */
export function pushBackStack(backStack, currentEntry) {
  const entry = cloneRouteEntry(currentEntry);
  if (!entry) return backStack;

  const top = backStack[backStack.length - 1];
  if (top && areSameRoute(top, entry)) {
    return backStack;
  }

  return [...backStack, entry];
}
