import { useEffect, useState } from "react"
import { Paper, Avatar, Text, Title, Group, UnstyledButton, Stack } from "@mantine/core"
import { IconShare } from "@tabler/icons-react"
import { getHouseholdMembers } from "../../api/household"
import { InviteModal } from "./InviteModal"
import "./HouseholdMembers.css"

interface Member {
    id: string
    display_name: string | null
    email: string | null
}

interface HouseholdMembersProps {
    householdId: string
    inviteId?: string
}

export function HouseholdMembers({ householdId, inviteId }: HouseholdMembersProps) {
    const [members, setMembers] = useState<Member[]>([])
    const [loading, setLoading] = useState(true)
    const [showInvite, setShowInvite] = useState(false)

    useEffect(() => {
        const fetch = async () => {
            setLoading(true)
            const { data, error } = await getHouseholdMembers(householdId)
            if (error) {
                console.error("Error fetching members:", error)
            } else {
                const rows = data as { id: string; display_name: string | null; email: string | null }[]
                setMembers(rows.map(row => ({
                    id: row.id,
                    display_name: row.display_name ?? null,
                    email: row.email ?? null,
                })))
            }
            setLoading(false)
        }
        void fetch()
    }, [householdId])

    if (loading) return <Text c="dimmed" ta="center" py="xl">Loading members...</Text>
    if (members.length === 0) return null

    const getName = (m: Member) =>
        m.display_name || m.email?.split("@")[0] || "Unknown"

    const getInitial = (m: Member) =>
        getName(m).charAt(0).toUpperCase()

    return (
        <Paper className="hh-members" radius="xl" p="xl" mt="lg">
            <Title order={3} size="h5" mb="md" c="#3a3929">
                Here are the members of your household
            </Title>

            <Group gap="md" wrap="wrap">
                {members.map(m => (
                    <Paper key={m.id} className="hh-member-card" radius="lg" p="lg" shadow="xs" w={140}>
                        <Stack align="center" gap="xs">
                            <Avatar size={80} radius="md">
                                {getInitial(m)}
                            </Avatar>
                            <Text size="sm" fw={600} c="#3a3929" ta="center" truncate maw={120}>
                                {getName(m)}
                            </Text>
                        </Stack>
                    </Paper>
                ))}

                {inviteId && (
                    <UnstyledButton
                        className="hh-invite-card"
                        onClick={() => setShowInvite(true)}
                        w={140}
                    >
                        <Paper radius="lg" p="lg" className="hh-invite-inner">
                            <Stack align="center" gap="xs">
                                <Avatar size={80} radius="md">
                                    <IconShare size={28} />
                                </Avatar>
                                <Text size="xs" ta="center">
                                    invite someone
                                </Text>
                            </Stack>
                        </Paper>
                    </UnstyledButton>
                )}
            </Group>

            {inviteId && (
                <InviteModal
                    inviteId={inviteId}
                    opened={showInvite}
                    onClose={() => setShowInvite(false)}
                />
            )}
        </Paper>
    )
}
