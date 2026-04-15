import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import "./HouseHold.css"
import { createHousehold, getHouseholds, joinHousehold, type Household } from "../../api/household"

export function HouseHold() {
    const navigate = useNavigate()
    const [households, setHouseholds] = useState<Household[]>([])
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showJoinModal, setShowJoinModal] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [newName, setNewName] = useState("")
    const [newBudget, setNewBudget] = useState("")
    const [creating, setCreating] = useState(false)
    const [createError, setCreateError] = useState<string | null>(null)

    const [inviteId, setInviteId] = useState("")
    const [joining, setJoining] = useState(false)
    const [joinError, setJoinError] = useState<string | null>(null)

    const fetchHouseholds = async () => {
        const { data, error } = await getHouseholds()

        if (error) {
            console.error("Error fetching households:", error)
            setError("Could not load households")
            setLoading(false)
            return
        }

        setHouseholds(data ?? [])
        setError(null)
        setLoading(false)
    }

    // Warns because fetchHouseholds calls setState internally;
    // safe to suppress since all setState calls happen after await, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void fetchHouseholds()}, [])

    const handleCreate = async () => {
        if (!newName.trim()) {
            setCreateError("Household name is required")
            return
        }

        const parsedBudget = newBudget ? parseFloat(newBudget) : null
        if (parsedBudget !== null && parsedBudget < 0) {
            setCreateError("Budget cannot be negative")
            return
        }

        setCreating(true)
        setCreateError(null)

        const { error } = await createHousehold(
            newName.trim(),
            parsedBudget
        )

        if (error) {
            console.error("Error creating household:", error)
            setCreateError("Could not create household: " + error.message)
            setCreating(false)
            return
        }

        // Reset and refresh
        setNewName("")
        setNewBudget("")
        setShowCreateModal(false)
        setCreating(false)
        void fetchHouseholds()
    }

    const handleJoin = async () => {
        if (!inviteId.trim()) {
            setJoinError("Invite Id is required")
            return
        }

        setJoining(true)
        setJoinError(null)

        const { error } = await joinHousehold(inviteId.trim())

        if (error) {
            console.error("Error joining household:", error)
            setJoinError(error.message)
            setJoining(false)
            return
        }

        // Reset and refresh
        setInviteId("")
        setShowJoinModal(false)
        setJoining(false)
        void fetchHouseholds()
    }

    const copyInviteId = (id: string) => {
        void navigator.clipboard.writeText(id)
    }

    return (
        <div className="page household-page">
            <h1>Households</h1>
            <p>Manage your shared households, invite members and customize your preferences.</p>

            {error && (
                <div className="error-banner">
                    {error}
                    <button className="error-dismiss" onClick={() => setError(null)}>×</button>
                </div>
            )}

            <div className="household-buttons">
                <button className="create-btn" onClick={() => { setCreateError(null); setShowCreateModal(true) }}>
                    + Create Household
                </button>
                <button className="join-btn" onClick={() => { setJoinError(null); setShowJoinModal(true) }}>
                    + Join Household
                </button>
            </div>

            <h2>Your Households</h2>

            {loading ? (
                <p className="loading-text">Loading households...</p>
            ) : households.length === 0 ? (
                <p className="empty-text">You are not part of any household yet. Create one or join with an invite code.</p>
            ) : (
                <div className="household-grid">
                    {households.map((h) => (
                        <div className="household-card" key={h.id}>
                            <div className="household-card-info">
                                <h3>{h.house_name}</h3>
                                {h.monthly_budget && (
                                    <p className="household-budget">Budget: {h.monthly_budget} kr/month</p>
                                )}
                                <div className="invite-code-row">
                                    <span className="invite-label">Invite Id:</span>
                                    <code className="invite-code">{h.invite_id}</code>
                                    <button
                                        className="copy-btn"
                                        onClick={() => copyInviteId(h.invite_id)}
                                        title="Copy invite code"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                            <button className="go-btn" onClick={() => { void navigate("/dashboard") }}>Go to household</button>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Household Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Create a Household</h2>
                        {createError && (
                            <div className="error-banner">
                                {createError}
                                <button className="error-dismiss" onClick={() => setCreateError(null)}>×</button>
                            </div>
                        )}
                        <div className="modal-field">
                            <label htmlFor="house-name">Household Name</label>
                            <input
                                id="house-name"
                                type="text"
                                placeholder="e.g. The Smiths"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                            />
                        </div>
                        <div className="modal-field">
                            <label htmlFor="house-budget">Monthly Budget (optional)</label>
                            <input
                                id="house-budget"
                                type="number"
                                placeholder="e.g. 5000"
                                value={newBudget}
                                onChange={(e) => setNewBudget(e.target.value)}
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowCreateModal(false)}>
                                Cancel
                            </button>
                            <button className="confirm-btn" onClick={() => void handleCreate()} disabled={creating}>
                                {creating ? "Creating..." : "Create"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Join Household Modal */}
            {showJoinModal && (
                <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Join a Household</h2>
                        <p className="modal-hint">Ask a household member for their invite ID.</p>
                        {joinError && (
                            <div className="error-banner">
                                {joinError}
                                <button className="error-dismiss" onClick={() => setJoinError(null)}>×</button>
                            </div>
                        )}
                        <div className="modal-field">
                            <label htmlFor="invite-code">Invite ID</label>
                            <input
                                id="invite-code"
                                type="text"
                                placeholder="e.g. a1b2c3d4"
                                value={inviteId}
                                onChange={(e) => setInviteId(e.target.value)}
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowJoinModal(false)}>
                                Cancel
                            </button>
                            <button className="confirm-btn" onClick={() => void handleJoin()} disabled={joining}>
                                {joining ? "Joining..." : "Join"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}