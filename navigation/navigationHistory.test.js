import {
  areSameRoute,
  pushBackStack,
} from './navigationHistory';

describe('navigationHistory', () => {
  describe('areSameRoute', () => {
    test('matches screen name when no id params differ', () => {
      expect(areSameRoute({ screen: 'games', params: {} }, { screen: 'games', params: { language: 'ar' } })).toBe(true);
    });

    test('differs when sessionId differs', () => {
      expect(
        areSameRoute(
          { screen: 'testResults', params: { sessionId: 'a' } },
          { screen: 'testResults', params: { sessionId: 'b' } }
        )
      ).toBe(false);
    });

    test('differs when screen name differs', () => {
      expect(areSameRoute({ screen: 'games', params: {} }, { screen: 'home', params: {} })).toBe(false);
    });
  });

  describe('pushBackStack', () => {
    test('does not add duplicate consecutive entries', () => {
      const stack = [{ screen: 'games', params: {} }];
      const next = pushBackStack(stack, { screen: 'games', params: {} });
      expect(next).toHaveLength(1);
    });

    test('adds a new entry when route differs', () => {
      const stack = [{ screen: 'home', params: {} }];
      const next = pushBackStack(stack, { screen: 'games', params: {} });
      expect(next).toEqual([
        { screen: 'home', params: {} },
        { screen: 'games', params: {} },
      ]);
    });
  });

  describe('acceptance path simulations', () => {
    function simulateNavigation() {
      let current = { screen: 'home', params: {} };
      let backStack = [];
      let forwardStack = [];

      const navigateTo = (screen, params = {}, options = {}) => {
        const next = { screen, params: { ...params } };
        const { replace = false, resetHistory = false } = options;

        if (resetHistory) {
          backStack = [];
          forwardStack = [];
          current = next;
          return;
        }

        if (areSameRoute(current, next)) {
          current = next;
          return;
        }

        if (replace) {
          forwardStack = [];
          current = next;
          return;
        }

        backStack = pushBackStack(backStack, current);
        forwardStack = [];
        current = next;
      };

      const goBack = () => {
        if (!backStack.length) return;
        forwardStack = [...forwardStack, { ...current, params: { ...current.params } }];
        current = backStack[backStack.length - 1];
        backStack = backStack.slice(0, -1);
      };

      const goForward = () => {
        if (!forwardStack.length) return;
        backStack = pushBackStack(backStack, current);
        current = forwardStack[forwardStack.length - 1];
        forwardStack = forwardStack.slice(0, -1);
      };

      return {
        get state() {
          return { current, backStack, forwardStack };
        },
        navigateTo,
        goBack,
        goForward,
      };
    }

    test('Home → Games → Exam → Success Stories back/forward', () => {
      const nav = simulateNavigation();
      nav.navigateTo('games');
      nav.navigateTo('adaptiveTest');
      nav.navigateTo('successStories');

      expect(nav.state.current.screen).toBe('successStories');
      expect(nav.state.backStack.map((e) => e.screen)).toEqual(['home', 'games', 'adaptiveTest']);

      nav.goBack();
      expect(nav.state.current.screen).toBe('adaptiveTest');
      nav.goBack();
      expect(nav.state.current.screen).toBe('games');
      nav.goBack();
      expect(nav.state.current.screen).toBe('home');
      expect(nav.state.backStack).toHaveLength(0);

      nav.goForward();
      expect(nav.state.current.screen).toBe('games');
      nav.goForward();
      expect(nav.state.current.screen).toBe('adaptiveTest');
      nav.goForward();
      expect(nav.state.current.screen).toBe('successStories');
      expect(nav.state.forwardStack).toHaveLength(0);
    });

    test('back then new page clears forward history', () => {
      const nav = simulateNavigation();
      nav.navigateTo('games');
      nav.navigateTo('adaptiveTest');
      nav.navigateTo('successStories');
      nav.goBack();

      expect(nav.state.current.screen).toBe('adaptiveTest');
      expect(nav.state.forwardStack.map((e) => e.screen)).toEqual(['successStories']);

      nav.navigateTo('activities');

      expect(nav.state.current.screen).toBe('activities');
      expect(nav.state.backStack.map((e) => e.screen)).toEqual(['home', 'games', 'adaptiveTest']);
      expect(nav.state.forwardStack).toHaveLength(0);
    });

    test('Home → Activities → Institutions → Profile', () => {
      const nav = simulateNavigation();
      nav.navigateTo('activities');
      nav.navigateTo('universitiesAndColleges');
      nav.navigateTo('profile');

      nav.goBack();
      expect(nav.state.current.screen).toBe('universitiesAndColleges');
      nav.goBack();
      expect(nav.state.current.screen).toBe('activities');
      nav.goBack();
      expect(nav.state.current.screen).toBe('home');
    });

    test('back then profile replaces forward branch', () => {
      const nav = simulateNavigation();
      nav.navigateTo('games');
      nav.navigateTo('adaptiveTest');
      nav.goBack();
      nav.navigateTo('profile');

      expect(nav.state.current.screen).toBe('profile');
      expect(nav.state.backStack.map((e) => e.screen)).toEqual(['home', 'games']);
      expect(nav.state.forwardStack).toHaveLength(0);

      nav.goBack();
      expect(nav.state.current.screen).toBe('games');
    });

    test('opening the same page twice does not grow back stack', () => {
      const nav = simulateNavigation();
      nav.navigateTo('games');
      nav.navigateTo('games');

      expect(nav.state.current.screen).toBe('games');
      expect(nav.state.backStack.map((e) => e.screen)).toEqual(['home']);
    });

    test('replace keeps back stack and avoids restarting finished exam', () => {
      const nav = simulateNavigation();
      nav.navigateTo('games');
      nav.navigateTo('adaptiveTest');
      nav.navigateTo('startAdaptiveTest', { sessionId: 'live-1' });
      nav.navigateTo('testResults', { sessionId: 'live-1' }, { replace: true });

      expect(nav.state.backStack.map((e) => e.screen)).toEqual(['home', 'games', 'adaptiveTest']);
      nav.goBack();
      expect(nav.state.current.screen).toBe('adaptiveTest');
      expect(nav.state.current.screen).not.toBe('startAdaptiveTest');
    });
  });
});
