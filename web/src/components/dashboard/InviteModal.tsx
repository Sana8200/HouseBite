import { IconUserPlus, IconCopy, IconCheck } from "@tabler/icons-react"
import { Modal, Group, Text, Title, Code, ActionIcon, CopyButton } from "@mantine/core"

interface InviteModalProps {
    inviteId: string
    opened: boolean
    onClose: () => void
}

export function InviteModal({ inviteId, opened, onClose }: InviteModalProps) {
    return (
        <Modal opened={opened} onClose={onClose} centered radius="xl" size="sm"
            title={
                <Group gap="sm">
                    <IconUserPlus size={24} color="var(--color-primary-600)" />
                    <Title order={3} size="h4">Invite to household</Title>
                </Group>
            }
        >
            <Text size="sm" c="dimmed" mb="lg">
                Share this code with the person you want to invite.
                They can paste it on the <strong>Households</strong> page to join.
            </Text>

            <CopyButton value={inviteId} timeout={4000}>
                {({ copied, copy }) => (
                    <>
                        <Group
                            gap="sm" p="sm"
                            style={{ background: "var(--color-surface-muted)", borderRadius: "var(--radius-md)" }}
                        >
                            <ActionIcon
                                variant="subtle"
                                color={copied ? "brand" : "gray"}
                                onClick={copy}
                                title="Copy to clipboard"
                            >
                                {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                            </ActionIcon>
                            <Code style={{ flex: 1, fontSize: "var(--font-size-300)", letterSpacing: 0.5 }}>
                                {inviteId}
                            </Code>
                        </Group>
                        {copied && (
                            <Text size="sm" ta="center" mt="sm" fw={500} style={{ color: "var(--color-success)" }}>
                                Copied! Send this code to your friend.
                            </Text>
                        )}
                    </>
                )}
            </CopyButton>
        </Modal>
    )
}
