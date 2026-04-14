import { useState } from "react"
import { signUp } from "../../supabase";
import type { User } from "@supabase/supabase-js";
//import { Button } from "../../components/ui/Button/Button";
//import { Input } from "../../components/ui/Input/Input";
import { Button, PasswordInput, Stack, Text, TextInput } from "@mantine/core";


export interface SignUpProps {
    setUser: (user: User) => void,
}

export function SignUpForm(props: SignUpProps) {
    const {setUser} = props;

    const [error, setError] = useState<Error | null>(null);

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [fullName, setFullName] = useState("")

    const onSubmit = async (e: React.SubmitEvent) => {
        e.preventDefault();

        try {
            const user = await signUp(email, password);
            setUser(user);
        } catch (error) {
            setError(error as Error);
        }
    }

    const disabled = !fullName || !email || !password;

    return (
        <form className="auth-form" onSubmit={e => void(onSubmit(e))}>
            <Stack gap="md">
                { error &&
                    <Text>
                        {error.message}
                    </Text>
                }

                <TextInput
                    label="Name"
                    type="text"
                    placeholder="Your name (does nothing)"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                />

                <TextInput 
                    label="Email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                
                <PasswordInput
                    label="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />


                <Button type="submit" variant="primary" disabled={disabled}>
                    Sign up
                </Button>
            </Stack>
        </form>
    )
}
