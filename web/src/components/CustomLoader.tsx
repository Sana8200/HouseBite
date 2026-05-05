import type { CSSProperties } from 'react';
import LoadingAnimationUrl from "../assets/animations/loading.png?url";
import { useMounted } from '@mantine/hooks';
import { Transition, type TransitionProps } from '@mantine/core';

export interface CustomLoaderProps {
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

export interface DelayedCustomLoaderProps extends CustomLoaderProps, Omit<TransitionProps, "mounted" | "children"> { }

export function DelayedCustomLoader(props: DelayedCustomLoaderProps) {
  const {
    style,
    size,
    ...transitionProps
  } = props;
  
  const mounted = useMounted();

  return (
    <Transition enterDelay={500} transition="fade" duration={500} {...transitionProps} mounted={mounted}>
      {(transitionStyle) => <CustomLoader style={{...style, ...transitionStyle}} size={size}/>}
    </Transition>
  )
}
