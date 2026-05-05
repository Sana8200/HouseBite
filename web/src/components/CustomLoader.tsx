import type { CSSProperties } from 'react';
import LoadingAnimationUrl from "../assets/animations/loading.png?url";

interface CustomLoaderProps {
  size?: number | string;
  style?: CSSProperties;
}

export function CustomLoader({ size = 120, style }: CustomLoaderProps) {
  const baseStyle: CSSProperties = {
    width: typeof size === 'number' ? `${size}px` : size,
    height: 'auto',
    display: 'block',
  };

  return (
    <img 
      src={LoadingAnimationUrl}
      alt="Loading..." 
      style={style ? { ...baseStyle, ...style } : baseStyle}
    />
  );
}
