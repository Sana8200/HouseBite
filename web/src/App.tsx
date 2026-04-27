import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import './App.css'
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
import { Scan } from './pages/scan/Scan';
import { getSession, onAuthStateChange } from "./api/auth";

export function App() {
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    void(load());
    async function load() {
      try {
        const session = await getSession();
        if (session.data.session?.user) {
          setUser(session.data.session?.user);
        }
      } catch (e) {
        console.error("App load failed", e);
      } finally {
        setLoaded(true);
      }
    }

    const { data: { subscription } } = onAuthStateChange((user) => {
      setUser(user);
    });

    return () => subscription.unsubscribe();
  }, []);

  // prevents redirect when reopening a tab. we need to wait until we know if we have a user signed in.
  if (!loaded) return <></>;


  const routes = [
    //     key                 path                                signed in                      not signed in
    <Route key="sign-in"       path="sign-in"      element={user ? <Navigate to="/household" /> : <SignIn />} />,
    <Route key="sign-up"       path="sign-up"      element={user ? <Navigate to="/household" /> : <SignIn defaultTab="signUp" />} />,
    <Route key="household"     path="household"    element={user ? <HouseHold />                : <Navigate to="/sign-in" />} />,
    <Route key="dashboard"     path="dashboard"    element={user ? <Dashboard user={user} />    : <Navigate to="/sign-in" />} />,
    <Route key="recipes"       path="recipes"      element={user ? <Recipes />                  : <Navigate to="/sign-in" />} />,
    <Route key="shopping-list" path="shoppinglist" element={user ? <ShoppingList />             : <Navigate to="/sign-in" />} />,
    <Route key="pantry"        path="pantry"       element={user ? <Pantry user={user} />       : <Navigate to="/sign-in" />} />,
    <Route key="receipts"      path="receipts"     element={user ? <Receipts user={user} />     : <Navigate to="/sign-in" />} />,
    <Route key="account"       path="account"      element={user ? <Account user={user} />      : <Navigate to="/sign-in" />} />,
    <Route key="scan"          path="scan"         element={user ? <Scan user={user} />         : <Navigate to="/sign-in" />} />,
  ];

  return (
    <BrowserRouter>
      <Header user={user}/>
      <Routes>
        <Route index element={<Landing user={user} />} />

        {routes}

      </Routes>
    </BrowserRouter>
  )
}
