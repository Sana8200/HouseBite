import { useLocation } from "react-router-dom"

export function Recipes() {
  const location = useLocation()
  const recipes = location.state?.recipes

  if (!recipes) {
    return <p>No recipes found. Go back and select some products.</p>
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Recipes</h1>
      <pre style={{ background: "#f4f4f4", padding: "1rem", borderRadius: "8px", overflow: "auto", fontSize: "0.85rem" }}>
        {JSON.stringify(recipes, null, 2)}
      </pre>
    </div>
  )
}
