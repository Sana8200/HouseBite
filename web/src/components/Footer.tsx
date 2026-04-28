import { Box, Group, Text } from "@mantine/core";
import "./Footer.css";

export function Footer() {
    return (
        <Box component="footer" className="footer">
            <Group justify="space-between" align="center" wrap="wrap" gap="md">
                <Text className="footer-text">
                    © 2026 HouseBite · KTH II1305 Riebnes
                </Text>

                <a
                    className="footer-link"
                    href="https://arpega75.github.io/houseBite/"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    About
                </a>
            </Group>
        </Box>
    );
}
