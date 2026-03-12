import React from "react";
import Svg, { Path, Ellipse, Rect, Circle } from "react-native-svg";

const BauhausCorner = ({ color = "#000", style = {} }) => (
  <Svg viewBox="0 0 200 200" style={style}>
    {/* Overlapping Hexagon */}
    <Path
      d="M40 40 L70 25 L100 40 L100 75 L70 90 L40 75 Z"
      fill={color}
      fillOpacity={0.1}
    />
    {/* Bold Oval */}
    <Ellipse
      cx="120"
      cy="110"
      rx="50"
      ry="25"
      fill={color}
      fillOpacity={0.05}
    />
    {/* Floating Bar */}
    <Rect x="20" y="130" width="80" height="4" fill={color} fillOpacity={0.2} />
    {/* Small Hard Circle */}
    <Circle cx="150" cy="40" r="8" fill={color} fillOpacity={0.3} />
  </Svg>
);

export default BauhausCorner;
