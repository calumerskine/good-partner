import React from "react";
import Svg, { Defs, Pattern, Circle, Path, Rect } from "react-native-svg";

const BauhausGrid = ({ color = "#000", opacity = 0.1, style = {} }) => (
  <Svg width="100%" height="100%" style={style}>
    <Defs>
      <Pattern
        id="bauhaus-grid"
        x="0"
        y="0"
        width="100"
        height="100"
        patternUnits="userSpaceOnUse"
      >
        <Circle cx="20" cy="20" r="12" fill={color} fillOpacity={opacity} />
        <Path
          d="M60 10 L85 10 L72.5 35 Z"
          fill={color}
          fillOpacity={opacity * 1.5}
        />
        <Rect
          x="20"
          y="60"
          width="30"
          height="10"
          rx="5"
          fill={color}
          fillOpacity={opacity}
        />
        <Path
          d="M70 70 L80 60 L90 70 L80 80 Z"
          fill={color}
          fillOpacity={opacity * 2}
        />
      </Pattern>
    </Defs>
    <Rect width="100%" height="100%" fill="url(#bauhaus-grid)" />
  </Svg>
);

export default BauhausGrid;
