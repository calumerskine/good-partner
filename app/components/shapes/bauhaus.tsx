import React from "react";
import Svg, { Circle, Path, Rect, G, Ellipse } from "react-native-svg";

interface BauhausProps {
  seed?: string;
  color?: string;
  opacity?: number;
}

const getSeedFromId = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

const BauhausBackground = ({
  seed = "random",
  color = "#000",
  opacity = 1,
}: BauhausProps) => {
  const getRot = (factor: number) => (getSeedFromId(seed) * factor) % 360;

  return (
    <Svg
      viewBox="0 0 200 200"
      preserveAspectRatio="xMidYMid slice"
      // 1. We manually define the position to ignore parent padding
      // 2. We use -20% to ensure it "overshoots" the right-hand and bottom gaps
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: "-20%",
        bottom: "-20%",
        opacity,
        transform: [{ scale: 1.4 }], // Extra zoom to keep shapes chunky
      }}
      pointerEvents="none"
    >
      <G transform={`rotate(${getRot(137)}, 100, 100)`}>
        {/* Large shapes placed at extremes to ensure coverage */}
        <Circle cx="-50" cy="100" r="140" fill={color} fillOpacity={0.6} />

        <Ellipse
          cx="250"
          cy="100"
          rx="120"
          ry="60"
          fill={color}
          fillOpacity={0.8}
          transform={`rotate(${getRot(45)}, 250, 100)`}
        />

        <Rect
          x="-50"
          y="160"
          width="300"
          height="80"
          fill={color}
          fillOpacity={0.5}
          transform={`rotate(-10, 100, 100)`}
        />

        <Path d="M220 -20 L280 60 L180 80 Z" fill={color} fillOpacity={0.5} />
      </G>
    </Svg>
  );
};

export default BauhausBackground;
