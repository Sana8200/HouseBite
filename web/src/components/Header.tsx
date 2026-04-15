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

    const authenticatedLinks = [
        { to: "/household", label: "Households" },
        { to: "/scan", label: "Scan" },
        { to: "/recipes", label: "Recipes" },
        { to: "/Account", label: "Account" },
    ];

    return (
        <div className="header">
            <NavLink to="/" className="header-logo">
                HouseBite
            </NavLink>

            <div className="header-spacer"/>

            <nav className="header-nav">
                {user && (
                    <>
                        {authenticatedLinks.map((link) => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                            >
                                {link.label}
                            </NavLink>
                        ))}
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
