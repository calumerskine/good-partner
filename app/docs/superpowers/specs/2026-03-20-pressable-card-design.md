# Pressable Card & Animation Hook Library

**Date:** 2026-03-20
**Status:** Approved

## Overview

Extract the 3D press animation from `Button` into a reusable `usePressAnimation` hook, introduce three additional animation hooks for common UI patterns, refactor `Button` to use dynamic Tailwind color shading, and create a new `PressableCard` component that applies the same press-animation style to card-shaped surfaces.

---

## 0. Tailwind / twrnc Color Model

The project uses `twrnc` (not NativeWind). `twrnc` resolves classes at runtime from the Tailwind config.

**The `color` prop on both Button and PressableCard accepts standard Tailwind color names that have a numeric scale** — e.g. `"indigo"`, `"blue"`, `"green"`, `"pink"`, `"yellow"`, `"gray"`, `"slate"`. Dynamic classes like `bg-${color}-400` work because twrnc resolves these from Tailwind's built-in palette.

**Flat custom colors** (`grape`, `charcoal`, `orange`) have no numeric scale and must NOT be passed as the `color` prop. The old Button named-color map (`grape → indigo`, `mint → green`, etc.) served as this translation layer; callers should now pass the Tailwind base name directly.

**Special string values handled explicitly** (not via dynamic shading):
- `"ghost"` — transparent face, no shadow ledge, no press translation
- `"muted"` — `bg-white/50` face, no shadow ledge, no press translation

Both special values are available on `Button` and `PressableCard`.

**`"white"` on PressableCard** — `bg-white` face, `bg-gray-100` shadow. `shade` is ignored for this and all special-case color values.

Allowed shade values for `PressableCard`: `100–800` (shadow = shade + 100, max `900`). Values outside this range are clamped. `shade` is ignored for `"white"`, `"ghost"`, and `"muted"`.

---

## 1. Direct Callsite Migration

The following `Button` callsites use old named colors that are not valid Tailwind base names. They must be updated as part of this work:

| File | Current | Updated to |
|---|---|---|
| `app/(tabs)/(settings)/index.tsx:72` | `color="grape"` | `color="indigo"` |
| `app/(tabs)/(settings)/index.tsx:175` | `color="raspberry"` | `color="pink"` |
| `app/(action)/[id]/reminders.tsx:68` | `color="mint"` | `color="green"` |

---

## 2. `actions.model.ts` — Color Name Migration

The `buttonColor` values `"raspberry"` and `"mint"` in `ActionTypes` refer to custom colors that are already **commented out** of `tailwind.config.js` and thus broken today. Update them to their standard Tailwind equivalents:

| Before | After |
|---|---|
| `"raspberry"` | `"pink"` |
| `"mint"` | `"green"` |

`"blue"` and `"yellow"` are already valid standard Tailwind names — no change needed.

Note: `suggestion-card.tsx` and `active-actions.tsx` both pass `categoryInfo.buttonColor` to `Button`. These files do not need direct changes — updating `actions.model.ts` (Section 2) is sufficient to fix all downstream consumers of `buttonColor`.

---

## 3. Animation Hook Library

### Location
`hooks/animations/` — barrel-exported from `hooks/animations/index.ts`

---

### `usePressAnimation`

Extracted from `Button`. Manages a `translateY` `Animated.Value` and returns press event handlers. All animations use `useNativeDriver: true`.

**Haptics are NOT managed by this hook.** The calling component retains its own `useHaptics()` call and fires haptics in its press handler.

**Config:**
```ts
type PressAnimationConfig = {
  pressDepth?: number;      // translateY on press. Default: 5
  bounciness?: number;      // spring bounciness on release. Default: 12
  disabled?: boolean;       // skip translate animation when true. Default: false
  skipAnimation?: boolean;  // skip translate (for ghost/muted variants). Default: false
}
```

`disabled` and `skipAnimation` are **functionally identical** in the hook — both prevent the translate animation. The distinction is semantic: use `disabled` when the control is in a disabled state; use `skipAnimation` for ghost/muted variants that are interactive but have no ledge effect. The calling component uses `disabled` independently to gate haptics and the `Pressable`'s `disabled` prop.

**Returns:**
```ts
{
  translateY: Animated.Value;
  handlePressIn: (event: GestureResponderEvent) => void;
  handlePressOut: (event: GestureResponderEvent) => void;
}
```

Callers wrap content in `<Animated.View style={{ transform: [{ translateY }] }}>` and spread the handlers onto their `<Pressable>`.

---

### `useMountAnimation`

Fade + transform entrance on mount. Uses `useNativeDriver: true`.

**Config:**
```ts
type MountAnimationConfig = {
  fromOpacity?: number;     // Default: 0
  fromScale?: number;       // Default: 0.95
  fromTranslateY?: number;  // Default: 0 (no vertical slide)
  duration?: number;        // Default: 300
  delay?: number;           // Default: 0
}
```

**Returns:** `{ animatedStyle: object }` — apply to `<Animated.View style={animatedStyle}>`.

