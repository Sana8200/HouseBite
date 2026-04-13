import { BrowserRouter, Route, Routes } from "react-router";
import './App.css'
import { Test } from './pages/test/Test'
import { Landing } from "./pages/landing/Landing";
import { Header } from "./components/Header";
import Dashboard from "./pages/dashboard/Dashboard";

export function App() {
  return (
    <BrowserRouter>
      <Header/>
      <Routes>
        <Route index element={<Landing />} />
        <Route path="test" element={<Test />} />
        <Route path="dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
