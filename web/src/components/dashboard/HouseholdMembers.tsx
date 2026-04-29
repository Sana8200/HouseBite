import { useEffect, useState } from "react"
import { Paper, Avatar, Text, Title, Group, UnstyledButton, Stack, Menu, ActionIcon, Modal, Button, Alert } from "@mantine/core"
import { IconShare, IconDots, IconUserOff, IconUserMinus, IconCrown } from "@tabler/icons-react"
import { notifications } from "@mantine/notifications"
import { getHouseholdMembers, kickMember, kickMemberPermanently, transferAdmin, type HouseholdMember } from "../../api/household"
import { InviteModal } from "./InviteModal"
import "./HouseholdMembers.css"

interface HouseholdMembersProps {
    householdId: string
    inviteId?: string
    adminId?: string | null
    currentUserId?: string | null
    onInviteIdChange?: (newInviteId: string) => void
    onAdminChange?: (newAdminId: string) => void
}

const getName = (m: HouseholdMember) =>
    m.display_name || m.email?.split("@")[0] || "Unknown"

export function HouseholdMembers({ householdId, inviteId, adminId, currentUserId, onInviteIdChange, onAdminChange }: HouseholdMembersProps) {
    const [members, setMembers] = useState<HouseholdMember[]>([])
    const [loading, setLoading] = useState(true)
    const [showInvite, setShowInvite] = useState(false)

    const [kickTarget, setKickTarget] = useState<{ member: HouseholdMember; permanent: boolean } | null>(null)
    const [kicking, setKicking] = useState(false)
    const [kickError, setKickError] = useState<string | null>(null)

    const [transferTarget, setTransferTarget] = useState<HouseholdMember | null>(null)
    const [transferring, setTransferring] = useState(false)
    const [transferError, setTransferError] = useState<string | null>(null)

    const isAdmin = !!adminId && !!currentUserId && adminId === currentUserId

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
        void load()
    }, [householdId])

    const handleKick = async () => {
        if (!kickTarget) return
        setKicking(true)
        setKickError(null)
        try {
            if (kickTarget.permanent) {
                const newInviteId = await kickMemberPermanently(householdId, kickTarget.member.id)
                setMembers(prev => prev.filter(m => m.id !== kickTarget.member.id))
                onInviteIdChange?.(newInviteId)
            } else {
                await kickMember(householdId, kickTarget.member.id)
                setMembers(prev => prev.filter(m => m.id !== kickTarget.member.id))
            }
            setKickTarget(null)
        } catch (e: unknown) {
            setKickError(e instanceof Error ? e.message : 'Could not kick member')
        } finally {
            setKicking(false)
        }
    }

    const handleTransfer = async () => {
        if (!transferTarget) return
        setTransferring(true)
        setTransferError(null)
        try {
            await transferAdmin(householdId, transferTarget.id)
            onAdminChange?.(transferTarget.id)
            setTransferTarget(null)
        } catch (e: unknown) {
            setTransferError(e instanceof Error ? e.message : 'Could not transfer admin')
        } finally {
            setTransferring(false)
        }
    }

    if (loading) return <Text c="dimmed" ta="center" py="xl">Loading members...</Text>
    if (members.length === 0) return null

    return (
        <Paper className="hh-members" radius="xl" p="xl">
            <Title order={3} size="h5" mb="md">
                Members
            </Title>

            <Group gap="md" wrap="wrap">
                {members.map(m => (
                    <Paper key={m.id} className="hh-card" bg="var(--color-surface)" radius="xl" p="lg" w={140}>
                        <Stack align="center" gap="xs">
                            <Avatar size={80} radius="md"
                                styles={{ placeholder: { background: "var(--color-surface-muted)", color: "var(--color-text-muted)", fontSize: 32, fontWeight: 700 } }}
                            >
                                {getName(m).charAt(0).toUpperCase()}
                            </Avatar>
                            <Text size="sm" fw={600} ta="center" truncate maw={120}>
                                {getName(m)}
                            </Text>
                            {m.id === adminId && (
                                <Text size="xs" c="yellow.7" fw={600}>admin</Text>
                            )}
                            {isAdmin && m.id !== currentUserId && (
                                <Menu withinPortal position="bottom-end" shadow="md">
                                    <Menu.Target>
                                        <ActionIcon variant="subtle" size="sm" aria-label={`Options for ${getName(m)}`}>
                                            <IconDots size={16} />
                                        </ActionIcon>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                        <Menu.Item
                                            leftSection={<IconCrown size={14} />}
                                            onClick={() => { setTransferError(null); setTransferTarget(m) }}
                                        >
                                            Make admin
                                        </Menu.Item>
                                        <Menu.Divider />
                                        <Menu.Item
                                            color="orange"
                                            leftSection={<IconUserOff size={14} />}
                                            onClick={() => { setKickError(null); setKickTarget({ member: m, permanent: false }) }}
                                        >
                                            Kick
                                        </Menu.Item>
                                        <Menu.Item
                                            color="red"
                                            leftSection={<IconUserMinus size={14} />}
                                            onClick={() => { setKickError(null); setKickTarget({ member: m, permanent: true }) }}
                                        >
                                            Kick permanently
                                        </Menu.Item>
                                    </Menu.Dropdown>
                                </Menu>
                            )}
                        </Stack>
                    </Paper>
                ))}

                {inviteId && (
                    <UnstyledButton className="hh-invite" onClick={() => setShowInvite(true)} w={140}>
                        <Paper radius="xl" p="lg" bg="transparent" bd="2px dashed var(--color-border)" h="100%">
                            <Stack align="center" gap="xs">
                                <Avatar size={80} radius="md"
                                    styles={{ placeholder: { background: "var(--color-surface-muted)", color: "var(--color-text-muted)", border: "2px dashed var(--color-border)" } }}
                                >
                                    <IconShare size={28} />
                                </Avatar>
                                <Text size="xs" c="dimmed" ta="center">invite someone</Text>
                            </Stack>
                        </Paper>
                    </UnstyledButton>
                )}
            </Group>

            {inviteId && (
                <InviteModal inviteId={inviteId} opened={showInvite} onClose={() => setShowInvite(false)} />
            )}

            {/* Kick confirmation modal */}
            <Modal
                opened={!!kickTarget}
                onClose={() => setKickTarget(null)}
                centered
                radius="lg"
                title={<Title order={4}>{kickTarget?.permanent ? "Kick permanently" : "Kick member"}</Title>}
            >
                <Stack gap="md">
                    <Text size="sm">
                        {kickTarget?.permanent
                            ? `Remove ${kickTarget ? getName(kickTarget.member) : ''} and rotate the invite code so they cannot rejoin with the old link?`
                            : `Remove ${kickTarget ? getName(kickTarget.member) : ''} from the household?`}
                    </Text>
                    {kickError && <Alert color="red">{kickError}</Alert>}
                    <Group justify="flex-end" gap="sm">
                        <Button variant="default" onClick={() => setKickTarget(null)} disabled={kicking}>Cancel</Button>
                        <Button
                            color={kickTarget?.permanent ? "red" : "orange"}
                            onClick={() => void handleKick()}
                            loading={kicking}
                        >
                            {kickTarget?.permanent ? "Kick permanently" : "Kick"}
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Transfer admin confirmation modal */}
            <Modal
                opened={!!transferTarget}
                onClose={() => setTransferTarget(null)}
                centered
                radius="lg"
                title={<Title order={4}>Transfer admin</Title>}
            >
                <Stack gap="md">
                    <Text size="sm">
                        Make <strong>{transferTarget ? getName(transferTarget) : ''}</strong> the new admin? You will lose your admin rights.
                    </Text>
                    {transferError && <Alert color="red">{transferError}</Alert>}
                    <Group justify="flex-end" gap="sm">
                        <Button variant="default" onClick={() => setTransferTarget(null)} disabled={transferring}>Cancel</Button>
                        <Button color="blue" onClick={() => void handleTransfer()} loading={transferring}>
                            Transfer
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Paper>
    )
}
