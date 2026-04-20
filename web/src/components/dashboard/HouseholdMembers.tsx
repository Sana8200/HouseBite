import { useEffect, useState } from "react"
import { getHouseholdMembers } from "../../api/household"
import { IconShare } from "@tabler/icons-react"
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

    if (loading) return <p className="loading-text">Loading members...</p>
    if (members.length === 0) return null

    const getName = (m: Member) =>
        m.display_name || m.email?.split("@")[0] || "Unknown"

    const getInitial = (m: Member) =>
        getName(m).charAt(0).toUpperCase()

    return (
        <div className="hh-members">
            <h3 className="hh-members-title">Here are the members of your household</h3>
            <div className="hh-members-grid">
                {members.map(m => (
                    <div key={m.id} className="hh-member-card">
                        <div className="hh-member-avatar">{getInitial(m)}</div>
                        <span className="hh-member-name">{getName(m)}</span>
                    </div>
                ))}
                {inviteId && (
                    <button
                        type="button"
                        className="hh-member-card hh-invite-card"
                        onClick={() => setShowInvite(true)}
                    >
                        <div className="hh-invite-icon">
                            <IconShare size={24} />
                        </div>
                        <span className="hh-member-name">invite someone</span>
                    </button>
                )}
            </div>

            {showInvite && inviteId && (
                <InviteModal inviteId={inviteId} onClose={() => setShowInvite(false)} />
            )}
        </div>
    )
}
