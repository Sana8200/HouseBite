import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import type { User } from "@supabase/supabase-js"
import { supabase, signOut } from "../../supabase"
import "./Account.css"

interface Household {
    id: string
    house_name: string
}

export interface AccountProps {
    user: User
}

export function Account({ user }: AccountProps) {
    const navigate = useNavigate()
    const [households, setHouseholds] = useState<Household[]>([])
    const [loading, setLoading] = useState(true)
    const [expanded, setExpanded] = useState(false)
    const [totalSpent, setTotalSpent] = useState<number | null>(null)

    const initialUsername =
        (user.user_metadata?.display_name as string | undefined) ??
        (user.user_metadata?.username as string | undefined) ??
        user.email?.split("@")[0] ??
        ""
    const [username, setUsername] = useState(initialUsername)
    const [editingName, setEditingName] = useState(false)
    const [draftName, setDraftName] = useState(initialUsername)
    const [savingName, setSavingName] = useState(false)
    const [nameError, setNameError] = useState<string | null>(null)

    const [avatarUrl, setAvatarUrl] = useState<string | null>(
        (user.user_metadata?.avatar_url as string | undefined) ?? null
    )
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const [avatarError, setAvatarError] = useState<string | null>(null)

    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [savingPassword, setSavingPassword] = useState(false)
    const [passwordError, setPasswordError] = useState<string | null>(null)
    const [passwordSuccess, setPasswordSuccess] = useState(false)

    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState("")
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    useEffect(() => {
        const fetch = async () => {
            const { data, error } = await supabase
                .from("household")
                .select("id, house_name")
            if (error) console.error("Error fetching households:", error)
            else setHouseholds(data ?? [])

            const { data: receipts, error: rErr } = await supabase
                .from("receipt")
                .select("total")
            if (rErr) console.error("Error fetching receipts:", rErr)
            else {
                const sum = (receipts ?? []).reduce(
                    (acc, r) => acc + Number(r.total ?? 0),
                    0
                )
                setTotalSpent(sum)
            }

            setLoading(false)
        }
        void fetch()
    }, [])

    const saveUsername = async () => {
        const trimmed = draftName.trim()
        if (!trimmed) {
            setNameError("Username cannot be empty")
            return
        }
        setSavingName(true)
        setNameError(null)
        const { error } = await supabase.auth.updateUser({
            data: { username: trimmed, display_name: trimmed },
        })
        setSavingName(false)
        if (error) {
            setNameError(error.message)
            return
        }
        setUsername(trimmed)
        setEditingName(false)
    }

    const cancelEdit = () => {
        setDraftName(username)
        setNameError(null)
        setEditingName(false)
    }

    const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadingAvatar(true)
        setAvatarError(null)

        const ext = file.name.split(".").pop() ?? "jpg"
        const path = `${user.id}/avatar.${ext}`

        const { error: uploadErr } = await supabase.storage
            .from("avatars")
            .upload(path, file, { upsert: true, contentType: file.type })

        if (uploadErr) {
            setAvatarError(uploadErr.message)
            setUploadingAvatar(false)
            return
        }

        const { data: publicUrl } = supabase.storage
            .from("avatars")
            .getPublicUrl(path)

        const url = `${publicUrl.publicUrl}?t=${Date.now()}`

        const { error: metaErr } = await supabase.auth.updateUser({
            data: { avatar_url: url },
        })

        setUploadingAvatar(false)
        if (metaErr) {
            setAvatarError(metaErr.message)
            return
        }
        setAvatarUrl(url)
    }

    const savePassword = async () => {
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
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        setSavingPassword(false)
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
    }

    const confirmDelete = async () => {
        if (deleteConfirm !== "DELETE") {
            setDeleteError("Type DELETE to confirm")
            return
        }
        setDeleting(true)
        setDeleteError(null)
        const { error } = await supabase.rpc("delete_account")
        if (error) {
            setDeleting(false)
            setDeleteError(error.message)
            return
        }
        await signOut()
    }

    const memberSince = user.created_at
        ? new Date(user.created_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
          })
        : "—"

    const initials =
        (username || user.email || "?").trim().charAt(0).toUpperCase()

    return (
        <div className="page account-page">
            <h1>Account</h1>

            <section className="account-section account-identity">
                <label className="avatar-wrapper">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="avatar" className="avatar-img" />
                    ) : (
                        <div className="avatar-fallback">{initials}</div>
                    )}
                    <span className="avatar-overlay">
                        {uploadingAvatar ? "Uploading..." : "Change"}
                    </span>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={e => void onAvatarChange(e)}
                        disabled={uploadingAvatar}
                        hidden
                    />
                </label>
                <div>
                    <p className="identity-name">{username || "—"}</p>
                    <p className="identity-email">{user.email}</p>
                    {avatarError && (
                        <p className="account-error">{avatarError}</p>
                    )}
                </div>
            </section>

            <section className="account-section">
                <h2>Profile</h2>
                <dl className="account-list">
                    <div className="account-row">
                        <dt>Username</dt>
                        <dd>
                            {editingName ? (
                                <div className="account-edit">
                                    <input
                                        type="text"
                                        value={draftName}
                                        onChange={e => setDraftName(e.target.value)}
                                        disabled={savingName}
                                        autoFocus
                                    />
                                    <button
                                        className="account-save"
                                        onClick={() => void saveUsername()}
                                        disabled={savingName}
                                    >
                                        {savingName ? "Saving..." : "Save"}
                                    </button>
                                    <button
                                        className="account-cancel"
                                        onClick={cancelEdit}
                                        disabled={savingName}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <div className="account-view">
                                    <span>{username || "—"}</span>
                                    <button
                                        className="account-edit-btn"
                                        onClick={() => {
                                            setDraftName(username)
                                            setEditingName(true)
                                        }}
                                    >
                                        Edit
                                    </button>
                                </div>
                            )}
                            {nameError && (
                                <p className="account-error">{nameError}</p>
                            )}
                        </dd>
                    </div>
                    <div className="account-row">
                        <dt>Email</dt>
                        <dd>{user.email}</dd>
                    </div>
                    <div className="account-row">
                        <dt>Member since</dt>
                        <dd>{memberSince}</dd>
                    </div>
                    <div className="account-row">
                        <dt>Total spent</dt>
                        <dd>
                            {totalSpent === null
                                ? "—"
                                : `${totalSpent.toFixed(2)} kr`}
                        </dd>
                    </div>
                </dl>
            </section>

            <section className="account-section">
                <div className="account-households-header">
                    <h2>Households</h2>
                    {!loading && (
                        <button
                            className="account-expand-btn"
                            onClick={() => setExpanded(v => !v)}
                            aria-expanded={expanded}
                        >
                            {households.length}{" "}
                            {households.length === 1 ? "household" : "households"}
                            <span className="chev">{expanded ? "▲" : "▼"}</span>
                        </button>
                    )}
                </div>

                {loading ? (
                    <p className="loading-text">Loading households...</p>
                ) : households.length === 0 ? (
                    <p className="empty-text">
                        You are not part of any household yet.
                    </p>
                ) : (
                    expanded && (
                        <ul className="account-household-list">
                            {households.map(h => (
                                <li key={h.id} className="account-household-item">
                                    <span>{h.house_name}</span>
                                    <button
                                        className="go-btn"
                                        onClick={() => {
                                            void navigate("/dashboard")
                                        }}
                                    >
                                        Go to household
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )
                )}
            </section>

            <section className="account-section">
                <h2>Security</h2>
                <button
                    className="account-edit-btn"
                    onClick={() => setShowPasswordModal(true)}
                >
                    Change password
                </button>
            </section>

            <section className="account-section account-danger">
                <h2>Danger zone</h2>
                <p className="danger-text">
                    Deleting your account is permanent and cannot be undone.
                </p>
                <button
                    className="danger-btn"
                    onClick={() => setShowDeleteModal(true)}
                >
                    Delete account
                </button>
            </section>

            {showPasswordModal && (
                <div
                    className="modal-overlay"
                    onClick={() => !savingPassword && setShowPasswordModal(false)}
                >
                    <div
                        className="modal"
                        onClick={e => e.stopPropagation()}
                    >
                        <h2>Change password</h2>
                        <div className="modal-field">
                            <label>New password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                disabled={savingPassword}
                            />
                        </div>
                        <div className="modal-field">
                            <label>Confirm password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                disabled={savingPassword}
                            />
                        </div>
                        {passwordError && (
                            <p className="account-error">{passwordError}</p>
                        )}
                        {passwordSuccess && (
                            <p className="success-text">Password updated.</p>
                        )}
                        <div className="modal-actions">
                            <button
                                className="account-cancel"
                                onClick={() => setShowPasswordModal(false)}
                                disabled={savingPassword}
                            >
                                Cancel
                            </button>
                            <button
                                className="account-save"
                                onClick={() => void savePassword()}
                                disabled={savingPassword}
                            >
                                {savingPassword ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteModal && (
                <div
                    className="modal-overlay"
                    onClick={() => !deleting && setShowDeleteModal(false)}
                >
                    <div
                        className="modal"
                        onClick={e => e.stopPropagation()}
                    >
                        <h2>Delete account</h2>
                        <p className="modal-hint">
                            This will permanently delete your account and all
                            your data. Type <strong>DELETE</strong> to confirm.
                        </p>
                        <div className="modal-field">
                            <input
                                type="text"
                                value={deleteConfirm}
                                onChange={e => setDeleteConfirm(e.target.value)}
                                disabled={deleting}
                                placeholder="DELETE"
                            />
                        </div>
                        {deleteError && (
                            <p className="account-error">{deleteError}</p>
                        )}
                        <div className="modal-actions">
                            <button
                                className="account-cancel"
                                onClick={() => setShowDeleteModal(false)}
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            <button
                                className="danger-btn"
                                onClick={() => void confirmDelete()}
                                disabled={deleting}
                            >
                                {deleting ? "Deleting..." : "Delete permanently"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
