import { BrowserRouter, Route, Routes } from "react-router";
import './App.css'
import { Test } from './pages/test/Test'
import { Landing } from "./pages/landing/Landing";
import { Header } from "./components/Header";
import { HouseHold } from "./pages/household/HouseHold";
import Dashboard from "./pages/dashboard/Dashboard";

export function App() {
  return (
    <BrowserRouter>
      <Header/>
      <Routes>
        <Route index element={<Landing />} />
        <Route path="test" element={<Test />} />
        <Route path="household" element={<HouseHold />} />
        <Route path="dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
