import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {Button, Group, Text, Modal, Stack, Title, Code, CopyButton, ActionIcon,
    ThemeIcon, Container, SimpleGrid, Card, TextInput, NumberInput, Alert,
    Tooltip} from "@mantine/core"
import {IconEdit, IconDoorExit, IconCheck, IconCopy, IconLink, IconPlus, IconUserPlus, IconAlertCircle,} from "@tabler/icons-react"
import { createHousehold, getHouseholds, getHouseholdMemberCount, joinHousehold, updateHousehold, leaveHousehold, getHouseholdMembers } from "../../api/household"
import { supabase } from "../../supabase"
import type { Household } from "../../api/schema"
import { notifications } from "@mantine/notifications"
import type { User } from "@supabase/supabase-js"
import "./HouseHold.css"
import { DelayedCustomLoader } from "../../components/CustomLoader"
import { formatCurrency } from "../../utils/currency"

export interface HouseHoldProps {
    user: User;
}

const HOUSEHOLD_COLORS = [
    '#228be6', // blue
    '#40c057', // green
    '#fab005', // yellow
    '#fd7e14', // orange
    '#e64980', // pink
    '#be4bdb', // purple
    '#f03e3e', // red
    '#12b886', // teal
    '#5c7cfa', // indigo
    '#20c997', // mint
]

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
    return (
        <Group gap={6}>
            {HOUSEHOLD_COLORS.map(color => (
                <ActionIcon
                    key={color}
                    size={28}
                    radius="xl"
                    style={{
                        backgroundColor: color,
                        border: value === color ? '3px solid white' : '2px solid transparent',
                        outline: value === color ? `2px solid ${color}` : 'none',
                    }}
                    onClick={() => onChange(color)}
                    aria-label={color}
                />
            ))}
        </Group>
    )
}

