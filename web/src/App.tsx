import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import './App.css'
import { About } from "./pages/about/About";
import { Test } from './pages/test/Test'
import { Landing } from "./pages/landing/Landing";
import { Header } from "./components/Header";
import { HouseHold } from "./pages/household/HouseHold";
import Dashboard from "./pages/dashboard/Dashboard";
import { Account } from "./pages/Account/Account";
import { Receipts } from "./pages/receipts/receipts";
import { SignIn } from "./pages/sign-in/SignIn";
import { ShoppingList } from "./pages/shoppingList/shoppingList";
import { Recipes } from "./pages/recipes/recipes";
import { Pantry } from "./pages/pantry/pantry";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { Scan } from './pages/scan/Scan';

export function App() {
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    void(load());
    async function load() {
      const session = await supabase.auth.getSession();
      if (session.data.session?.user) {
        setUser(session.data.session?.user);
      }
      setLoaded(true);
    }
  }, []);

  // prevents redirect when reopening a tab. we need to wait until we know if we have a user signed in.
  if (!loaded) return <></>;

  let routes;
  if (user) {
    routes = [
      <Route key="sign-in" path="sign-in" element={<Navigate to="/household" />} />,
      <Route key="household" path="household" element={<HouseHold />} />,
      <Route key="dashboard" path="dashboard" element={<Dashboard />} />,
      <Route key="recipes" path="recipes" element={<Recipes />} />,
      <Route key="shopping-list" path="shoppinglist" element={<ShoppingList />} />,
      <Route key="pantry" path="pantry" element={<Pantry />} />,
      <Route key="receipts" path="receipts" element={<Receipts />} />,
      <Route key="about" path="about" element={<About />} />,
      <Route key="account" path="Account" element={<Account user={user} />} />,
      <Route key="scan" path="scan" element={<Scan />} />
    ];
  } else {
    routes = [
      <Route key="sign-in" path="sign-in" element={<SignIn setUser={setUser} />} />,
      <Route key="household" path="household" element={<Navigate to="/sign-in" />} />,
      <Route key="dashboard" path="dashboard" element={<Navigate to="/sign-in" />} />,
      <Route key="shopping-list" path="shoppinglist" element={<Navigate to="/sign-in" />} />,
      <Route key="receipts" path="receipts" element={<Navigate to="/sign-in" />} />,
      <Route key="about" path="about" element={<Navigate to="/sign-in" />} />,
      <Route key="account" path="Account" element={<Navigate to="/sign-in" />} />,
      <Route key="scan" path="scan" element={<Navigate to="/sign-in" />} />
    ];
  }

  return (
    <BrowserRouter>
      <Header user={user}/>
      <Routes>
        <Route index element={<Landing user={user} />} />

        {routes}

        { import.meta.env.DEV &&
          <Route path="test" element={<Test />} />
        }
      </Routes>
    </BrowserRouter>
  )
}
