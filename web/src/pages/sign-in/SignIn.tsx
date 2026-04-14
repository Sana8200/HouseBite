import "./SignIn.css";
import type { User } from "@supabase/supabase-js";
import { SignInForm } from "./SignInForm";
import { SignUpForm } from "./SignUpForm";

export interface SignInProps {
    setUser: (user: User) => void,
}

export function SignIn(props: SignInProps) {
    const {setUser} = props;

    return (
        <div>
            <SignInForm setUser={setUser}/>
            <br/>
            <hr/>
            <br/>
            <SignUpForm setUser={setUser}/>
        </div>
    )
}
