import { Button, Container, Text, Title, Stack, Group, SimpleGrid, Card, ThemeIcon, Badge, Paper } from "@mantine/core";
import type { User } from "@supabase/supabase-js";
import { Link } from "react-router";
import { IconHome, IconChefHat, IconShoppingCart, IconBarcode, IconUsers, IconUser, IconLeaf, IconArrowRight } from "@tabler/icons-react";
import { getUsername } from "../../utils/user";

export interface LandingProps {
    user: User | null,
}

const features = [
    {
        icon: IconHome,
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

const quickLinks = [
    { to: "/household", icon: IconHome, color: "brand", title: "Households", badge: "Manage", description: "View, create, or join households." },
    { to: "/dashboard", icon: IconUsers, color: "green", title: "Dashboard", badge: "Overview", description: "Household overview, members, and expiring products." },
    { to: "/recipes", icon: IconChefHat, color: "orange", title: "Recipes", badge: "Search & Save", description: "Discover recipes and save your favourites." },
    { to: "/pantry", icon: IconShoppingCart, color: "grape", title: "Pantry", badge: "Track", description: "Manage pantry items and expiration dates." },
    { to: "/scan", icon: IconBarcode, color: "red", title: "Scan", badge: "Quick Add", description: "Scan receipts to add products quickly." },
    { to: "/account", icon: IconUser, color: "teal", title: "Account", badge: "Settings", description: "Preferences, restrictions, and account settings." },
];

export function Landing(props: LandingProps) {
    const { user } = props;

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
                                <Link to="/sign-in">
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
                                <Card key={f.title} withBorder radius="md" p="xl"
                                    style={{ transition: "transform 0.15s, box-shadow 0.15s" }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = ""; }}
                                >
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
                            background: "linear-gradient(135deg, var(--color-primary-50) 0%, var(--color-primary-100) 100%)",
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
    return (
        <Container size="md" py="xl">
            <Stack gap="xl">
                <div>
                    <Title order={1} mb={4}>
                        Welcome back, {displayName || 'there'} 👋
                    </Title>
                    <Text c="dimmed">
                        Jump into any section below.
                    </Text>
                </div>

                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                    {quickLinks.map(link => (
                        <Link key={link.to} to={link.to} style={{ textDecoration: 'none' }}>
                            <Card withBorder radius="md" p="lg" h="100%"
                                style={{ cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = ""; }}
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
                        </Link>
                    ))}
                </SimpleGrid>
            </Stack>
        </Container>
    );
}
