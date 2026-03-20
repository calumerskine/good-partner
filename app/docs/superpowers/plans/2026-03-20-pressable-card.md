# Pressable Card & Animation Hook Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract Button's press animation into reusable hooks, create a `PressableCard` component with the same 3D ledge effect, and refactor Button to use dynamic Tailwind color shading.

**Architecture:** Four focused animation hooks live in `hooks/animations/`, barrel-exported from `index.ts`. `Button` is refactored to use `usePressAnimation` and dynamic `bg-${color}-400/500` classes. `PressableCard` is a new primitive in `components/ui/` that wraps `Pressable` or `Link` with the same ledge animation. Color name callsites and `actions.model.ts` are updated so all callers pass standard Tailwind base names.

**Tech Stack:** React Native `Animated` API (`useNativeDriver: true`), `twrnc` for dynamic class resolution, expo-router `Link`, `useHaptics` from `@/hooks/use-haptics`, TypeScript strict mode.

**Verification:** No Jest setup in this project. Use `npx tsc --noEmit` to verify type correctness after each task. Visual verification by running the app.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `hooks/animations/use-press-animation.ts` | Create | translateY spring hook |
| `hooks/animations/use-mount-animation.ts` | Create | fade + scale entrance hook |
| `hooks/animations/use-pulse.ts` | Create | looping scale pulse hook |
| `hooks/animations/use-shake.ts` | Create | one-shot shake hook |
| `hooks/animations/index.ts` | Create | barrel export |
| `components/ui/button.tsx` | Modify | use `usePressAnimation`, dynamic colors |
| `components/ui/pressable-card.tsx` | Create | new PressableCard component |
| `lib/state/actions.model.ts` | Modify | `buttonColor` `raspberry`→`pink`, `mint`→`green` |
| `app/(tabs)/(settings)/index.tsx` | Modify | `grape`→`indigo`, `raspberry`→`pink` |
| `app/(action)/[id]/reminders.tsx` | Modify | `mint`→`green` |

---

## Task 1: `usePressAnimation`

**Files:**
- Create: `hooks/animations/use-press-animation.ts`

- [ ] **Step 1: Create the hook**

```typescript
// hooks/animations/use-press-animation.ts
import { useRef } from "react";
import { Animated, GestureResponderEvent } from "react-native";

export type PressAnimationConfig = {
  pressDepth?: number;
  bounciness?: number;
  disabled?: boolean;
  skipAnimation?: boolean;
};

export function usePressAnimation({
  pressDepth = 5,
  bounciness = 12,
  disabled = false,
  skipAnimation = false,
}: PressAnimationConfig = {}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const shouldAnimate = !disabled && !skipAnimation;

  const handlePressIn = (_event: GestureResponderEvent) => {
    if (shouldAnimate) {
      Animated.spring(translateY, {
        toValue: pressDepth,
        useNativeDriver: true,
        bounciness: 0,
      }).start();
    }
  };

  const handlePressOut = (_event: GestureResponderEvent) => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness,
    }).start();
  };

  return { translateY, handlePressIn, handlePressOut };
}
```

- [ ] **Step 2: TypeScript check**

Run from the app directory root (`good-partner/app`):

```bash
npx tsc --noEmit
```

Expected: no errors related to the new file.

- [ ] **Step 3: Commit**

```bash
git add hooks/animations/use-press-animation.ts
git commit -m "feat: add usePressAnimation hook"
```

---

## Task 2: `useMountAnimation`

**Files:**
- Create: `hooks/animations/use-mount-animation.ts`

- [ ] **Step 1: Create the hook**

