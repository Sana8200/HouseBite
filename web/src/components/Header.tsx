import { NavLink } from "react-router"
import "./Header.css"
import type { User } from "@supabase/supabase-js"
import { signOut } from "../supabase";

export interface HeaderProps {
    user: User | null,
}

export function Header(props: HeaderProps) {
    const {user} = props;


    const logout = async (e: React.MouseEvent) => {
        e.preventDefault();
        await signOut();
    };

    return (
        <div className="header">
            <NavLink to="/">
                HouseBite
            </NavLink>

            <div className="header-spacer"/>

            {user && <NavLink to="/dashboard">Dashboard</NavLink>}
            {user && <NavLink to="/household">Households</NavLink>}
            {user && <NavLink to="/scan">Scan</NavLink>}
            {user && <NavLink to="/recipes">Recipes</NavLink>}
            {!user && <NavLink to="/sign-in">Sign-in</NavLink>}
            {!user && <NavLink to="/sign-up">Sign-up</NavLink>}
            {user && <NavLink to="/settings">Settings</NavLink>}
            <NavLink to="/about">About</NavLink>

            {user && <a href="/" onClick={e => void(logout(e))}>Logout</a>}
        </div>
    )
}
