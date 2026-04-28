import { useEffect, useState } from "react"
import { Paper, Avatar, Text, Title, Group, UnstyledButton, Stack } from "@mantine/core"
import { IconShare } from "@tabler/icons-react"
import { notifications } from "@mantine/notifications"
import { getHouseholdMembers, type HouseholdMember } from "../../api/household"
import { InviteModal } from "./InviteModal"
import "./HouseholdMembers.css"

interface HouseholdMembersProps {
    householdId: string
    inviteId?: string
}

const getName = (m: HouseholdMember) =>
    m.display_name || m.email?.split("@")[0] || "Unknown"

export function HouseholdMembers({ householdId, inviteId }: HouseholdMembersProps) {
    const [members, setMembers] = useState<HouseholdMember[]>([])
    const [loading, setLoading] = useState(true)
    const [showInvite, setShowInvite] = useState(false)

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            try {
                const { data, error } = await getHouseholdMembers(householdId)
                if (error) {
                    notifications.show({
                        color: "red",
                        title: "Could not load members",
                        message: error.message,
                    })
                    return
                }
                setMembers(data ?? [])
            } catch (e) {
                notifications.show({
                    color: "red",
                    title: "Could not load members",
                    message: e instanceof Error ? e.message : "Please try again.",
                })
            } finally {
                setLoading(false)
            }
        }
        void load() // void: fire-and-forget the async call (useEffect can't await directly)
    }, [householdId])

    if (loading) return <Text c="dimmed" ta="center" py="xl">Loading members...</Text>
    if (members.length === 0) return null

    return (
        <Paper className="hh-members" radius="xl" p="xl">
            <Title order={3} size="h5" mb="md" c="#3a3929">
                Members
            </Title>

            <Group gap="md" wrap="wrap">
                {members.map(m => (
                    <Paper key={m.id} className="hh-card" bg="#f4f3ee" radius="lg" p="lg" w={140}>
                        <Stack align="center" gap="xs">
                            <Avatar size={80} radius="md"
                                styles={{ placeholder: { background: "#dddcd6", color: "#5a5947", fontSize: 32, fontWeight: 700 } }}
                            >
                                {getName(m).charAt(0).toUpperCase()}
                            </Avatar>
                            <Text size="sm" fw={600} c="#3a3929" ta="center" truncate maw={120}>
                                {getName(m)}
                            </Text>
                        </Stack>
                    </Paper>
                ))}

                {inviteId && (
                    <UnstyledButton className="hh-invite" onClick={() => setShowInvite(true)} w={140}>
                        <Paper radius="lg" p="lg" bg="transparent" bd="2px dashed #b5b3a5" h="100%">
                            <Stack align="center" gap="xs">
                                <Avatar size={80} radius="md"
                                    styles={{ placeholder: { background: "#e8e7e0", color: "#5a5947", border: "2px dashed #b5b3a5" } }}
                                >
                                    <IconShare size={28} />
                                </Avatar>
                                <Text size="xs" c="#6b6a58" ta="center">invite someone</Text>
                            </Stack>
                        </Paper>
                    </UnstyledButton>
                )}
            </Group>

            {inviteId && (
                <InviteModal inviteId={inviteId} opened={showInvite} onClose={() => setShowInvite(false)} />
            )}
        </Paper>
    )
}
