import { Group, Menu, UnstyledButton, useMantineTheme } from "@mantine/core";
import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";
import "./Header.css";
import type { User } from "@supabase/supabase-js";
import { getHouseholds } from "../api/household";
import { signOut } from "../api/auth";
import { useMediaQuery } from "@mantine/hooks";
import { IconLogout, IconUserCircle, IconCamera, IconChefHat, IconBuildingCommunity, IconChevronDown } from "@tabler/icons-react";
import type { Household } from "../api/schema";
import IconHouseBite from "../assets/icons/icon.svg";
import { supabase } from "../supabase";

export interface HeaderProps {
    user: User | null,
}

export function Header(props: HeaderProps) {
    const { user } = props;
    const navigate = useNavigate();
    const location = useLocation();
    const [households, setHouseholds] = useState<Household[]>([]);

    const theme = useMantineTheme();

    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

    const logout = async () => {
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
        };
    }, [user]);

    const authenticatedLinks = [
        { to: "/scan", label: "Scan", icon: IconCamera },
        { to: "/recipes", label: "Recipes", icon: IconChefHat },
        { to: "/account", label: "Account", icon: IconUserCircle },
    ];

    const householdsActive = location.pathname === "/household" || location.pathname === "/dashboard";

    return (
        <Group component="nav" justify="space-between" align="center" className="header" wrap="nowrap">
            <NavLink to="/" className="header-logo" aria-label="HouseBite home">
                {isMobile ? <img src={IconHouseBite} width={32} alt="HouseBite" /> : "HouseBite"}
            </NavLink>

            {user && (
                <Group gap={4} wrap="nowrap">
                    <Menu
                        shadow="md"
                        width={260}
                        position="bottom-start"
                        offset={8}
                        trigger="click-hover"
                        openDelay={80}
                        closeDelay={120}
                    >
                        <Menu.Target>
                            <UnstyledButton
                                className={`nav-link header-households-trigger${householdsActive ? " active" : ""}`}
                                onClick={() => void navigate("/household")}
                                aria-label="Households"
                            >
                                {isMobile ? (
                                    <IconBuildingCommunity size={20} />
                                ) : (
                                    <Group gap={4} wrap="nowrap" component="span">
                                        <span>Households</span>
                                        <IconChevronDown size={14} stroke={2.5} />
                                    </Group>
                                )}
                            </UnstyledButton>
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
                            aria-label={link.label}
                        >
                            {isMobile ? <link.icon size={20} /> : link.label}
                        </NavLink>
                    ))}

                    <UnstyledButton
                        onClick={() => void logout()}
                        className="nav-link logout-link"
                        aria-label="Logout"
                    >
                        {isMobile ? <IconLogout size={20} /> : (
                            <Group gap={4} wrap="nowrap" component="span">
                                <IconLogout size={16} />
                                <span>Logout</span>
                            </Group>
                        )}
                    </UnstyledButton>
                </Group>
            )}
        </Group>
    );
}
