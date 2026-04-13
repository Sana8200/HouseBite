import { useState, useEffect } from "react"
import { supabase } from "../../supabase"
import "./HouseHold.css"

export function HouseHold() {
    const [households, setHouseholds] = useState<{ id: string, house_name: string }[]>([])

    useEffect(() => {
        const fetchHouseholds = async () => {
            const { data, error } = await supabase
                .from("household")
                .select("id, house_name")

            if (error) {
                console.error("Error fetching households:", error)
                return
            }

            setHouseholds(data)
        }

        void fetchHouseholds()
    }, [])

    return (
        <div className="household-page">
            <h1>Households</h1>
            <p>Manage your shared households, invite members and customize your preferences.</p>

            <div className="household-buttons">
                <button className="create-btn">+ Create Household</button>
                <button className="join-btn">+ Join Household</button>
            </div>

            <h2>Your Households</h2>
            <div className="household-grid">
                {households.map((h) => (
                    <div className="household-card" key={h.id}>
                        <h3>{h.house_name}</h3>
                        <button>Go to household</button>
                    </div>
                ))}
            </div>
        </div>
    )
}