---

### `usePulse`

Looping scale pulse. Uses `useNativeDriver: true`.

**Config:**
```ts
type PulseConfig = {
  minScale?: number;    // Default: 1.0
  maxScale?: number;    // Default: 1.08
  duration?: number;    // Default: 800
  autoStart?: boolean;  // Start on mount. Default: true
}
```

**Returns:** `{ animatedStyle: object, start: () => void, stop: () => void }`

The hook must store the `Animated.loop` reference in a `useRef` and call `stop()` in a `useEffect` cleanup to prevent leaks on unmount.

---

### `useShake`

One-shot horizontal shake for error feedback. Uses `useNativeDriver: true`.

**Config:**
```ts
type ShakeConfig = {
  intensity?: number;  // px offset per step. Default: 10
  duration?: number;   // duration per step ms (total = duration * 4). Default: 60
}
```

**Sequence:** The `Animated.Value` starts at `0`. The `Animated.sequence` array contains exactly 4 `Animated.timing` calls, each using the configured `duration` and `useNativeDriver: true`. In order:
1. `toValue: +intensity`
2. `toValue: -intensity`
3. `toValue: +intensity`
4. `toValue: 0`

Total duration = `duration * 4`. Ends at `0` (no residual offset).

**Returns:** `{ animatedStyle: object, trigger: () => void }`

---

## 4. Button Refactor

### Dynamic Color Shading

Replace the static `colors` and `shadows` maps with dynamic Tailwind shade derivation:

```
color prop (e.g. "indigo")
  → face:   bg-${color}-400
  → shadow: bg-${color}-500
```

`"ghost"` and `"muted"` are checked first as string literals — no ledge shadow is rendered, `skipAnimation: true` is passed to `usePressAnimation`.

**Default color:** `"indigo"` (previously `"grape"`, which mapped to `indigo-500`).

**`pressDepth`** is not exposed as a Button prop. Button internally passes `{ pressDepth: 5 }` to `usePressAnimation` and uses `paddingBottom: 5` on the outer container — both values sourced from a shared constant.

**Internal:** uses `usePressAnimation`. Haptics call (`trigger("impactLight")`) stays in the component, gated by `disabled`.

**Sizes and layout:** unchanged.

---

## 5. PressableCard Component

### Location
`components/ui/pressable-card.tsx`

### Props
```ts
type PressableCardProps = {
  children: React.ReactNode;
  color?: string;              // Tailwind color name. Default: "white"
  shade?: number;              // Face shade (100–800). Shadow = shade + 100. Default: 100. Ignored for white/ghost/muted.
  onPress?: () => void;
  href?: Href;                 // expo-router. href takes precedence over onPress if both provided.
  pressDepth?: number;         // Override usePressAnimation depth. Default: 5
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link' | 'none';
}
```

If both `href` and `onPress` are provided, `href` takes precedence and `onPress` is silently ignored. In `__DEV__`, log a warning: `"PressableCard: both href and onPress provided — onPress will be ignored"`.

### Behavior

| Condition | Rendering | Default accessibilityRole |
|---|---|---|
| `href` provided | `<Link href={href} asChild><Pressable>` | `"link"` |
| `onPress` only | `<Pressable onPress={onPress}>` | `"button"` |
| Neither | `<View>` — no animation, no shadow ledge, no `paddingBottom` | `"none"` |

Uses `usePressAnimation`. Haptics (`trigger("impactLight")`) called in the component's press handler.

### Shadow Ledge

Same pattern as `Button`: an absolutely-positioned `View` behind the face, offset top by `pressDepth`, colored `bg-${color}-${Math.min(shade + 100, 900)}`. Outer container has `paddingBottom: pressDepth`. Omitted entirely for the static (non-interactive) case.

### Color Special Cases

| `color` value | Face class | Shadow class | Press animation |
|---|---|---|---|
| `"white"` (default) | `bg-white` | `bg-gray-100` | yes |
| `"ghost"` | `bg-transparent` | none | `skipAnimation: true` |
| `"muted"` | `bg-white/50` | none | `skipAnimation: true` |
| Any Tailwind scale color | `bg-${color}-${shade}` | `bg-${color}-${min(shade+100, 900)}` | yes |

---

## 6. File Structure

```
hooks/
  animations/
    use-press-animation.ts
    use-mount-animation.ts
    use-pulse.ts
    use-shake.ts
    index.ts

components/
  ui/
    button.tsx             (refactored)
    pressable-card.tsx     (new)

lib/state/
  actions.model.ts         (buttonColor values updated)

app/(tabs)/(settings)/index.tsx   (color prop callsites updated)
app/(action)/[id]/reminders.tsx   (color prop callsite updated)
```

---

## 7. Out of Scope

- Migrating existing `MotiView` usages to `useMountAnimation`.
- Migrating `ActionCard` / `CategoryButton` to use `PressableCard`.
- Dark mode shade variants.
- Exposing `pressDepth` as a prop on `Button`.
