import { useState } from "react"
import { signIn } from "../../supabase";
import type { User } from "@supabase/supabase-js";
//import { Input } from "../../components/ui/Input/Input";
//import { Button } from "../../components/ui/Button/Button";
import { Button, PasswordInput, Stack, Text, TextInput } from "@mantine/core";

export interface SignInProps {
    setUser: (user: User) => void,
}

export function SignInForm(props: SignInProps) {
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
        <form className="sign-in-form" onSubmit={e => void(onSubmit(e))}>
            <Stack gap="md">

                { error &&
                    <Text>
                        {error.message}
                    </Text>
                }

                <TextInput
                    label="Email"
                    type="email"
                    placeholder="youremail@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                
                <PasswordInput 
                    label="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <Button type="submit" variant="primary" disabled={disabled}>
                    Sign-in
                </Button>
            </Stack>
        </form>
    )
}
