import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import './App.css'
import { Test } from './pages/test/Test'
import { Landing } from "./pages/landing/Landing";
import { Header } from "./components/Header";
import { HouseHold } from "./pages/household/HouseHold";
import Dashboard from "./pages/dashboard/Dashboard";
import { SignIn } from "./pages/sign-in/SignIn";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export function App() {
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.onAuthStateChange((_e, s) => {
      if (s?.user) setUser(s.user);
      setLoaded(true);
    });
  }, []);

  // prevents redirect when reopening a tab. we need to wait until we know if we have a user signed in.
  if (!loaded) return <></>;

  let routes;
  if (user) {
    routes = [
      <Route key="sign-in" path="sign-in" element={<Navigate to="/household" />} />,
      <Route key="household" path="household" element={<HouseHold />} />,
      <Route key="dashboard" path="dashboard" element={<Dashboard />} />
    ];
  } else {
    routes = [
      <Route key="sign-in" path="sign-in" element={<SignIn setUser={setUser} />} />,
      <Route key="household" path="household" element={<Navigate to="/sign-in" />} />,
      <Route key="dashboard" path="dashboard" element={<Navigate to="/sign-in" />} />
    ];
  }

  return (
    <BrowserRouter>
      <Header user={user}/>
      <Routes>
        <Route index element={<Landing />} />

        {routes}

        { import.meta.env.DEV &&
          <Route path="test" element={<Test />} />
        }
      </Routes>
    </BrowserRouter>
  )
}
