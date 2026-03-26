# Home Entrance Animations Design

**Date:** 2026-03-26
**Status:** Approved

## Summary

Add subtle staggered entrance animations to the home screen header and headline text, triggered on every tab focus.

## Scope

This pass animates two elements:

- `HomeHeader` (day badge)
- Daily headline text

`ActiveActions` and `SuggestedActions` are explicitly out of scope — each will handle its own internal stagger in a future pass.

## Changes

### `useMountAnimation` — add `trigger()`

Add a `trigger()` function that resets all animated values to their initial (`from*`) state and re-runs the animation. The existing `useEffect` on mount is refactored to call `trigger()` internally, so all current usage remains unchanged.

Returned shape becomes:
```ts
{ animatedStyle, trigger }
```

### `index.tsx` — staggered focus animations

Three instances of `useMountAnimation`, each configured with:
- `fromOpacity: 0`
- `fromTranslateY: 8` (subtle upward drift)
- `duration: 250`
- Staggered `delay`:

| Element | Delay |
|---|---|
| `HomeHeader` | 0ms |
| Daily headline text | 80ms |

Each element wrapped in `Animated.View`. A `useFocusEffect` callback calls all `trigger()`s on tab focus.

## What's Not Changing

- No easing changes
- No animation on `ActionReminderSheet`
- No changes inside `ActiveActions` or `SuggestedActions`
- Existing consumers of `useMountAnimation` are unaffected
