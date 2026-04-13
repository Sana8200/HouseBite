import { BrowserRouter, Route, Routes } from "react-router";
import './App.css'
import { Test } from './pages/test/Test'
import { Landing } from "./pages/landing/Landing";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<Landing />} />
        <Route path="test" element={<Test />} />
      </Routes>
    </BrowserRouter>
  )
}
