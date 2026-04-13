import type { HouseholdType } from "./types"
import "./HouseHold.css"

const households: HouseholdType[] = [
    { name: "Smith Family", members: 5 },
    { name: "García Family", members: 2 },
    { name: "Student Coliving Prague", members: 8},
    { name: "Stockholm Shared Apartment", members: 2},
]

// create a household / joining a household 

export function HouseHold() {
    return (
        <div className="household-page">
    <h1>Households</h1>
    <p>Manage your shared households, invite members and customize your preferences.</p>
    <p>Here you can create and customize your household grocery budget, pantry, shopping list.</p>

    <div className="household-buttons">
        <button className="create-btn">+ Create Household</button>
        <button className="join-btn">+ Join Household</button>
    </div>

    <h2>Your Households</h2>
    <div className="household-grid">
        {households.map((h) => (
            <div className="household-card" key={h.name}>
                <h3>{h.name}</h3>
                <p>{h.members} members</p>
                <button>Go to household</button>
            </div>
        ))}
    </div>
</div>
    )
}