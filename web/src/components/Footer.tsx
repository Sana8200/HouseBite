import { Box, Divider, Flex, Text } from "@mantine/core";

export function Footer() {
    return (
        <Box mt="xl">
            <Divider/>
            <Flex p="xl" justify="center" wrap="wrap" gap="xl">
                <Text c="dimmed">© HouseBite, KTH II1305 Riebnes</Text>
            </Flex>
        </Box>
    );
}