export function HouseHold(props: HouseHoldProps) {
    const {user} = props;
    const navigate = useNavigate()
    const [households, setHouseholds] = useState<Household[]>([])
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showJoinModal, setShowJoinModal] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [errorTitle, setErrorTitle] = useState<string>("Couldn't load households")

    const [newName, setNewName] = useState("")
    const [newBudget, setNewBudget] = useState<number | string>("")
    const [newColor, setNewColor] = useState(HOUSEHOLD_COLORS[0])
    const [creating, setCreating] = useState(false)
    const [createError, setCreateError] = useState<string | null>(null)

    const [inviteId, setInviteId] = useState("")
    const [joinColor, setJoinColor] = useState(HOUSEHOLD_COLORS[0])
    const [joining, setJoining] = useState(false)
    const [joinError, setJoinError] = useState<string | null>(null)

    const [editingHousehold, setEditingHousehold] = useState<Household | null>(null)
    const [editName, setEditName] = useState("")
    const [editBudget, setEditBudget] = useState<number | string>("")
    const [editColor, setEditColor] = useState(HOUSEHOLD_COLORS[0])
    const [saving, setSaving] = useState(false)
    const [editError, setEditError] = useState<string | null>(null)

    const [leavingId, setLeavingId] = useState<string | null>(null)
    const [leaving, setLeaving] = useState(false)
    const [lastMemberLeaveId, setLastMemberLeaveId] = useState<string | null>(null)
    const [confirmName, setConfirmName] = useState("")
    const [checkingMembers, setCheckingMembers] = useState<string | null>(null)

    const [createdHousehold, setCreatedHousehold] = useState<{ name: string; inviteId: string | null; id: string } | null>(null)
    const [memberCounts, setMemberCounts] = useState<Record<string, number>>({})
    const [userId, setUserId] = useState<string | null>(null)

    const atHouseholdLimit = households.length >= 5;

    const fetchHouseholds = async () => {
        try {
            const { data, error } = await getHouseholds()
            if (error) {
                setError("Could not load households")
                return
            }
            const list = data ?? []
            setHouseholds(list)
            setError(null)
            setErrorTitle("Couldn't load households")
            const counts = await Promise.all(list.map(h => getHouseholdMemberCount(h.id)))
            setMemberCounts(Object.fromEntries(list.map((h, i) => [h.id, counts[i]])))
        } catch {
            setError("Could not load households")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void fetchHouseholds()
        void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
    }, [])

    const handleCreate = async () => {
        if (!newName.trim()) { setCreateError("Household name is required"); return }
        
        // Check household limit
        if (atHouseholdLimit) {
            setCreateError("You have reached the maximum of 5 households. Please leave a household first before creating a new one.")
            return
        }
        
        const budget = typeof newBudget === "number" ? newBudget : newBudget ? parseFloat(newBudget) : null
        if (budget !== null && budget < 0) { setCreateError("Budget cannot be negative"); return }

        setCreating(true)
        setCreateError(null)
        try {
            const { data, error } = await createHousehold(newName.trim(), budget, newColor)
            if (error) { setCreateError(error.message); return }

            const result = (Array.isArray(data) ? data[0] : data)
            setNewName("")
            setNewBudget("")
            setNewColor(HOUSEHOLD_COLORS[0])
            setShowCreateModal(false)
            setCreatedHousehold(result ? { name: result.house_name, inviteId: result.invite_id, id: result.id } : null)
            void fetchHouseholds()
        } catch (e) {
            console.error("createHousehold failed", e)
            setCreateError("Could not create household. Please try again.")
        } finally {
            setCreating(false)
        }
    }

    const handleJoin = async () => {
        if (!inviteId.trim()) { setJoinError("Invite code is required"); return }
        
        // Check household limit
        if (atHouseholdLimit) {
            setJoinError("You have reached the maximum of 5 households. Please leave a household first before joining a new one.")
            return
        }
        
        setJoining(true)
        setJoinError(null)
        try {
            const { error } = await joinHousehold(inviteId.trim(), joinColor)
            if (error) { setJoinError(error.message); return }
            setInviteId("")
            setJoinColor(HOUSEHOLD_COLORS[0])
            setShowJoinModal(false)
            void fetchHouseholds()
            notifications.show({
                color: "brand",
                title: "Joined household",
                message: "You're now a member.",
            })
        } catch (e) {
            console.error("joinHousehold failed", e)
            setJoinError("Could not join household. Please try again.")
        } finally {
            setJoining(false)
        }
    }

    const openEdit = (h: Household) => {
        setEditingHousehold(h)
        setEditName(h.house_name)
        setEditBudget(h.monthly_budget ?? "")
        setEditColor(h.household_color ?? HOUSEHOLD_COLORS[0])
        setEditError(null)
    }

    const handleSaveEdit = async () => {
        if (!editingHousehold) return
        if (!editName.trim()) { setEditError("Name is required"); return }
        const budget = typeof editBudget === "number" ? editBudget : editBudget ? parseFloat(editBudget) : null
        if (budget !== null && budget < 0) { setEditError("Budget cannot be negative"); return }
        setSaving(true)
        setEditError(null)
        try {
            const { error } = await updateHousehold(editingHousehold.id, editName.trim(), budget, editColor)
            if (error) { setEditError(error.message); return }
            setEditingHousehold(null)
            void fetchHouseholds()
            notifications.show({
                color: "brand",
                title: "Saved",
                message: "Household updated.",
            })
        } catch (e) {
            console.error("updateHousehold failed", e)
            setEditError("Could not update household. Please try again.")
        } finally {
            setSaving(false)
        }
    }

    const handleLeave = async (householdId: string) => {
        const household = households.find(h => h.id === householdId)
        if (household && household.admin_id === userId && (memberCounts[householdId] ?? 0) > 1) {
            setErrorTitle("Transfer admin before leaving")
            setError("You are the admin of this household. Transfer admin rights to another member before leaving.")
            setLeavingId(null)
            return
        }
        setLeaving(true)
        try {
            const { error } = await leaveHousehold(user.id, householdId)
            if (error) {
                notifications.show({
                    color: "red",
                    title: "Couldn't leave household",
                    message: error.message,
                })
                return
            }
            setLeavingId(null)
            void fetchHouseholds()
            notifications.show({
                color: "orange",
                title: "Left household",
                message: `You have left ${household?.house_name ?? "the household"}.`,
            })
        } catch (e) {
            notifications.show({
                color: "red",
                title: "Couldn't leave household",
                message: e instanceof Error ? e.message : "Please try again.",
            })
        } finally {
            setLeaving(false)
        }
    }

    const handleLeaveClick = async (householdId: string) => {
        setCheckingMembers(householdId)
        try {
            const { data, error } = await getHouseholdMembers(householdId)
            if (error) {
                notifications.show({
                    color: "red",
                    title: "Could not check members",
                    message: error.message,
                })
                return
            }
            const memberCount = (data ?? []).length
            if (memberCount <= 1) {
                setLastMemberLeaveId(householdId)
            } else {
                setLeavingId(householdId)
            }
        } catch (e) {
            notifications.show({
                color: "red",
                title: "Could not check members",
                message: e instanceof Error ? e.message : "Please try again.",
            })
        } finally {
            setCheckingMembers(null)
        }
    }

    return (
        <Container size="md" py="xl">
            <Stack gap="lg">
                <div>
                    <Title order={1}>Households</Title>
                    <Text c="dimmed" mt="xs">
                        Manage your shared households, invite members and customize your preferences.
                    </Text>
                </div>

                {error && (
                    <Alert
                        variant="light"
                        color="red"
                        radius="md"
                        icon={<IconAlertCircle size={18} />}
                        title={errorTitle}
                        withCloseButton
                        onClose={() => { setError(null); setErrorTitle("Couldn't load households") }}
                    >
                        {error}
                    </Alert>
                )}

                <Group gap="md">
                    <Tooltip label="At maximum limit" disabled={!atHouseholdLimit}>
                        <Button size="lg" leftSection={<IconPlus size={20} />}
                            onClick={() => { setCreateError(null); setShowCreateModal(true) }}
                            disabled={atHouseholdLimit}
                        >
                            Create Household
                        </Button>
                    </Tooltip>
                    <Tooltip label="At maximum limit" disabled={!atHouseholdLimit}>
                        <Button
                            size="lg"
                            variant="default"
                            leftSection={<IconUserPlus size={20} />}
                            className="households-page__join-button"
                            onClick={() => { setJoinError(null); setInviteId(""); setJoinColor(HOUSEHOLD_COLORS[0]); setShowJoinModal(true) }}
                            disabled={atHouseholdLimit}
                        >
                            Join Household
                        </Button>
                    </Tooltip>
                </Group>

                <Title order={2} size="h3">Your Households ({households.length}/5)</Title>

                {loading ? (
                    <Group justify="center" py="xl"><DelayedCustomLoader /></Group>
                ) : households.length === 0 ? (
                    <Text c="dimmed" ta="center" py="xl">
                        You are not part of any household yet. Create one or join with an invite code.
                    </Text>
                ) : (
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                        {households.map(h => (
                            <Card
                                key={h.id}
                                withBorder
                                shadow="sm"
                                radius="xl"
                                padding="lg"
                                style={{
                                    borderLeft: `8px solid ${h.household_color}`,
                                }}
                            >
                                <Stack gap="sm">
                                    <div>
                                        <Group gap="xs" mb={2}>
                                            <Text fw={700} size="lg">{h.house_name}</Text>
                                        </Group>
                                        {h.monthly_budget != null && (
                                            <Text size="sm" c="dimmed">Budget: {formatCurrency(h.monthly_budget, {maximumFractionDigits: 0})} /month</Text>
                                        )}
                                        <Text size="sm" c={memberCounts[h.id] >= 51 ? "red" : "dimmed"}>
                                            {memberCounts[h.id] ?? "…"} {memberCounts[h.id] == 1 ? "member" : "members"}
                                            {memberCounts[h.id] >= 51 && " · Household is full"}
                                        </Text>
                                    </div>

                                    <CopyButton value={h.invite_id ?? ""} timeout={3000}>
                                        {({ copied, copy }) => (
                                            <Group gap="xs">
                                                <Text size="xs" c="dimmed">Invite code:</Text>
                                                <Code style={{ letterSpacing: 0.5 }}>{h.invite_id}</Code>
                                                <ActionIcon variant="subtle" size="sm"
                                                    color={copied ? "green" : "gray"} onClick={copy}>
                                                    {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                                </ActionIcon>
                                            </Group>
                                        )}
                                    </CopyButton>

                                    <Group gap="xs" mt="xs" className="households-page__actions">
                                        <Button variant="outline" size="sm" className="households-page__go-button"
                                            onClick={() => {
                                                void navigate("/dashboard", {
                                                    state: { householdId: h.id, householdName: h.house_name },
                                                })
                                            }}>
                                            Go to household
                                        </Button>
                                        <Button
                                            variant="default"
                                            size="sm"
                                            className="households-page__edit-button"
                                            leftSection={<IconEdit size={14} />}
                                            onClick={() => openEdit(h)}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="subtle"
                                            color="red"
                                            size="sm"
                                            className="households-page__leave-button"
                                            leftSection={<IconDoorExit size={14} />}
                                            loading={checkingMembers === h.id}
                                            onClick={() => void handleLeaveClick(h.id)}
                                        >
                                            Leave
                                        </Button>
                                    </Group>
                                </Stack>
                            </Card>
                        ))}
                    </SimpleGrid>
                )}
            </Stack>

            {/* Create Modal */}
            <Modal opened={showCreateModal} onClose={() => setShowCreateModal(false)}
                centered radius="xl" title={<Title order={3}>Create a Household</Title>}>
                <Stack gap="md">
                    {createError && (
                        <Alert
                            variant="light"
                            color="red"
                            radius="md"
                            icon={<IconAlertCircle size={18} />}
                            title="Couldn't create household"
                            withCloseButton
                            onClose={() => setCreateError(null)}
                        >
                            {createError}
                        </Alert>
                    )}
                    <TextInput label="Household Name" placeholder="e.g. The Smiths"
                        value={newName} onChange={e => setNewName(e.target.value)} />
                    <NumberInput label="Monthly Budget (optional)" placeholder="e.g. 5000"
                        min={0} value={newBudget} onChange={v => setNewBudget(v)} />
                    <div>
                        <Text size="sm" fw={500} mb={6}>Color</Text>
                        <ColorPicker value={newColor} onChange={setNewColor} />
                    </div>
                    <Group justify="flex-end" gap="sm">
                        <Button variant="default" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                        <Button onClick={() => void handleCreate()} loading={creating}>Create</Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Edit Modal */}
            <Modal opened={!!editingHousehold} onClose={() => setEditingHousehold(null)}
                centered radius="xl" title={<Title order={3}>Edit Household</Title>}>
                <Stack gap="md">
                    {editError && (
                        <Alert
                            variant="light"
                            color="red"
                            radius="md"
                            icon={<IconAlertCircle size={18} />}
                            title="Couldn't update household"
                            withCloseButton
                            onClose={() => setEditError(null)}
                        >
                            {editError}
                        </Alert>
                    )}
                    <TextInput label="Household Name" value={editName}
                        onChange={e => setEditName(e.target.value)} />
                    <NumberInput label="Monthly Budget (optional)" placeholder="e.g. 5000"
                        min={0} value={editBudget} onChange={v => setEditBudget(v)} />
                    <div>
                        <Text size="sm" fw={500} mb={6}>Color</Text>
                        <ColorPicker value={editColor} onChange={setEditColor} />
                    </div>
                    <Group justify="flex-end" gap="sm">
                        <Button variant="default" onClick={() => setEditingHousehold(null)}>Cancel</Button>
                        <Button onClick={() => void handleSaveEdit()} loading={saving}>Save Changes</Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Join Modal */}
            <Modal opened={showJoinModal} onClose={() => { setShowJoinModal(false); setInviteId(""); setJoinColor(HOUSEHOLD_COLORS[0]) }}
                centered radius="xl" title={<Title order={3}>Join a Household</Title>}>
                <Stack gap="md">
                    <Text size="sm" c="dimmed">Ask a household member for their invite code.</Text>
                    {joinError && (
                        <Alert
                            variant="light"
                            color="red"
                            radius="md"
                            icon={<IconAlertCircle size={18} />}
                            title="Couldn't join household"
                            withCloseButton
                            onClose={() => setJoinError(null)}
                        >
                            {joinError}
                        </Alert>
                    )}
                    <TextInput label="Invite Code" placeholder="e.g. a1b2c3d4"
                        value={inviteId} onChange={e => setInviteId(e.target.value)} />
                    <div>
                        <Text size="sm" fw={500} mb={6}>Color</Text>
                        <ColorPicker value={joinColor} onChange={setJoinColor} />
                    </div>
                    <Group justify="flex-end" gap="sm">
                        <Button variant="default" onClick={() => { setShowJoinModal(false); setInviteId(""); setJoinColor(HOUSEHOLD_COLORS[0]) }}>Cancel</Button>
                        <Button onClick={() => void handleJoin()} loading={joining}>Join</Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Success Modal */}
            <Modal opened={!!createdHousehold} onClose={() => setCreatedHousehold(null)}
                centered radius="xl" size="sm" padding="xl">
                {createdHousehold && (
                    <Stack align="center" gap="xl" py="md">
                        <div style={{
                            position: "relative", width: 100, height: 100,
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <div style={{
                                position: "absolute", inset: 0, borderRadius: "50%",
                                background: "radial-gradient(circle, var(--color-primary-50) 0%, transparent 70%)",
                            }} />
                            <ThemeIcon size={60} radius="xl" color="brand" variant="filled">
                                <IconCheck size={30} stroke={3} />
                            </ThemeIcon>
                            <Text style={{ position: "absolute", top: -4, right: 2, fontSize: 20 }}>🎊</Text>
                            <Text style={{ position: "absolute", top: 8, left: 0, fontSize: 14 }}>🎉</Text>
                            <Text style={{ position: "absolute", bottom: 4, right: 8, fontSize: 12 }}>✨</Text>
                            <Text style={{ position: "absolute", bottom: 8, left: 6, fontSize: 16 }}>🎈</Text>
                        </div>

                        <Stack align="center" gap={6}>
                            <Title order={2} ta="center">Household created! 🎉</Title>
                            <Text size="sm" c="dimmed" ta="center" maw={280}>
                                You're all set. Invite your house mates to start collaborating.
                            </Text>
                        </Stack>

                        <Stack w="100%" gap="xs" style={{
                            background: "var(--color-primary-50)",
                            border: "1px solid var(--color-primary-200)",
                            borderRadius: "var(--radius-lg)",
                            padding: "var(--space-lg)",
                        }}>
                            <Group gap="xs">
                                <IconLink size={16} color="var(--color-primary-700)" />
                                <Text size="sm" fw={700} c="var(--color-primary-700)">Your invite code</Text>
                            </Group>
                            <CopyButton value={createdHousehold.inviteId ?? ""} timeout={4000}>
                                {({ copied, copy }) => (
                                    <Stack gap="xs">
                                        <Group gap="sm" p="sm" style={{
                                            background: "var(--color-surface)",
                                            borderRadius: "var(--radius-md)",
                                            border: "1px solid var(--color-primary-200)",
                                        }}>
                                            <Code style={{ flex: 1, fontSize: "var(--font-size-400)", letterSpacing: 1.5, background: "transparent", fontWeight: 600 }}>
                                                {createdHousehold.inviteId}
                                            </Code>
                                            <ActionIcon variant={copied ? "filled" : "light"}
                                                color={copied ? "brand" : "gray"} onClick={copy} size="lg">
                                                {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                                            </ActionIcon>
                                        </Group>
                                        {copied && (
                                            <Group gap={4} justify="center">
                                                <IconCheck size={14} color="var(--color-success)" />
                                                <Text size="sm" fw={500} style={{ color: "var(--color-success)" }}>Copied!</Text>
                                            </Group>
                                        )}
                                    </Stack>
                                )}
                            </CopyButton>
                        </Stack>

                        <Button fullWidth size="lg" color="dark" radius="md"
                            rightSection={<span style={{ fontSize: 18 }}>→</span>}
                            onClick={() => {
                                setCreatedHousehold(null)
                                void navigate("/dashboard", {
                                    state: { householdId: createdHousehold.id, householdName: createdHousehold.name },
                                })
                            }}>
                            Continue to household
                        </Button>
                    </Stack>
                )}
            </Modal>

            {/* Multi-member leave confirmation */}
            {(() => {
                const h = households.find(x => x.id === leavingId)
                if (!h) return null
                return (
                    <Modal opened={!!leavingId} onClose={() => setLeavingId(null)}
                        centered radius="lg" title={<Text fw={700}>Leave household?</Text>}>
                        <Stack gap="md">
                            <Text size="sm">
                                You're about to leave <strong>{h.house_name}</strong>. The other members will keep using the household as normal.
                            </Text>
                            <Group justify="flex-end" gap="sm">
                                <Button variant="default" onClick={() => setLeavingId(null)}>Cancel</Button>
                                <Button color="red"
                                    leftSection={<IconDoorExit size={16} />}
                                    loading={leaving}
                                    onClick={() => void handleLeave(h.id)}>
                                    Leave
                                </Button>
                            </Group>
                        </Stack>
                    </Modal>
                )
            })()}

            {/* Last-member leave warning */}
            {(() => {
                const h = households.find(x => x.id === lastMemberLeaveId)
                if (!h) return null
                const closeModal = () => { setLastMemberLeaveId(null); setConfirmName("") }
                return (
                    <Modal opened={!!lastMemberLeaveId} onClose={closeModal}
                        centered radius="xl" title={<Text fw={700} style={{ color: "var(--color-danger)" }}>Delete household?</Text>}>
                        <Stack gap="md">
                            <Alert color="red" variant="light" title="This action is permanent">
                                You're the last member of <strong>{h.house_name}</strong>.
                                Leaving will permanently delete this household and everything in it:
                                pantry, receipts, shopping list, food restrictions, and budget history.
                                This cannot be undone.
                            </Alert>
                            <Text size="sm">
                                Type <strong>{h.house_name}</strong> to confirm:
                            </Text>
                            <TextInput
                                value={confirmName}
                                onChange={e => setConfirmName(e.currentTarget.value)}
                                placeholder={h.house_name}
                            />
                            <Group justify="flex-end" gap="sm">
                                <Button variant="default" onClick={closeModal}>Cancel</Button>
                                <Button color="red"
                                    disabled={confirmName !== h.house_name}
                                    loading={leaving}
                                    onClick={() => {
                                        void (async () => {
                                            await handleLeave(h.id)
                                            closeModal()
                                        })()
                                    }}>
                                    Delete household and leave
                                </Button>
                            </Group>
                        </Stack>
                    </Modal>
                )
            })()}
        </Container>
    )
}
