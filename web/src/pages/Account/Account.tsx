import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { signOut, saveUsername, savePassword, setAvatar } from "../../api/auth"
import {
    getTotalSpent,
    deleteAccount,
    getFoodRestrictions,
    getMyRestrictions,
    addRestriction,
    removeRestriction,
} from "../../api/account"
import { avatars, getAvatarUrl, getUsername } from "../../utils/user"
import { ActionIcon, Alert, Avatar, Box, Button, Card, Center, Chip, Container, Divider, Flex, Grid, Group, Modal, Space, Stack, Text, TextInput, Title, type MantineStyleProp } from "@mantine/core"
import { IconEdit, IconDeviceFloppyFilled, IconAlertCircle } from '@tabler/icons-react';
import { notifications } from "@mantine/notifications";
import type { FoodRestriction } from "../../api/schema"
import { DelayedCustomLoader } from "../../components/CustomLoader"

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

    const avatar = getAvatarUrl(user);

    // Password Modal
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [savingPassword, setSavingPassword] = useState(false)
    const [passwordError, setPasswordError] = useState<string | null>(null)

    // Deletion modal
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState("")
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    const [availableRestrictions, setAvailableRestrictions] = useState<FoodRestriction[]>([])
    const [userRestrictions, setUserRestrictions] = useState<Set<string>>(new Set())
    const [togglingId, setTogglingId] = useState<string | null>(null)
    const [restrictionError, setRestrictionError] = useState<string | null>(null)

    const [avatarModalOpen, setAvatarModalOpen] = useState(false);


    useEffect(() => {
        const fetch = async () => {
            try {
                const [totalResult, availableRestrictionsResult, userRestrictionsResult] = await Promise.all([
                    getTotalSpent(),
                    getFoodRestrictions(),
                    getMyRestrictions(user.id),
                ]);

                if (totalResult.error) {
                    notifications.show({
                        color: "red",
                        title: "Could not load total spent",
                        message: String(totalResult.error.message ?? "Please try again.")
                    });
                }
                else setTotalSpent(totalResult.total);

                if (availableRestrictionsResult.error) {
                    notifications.show({
                        color: "red",
                        title: "Could not load restrictions",
                        message: availableRestrictionsResult.error.message
                    });
                }
                else setAvailableRestrictions(availableRestrictionsResult.data ?? []);

                if (userRestrictionsResult.error) {
                    notifications.show({
                        color: "red",
                        title: "Could not load your restrictions",
                        message: userRestrictionsResult.error instanceof Error
                            ? userRestrictionsResult.error.message
                            : "Please try again."
                    })
                }
                else setUserRestrictions(new Set((userRestrictionsResult.data ?? []).map(m => m.restriction_id)));
            } catch (e) {
                notifications.show({
                    color: "red",
                    title: "Could not load account",
                    message: e instanceof Error ? e.message : "Please try again."
                });
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
        const restriction = availableRestrictions.find(r => r.id === id)
        const label = formatRestriction(restriction?.name ?? "Restriction")

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
            notifications.show({
                color: has ? "orange" : "brand",
                title: has ? "Removed" : "Added",
                message: `${label} ${has ? "removed from" : "added to"} your restrictions.`,
            })
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
        if (trimmed.length > 25) {
            setNameError("Username must be 25 characters or fewer")
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
            notifications.show({
                color: "brand",
                title: "Saved",
                message: "Username updated.",
            })
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
        if (newPassword.length > 50) {
            setPasswordError("Password must be 50 characters or fewer")
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
            setNewPassword("")
            setConfirmPassword("")
            setShowPasswordModal(false)
            notifications.show({
                color: "brand",
                title: "Password updated",
                message: "Your password has been changed.",
            })
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
            <DelayedCustomLoader />
        </Center>
    );

    return (
        <Container size="lg" p="md">
            <Title>Account</Title>

            <Grid mt="md">
                <Grid.Col span={{ base: 12, md: 5 }}>
                    <Stack>
                        <Card shadow="md" radius="xl">
                            <Flex align="center" gap="md">
                                <Box pos="relative">
                                    <Avatar src={avatar} name={username} color="initials" size="xl" />
                                    <ActionIcon pos="absolute" bottom={0} right={0} radius="100%" variant="light"
                                        onClick={() => setAvatarModalOpen(true)}
                                        style={{ border: "2px solid white" }}
                                    >
                                        <IconEdit size={16} />
                                    </ActionIcon>
                                </Box>
                                <div>
                                    <Text size="xl">{username || "—"}</Text>
                                    <Text c="dimmed">{user.email}</Text>
                                </div>
                            </Flex>
                        </Card>

                        <Card shadow="md" radius="xl">
                            <Title order={4}>Profile</Title>

                            {nameError && (
                                <Alert
                                    variant="light"
                                    color="red"
                                    radius="md"
                                    mt="md"
                                    icon={<IconAlertCircle size={18} />}
                                    title="Couldn't save username"
                                    withCloseButton
                                    onClose={() => setNameError(null)}>
                                    {nameError}
                                </Alert>
                            )}

                            <Stack gap="xs" mt="md">
                                <Flex>
                                    <Text c="dimmed">Username</Text>
                                    <Space flex={1} />
                                    {!editingName &&
                                        <>
                                            <Text fw={500}>{username || "-"}</Text>
                                            <ActionIcon variant="transparent" ml="xs"
                                                onClick={() => {
                                                    setDraftName(username)
                                                    setEditingName(true)
                                                }}>
                                                <IconEdit />
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
                                            maxLength={25}
                                            error={nameError}
                                            rightSectionPointerEvents="auto"
                                            rightSection={
                                                <>
                                                    <ActionIcon variant="transparent" onClick={() => void handleSaveUsername()} disabled={savingName}>
                                                        <IconDeviceFloppyFilled />
                                                    </ActionIcon>
                                                </>
                                            } />
                                    }

                                </Flex>
                                <Divider />
                                <Flex>
                                    <Text c="dimmed">Email</Text>
                                    <Space flex={1} />
                                    <Text fw={500}>{user.email || "-"}</Text>
                                </Flex>
                                <Divider />
                                <Flex>
                                    <Text c="dimmed">Member since</Text>
                                    <Space flex={1} />
                                    <Text fw={500}>{memberSince}</Text>
                                </Flex>
                                <Divider />
                                <Flex>
                                    <Text c="dimmed">Spent this month</Text>
                                    <Space flex={1} />
                                    <Text fw={500}>
                                        {totalSpent?.toFixed(2) || '-'} kr
                                    </Text>
                                </Flex>
                            </Stack>

                        </Card>
                    </Stack>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 7 }}>
                    <Card shadow="md" radius="xl">
                        <Title order={4}>Food Preferences & Restrictions</Title>
                        <Text c="dimmed">
                            Add your dietary restrictions to get personalized recipe
                            suggestions and let your household know what you can and
                            cannot eat.
                        </Text>

                        {restrictionError && (
                            <Alert
                                variant="light"
                                color="red"
                                radius="md"
                                mt="md"
                                icon={<IconAlertCircle size={18} />}
                                title="Couldn't update restrictions"
                                withCloseButton
                                onClose={() => setRestrictionError(null)}>
                                {restrictionError}
                            </Alert>
                        )}

                        <Card p="md" shadow="none" withBorder radius="xl" mt="md">
                            <Text fw={500}>Your selections</Text>
                            <Space h="xs" />
                            {userRestrictions.size === 0 && <Text>None selected</Text>}
                                <Group>
                                {availableRestrictions
                                    .filter(r => userRestrictions.has(r.id))
                                    .map(r => (
                                        <Chip key={r.id} checked color="brand" onClick={() => void toggleRestriction(r.id)}>
                                            {formatRestriction(r.name)}
                                        </Chip>
                                    ))
                                }
                            </Group>
                        </Card>
                        <Space h="md" />
                        <RestrictionCategory label="Intolerances" items={intolerances}
                            togglingId={togglingId} toggleRestriction={id => void toggleRestriction(id)} userRestrictions={userRestrictions} />
                        <Space h="md" />
                        <RestrictionCategory label="Diets" items={diets}
                            togglingId={togglingId} toggleRestriction={id => void toggleRestriction(id)} userRestrictions={userRestrictions} />
                    </Card>
                </Grid.Col>
            </Grid>

            <Stack mt="md">
                <Card shadow="md" radius="xl">
                    <div>
                        <Title order={4}>Security</Title>
                        <Button onClick={handleChangePasswordClick} mt="sm">
                            Change password
                        </Button>
                    </div>
                </Card>

                <Card shadow="md" radius="xl">
                    <div>
                        <Title order={4} style={{ color: "var(--color-danger)" }}>Danger zone</Title>
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
                    <Alert
                        variant="light"
                        color="red"
                        radius="md"
                        icon={<IconAlertCircle size={18} />}
                        title="Couldn't update password"
                        withCloseButton
                        onClose={() => setPasswordError(null)}>
                        {passwordError}
                    </Alert>
                )}

                <TextInput
                    label="New password"
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    disabled={savingPassword}
                    maxLength={50}
                    mt="sm"/>

                <TextInput
                    label="Confirm password"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    disabled={savingPassword}
                    maxLength={50}
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
                    <Alert
                        variant="light"
                        color="red"
                        radius="md"
                        mt="sm"
                        icon={<IconAlertCircle size={18} />}
                        title="Couldn't delete account"
                        withCloseButton
                        onClose={() => setDeleteError(null)}>
                        {deleteError}
                    </Alert>
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

            <AvatarModal username={username} opened={avatarModalOpen} onClose={() => setAvatarModalOpen(false)}/>
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
        <Card p="md" shadow="none" withBorder radius="xl">
            <Text fw={500}>{label}</Text>
            <Group wrap="wrap" mt="xs">
                {items.map(r => {
                    const on = userRestrictions.has(r.id);
                    return (
                        <Chip key={r.id} checked={on} color="brand" disabled={togglingId == r.id} onClick={() => void toggleRestriction(r.id)}>
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

interface AvatarModalProps {
    opened: boolean,
    onClose: () => void,
    username: string,
}

function AvatarModal(props: AvatarModalProps) {
    const { opened, onClose, username } = props;

    const onChange = async (id: string) => {
        await setAvatar(id);
        onClose();
    };

    const cursorStyle: MantineStyleProp = {cursor: "pointer"};

    return (
        <Modal opened={opened} onClose={onClose} title="Change avatar" centered>
            <Flex gap="md" wrap="wrap">
                <Avatar name={username} color="initials" size="xl" onClick={() => void onChange("")} style={cursorStyle}/>
                {[...avatars.values()].map(avatar => (
                    <Avatar key={avatar.id} src={avatar.url} size="xl" onClick={() => void onChange(avatar.id)} style={cursorStyle}/>
                ))}
            </Flex>
        </Modal>
    );
}
