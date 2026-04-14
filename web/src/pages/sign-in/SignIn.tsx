import { useState } from "react"
import { signIn } from "../../supabase";
import "./SignIn.css";
import type { User } from "@supabase/supabase-js";
import { NavLink } from "react-router";

export interface SignInProps {
    setUser: (user: User) => void,
}

export function SignIn(props: SignInProps) {
    const {setUser} = props;

    const [error, setError] = useState<Error | null>(null);

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const onSubmit = async (e: React.SubmitEvent) => {
        e.preventDefault();

        try {
            const user = await signIn(email, password);
            setUser(user);
        } catch (error) {
            setError(error as Error);
        }
    }

    const disabled = !email || !password;

    return (
        <form className="sign-in-root" onSubmit={e => void(onSubmit(e))}>

            <p>
                Sign-in or <NavLink to="/sign-up">sign-up</NavLink>
            </p>

            { error &&
                <div>
                    {error.message}
                </div>
            }

            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}/>
            
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}/>

            <button type="submit" disabled={disabled}>
                Sign-in
            </button>
        </form>
    )
}
