import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from '@mantine/notifications';
import "@mantine/core/styles.css";
import '@mantine/notifications/styles.css';
import '@mantine/dropzone/styles.css';
import "./styles/globals.css";
import "./styles/loader-override.css";
import { App } from './App.tsx'

const brand: [string,string,string,string,string,string,string,string,string,string] = [
  '#eef7f2',
  '#d1ead9',
  '#a2d3b3',
  '#6fb98a',
  '#3d9e63',
  '#16833f',
  '#00572E',
  '#004826',
  '#003a1e',
  '#002c16',
]

const semantic = {
  surface:      '#FBF4EB',
  surfaceMuted: '#F2E7D9',
  border:       '#E0D5C5',
  white:        '#FFFFFF',
  text:         '#26221B',
  textMuted:    '#5A6E65',
  success:      '#93A664',
  warning:      '#C76842',
  warningSmall: '#E6A55B',
  danger:       '#AD311D',
  dangerSoft:   '#fdf3f1',
  dangerBorder: '#f5cfc9',
  info:         '#546F9E',
}

const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: 6,
  colors: { brand },
  fontFamily: 'Epilogue, "Segoe UI", sans-serif',
  headings: {
    fontFamily: 'Gloock, Georgia, serif',
    fontWeight: '400',
  },
  defaultRadius: 'md',
  radius: {
    sm: '6px',
    md: '10px',
    lg: '16px',
    xl: '24px',
  },
  spacing: {
    xs: '6px',
    sm: '12px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  fontSizes: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '20px',
    xl: '24px',
  },
  shadows: {
    sm: '0 2px 8px rgba(38, 34, 27, 0.08)',
    md: '0 8px 24px rgba(38, 34, 27, 0.12)',
    lg: '0 16px 40px rgba(38, 34, 27, 0.16)',
  },
})

const cssVariablesResolver = () => ({
  variables: {
    // Brand scale
    '--color-primary-50':  brand[0],
    '--color-primary-100': brand[1],
    '--color-primary-200': brand[2],
    '--color-primary-300': brand[3],
    '--color-primary-400': brand[4],
    '--color-primary-500': brand[5],
    '--color-primary-600': brand[6],
    '--color-primary-700': brand[7],
    '--color-primary-800': brand[8],
    '--color-primary-900': brand[9],
    // Legacy aliases used in App.css utility classes
    '--color-primary':       brand[6],
    '--color-primary-hover': brand[5],
    '--color-primary-soft':  brand[0],
    // Surface & text — mantine-color-body makes all Paper/Card defaults use surface
    '--mantine-color-body':  semantic.surface,
    '--color-white':         semantic.white,
    '--color-surface':       semantic.surface,
    '--color-surface-muted': semantic.surfaceMuted,
    '--color-border':        semantic.border,
    '--color-text':          semantic.text,
    '--color-text-muted':    semantic.textMuted,
    // Legacy text aliases
    '--color-muted':         semantic.textMuted,
    '--color-subtle':        semantic.textMuted,
    '--color-bg-soft':       semantic.surfaceMuted,
    // Feedback
    '--color-success':        semantic.success,
    '--color-warning':        semantic.warning,
    '--color-danger':         semantic.danger,
    '--color-danger-soft':    semantic.dangerSoft,
    '--color-danger-border':  semantic.dangerBorder,
    // Typography
    '--font-family-base':    'Epilogue, "Segoe UI", sans-serif',
    '--font-family-display': 'Gloock, Georgia, serif',
    '--font-size-100': '12px',
    '--font-size-200': '14px',
    '--font-size-300': '16px',
    '--font-size-400': '20px',
    '--font-size-500': '24px',
    '--font-size-600': '32px',
    '--font-size-700': '36px',
    '--font-size-800': '48px',
    '--font-weight-regular':  '400',
    '--font-weight-medium':   '500',
    '--font-weight-semibold': '600',
    '--font-weight-bold':     '700',
    // Spacing — numeric tokens
    '--space-1': '4px',
    '--space-2': '8px',
    '--space-3': '12px',
    '--space-4': '16px',
    '--space-5': '24px',
    '--space-6': '32px',
    '--space-7': '40px',
    '--space-8': '48px',
    // Spacing — legacy named aliases (App.css)
    '--space-xs': '6px',
    '--space-sm': '12px',
    '--space-md': '16px',
    '--space-lg': '24px',
    '--space-xl': '32px',
    // Radius
    '--radius-sm': '6px',
    '--radius-md': '10px',
    '--radius-lg': '16px',
    '--radius-xl': '24px',
    // Shadows (tinted toward text color #26221B)
    '--shadow-sm': '0 2px 8px rgba(38, 34, 27, 0.08)',
    '--shadow-md': '0 8px 24px rgba(38, 34, 27, 0.12)',
    '--shadow-lg': '0 16px 40px rgba(38, 34, 27, 0.16)',
    // Breakpoints
    '--bp-sm':  '640px',
    '--bp-md':  '768px',
    '--bp-lg':  '1024px',
    '--bp-xl':  '1280px',
  },
  dark: {},
  light: {},
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver}>
      <Notifications position='bottom-right' />
      <App />
    </MantineProvider>
  </StrictMode>,
)