```typescript
// hooks/animations/use-mount-animation.ts
import { useEffect, useRef } from "react";
import { Animated } from "react-native";

export type MountAnimationConfig = {
  fromOpacity?: number;
  fromScale?: number;
  fromTranslateY?: number;
  duration?: number;
  delay?: number;
};

export function useMountAnimation({
  fromOpacity = 0,
  fromScale = 0.95,
  fromTranslateY = 0,
  duration = 300,
  delay = 0,
}: MountAnimationConfig = {}) {
  const opacity = useRef(new Animated.Value(fromOpacity)).current;
  const scale = useRef(new Animated.Value(fromScale)).current;
  const translateY = useRef(new Animated.Value(fromTranslateY)).current;

  useEffect(() => {
    const animations = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
      ...(fromTranslateY !== 0
        ? [
            Animated.timing(translateY, {
              toValue: 0,
              duration,
              delay,
              useNativeDriver: true,
            }),
          ]
        : []),
    ]);
    animations.start();
  }, []);

  const animatedStyle = {
    opacity,
    transform: [{ scale }, { translateY }],
  };

  return { animatedStyle };
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add hooks/animations/use-mount-animation.ts
git commit -m "feat: add useMountAnimation hook"
```

---

## Task 3: `usePulse`

**Files:**
- Create: `hooks/animations/use-pulse.ts`

- [ ] **Step 1: Create the hook**

```typescript
// hooks/animations/use-pulse.ts
import { useEffect, useRef } from "react";
import { Animated } from "react-native";

export type PulseConfig = {
  minScale?: number;
  maxScale?: number;
  duration?: number;
  autoStart?: boolean;
};

export function usePulse({
  minScale = 1.0,
  maxScale = 1.08,
  duration = 800,
  autoStart = true,
}: PulseConfig = {}) {
  const scale = useRef(new Animated.Value(minScale)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  const start = () => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: maxScale,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: minScale,
          duration,
          useNativeDriver: true,
        }),
      ]),
    );
    loopRef.current = loop;
    loop.start();
  };

  const stop = () => {
    loopRef.current?.stop();
    loopRef.current = null;
    scale.setValue(minScale);
  };

  useEffect(() => {
    if (autoStart) start();
    return () => {
      loopRef.current?.stop();
    };
  }, []);

  const animatedStyle = { transform: [{ scale }] };

  return { animatedStyle, start, stop };
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add hooks/animations/use-pulse.ts
git commit -m "feat: add usePulse hook"
```

---

## Task 4: `useShake`

**Files:**
- Create: `hooks/animations/use-shake.ts`

- [ ] **Step 1: Create the hook**

```typescript
// hooks/animations/use-shake.ts
import { useRef } from "react";
import { Animated } from "react-native";

export type ShakeConfig = {
  intensity?: number;
  duration?: number;
};

export function useShake({ intensity = 10, duration = 60 }: ShakeConfig = {}) {
  const translateX = useRef(new Animated.Value(0)).current;

  const trigger = () => {
    translateX.setValue(0);
    Animated.sequence([
      Animated.timing(translateX, {
        toValue: intensity,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: -intensity,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: intensity,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animatedStyle = { transform: [{ translateX }] };

  return { animatedStyle, trigger };
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add hooks/animations/use-shake.ts
git commit -m "feat: add useShake hook"
```

---

## Task 5: Barrel Export

**Files:**
- Create: `hooks/animations/index.ts`

- [ ] **Step 1: Create the barrel**

```typescript
// hooks/animations/index.ts
export { usePressAnimation } from "./use-press-animation";
export type { PressAnimationConfig } from "./use-press-animation";

export { useMountAnimation } from "./use-mount-animation";
export type { MountAnimationConfig } from "./use-mount-animation";

export { usePulse } from "./use-pulse";
export type { PulseConfig } from "./use-pulse";

export { useShake } from "./use-shake";
export type { ShakeConfig } from "./use-shake";
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add hooks/animations/index.ts
git commit -m "feat: add animations barrel export"
```

---

## Task 6: Refactor Button

Replace the static `colors`/`shadows` maps with dynamic `bg-${color}-400/500` shading and wire in `usePressAnimation`.

**Files:**
- Modify: `components/ui/button.tsx`

- [ ] **Step 1: Rewrite the file**

The key changes:
- Remove `colors` and `shadows` maps
- `color` prop type changes from `keyof typeof colors` to `string`
- Default changes from `"grape"` to `"indigo"`
- `isSpecial` check: `color === "ghost" || color === "muted"`
- Face class: `isSpecial ? (color === "muted" ? "bg-white/50" : "bg-transparent") : \`bg-${color}-400\``
- Shadow class: `` `bg-${color}-500` ``
- Replace inline `translateY` ref + spring logic with `usePressAnimation`
- Pass `skipAnimation: isSpecial` to the hook

