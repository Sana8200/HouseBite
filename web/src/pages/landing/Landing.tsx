import { Button, Container, Paper, Text, Title, Stack, Group, SimpleGrid, Card, ThemeIcon, Badge } from "@mantine/core";
import type { User } from "@supabase/supabase-js";
import { Link } from "react-router";
import { IconHome, IconChefHat, IconShoppingCart, IconBarcode, IconUsers, IconLogout } from "@tabler/icons-react";
import { useDisplayName } from "../../hooks/useDisplayName";

export interface LandingProps {
    user: User | null,
}

export function Landing(props: LandingProps) {
    const { user } = props;
    const displayName = useDisplayName();

    // Welcome page for users who are not signed in
    if (!user) {
        return (
            <div>
                <Container size="md" py="xl">
                    <Stack gap="xl" align="center" ta="center">
                        <div>
                            <Title order={1} size="h1" fw={700} mb="md">
                                🏠 HouseBite
                            </Title>
                            <Text size="lg" c="dimmed" maw={500}>
                                Manage your household's food, recipes, and shopping together. 
                                Smart planning for shared living.
                            </Text>
                        </div>

                        <Group gap="md">
                            <Link to="/sign-in">
                                <Button size="lg">
                                    Sign In
                                </Button>
                            </Link>
                            <Link to="/sign-up">
                                <Button size="lg" variant="outline">
                                    Sign Up
                                </Button>
                            </Link>
                        </Group>
                    </Stack>
                </Container>

                {/* Features Section */}
                <Container size="md" py="xl">
                    <Title order={2} ta="center" mb="xl">Features</Title>
                    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                        <Card withBorder radius="md" p="lg">
                            <Group gap="md" mb="md">
                                <ThemeIcon size="lg" radius="md" variant="light">
                                    <IconHome size={24} />
                                </ThemeIcon>
                                <Title order={3} size="h4">Manage Households</Title>
                            </Group>
                            <Text size="sm" c="dimmed">
                                Create or join households and collaborate with housemates on meal planning.
                            </Text>
                        </Card>

                        <Card withBorder radius="md" p="lg">
                            <Group gap="md" mb="md">
                                <ThemeIcon size="lg" radius="md" variant="light">
                                    <IconChefHat size={24} />
                                </ThemeIcon>
                                <Title order={3} size="h4">Discover Recipes</Title>
                            </Group>
                            <Text size="sm" c="dimmed">
                                Search and save your favourite recipes tailored to your household's preferences.
                            </Text>
                        </Card>

                        <Card withBorder radius="md" p="lg">
                            <Group gap="md" mb="md">
                                <ThemeIcon size="lg" radius="md" variant="light">
                                    <IconShoppingCart size={24} />
                                </ThemeIcon>
                                <Title order={3} size="h4">Smart Shopping</Title>
                            </Group>
                            <Text size="sm" c="dimmed">
                                Create and manage shopping lists with your household members.
                            </Text>
                        </Card>

                        <Card withBorder radius="md" p="lg">
                            <Group gap="md" mb="md">
                                <ThemeIcon size="lg" radius="md" variant="light">
                                    <IconBarcode size={24} />
                                </ThemeIcon>
                                <Title order={3} size="h4">Scan & Track</Title>
                            </Group>
                            <Text size="sm" c="dimmed">
                                Scan products to track pantry inventory and expiration dates.
                            </Text>
                        </Card>
                    </SimpleGrid>
                </Container>

                {/* CTA Section */}
                <Container size="md" py="xl">
                    <Paper withBorder radius="lg" p="xl" ta="center">
                        <Title order={3} mb="md">Ready to get started?</Title>
                        <Text c="dimmed" mb="xl">
                            Join HouseBite today and make household management easier.
                        </Text>
                        <Link to="/sign-in">
                            <Button size="lg">
                                Get Started
                            </Button>
                        </Link>
                    </Paper>
                </Container>
            </div>
        );
    }

    // welcome page for users who are signed in
    return (
        <Container size="md" py="xl">
            <Stack gap="xl">
                <div>
                    <Title order={1} mb="md">
                        Welcome back, {displayName ?? 'there'} 👋
                    </Title>
                    <Text c="dimmed">
                        Here's what you can do in HouseBite
                    </Text>
                </div>

                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                    <Link to="/household" style={{ textDecoration: 'none' }}>
                        <Card withBorder radius="md" p="lg" style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                            className="hover-card">
                            <Group gap="md" mb="md">
                                <ThemeIcon size="lg" radius="md" variant="light" color="blue">
                                    <IconHome size={24} />
                                </ThemeIcon>
                                <div>
                                    <Title order={3} size="h4">My Households</Title>
                                    <Badge size="sm" variant="light">Manage & Join</Badge>
                                </div>
                            </Group>
                            <Text size="sm" c="dimmed">
                                View and manage your households, invite members, or join new ones.
                            </Text>
                        </Card>
                    </Link>

                    <Link to="/dashboard" style={{ textDecoration: 'none' }}>
                        <Card withBorder radius="md" p="lg" style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                            className="hover-card">
                            <Group gap="md" mb="md">
                                <ThemeIcon size="lg" radius="md" variant="light" color="green">
                                    <IconUsers size={24} />
                                </ThemeIcon>
                                <div>
                                    <Title order={3} size="h4">Dashboard</Title>
                                    <Badge size="sm" variant="light">Overview</Badge>
                                </div>
                            </Group>
                            <Text size="sm" c="dimmed">
                                View household overview, members, and recent activity.
                            </Text>
                        </Card>
                    </Link>

                    <Link to="/recipes" style={{ textDecoration: 'none' }}>
                        <Card withBorder radius="md" p="lg" style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                            className="hover-card">
                            <Group gap="md" mb="md">
                                <ThemeIcon size="lg" radius="md" variant="light" color="orange">
                                    <IconChefHat size={24} />
                                </ThemeIcon>
                                <div>
                                    <Title order={3} size="h4">Recipes</Title>
                                    <Badge size="sm" variant="light">Search & Save</Badge>
                                </div>
                            </Group>
                            <Text size="sm" c="dimmed">
                                Discover and save your favourite recipes.
                            </Text>
                        </Card>
                    </Link>

                    <Link to="/pantry" style={{ textDecoration: 'none' }}>
                        <Card withBorder radius="md" p="lg" style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                            className="hover-card">
                            <Group gap="md" mb="md">
                                <ThemeIcon size="lg" radius="md" variant="light" color="grape">
                                    <IconShoppingCart size={24} />
                                </ThemeIcon>
                                <div>
                                    <Title order={3} size="h4">Pantry</Title>
                                    <Badge size="sm" variant="light">Track & Manage</Badge>
                                </div>
                            </Group>
                            <Text size="sm" c="dimmed">
                                Manage pantry items and track expiration dates.
                            </Text>
                        </Card>
                    </Link>

                    <Link to="/scan" style={{ textDecoration: 'none' }}>
                        <Card withBorder radius="md" p="lg" style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                            className="hover-card">
                            <Group gap="md" mb="md">
                                <ThemeIcon size="lg" radius="md" variant="light" color="red">
                                    <IconBarcode size={24} />
                                </ThemeIcon>
                                <div>
                                    <Title order={3} size="h4">Scan</Title>
                                    <Badge size="sm" variant="light">Quick Add</Badge>
                                </div>
                            </Group>
                            <Text size="sm" c="dimmed">
                                Scan product barcodes to quickly add items to your pantry.
                            </Text>
                        </Card>
                    </Link>

                    <Link to="/account" style={{ textDecoration: 'none' }}>
                        <Card withBorder radius="md" p="lg" style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                            className="hover-card">
                            <Group gap="md" mb="md">
                                <ThemeIcon size="lg" radius="md" variant="light" color="teal">
                                    <IconLogout size={24} />
                                </ThemeIcon>
                                <div>
                                    <Title order={3} size="h4">Account</Title>
                                    <Badge size="sm" variant="light">Settings</Badge>
                                </div>
                            </Group>
                            <Text size="sm" c="dimmed">
                                Manage your account settings, preferences, and food restrictions.
                            </Text>
                        </Card>
                    </Link>
                </SimpleGrid>
            </Stack>
        </Container>
    );
}
