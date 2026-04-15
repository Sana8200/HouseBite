import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider, createTheme } from "@mantine/core";
import "@mantine/core/styles.css";
import "./styles/tokens.css";
import "./styles/globals.css";
import { App } from './App.tsx'


const theme = createTheme({
  primaryColor: "brand",
  colors: {
    brand: [
      "#f1f8f4",
      "#dceee3",
      "#bddbc9",
      "#97c3ab",
      "#6ea282",
      "#4f8667",
      "#3f6f55",
      "#345a46",
      "#2b4939",
      "#243c30",
    ],
  },
  fontFamily: 'Inter, "Segoe UI", sans-serif',
  defaultRadius: "md",
  radius: {
    sm: "6px",
    md: "10px",
    lg: "16px",
    xl: "24px",
  },
  shadows: {
    sm: "0 2px 8px rgba(31, 42, 35, 0.08)",
    md: "0 8px 24px rgba(31, 42, 35, 0.12)",
    lg: "0 16px 40px rgba(31, 42, 35, 0.16)",
  },
});


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme}>
        <App />
    </MantineProvider>
  </StrictMode>,
)
