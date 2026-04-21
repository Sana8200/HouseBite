import { useEffect, useState, useCallback } from "react"
import { Modal, Text, Title, Group, Stack, Paper, Loader, Tooltip } from "@mantine/core"
import { IconAlertTriangle, IconLeaf, IconLock, IconUsers } from "@tabler/icons-react"
import { supabase } from "../../supabase"

interface FoodRestrictionsModalProps {
    householdId: string
    opened: boolean
    onClose: () => void
}

interface Restriction { id: string; name: string; category: string }
interface MemberRestriction { member_id: string; member_name: string; restriction_id: string }

const fmt = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase())

export function FoodRestrictionsModal({ householdId, opened, onClose }: FoodRestrictionsModalProps) {
    const [restrictions, setRestrictions] = useState<Restriction[]>([])
    const [memberRestrictions, setMemberRestrictions] = useState<MemberRestriction[]>([])
    const [hhIds, setHhIds] = useState<Set<string>>(new Set())
    const [busy, setBusy] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    const load = useCallback(async () => {
        setLoading(true)
        const [{ data: all }, { data: memberData }, { data: hhData }] = await Promise.all([
            supabase.from("food_restriction").select("id, name, category").order("category").order("name"),
            supabase.rpc("get_household_restrictions", { p_household_id: householdId }),
            supabase.from("household_food_restriction").select("restriction_id").eq("household_id", householdId),
        ])
        setRestrictions(all ?? [])
        setMemberRestrictions((memberData ?? []) as MemberRestriction[])
        setHhIds(new Set((hhData ?? []).map(r => r.restriction_id as string)))
        setLoading(false)
    }, [householdId])

    useEffect(() => {
        if (opened) void load()
    }, [opened, load])

    const toggle = async (id: string) => {
        setBusy(id)
        if (hhIds.has(id)) {
            await supabase.from("household_food_restriction").delete()
                .eq("household_id", householdId).eq("restriction_id", id)
            setHhIds(prev => { const n = new Set(prev); n.delete(id); return n })
        } else {
            await supabase.from("household_food_restriction")
                .insert({ household_id: householdId, restriction_id: id })
            setHhIds(prev => new Set(prev).add(id))
        }
        setBusy(null)
    }

    // Derived
    const memberIds = new Set(memberRestrictions.map(r => r.restriction_id))
    const allActiveIds = new Set([...memberIds, ...hhIds])

    // Build active chips with source info
    const activeChips = restrictions.filter(r => allActiveIds.has(r.id)).map(r => {
        const owners = [...new Set(
            memberRestrictions.filter(mr => mr.restriction_id === r.id).map(mr => mr.member_name)
        )]
        const isHh = hhIds.has(r.id)
        const isMemberOnly = owners.length > 0 && !isHh
        return { ...r, owners, isHh, isMemberOnly, canRemove: isHh && owners.length === 0 }
    })

    // Picker: only show options NOT already active from any source
    const available = restrictions.filter(r => !allActiveIds.has(r.id))
    const availableIntolerances = available.filter(r => r.category === "intolerance")
    const availableDiets = available.filter(r => r.category === "diet")

    return (
        <Modal opened={opened} onClose={onClose} centered size="lg" radius="xl" padding="xl"
            title={
                <Group gap="sm">
                    <IconLeaf size={22} color="var(--color-primary-600)" />
                    <Title order={3} fz="xl">Food Restrictions</Title>
                </Group>
            }
        >
            {loading ? (
                <Group justify="center" py="xl"><Loader /></Group>
            ) : (
                <Stack gap="lg">

                    {/* Active restrictions */}
                    <Paper radius="lg" p="lg"
                        style={{ background: "linear-gradient(135deg, #f0efe8 0%, #e8e7df 100%)", border: "1px solid #dddcd4" }}
                    >
                        <Group gap="xs" mb={4}>
                            <IconUsers size={16} color="#5a5947" />
                            <Text size="sm" fw={700} c="#3a3929">
                                Active for this household
                            </Text>
                        </Group>
                        <Text size="xs" c="#7a7968" mb="md">
                            Hover over any item to see where it comes from.
                        </Text>

                        {activeChips.length === 0 ? (
                            <Text size="sm" c="dimmed" fs="italic">
                                No restrictions set. Add some below, or set personal ones in your Account page.
                            </Text>
                        ) : (
                            <Group gap={6}>
                                {activeChips.map(r => (
                                    <Tooltip key={r.id} withArrow color="dark" multiline w={220} fz="xs"
                                        label={
                                            r.canRemove
                                                ? "Added for this household. Click to remove."
                                                : r.owners.length > 0
                                                    ? `Set by ${r.owners.join(", ")} in their Account.${r.isHh ? " Also added to household." : ""} Personal restrictions can only be changed in Account.`
                                                    : "Added for this household."
                                        }
                                    >
                                        <Text component="button" size="xs" px="sm" py={5}
                                            onClick={r.canRemove ? () => void toggle(r.id) : undefined}
                                            style={{
                                                borderRadius: 999,
                                                border: "none",
                                                fontFamily: "inherit",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 5,
                                                transition: "opacity 0.15s",
                                                background: r.canRemove ? "#3a3929" : "#8a8978",
                                                color: "white",
                                                cursor: r.canRemove ? "pointer" : "default",
                                                opacity: busy === r.id ? 0.4 : 1,
                                            }}
                                        >
                                            {!r.canRemove && <IconLock size={11} />}
                                            {fmt(r.name)}
                                            {r.canRemove && " ×"}
                                        </Text>
                                    </Tooltip>
                                ))}
                            </Group>
                        )}
                    </Paper>

                    {/* Picker — only shows what's not already active */}
                    {(availableIntolerances.length > 0 || availableDiets.length > 0) ? (
                        <div>
                            <Text fw={700} fz="md" mb={4}>
                                Add more for this household
                            </Text>
                            <Text size="xs" c="dimmed" mb="md">
                                These apply to this household only — they won't change anyone's Account.
                            </Text>

                            {availableIntolerances.length > 0 && (
                                <>
                                    <Group gap="xs" mb="xs">
                                        <IconAlertTriangle size={15} color="#b88a00" />
                                        <Text size="sm" fw={700} c="#5a5947">Intolerances</Text>
                                    </Group>
                                    <Group gap={6} mb="lg">
                                        {availableIntolerances.map(r => (
                                            <Text key={r.id} component="button" size="xs" px="md" py={6}
                                                onClick={() => void toggle(r.id)}
                                                style={{
                                                    borderRadius: 999,
                                                    border: "1.5px solid #e0e0e0",
                                                    background: "#fafafa",
                                                    color: "#555",
                                                    fontFamily: "inherit",
                                                    cursor: busy === r.id ? "wait" : "pointer",
                                                    opacity: busy === r.id ? 0.4 : 1,
                                                    transition: "all 0.15s",
                                                }}
                                            >
                                                + {fmt(r.name)}
                                            </Text>
                                        ))}
                                    </Group>
                                </>
                            )}

                            {availableDiets.length > 0 && (
                                <>
                                    <Group gap="xs" mb="xs">
                                        <IconLeaf size={15} color="#4a8c5c" />
                                        <Text size="sm" fw={700} c="#5a5947">Dietary preferences</Text>
                                    </Group>
                                    <Group gap={6}>
                                        {availableDiets.map(r => (
                                            <Text key={r.id} component="button" size="xs" px="md" py={6}
                                                onClick={() => void toggle(r.id)}
                                                style={{
                                                    borderRadius: 999,
                                                    border: "1.5px solid #e0e0e0",
                                                    background: "#fafafa",
                                                    color: "#555",
                                                    fontFamily: "inherit",
                                                    cursor: busy === r.id ? "wait" : "pointer",
                                                    opacity: busy === r.id ? 0.4 : 1,
                                                    transition: "all 0.15s",
                                                }}
                                            >
                                                + {fmt(r.name)}
                                            </Text>
                                        ))}
                                    </Group>
                                </>
                            )}
                        </div>
                    ) : (
                        <Text size="sm" c="dimmed" ta="center" py="md">
                            All restrictions are already active for this household.
                        </Text>
                    )}

                </Stack>
            )}
        </Modal>
    )
}
