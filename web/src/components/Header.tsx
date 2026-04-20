import { Menu } from "@mantine/core";
import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router"
import "./Header.css"
import type { User } from "@supabase/supabase-js"
import { getHouseholds } from "../api/household";
import { signOut } from "../api/auth";

export interface HeaderProps {
    user: User | null,
}

interface HouseholdOption {
    id: string,
    house_name: string,
}

export function Header(props: HeaderProps) {
    const {user} = props;
    const navigate = useNavigate();
    const location = useLocation();
    const [households, setHouseholds] = useState<HouseholdOption[]>([]);

    const logout = async (e: React.MouseEvent) => {
        e.preventDefault();
        await signOut();
        navigate("/");
    };

    useEffect(() => {
        if (!user) {
            setHouseholds([]);
            return;
        }

        void loadHouseholds();

        async function loadHouseholds() {
            const { data } = await getHouseholds();
            setHouseholds((data ?? []).map((household) => ({
                id: household.id,
                house_name: household.house_name,
            })));
        }
    }, [user]);

    const authenticatedLinks = [
        { to: "/scan", label: "Scan" },
        { to: "/recipes", label: "Recipes" },
        { to: "/account", label: "Account" },
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
                        <Menu
                            shadow="md"
                            width={260}
                            position="bottom-start"
                            offset={8}
                            trigger="hover"
                            openDelay={80}
                            closeDelay={120}
                        >
                            <Menu.Target>
                                <NavLink
                                    to="/household"
                                    className={`nav-link header-households-trigger${
                                        location.pathname === "/household" || location.pathname === "/dashboard"
                                            ? " active"
                                            : ""
                                    }`}
                                >
                                    Households
                                </NavLink>
                            </Menu.Target>

                            <Menu.Dropdown className="header-households-menu">
                                <Menu.Label>Your households</Menu.Label>
                                {households.map((household) => (
                                    <Menu.Item
                                        key={household.id}
                                        onClick={() => navigate("/dashboard", {
                                            state: {
                                                householdId: household.id,
                                                householdName: household.house_name,
                                            },
                                        })}
                                    >
                                        {household.house_name}
                                    </Menu.Item>
                                ))}
                                {!households.length && (
                                    <Menu.Item disabled>No households yet</Menu.Item>
                                )}
                            </Menu.Dropdown>
                        </Menu>

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
