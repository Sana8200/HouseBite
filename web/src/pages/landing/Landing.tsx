import { useEffect, useMemo, useState } from "react";
import {
    Button, Container, Text, Title, Stack, Group, SimpleGrid, Card,
    ThemeIcon, Badge, Paper, Modal,
} from "@mantine/core";
import type { User } from "@supabase/supabase-js";
import { Link, useNavigate } from "react-router";
import {
    IconBuildingCommunity, IconChefHat, IconArchive, IconBarcode,
    IconLayoutDashboard, IconUserCircle, IconLeaf, IconArrowRight,
    IconPlus, IconShoppingCart, IconDeviceMobile,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { getUsername } from "../../utils/user";
import { getHouseholds } from "../../api/household";
import type { Household } from "../../api/schema";
import "./Landing.css";
import { CustomLoader } from "../../components/CustomLoader";
import { useAppInstaller } from "../../hooks/useAppInstaller";

export interface LandingProps {
    user: User | null,
}

const features = [
    {
        icon: IconBuildingCommunity,
        title: "Shared Households",
        description: "Create or join a household and collaborate with your housemates on everything food-related.",
    },
    {
        icon: IconChefHat,
        title: "Recipe Discovery",
        description: "Find recipes based on what's in your pantry, filtered by your household's dietary needs.",
    },
    {
        icon: IconShoppingCart,
        title: "Smart Shopping",
        description: "Build shared shopping lists and track what's been bought with receipt scanning.",
    },
    {
        icon: IconLeaf,
        title: "Dietary Preferences",
        description: "Set allergies and diets per member — recipes and suggestions adapt automatically.",
    },
];

type QuickLink = {
    to: string;
    icon: typeof IconBuildingCommunity;
    color: string;
    title: string;
    badge: string;
    description: string;
    /** If true, click triggers the household-picker flow instead of direct navigation */
    householdScoped?: boolean;
};

const dailyLinks: QuickLink[] = [
    { to: "/dashboard", icon: IconLayoutDashboard, color: "green", title: "Dashboard", badge: "Overview", description: "Household overview, members, and expiring products.", householdScoped: true },
    { to: "/pantry", icon: IconArchive, color: "grape", title: "Pantry", badge: "Track", description: "Manage pantry items and expiration dates.", householdScoped: true },
    { to: "/recipes", icon: IconChefHat, color: "orange", title: "Recipes", badge: "Search & Save", description: "Discover recipes and save your favourites." },
    { to: "/scan", icon: IconBarcode, color: "red", title: "Scan", badge: "Quick Add", description: "Scan receipts to add products quickly." },
];

const manageLinks: QuickLink[] = [
    { to: "/household", icon: IconBuildingCommunity, color: "brand", title: "Households", badge: "Manage", description: "View, create, or join households." },
    { to: "/account", icon: IconUserCircle, color: "teal", title: "Account", badge: "Settings", description: "Preferences, restrictions, and account settings." },
];

const installLink: QuickLink = {
    to: "#", icon: IconDeviceMobile, color: "pink", title: "App", badge: "Install", description: "Install app as an icon on your home screen."
}

function getTimeOfDayGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
}

