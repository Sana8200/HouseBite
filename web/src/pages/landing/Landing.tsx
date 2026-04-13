import { NavLink } from "react-router";

export function Landing() {
  return (
    <>
      <p>This is the landing page</p>
      <NavLink to="/test">Test</NavLink>
    </>
  )
}
