import { useState } from "react"
import { signUp } from "../../supabase";
import type { User } from "@supabase/supabase-js";

export interface SignUpProps {
    setUser: (user: User) => void,
}

export function SignUpForm(props: SignUpProps) {
    const {setUser} = props;

    const [error, setError] = useState<Error | null>(null);

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const onSubmit = async (e: React.SubmitEvent) => {
        e.preventDefault();

        try {
            const user = await signUp(email, password);
            setUser(user);
        } catch (error) {
            setError(error as Error);
        }
    }

    const disabled = !email || !password;

    return (
        <form className="sign-in-form" onSubmit={e => void(onSubmit(e))}>

            <p>Sign-up</p>

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
                Sign-up
            </button>
        </form>
    )
}
