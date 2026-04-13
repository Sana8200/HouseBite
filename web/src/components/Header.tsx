
import { NavLink } from "react-router"
import "./Header.css"

export function Header() {
    return (
        <div className="header">
            <NavLink to="/">
                HouseBite
            </NavLink>
            <div className="header-spacer"/>
            { import.meta.env.DEV &&
                <NavLink to="/test">Test</NavLink>
            }
            <NavLink to="/about">About</NavLink>
            <NavLink to="/login">Login</NavLink>
            <NavLink to="/signup">Sign up</NavLink>
            <NavLink to="/household">Household</NavLink>
        </div>
    )
}
