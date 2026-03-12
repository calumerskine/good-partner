import React, { useMemo, useEffect } from "react";
import { DimensionValue, ViewStyle } from "react-native";
import { Canvas, Path, Group, Skia } from "@shopify/react-native-skia";
import {
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  useDerivedValue,
} from "react-native-reanimated";

type ShapeType =
  | "half-oval"
  | "hexagon"
  | "pill"
  | "arch"
  | "circle"
  | "triangle"
  | "trapezoid"
  | "stripes";

interface BauhausSkiaProps {
  seed?: string;
  type?: ShapeType;
  color?: string;
  opacity?: number;
  anchor?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "center";
  distance?: number;
  size?: number;
  shapeScale?: number;
  strokeOnly?: boolean;
  strokeWidth?: number;
  /** Animation logic */
  animation?: "float" | "pulse" | "rotate" | "none";
  speed?: number; // 1 = normal, 2 = fast, 0.5 = slow
  nudge?: [number, number];
}

const SHAPES: Record<ShapeType, string> = {
  "half-oval": "M -100,0 A 100,100 0 0,1 100,0 L 100,0 L -100,0 Z",
  hexagon: "M -50,-86 L 50,-86 L 100,0 L 50,86 L -50,86 L -100,0 Z",
  arch: "M -70,100 L -70,-30 A 70,70 0 0,1 70,-30 L 70,100 Z",
  pill: "M -80,-40 H 80 A 40,40 0 0,1 80,40 H -80 A 40,40 0 0,1 -80,-40 Z",
  circle: "M 0,0 m -80,0 a 80,80 0 1,0 160,0 a 80,80 0 1,0 -160,0",
  triangle: "M 0,-90 L 90,80 L -90,80 Z",
  trapezoid: "M -90,60 L -50,-60 L 50,-60 L 90,60 Z",
  stripes: "M -100,-60 H 100 M -100,-20 H 100 M -100,20 H 100 M -100,60 H 100",
};

const BauhausSkiaShape = ({
  seed = "bauhaus",
  type = "half-oval",
  color = "#000",
  opacity = 0.2,
  anchor = "top-right",
  distance = 0.5,
  size = 300,
  shapeScale = 1,
  strokeOnly = false,
  strokeWidth = 2,
  animation = "none",
  speed = 1,
  nudge = [0, 0],
}: BauhausSkiaProps) => {
  // 1. Deterministic Seed Math
  const { rotation, baseDuration } = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    return {
      rotation: (Math.abs(hash) * 137) % 360,
      baseDuration: 4000 + (Math.abs(hash) % 2000),
    };
  }, [seed]);

  // 2. Animation Logic (Reanimated values drive Skia)
  const anim = useSharedValue(0);
  const duration = baseDuration / speed;

  useEffect(() => {
    if (animation === "none") return;
    anim.value = withRepeat(
      withSequence(
        withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [animation, speed]);

  // 3. Derived transforms for Skia Group
  const transform = useDerivedValue(() => {
    const rad = (rotation * Math.PI) / 180;
    const floatY = animation === "float" ? anim.value * 15 : 0;
    const pulseScale = animation === "pulse" ? 1 + anim.value * 0.1 : 1;
    const rotateAdd = animation === "rotate" ? anim.value * Math.PI * 2 : 0;

    return [
      { translateX: nudge[0] + size / 2 }, // Center in canvas
      { translateY: nudge[1] + size / 2 + floatY },
      { rotate: rad + rotateAdd },
      { scale: shapeScale * pulseScale },
    ];
  });

  const skiaOpacity = useDerivedValue(() => {
    return animation === "pulse" ? opacity + anim.value * 0.1 : opacity;
  });

  // 4. Position Layout (Standard React Native)
  const containerStyle = useMemo((): ViewStyle => {
    const isCenter = anchor === "center";
    const edgePos = (25 - distance * 75 + "%") as DimensionValue;
    const styles: ViewStyle = {
      position: "absolute",
      width: size,
      height: size,
      zIndex: -1,
    };

    if (isCenter) {
      styles.top = "50%";
      styles.left = "50%";
      styles.transform = [{ translateX: -size / 2 }, { translateY: -size / 2 }];
    } else {
      const [vDir, hDir] = anchor.split("-");
      styles[vDir as "top" | "bottom"] = edgePos;
      styles[hDir as "left" | "right"] = edgePos;
    }
    return styles;
  }, [anchor, distance, size]);

  const skiaPath = useMemo(
    () => Skia.Path.MakeFromSVGString(SHAPES[type]),
    [type],
  );

  return (
    <Canvas style={containerStyle}>
      <Group transform={transform} opacity={skiaOpacity}>
        <Path
          path={skiaPath!}
          color={color}
          style={strokeOnly || type === "stripes" ? "stroke" : "fill"}
          strokeWidth={strokeWidth}
          strokeCap="round"
          strokeJoin="round"
        />
      </Group>
    </Canvas>
  );
};

export default BauhausSkiaShape;
