import { Flex, Menu, Space, useMantineTheme } from "@mantine/core";
import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router"
import "./Header.css"
import type { User } from "@supabase/supabase-js";
import { getHouseholds } from "../api/household";
import { signOut } from "../api/auth";
import { useMediaQuery } from "@mantine/hooks";
import { IconLogout, IconUser, IconCamera, IconDeviceTabletStar, IconHome } from "@tabler/icons-react";
import type { Household } from "../api/schema";
import IconHouseBite from "../assets/icon.svg";
import { supabase } from "../supabase";

export interface HeaderProps {
    user: User | null,
}

export function Header(props: HeaderProps) {
    const {user} = props;
    const navigate = useNavigate();
    const location = useLocation();
    const [households, setHouseholds] = useState<Household[]>([]);

    const theme = useMantineTheme();

    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

    const logout = async (e: React.MouseEvent) => {
        e.preventDefault();
        await signOut();
        await navigate("/");
    };

    useEffect(() => {
        let cancel = false;
        void loadHouseholds();

        async function loadHouseholds() {
            const { data } = await getHouseholds();
            if (cancel) return;
            setHouseholds(data ?? []);
        }

        const channel = supabase
            .channel("reload-households")
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "allocations"
            }, () => {
                void loadHouseholds();
            })
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "household"
            }, () => {
                void loadHouseholds();
            })
            .subscribe();

        return () => {
            cancel = true;
            setHouseholds([]);
            void channel.unsubscribe();
        }
    }, [user]);

    const authenticatedLinks = [
        { to: "/scan", label: "Scan", icon: IconCamera },
        { to: "/recipes", label: "Recipes", icon: IconDeviceTabletStar },
        { to: "/account", label: "Account", icon: IconUser },
    ];

    return (
        <Flex component="nav" align="center" className="header" wrap="wrap">

            <NavLink to="/" className="header-logo">
                { isMobile ? <img src={IconHouseBite} width={32}/> : "HouseBite" }
            </NavLink>

            <Space flex={1}/>

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
                                {isMobile ? <IconHome/> : "Households" }
                            </NavLink>
                        </Menu.Target>

                        <Menu.Dropdown className="header-households-menu">
                            <Menu.Label>Your households</Menu.Label>
                            {households.map((household) => (
                                <Menu.Item
                                    key={household.id}
                                    onClick={() => void navigate("/dashboard", {
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
                            {isMobile ? <link.icon/> : link.label}
                        </NavLink>
                    ))}

                    <a href="/" onClick={e => void(logout(e))} className="nav-link logout-link">
                        {isMobile ? <IconLogout/> : "Logout"}
                    </a>
                </>
            )}
        </Flex>
    )
}
