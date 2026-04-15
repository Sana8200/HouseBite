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
            <NavLink to="/" className="header-logo">
                HouseBite
            </NavLink>

            <div className="header-spacer"/>

            <nav className="header-nav">
                {user ? (
                    <>
                        <NavLink to="/household" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                            Households
                        </NavLink>
                        <NavLink to="/scan" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                            Scan
                        </NavLink>
                        <NavLink to="/recipes" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                            Recipes
                        </NavLink>
                        <NavLink to="/Account" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                            Account
                        </NavLink>
                    </>
                ) : (
                    <>
                        <NavLink to="/sign-in" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                            Sign In
                        </NavLink>
                        <NavLink to="/sign-in" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                            Sign Up
                        </NavLink>
                    </>
                )}
                
                <NavLink to="/about" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                    About
                </NavLink>

                {user && (
                    <a href="/" onClick={e => void(logout(e))} className="nav-link logout-link">
                        Logout
                    </a>
                )}
            </nav>
        </div>
    )
}
