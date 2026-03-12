import React from "react";
import Svg, { Circle, Path, Ellipse, Rect } from "react-native-svg";

const BauhausScatter = ({ color = "black", style = {} }) => (
  <Svg viewBox="0 0 400 400" style={style}>
    {/* Large Circle */}
    <Circle cx="320" cy="80" r="50" fill={color} fillOpacity={0.15} />

    {/* Triangle */}
    <Path d="M50 300 L120 180 L190 300 Z" fill={color} fillOpacity={0.2} />

    {/* Oval */}
    <Ellipse
      cx="250"
      cy="280"
      rx="60"
      ry="30"
      transform="rotate(-20, 250, 280)"
      fill={color}
      fillOpacity={0.1}
    />

    {/* Hexagon */}
    <Path
      d="M330 220 L355 235 L355 265 L330 280 L305 265 L305 235 Z"
      fill={color}
      fillOpacity={0.25}
    />

    {/* Small Accents */}
    <Circle cx="80" cy="60" r="15" fill={color} fillOpacity={0.3} />

    <Rect
      x="180"
      y="40"
      width="40"
      height="40"
      transform="rotate(15, 200, 60)"
      fill={color}
      fillOpacity={0.1}
    />
  </Svg>
);

export default BauhausScatter;