```typescript
import { usePressAnimation } from "@/hooks/animations";
import { useHaptics } from "@/hooks/use-haptics";
import tw from "@/lib/tw";
import React, { forwardRef } from "react";
import {
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

const PRESS_DEPTH = 5;

const sizes = {
  sm: { padding: "py-2 px-6", text: "text-base" },
  md: { padding: "py-4 px-8", text: "text-lg" },
  lg: { padding: "py-5 px-10", text: "text-xl" },
};

type Props = PressableProps & {
  children: React.ReactNode;
  color?: string;
  size?: keyof typeof sizes;
  buttonStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export default forwardRef(function Button(
  {
    children,
    color = "indigo",
    size = "md",
    disabled,
    buttonStyle,
    textStyle,
    ...props
  }: Props,
  ref: React.Ref<View>,
) {
  const { trigger } = useHaptics();
  const isSpecial = color === "ghost" || color === "muted";
  const isDisabled = disabled || false;

  const { translateY, handlePressIn, handlePressOut } = usePressAnimation({
    pressDepth: PRESS_DEPTH,
    disabled: isDisabled,
    skipAnimation: isSpecial,
  });

  const faceClass = isSpecial
    ? color === "muted"
      ? "bg-white/50"
      : "bg-transparent"
    : `bg-${color}-400`;

  const shadowClass = `bg-${color}-500`;

  const onPressIn = (event: any) => {
    handlePressIn(event);
    props.onPressIn?.(event);
    if (!isDisabled) trigger("impactLight");
  };

  const onPressOut = (event: any) => {
    handlePressOut(event);
    props.onPressOut?.(event);
  };

  return (
    <View style={[tw`relative`, { paddingBottom: PRESS_DEPTH }]}>
      {!isSpecial && (
        <View
          style={[
            tw.style(shadowClass, `rounded-3xl absolute inset-0`),
            { top: PRESS_DEPTH },
          ]}
        />
      )}

      <Animated.View style={{ transform: [{ translateY }] }}>
        <Pressable
          {...props}
          ref={ref}
          disabled={isDisabled}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={[
            tw.style(
              `rounded-3xl w-full ${sizes[size].padding}`,
              faceClass,
            ),
            buttonStyle,
          ]}
        >
          <Text
            style={[
              tw.style(
                `text-center font-gabarito font-medium ${sizes[size].text} uppercase tracking-widest`,
                isSpecial ? "text-ink" : "text-white",
              ),
              textStyle,
            ]}
          >
            {children}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
});
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors. The `color` prop is now `string` so existing callers with old names like `"raspberry"` will still type-check (they'll just render incorrectly until Task 7).

- [ ] **Step 3: Commit**

```bash
git add components/ui/button.tsx
git commit -m "refactor: Button uses usePressAnimation and dynamic color shading"
```

---

## Task 7: Migrate Color Names

Update `actions.model.ts` and the three direct Button callsites to use valid Tailwind base color names.

**Files:**
- Modify: `lib/state/actions.model.ts`
- Modify: `app/(tabs)/(settings)/index.tsx` (lines 72 and 175)
- Modify: `app/(action)/[id]/reminders.tsx` (line 68)

- [ ] **Step 1: Update `actions.model.ts`**

Change:
- `buttonColor: "raspberry"` → `buttonColor: "pink"` (AFFECTION)
- `buttonColor: "mint"` → `buttonColor: "green"` (REPAIR)

`"blue"` (ATTENTION) and `"yellow"` (INITIATIVE) are already valid — no change.

- [ ] **Step 2: Update `app/(tabs)/(settings)/index.tsx`**

Line 72: `color="grape"` → `color="indigo"`
Line 175: `color="raspberry"` → `color="pink"`

- [ ] **Step 3: Update `app/(action)/[id]/reminders.tsx`**

Line 68: `color="mint"` → `color="green"`

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add lib/state/actions.model.ts app/(tabs)/\(settings\)/index.tsx "app/(action)/[id]/reminders.tsx"
git commit -m "fix: update Button color names to standard Tailwind base names"
```

