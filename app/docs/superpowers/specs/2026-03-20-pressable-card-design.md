# Pressable Card & Animation Hook Library

**Date:** 2026-03-20
**Status:** Approved

## Overview

Extract the 3D press animation from `Button` into a reusable `usePressAnimation` hook, introduce three additional animation hooks for common UI patterns, refactor `Button` to use dynamic Tailwind color shading, and create a new `PressableCard` component that applies the same press-animation style to card-shaped surfaces.

---

## 1. Animation Hook Library

### Location
`hooks/animations/` — barrel-exported from `hooks/animations/index.ts`

### `usePressAnimation`

Extracted directly from `Button`. Manages a `translateY` Animated.Value and provides press event handlers.

**Config:**
```ts
type PressAnimationConfig = {
  pressDepth?: number;     // translateY on press. Default: 5
  bounciness?: number;     // spring bounciness on release. Default: 12
  disabled?: boolean;      // skip animation when true. Default: false
  skipAnimation?: boolean; // for ghost/muted variants — no translate. Default: false
}
```

**Returns:**
```ts
{
  translateY: Animated.Value;
  handlePressIn: (event: GestureEvent) => void;
  handlePressOut: (event: GestureEvent) => void;
}
```

Callers wrap their content in `<Animated.View style={{ transform: [{ translateY }] }}>` and spread `handlePressIn`/`handlePressOut` onto their `<Pressable>`.

---

### `useMountAnimation`

Fade + transform entrance on mount. Replaces the `MotiView` pattern used in `XPHeroCard` and similar components for components that want to avoid the Moti dependency.

**Config:**
```ts
type MountAnimationConfig = {
  fromOpacity?: number;     // Default: 0
  fromScale?: number;       // Default: 0.95
  fromTranslateY?: number;  // Default: 0 (disabled by default)
  duration?: number;        // Default: 300
  delay?: number;           // Default: 0
}
```

**Returns:** `{ animatedStyle: Animated.WithAnimatedValue<ViewStyle> }`

Applied directly to an `<Animated.View>`.

---

### `usePulse`

Looping scale pulse. Useful for drawing attention — streak badges, notification indicators, CTA elements.

**Config:**
```ts
type PulseConfig = {
  minScale?: number;   // Default: 1.0
  maxScale?: number;   // Default: 1.08
  duration?: number;   // Default: 800
  autoStart?: boolean; // Start pulsing on mount. Default: true
}
```

**Returns:** `{ animatedStyle, start: () => void, stop: () => void }`

---

### `useShake`

One-shot horizontal shake. Used for error feedback — failed form submission, invalid input, etc.

**Config:**
```ts
type ShakeConfig = {
  intensity?: number; // px offset. Default: 10
  duration?: number;  // total shake duration ms. Default: 500
}
```

**Returns:** `{ animatedStyle, trigger: () => void }`

`trigger()` fires the shake sequence imperatively — call it from a validation handler.

---

## 2. Button Refactor

### Dynamic Color Shading

Replace the static `colors` and `shadows` maps with dynamic Tailwind shade derivation:

```ts
// Before
const colors = { grape: "bg-indigo-500", mint: "bg-green-500", ... }
const shadows = { grape: "bg-indigo-600", mint: "bg-green-600", ... }

// After
// color prop is a Tailwind color name, e.g. "indigo", "green", "pink"
// face:   `bg-${color}-400`
// shadow: `bg-${color}-500`
```

`ghost` and `muted` remain as special-cased string checks — no ledge shadow, no press translation (`skipAnimation: true` passed to `usePressAnimation`).

**Default color:** `indigo` (previously `grape`, which mapped to `indigo-500`).

**Sizes and layout:** unchanged.

**Internal:** uses `usePressAnimation` hook. Haptics call stays in the component.

---

## 3. PressableCard Component

### Location
`components/ui/pressable-card.tsx`

### Props
```ts
type PressableCardProps = {
  children: React.ReactNode;
  color?: string;              // Tailwind color name. Default: "white"
  shade?: number;              // Face shade level. Default: 100. Shadow: shade + 100
  onPress?: () => void;
  href?: Href;                 // expo-router Href — renders <Link asChild>
  pressDepth?: number;         // Override usePressAnimation depth. Default: 5
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}
```

### Behavior

- **`href` provided:** wraps `<Pressable>` in `<Link asChild>` for navigation.
- **`onPress` provided:** plain `<Pressable>` with the handler.
- **Neither:** renders as a static `<View>` — no press animation, no shadow ledge.
- Uses `usePressAnimation` with haptics (same pattern as `Button`).

### Shadow Ledge

Identical to `Button` — a `View` positioned behind the face, offset by `pressDepth`, colored at `bg-${color}-${shade + 100}`. The outer container has `paddingBottom: pressDepth` to reserve space.

### Color Defaults

`color="white"` → face `bg-white-100` (effectively `bg-white`), shadow `bg-gray-100`. For neutral cards this produces a subtle lift effect. Callers can pass any Tailwind color name.

---

## 4. File Structure

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
    button.tsx          (refactored)
    pressable-card.tsx  (new)
```

---

## 5. Out of Scope

- Migrating existing `MotiView` usages to `useMountAnimation` — possible follow-up.
- Migrating `ActionCard` / `CategoryButton` to use `PressableCard` — separate task after the primitive exists.
- Dark mode shade variants.
