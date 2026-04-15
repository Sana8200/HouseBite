import { Button, Container, Paper, Text } from "@mantine/core";
import type { User } from "@supabase/supabase-js";
import { Link } from "react-router";

export interface LandingProps {
    user: User | null,
}

export function Landing(props: LandingProps) {
    const {user} = props;
    return (
        <Container p="md">
            <Paper radius="xl" shadow="md" p="md">
                <Text size="xl">Welcome to HouseBite!</Text>
                <br/>
                <Text>This is the landing page with lots of text and images.</Text>
                <br/>

                { !user &&
                    <Link to="/sign-in">
                        <Button>
                            Sign up now!
                        </Button>
                    </Link>
                }

                { user &&
                    <Link to="/household">
                        <Button>
                            My households
                        </Button>
                    </Link>
                }
            </Paper>
        </Container>
    )
}