---

## Task 8: PressableCard

**Files:**
- Create: `components/ui/pressable-card.tsx`

- [ ] **Step 1: Create the component**

```typescript
// components/ui/pressable-card.tsx
import { usePressAnimation } from "@/hooks/animations";
import { useHaptics } from "@/hooks/use-haptics";
import tw from "@/lib/tw";
import { Href, Link } from "expo-router";
import React from "react";
import {
  Animated,
  Pressable,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";

const PRESS_DEPTH = 5;

type PressableCardProps = {
  children: React.ReactNode;
  color?: string;
  shade?: number;
  onPress?: () => void;
  href?: Href;
  pressDepth?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: "button" | "link" | "none";
};

function clampShade(shade: number): number {
  return Math.max(100, Math.min(800, shade));
}

function getColorClasses(color: string, shade: number) {
  if (color === "ghost") {
    return { faceClass: "bg-transparent", shadowClass: null, isSpecial: true };
  }
  if (color === "muted") {
    return { faceClass: "bg-white/50", shadowClass: null, isSpecial: true };
  }
  if (color === "white") {
    return { faceClass: "bg-white", shadowClass: "bg-gray-100", isSpecial: false };
  }
  const s = clampShade(shade);
  const shadowShade = Math.min(s + 100, 900);
  return {
    faceClass: `bg-${color}-${s}`,
    shadowClass: `bg-${color}-${shadowShade}`,
    isSpecial: false,
  };
}

export default function PressableCard({
  children,
  color = "white",
  shade = 100,
  onPress,
  href,
  pressDepth = PRESS_DEPTH,
  style,
  disabled = false,
  accessibilityLabel,
  accessibilityRole,
}: PressableCardProps) {
  const { trigger } = useHaptics();
  const isInteractive = !!(href || onPress);
  const { faceClass, shadowClass, isSpecial } = getColorClasses(color, shade);

  const { translateY, handlePressIn, handlePressOut } = usePressAnimation({
    pressDepth,
    disabled,
    skipAnimation: isSpecial || !isInteractive,
  });

  if (__DEV__ && href && onPress) {
    console.warn(
      "PressableCard: both href and onPress provided — onPress will be ignored",
    );
  }

  const defaultRole = href ? "link" : onPress ? "button" : "none";
  const role = accessibilityRole ?? defaultRole;

  if (!isInteractive) {
    return (
      <View style={[tw.style(`rounded-2xl overflow-hidden`, faceClass), style]}>
        {children}
      </View>
    );
  }

  const onPressIn = (event: any) => {
    handlePressIn(event);
    if (!disabled) trigger("impactLight");
  };

  const pressableEl = (
    <Pressable
      onPress={href ? undefined : onPress}
      onPressIn={onPressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={role === "none" ? undefined : role}
      style={[tw.style(`rounded-2xl overflow-hidden`, faceClass), style]}
    >
      {children}
    </Pressable>
  );

  return (
    <View style={[tw`relative`, { paddingBottom: pressDepth }]}>
      {shadowClass && (
        <View
          style={[
            tw.style(shadowClass, `rounded-2xl absolute inset-0`),
            { top: pressDepth },
          ]}
        />
      )}
      <Animated.View style={{ transform: [{ translateY }] }}>
        {href ? (
          <Link href={href} asChild>
            {pressableEl}
          </Link>
        ) : (
          pressableEl
        )}
      </Animated.View>
    </View>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Verify visually**

Run the app (`expo start`) and check:
1. Existing buttons still animate with the ledge press effect
2. Navigate to settings — the indigo and pink buttons render correctly
3. Navigate to reminders — the green button renders correctly
4. The suggestion card and active actions cards still render (they use `buttonColor` via `actions.model.ts`, now fixed to `"pink"` and `"green"`)

- [ ] **Step 4: Commit**

```bash
git add components/ui/pressable-card.tsx
git commit -m "feat: add PressableCard component with ledge press animation"
```
