import { useState } from "react"
import { signIn, turnstileSiteKey } from "../../api/auth";
import type { User } from "@supabase/supabase-js";
import { Alert, Button, Center, PasswordInput, Stack, Text, TextInput } from "@mantine/core";
import { Turnstile } from "@marsidev/react-turnstile";

export interface SignInProps {
    setUser: (user: User) => void,
}

export function SignInForm(props: SignInProps) {
    const {setUser} = props;

    const [error, setError] = useState<Error | null>(null);

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);

    const onSubmit = async (e: React.SubmitEvent) => {
        e.preventDefault();

        if (!captchaToken) return;

        try {
            const user = await signIn(email, password, captchaToken);
            setUser(user);
        } catch (error) {
            setError(error as Error);
        }
    }

    const disabled = !email || !password || !captchaToken;

    return (
        <form className="auth-form" onSubmit={e => void(onSubmit(e))}>
            <Stack gap="md">

                { error &&
                    <Alert variant="light" color="red">
                        <Center>
                            <Text>{error.message}</Text>
                        </Center>
                    </Alert>
                }

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

                <Turnstile siteKey={turnstileSiteKey} onSuccess={setCaptchaToken} />

                <Button type="submit" variant="primary" disabled={disabled}>
                    Sign in
                </Button>
            </Stack>
        </form>
    )
}
