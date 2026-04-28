import { Box, Divider, Flex, Text } from "@mantine/core";

export function Footer() {
    return (
        <Box mt="xl">
            <Divider/>
            <Flex p="xl" justify="center" wrap="wrap" gap="xl">
                <Text c="dimmed">© HouseBite, KTH II1305 Riebnes</Text>
                <Text c="gray.7" component="a" href="https://arpega75.github.io/houseBite/" target="_blank">About</Text>
            </Flex>
        </Box>
    );
}