export function Landing(props: LandingProps) {
    const { user } = props;
    const navigate = useNavigate();

    const appInstaller = useAppInstaller();

    const [households, setHouseholds] = useState<Household[]>([]);
    const [loadingHouseholds, setLoadingHouseholds] = useState(true);
    const [pickerTarget, setPickerTarget] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            setLoadingHouseholds(false);
            return;
        }
        void (async () => {
            try {
                const { data } = await getHouseholds();
                setHouseholds(data ?? []);
            } catch (e) {
                notifications.show({
                    color: "red",
                    title: "Could not load households",
                    message: e instanceof Error ? e.message : "Please try again.",
                });
            } finally {
                setLoadingHouseholds(false);
            }
        })();
    }, [user]);

    const manageLinksWithInstall = useMemo(() => {
        if (appInstaller.canPrompt) {
            return [...manageLinks, installLink];
        } else {
            return manageLinks;
        }
    }, [appInstaller]);

    if (!user) {
        return (
            <div>
                {/* Hero */}
                <div style={{
                    background: "linear-gradient(135deg, var(--color-primary-50) 0%, var(--color-surface) 60%)",
                    borderBottom: "1px solid var(--color-border)",
                }}>
                    <Container size="md" py={80}>
                        <Stack gap="xl" align="center" ta="center">
                            <Badge size="lg" variant="light" radius="xl">
                                Shared living, simplified
                            </Badge>
                            <Title order={1} fz={42} fw={800} lh={1.2}>
                                Manage your household's food,{"\n"}together.
                            </Title>
                            <Text size="lg" c="dimmed" maw={480} lh={1.6}>
                                Track pantry items, discover recipes that match your dietary needs,
                                and plan meals with your housemates — all in one place.
                            </Text>
                            <Group gap="md" mt="sm">
                                <Link to="/sign-up">
                                    <Button size="lg" rightSection={<IconArrowRight size={18} />}>
                                        Get Started
                                    </Button>
                                </Link>
                                <Link to="/sign-in">
                                    <Button size="lg" variant="default">
                                        Sign In
                                    </Button>
                                </Link>
                            </Group>
                        </Stack>
                    </Container>
                </div>

                {/* Features */}
                <Container size="md" py={60}>
                    <Stack gap="xl">
                        <div style={{ textAlign: "center" }}>
                            <Text size="sm" fw={600} c="var(--color-primary-600)" mb={4}>FEATURES</Text>
                            <Title order={2}>Everything your household needs</Title>
                        </div>
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                            {features.map(f => (
                                <Card key={f.title} className="landing-card" withBorder radius="xl" p="xl">
                                    <ThemeIcon size={44} radius="md" variant="light" mb="md">
                                        <f.icon size={22} />
                                    </ThemeIcon>
                                    <Text fw={700} mb={4}>{f.title}</Text>
                                    <Text size="sm" c="dimmed" lh={1.6}>{f.description}</Text>
                                </Card>
                            ))}
                        </SimpleGrid>
                    </Stack>
                </Container>

                {/* CTA */}
                <Container size="sm" py={60}>
                    <Paper radius="xl" p="xl" ta="center"
                        style={{
                            background: "var(--color-primary-50)",
                            border: "1px solid var(--color-primary-200)",
                        }}
                    >
                        <Title order={3} mb="xs">Ready to simplify your household?</Title>
                        <Text c="dimmed" mb="lg" maw={360} mx="auto">
                            Free to use. Set up your household in under a minute.
                        </Text>
                        <Link to="/sign-in">
                            <Button size="lg" rightSection={<IconArrowRight size={18} />}>
                                Get Started
                            </Button>
                        </Link>
                    </Paper>
                </Container>
            </div>
        );
    }

    // Signed-in landing
    const displayName = getUsername(user);
    const greeting = getTimeOfDayGreeting();

    const goToHouseholdScoped = (path: string) => {
        if (households.length === 0) {
            notifications.show({
                color: "blue",
                title: "No household yet",
                message: "Create or join a household first.",
            });
            void navigate("/household");
            return;
        }
        if (households.length === 1) {
            const h = households[0];
            void navigate(path, { state: { householdId: h.id, householdName: h.house_name } });
            return;
        }
        setPickerTarget(path);
    };

    const handleQuickLinkClick = (link: QuickLink) => {
        if (link == installLink) {
            void appInstaller.prompt();
        } else if (link.householdScoped) {
            goToHouseholdScoped(link.to);
        } else {
            void navigate(link.to);
        }
    };

    const subtitle = loadingHouseholds
        ? "Loading your households…"
        : households.length === 0
            ? "Get started by creating or joining a household."
            : `You're in ${households.length} household${households.length === 1 ? "" : "s"}.`;

    const renderQuickLinkCard = (link: QuickLink) => (
        <Card
            key={link.to}
            component="button"
            type="button"
            className="landing-card landing-card--interactive"
            withBorder
            radius="xl"
            p="lg"
            h="100%"
            onClick={() => handleQuickLinkClick(link)}
        >
            <Stack gap="sm">
                <Group gap="sm">
                    <ThemeIcon size="lg" radius="md" variant="light" color={link.color}>
                        <link.icon size={22} />
                    </ThemeIcon>
                    <Badge size="sm" variant="light">{link.badge}</Badge>
                </Group>
                <Text fw={700}>{link.title}</Text>
                <Text size="sm" c="dimmed">{link.description}</Text>
            </Stack>
        </Card>
    );

    return (
        <Container size="md" py="xl">
            <Stack gap="xl">
                {/* Hero */}
                <Paper p="xl" radius="xl" withBorder
                    style={{
                        background: "linear-gradient(135deg, var(--color-primary-50) 0%, var(--color-surface) 70%)",
                        border: "1px solid var(--color-border)",
                    }}>
                    <Group justify="space-between" align="center" wrap="nowrap">
                        <Stack gap={4}>
                            <Title order={2} fz={28} fw={700}>
                                {greeting}, {displayName || "there"} 👋
                            </Title>
                            <Text c="dimmed">{subtitle}</Text>
                        </Stack>
                        {!loadingHouseholds && households.length === 0 && (
                            <Button
                                leftSection={<IconPlus size={18} />}
                                onClick={() => void navigate("/household")}
                            >
                                Create household
                            </Button>
                        )}
                    </Group>
                </Paper>

                {/* Daily section */}
                <Stack gap="md">
                    <Text size="sm" fw={700} c="dimmed" tt="uppercase" lts={1}>
                        Daily
                    </Text>
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                        {dailyLinks.map(renderQuickLinkCard)}
                    </SimpleGrid>
                </Stack>

                {/* Manage section */}
                <Stack gap="md">
                    <Text size="sm" fw={700} c="dimmed" tt="uppercase" lts={1}>
                        Manage
                    </Text>
                    <SimpleGrid cols={{ base: 1, sm: 2, md: Math.min(4, manageLinksWithInstall.length) }} spacing="md">
                        {manageLinksWithInstall.map(renderQuickLinkCard)}
                    </SimpleGrid>
                </Stack>
            </Stack>

            {/* Household picker modal — shown when user has 2+ households and clicked a scoped link */}
            <Modal
                opened={!!pickerTarget}
                onClose={() => setPickerTarget(null)}
                title="Choose a household"
                centered
            >
                {loadingHouseholds ? (
                    <Group justify="center" py="md"><CustomLoader size="sm" /></Group>
                ) : (
                    <Stack gap="xs">
                        {households.map(h => (
                            <Button
                                key={h.id}
                                variant="default"
                                size="md"
                                justify="space-between"
                                fullWidth
                                leftSection={<IconBuildingCommunity size={18} />}
                                rightSection={<IconArrowRight size={16} />}
                                onClick={() => {
                                    if (!pickerTarget) return;
                                    void navigate(pickerTarget, { state: { householdId: h.id, householdName: h.house_name } });
                                    setPickerTarget(null);
                                }}
                            >
                                {h.house_name}
                            </Button>
                        ))}
                    </Stack>
                )}
            </Modal>
        </Container>
    );
}
