import { useState, useEffect } from "react"
import { supabase } from "../../supabase"
import "./HouseHold.css"

interface Household {
    id: string
    house_name: string
    invite_code: string
    monthly_budget: number | null
}

export function HouseHold() {
    const [households, setHouseholds] = useState<Household[]>([])
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showJoinModal, setShowJoinModal] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [newName, setNewName] = useState("")
    const [newBudget, setNewBudget] = useState("")
    const [creating, setCreating] = useState(false)

    const [inviteCode, setInviteCode] = useState("")
    const [joining, setJoining] = useState(false)

    const fetchHouseholds = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from("household")
            .select("id, house_name, invite_code, monthly_budget")

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

    useEffect(() => { void fetchHouseholds()}, [])

    const handleCreate = async () => {
        if (!newName.trim()) {
            setError("Household name is required")
            return
        }

        setCreating(true)
        setError(null)

        // current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setError("You must be logged in to create a household")
            setCreating(false)
            return
        }

        // Inserting the household
        const { data: household, error: createError } = await supabase
            .from("household")
            .insert({
                house_name: newName.trim(),
                monthly_budget: newBudget ? parseFloat(newBudget) : null,
            })
            .select()
            .single()

        if (createError) {
            console.error("Error creating household:", createError)
            setError("Could not create household: " + createError.message)
            setCreating(false)
            return
        }

        // Link the current user to the household
        const { error: allocError } = await supabase
            .from("allocations")
            .insert({
                member_id: user.id,
                household_id: household.id,
            })

        if (allocError) {
            console.error("Error joining household:", allocError)
            setError("Household created but could not link your account: " + allocError.message)
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
        if (!inviteCode.trim()) {
            setError("Invite code is required")
            return
        }

        setJoining(true)
        setError(null)

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setError("You must be logged in to join a household")
            setJoining(false)
            return
        }

        // Find the household by invite code
        const { data: household, error: findError } = await supabase
            .from("household")
            .select("id, house_name")
            .eq("invite_code", inviteCode.trim().toLowerCase())
            .single()

        if (findError || !household) {
            setError("No household found with that invite code")
            setJoining(false)
            return
        }

        // Check if already a member
        const { data: existing } = await supabase
            .from("allocations")
            .select("member_id")
            .eq("member_id", user.id)
            .eq("household_id", household.id)
            .maybeSingle()

        if (existing) {
            setError("You are already a member of " + household.house_name)
            setJoining(false)
            return
        }

        // Link the user to the household
        const { error: allocError } = await supabase
            .from("allocations")
            .insert({
                member_id: user.id,
                household_id: household.id,
            })

        if (allocError) {
            console.error("Error joining household:", allocError)
            setError("Could not join household: " + allocError.message)
            setJoining(false)
            return
        }

        // Reset and refresh
        setInviteCode("")
        setShowJoinModal(false)
        setJoining(false)
        void fetchHouseholds()
    }

    const copyInviteCode = (code: string) => {
        void navigator.clipboard.writeText(code)
    }

    return (
        <div className="household-page">
            <h1>Households</h1>
            <p>Manage your shared households, invite members and customize your preferences.</p>

            {error && (
                <div className="household-error">
                    {error}
                    <button className="error-dismiss" onClick={() => setError(null)}>×</button>
                </div>
            )}

            <div className="household-buttons">
                <button className="create-btn" onClick={() => setShowCreateModal(true)}>
                    + Create Household
                </button>
                <button className="join-btn" onClick={() => setShowJoinModal(true)}>
                    + Join Household
                </button>
            </div>

            <h2>Your Households</h2>

            {loading ? (
                <p className="household-loading">Loading households...</p>
            ) : households.length === 0 ? (
                <p className="household-empty">You are not part of any household yet. Create one or join with an invite code.</p>
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
                                    <span className="invite-label">Invite code:</span>
                                    <code className="invite-code">{h.invite_code}</code>
                                    <button
                                        className="copy-btn"
                                        onClick={() => copyInviteCode(h.invite_code)}
                                        title="Copy invite code"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                            <button className="go-btn">Go to household</button>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Household Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Create a Household</h2>
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
                        <p className="modal-hint">Ask a household member for their invite code.</p>
                        <div className="modal-field">
                            <label htmlFor="invite-code">Invite Code</label>
                            <input
                                id="invite-code"
                                type="text"
                                placeholder="e.g. a1b2c3d4"
                                value={inviteCode}
                                onChange={(e) => setInviteCode(e.target.value)}
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