# Games Shared Layer

This folder is the shared foundation for all games under `src/features/games`.

## Included
- reusable React Native components
- shared hooks for language, timer, progress, session lifecycle
- DB-shaped services for `games`, `game_levels`, `game_sessions`, `game_action_logs`
- utils for localization, scoring, payload building, validation
- common schema constants

## Expected DB tables
This code is shaped around:
- `games`
- `game_levels`
- `game_sessions`
- `game_action_logs`

## Important
Update the import path for your Supabase client if needed:

```js
import { supabase } from '../../../../lib/supabase';
```

If your app uses a different path, change it in:
- `services/gameSessionService.js`
- `services/gameActionLogService.js`
- `services/gameCatalogService.js`
- `services/gameLevelService.js`

## Suggested next step
Build your first game folder, for example:
- `features/games/careerStory/`
