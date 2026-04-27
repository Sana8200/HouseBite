import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { signOut, saveUsername, savePassword } from "../../api/auth"
import {
    getTotalSpent,
    deleteAccount,
    getFoodRestrictions,
    getMyRestrictions,
    addRestriction,
    removeRestriction,
    type FoodRestriction,
} from "../../api/account"
import { getAvatar, getUsername } from "../../utils/user"
import { ActionIcon, Alert, Avatar, Button, Card, Center, Chip, Container, Divider, Flex, Grid, Group, Loader, Modal, Space, Stack, Text, TextInput, Title } from "@mantine/core"
import { IconEdit, IconDeviceFloppyFilled } from '@tabler/icons-react';

interface AccountProps {
    user: User;
}

export function Account(props: AccountProps) {
    const { user } = props;

    // Page Data
    const [loading, setLoading] = useState(true)
    const [totalSpent, setTotalSpent] = useState<number | null>(null)

    // Username editable
    const [username, setUsername] = useState(getUsername(user))
    const [editingName, setEditingName] = useState(false)
    const [draftName, setDraftName] = useState(username)
    const [savingName, setSavingName] = useState(false)
    const [nameError, setNameError] = useState<string | null>(null)

    const avatar = getAvatar(user);

    // Password Modal
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [savingPassword, setSavingPassword] = useState(false)
    const [passwordError, setPasswordError] = useState<string | null>(null)
    const [passwordSuccess, setPasswordSuccess] = useState(false)

    // Deletion modal
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState("")
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    const [availableRestrictions, setAvailableRestrictions] = useState<FoodRestriction[]>([])
    const [userRestrictions, setUserRestrictions] = useState<Set<string>>(new Set())
    const [togglingId, setTogglingId] = useState<string | null>(null)
    const [restrictionError, setRestrictionError] = useState<string | null>(null)


    useEffect(() => {
        const fetch = async () => {
            try {
                const [totalResult, availableRestrictionsResult, userRestrictionsResult] = await Promise.all([
                    getTotalSpent(),
                    getFoodRestrictions(),
                    getMyRestrictions(user.id),
                ]);

                if (totalResult.error) console.error("Error fetching total spent:", totalResult.error);
                else setTotalSpent(totalResult.total);

                if (availableRestrictionsResult.error) console.error("Error fetching availableRestrictions:", availableRestrictionsResult.error);
                else setAvailableRestrictions((availableRestrictionsResult.data ?? []) as FoodRestriction[]);

                if (userRestrictionsResult.error) console.error("Error fetching my availableRestrictions:", userRestrictionsResult.error);
                else setUserRestrictions(new Set((userRestrictionsResult.data ?? []).map(m => m.restriction_id)));
            } catch (e) {
                console.error("Account fetch failed", e)
            } finally {
                setLoading(false)
            }
        }
        void fetch()
    }, [user.id])

    const toggleRestriction = async (id: string) => {
        setTogglingId(id)
        setRestrictionError(null)
        const has = userRestrictions.has(id)
        const next = new Set(userRestrictions)

        try {
            if (has) {
                const { error } = await removeRestriction(user.id, id)
                if (error) { setRestrictionError(error.message); return }
                next.delete(id)
            } else {
                const { error } = await addRestriction(user.id, id)
                if (error) { setRestrictionError(error.message); return }
                next.add(id)
            }
            setUserRestrictions(next)
        } catch (e) {
            console.error("toggleRestriction failed", e)
            setRestrictionError("Could not update restrictions. Please try again.")
        } finally {
            setTogglingId(null)
        }
    }

    const diets = availableRestrictions.filter(r => r.category === "diet")
    const intolerances = availableRestrictions.filter(r => r.category === "intolerance")

    const handleSaveUsername = async () => {
        if (draftName == username) {
            setEditingName(false);
            return;
        }
        const trimmed = draftName.trim()
        if (!trimmed) {
            setNameError("Username cannot be empty")
            return
        }
        setSavingName(true)
        setNameError(null)
        try {
            const { error } = await saveUsername(trimmed)
            if (error) {
                setNameError(error.message)
                return
            }
            setUsername(trimmed)
            setEditingName(false)
        } catch (e) {
            console.error("saveUsername failed", e)
            setNameError("Could not save username. Please try again.")
        } finally {
            setSavingName(false)
        }
    }

    const handleChangePasswordClick = () => {
        setNewPassword("")
        setConfirmPassword("")
        setPasswordError(null)
        setShowPasswordModal(true)
    };

    const handleSavePassword = async () => {
        if (newPassword.length < 6) {
            setPasswordError("Password must be at least 6 characters")
            return
        }
        if (newPassword !== confirmPassword) {
            setPasswordError("Passwords do not match")
            return
        }
        setSavingPassword(true)
        setPasswordError(null)
        try {
            const { error } = await savePassword(newPassword)
            if (error) {
                setPasswordError(error.message)
                return
            }
            setPasswordSuccess(true)
            setNewPassword("")
            setConfirmPassword("")
            setTimeout(() => {
                setShowPasswordModal(false)
                setPasswordSuccess(false)
            }, 1200)
        } catch (e) {
            console.error("savePassword failed", e)
            setPasswordError("Could not update password. Please try again.")
        } finally {
            setSavingPassword(false)
        }
    }

    const handleDeleteAccount = async () => {
        if (deleteConfirm !== "DELETE") return;
        setDeleting(true)
        setDeleteError(null)
        try {
            const { error } = await deleteAccount()
            if (error) {
                setDeleteError(error.message)
                return
            }
            await signOut()
        } catch (e) {
            console.error("deleteAccount failed", e)
            setDeleteError("Could not delete account. Please try again.")
        } finally {
            setDeleting(false)
        }
    }

    const memberSince = user.created_at
        ? new Date(user.created_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
        })
        : "—"

    if (loading) return (
        <Center p="md">
            <Loader/>
        </Center>
    );

    return (
        <Container size="lg" p="md">
            <Title>Account</Title>

            <Grid mt="md">
                <Grid.Col span={{base: 12, md: 5}}>
                    <Stack>
                        <Card shadow="md">
                            <Flex align="center" gap="md">
                                <Avatar src={avatar} name={username} color="initials" size="xl"/>
                                <div>
                                    <Text size="xl">{username || "—"}</Text>
                                    <Text c="dimmed">{user.email}</Text>
                                </div>
                            </Flex>
                        </Card>

                        <Card shadow="md">
                            <Title order={4}>Profile</Title>

                            {nameError && (
                                <>
                                    <Alert variant="light" color="red" mt="md">
                                        {nameError}
                                    </Alert>
                                </>
                            )}

                            <Stack gap="xs" mt="md">
                                <Flex>
                                    <Text c="dimmed">Username</Text>
                                    <Space flex={1}/>
                                    {!editingName && 
                                        <>
                                            <Text fw={500}>{username || "-"}</Text>
                                            <ActionIcon variant="transparent" ml="xs"
                                                onClick={() => {
                                                    setDraftName(username)
                                                    setEditingName(true)
                                                }}>
                                                <IconEdit/>
                                            </ActionIcon>
                                        </>
                                    }
                                    {editingName &&
                                        <TextInput
                                            value={draftName}
                                            onChange={e => setDraftName(e.target.value)}
                                            disabled={savingName}
                                            loading={savingName}
                                            autoFocus
                                            rightSectionPointerEvents="auto"
                                            rightSection={
                                                <>
                                                    <ActionIcon variant="transparent" onClick={() => void handleSaveUsername()} disabled={savingName}>
                                                        <IconDeviceFloppyFilled/>
                                                    </ActionIcon>
                                                </>
                                            }/>
                                    }
                                    
                                </Flex>
                                <Divider/>
                                <Flex>
                                    <Text c="dimmed">Email</Text>
                                    <Space flex={1}/>
                                    <Text fw={500}>{user.email || "-"}</Text>
                                </Flex>
                                <Divider/>
                                <Flex>
                                    <Text c="dimmed">Member since</Text>
                                    <Space flex={1}/>
                                    <Text fw={500}>{memberSince}</Text>
                                </Flex>
                                <Divider/>
                                <Flex>
                                    <Text c="dimmed">Spent this month</Text>
                                    <Space flex={1}/>
                                    <Text fw={500}>
                                        {totalSpent?.toFixed(2) || '-'} kr
                                    </Text>
                                </Flex>
                            </Stack>

                        </Card>
                    </Stack>
                </Grid.Col>
                
                <Grid.Col span={{base: 12, md: 7}}>
                    <Card shadow="md">
                        <Title order={4}>Food Preferences & Restrictions</Title>
                        <Text c="dimmed">
                            Add your dietary restrictions to get personalized recipe
                            suggestions and let your household know what you can and
                            cannot eat.
                        </Text>

                        {restrictionError && (
                            <>
                                <Alert variant="light" color="red" mt="md">
                                    {restrictionError}
                                </Alert>
                            </>
                        )}

                        <Card p="md" shadow="none" withBorder mt="md">
                            <Text fw={500}>Your selections</Text>
                            <Space h="xs"/>
                            {userRestrictions.size === 0 && <Text>None selected</Text>}
                            <Group>
                                {availableRestrictions
                                    .filter(r => userRestrictions.has(r.id))
                                    .map(r => (
                                        <Chip key={r.id} checked onClick={() => void toggleRestriction(r.id)}>
                                            {formatRestriction(r.name)}
                                        </Chip>
                                    ))
                                }
                            </Group>
                        </Card>
                        <Space h="md"/>
                        <RestrictionCategory label="Intolerances" items={intolerances}
                            togglingId={togglingId} toggleRestriction={id => void toggleRestriction(id)} userRestrictions={userRestrictions}/>
                        <Space h="md"/>
                        <RestrictionCategory label="Diets" items={diets}
                            togglingId={togglingId} toggleRestriction={id => void toggleRestriction(id)} userRestrictions={userRestrictions}/>
                    </Card>
                </Grid.Col>
            </Grid>

            <Stack mt="md">
                <Card shadow="md">
                    <div>
                        <Title order={4}>Security</Title>
                        <Button onClick={handleChangePasswordClick} mt="sm">
                            Change password
                        </Button>
                    </div>
                </Card>

                <Card shadow="md">
                    <div>
                        <Title order={4} c="red">Danger zone</Title>
                        <Text>Deleting your account is permanent and cannot be undone.</Text>
                        <Button color="red" onClick={() => setShowDeleteModal(true)} mt="sm">
                            Delete account
                        </Button>
                    </div>
                </Card>
            </Stack>

            <Modal title="Change password"
                opened={showPasswordModal} onClose={() => !savingPassword && setShowPasswordModal(false)}>

                {passwordError && (
                    <Alert variant="light" color="red">{passwordError}</Alert>
                )}
                {passwordSuccess && (
                    <Alert variant="light" color="green">Password updated.</Alert>
                )}

                <TextInput 
                    label="New password"
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    disabled={savingPassword}
                    mt="sm"/>

                <TextInput
                    label="Confirm password"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    disabled={savingPassword}
                    mt="sm"/>

                <Flex justify="end" gap="md" mt="sm">
                    <Button
                        onClick={() => void handleSavePassword()}
                        disabled={savingPassword || !newPassword || newPassword != confirmPassword}
                        loading={savingPassword}>
                            Save
                    </Button>
                </Flex>
            </Modal>

            <Modal title="Delete account"
                opened={showDeleteModal} onClose={() => !deleting && setShowDeleteModal(false)}>
                <Text>
                    This will permanently delete your account and all
                    your data. Type <strong>DELETE</strong> to confirm.
                </Text>

                {deleteError && (
                    <>
                        <Alert variant="light" color="red" mt="sn">
                            {deleteError}
                        </Alert>
                    </>
                )}

                <TextInput
                    mt="sm"
                    value={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.value)}
                    disabled={deleting}
                    placeholder="DELETE" />

                <Flex justify="end" gap="md" mt="sm">
                    <Button color="red" onClick={() => void handleDeleteAccount()} disabled={deleting || deleteConfirm !== "DELETE"} loading={deleting}>Delete permanently</Button>
                </Flex>
            </Modal>

        </Container>
    )
}

interface RestrictionCategoryProps {
    label: string;
    items: FoodRestriction[];
    togglingId: string | null;
    toggleRestriction: (id: string) => void;
    userRestrictions: Set<string>;
}

function RestrictionCategory(props: RestrictionCategoryProps) {
    const { label, items, togglingId, toggleRestriction, userRestrictions } = props;

    return (
        <Card p="md" shadow="none" withBorder>
            <Text fw={500}>{label}</Text>
            <Group wrap="wrap" mt="xs">
                {items.map(r => {
                    const on = userRestrictions.has(r.id);
                    return (
                        <Chip key={r.id} checked={on} disabled={togglingId == r.id} onClick={() => void toggleRestriction(r.id)}>
                            {formatRestriction(r.name)}
                        </Chip>
                    );
                })}
            </Group>

        </Card>
    );
}

function formatRestriction(r: string) {
    return r.replace(/\b\w/g, c => c.toUpperCase());
}
