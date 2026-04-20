import { useState } from "react"
import { IconUserPlus, IconCopy, IconCheck } from "@tabler/icons-react"

interface InviteModalProps {
    inviteId: string
    onClose: () => void
}

export function InviteModal({ inviteId, onClose }: InviteModalProps) {
    const [copied, setCopied] = useState(false)

    const copyCode = () => {
        void navigator.clipboard.writeText(inviteId)
        setCopied(true)
    }

    return (
        <div className="invite-overlay" onClick={onClose}>
            <div className="invite-modal" onClick={e => e.stopPropagation()}>
                <button type="button" className="invite-close" onClick={onClose} aria-label="Close">
                    ×
                </button>

                <div className="invite-header">
                    <span className="invite-header-icon"><IconUserPlus size={28} /></span>
                    <h3>{copied ? "Code copied!" : "Invite to household"}</h3>
                </div>

                <p className="invite-desc">
                    Share this code with the person you want to invite.
                    They can paste it on the <strong>Households</strong> page to join.
                </p>

                <div className="invite-code-row">
                    <button
                        type="button"
                        className={`invite-copy-btn ${copied ? "is-copied" : ""}`}
                        onClick={copyCode}
                        title="Copy to clipboard"
                    >
                        {copied ? <IconCheck size={20} /> : <IconCopy size={20} />}
                    </button>
                    <code className="invite-code">{inviteId}</code>
                </div>

                {copied && (
                    <p className="invite-success">Now send this code to your friend!</p>
                )}
            </div>
        </div>
    )
}
