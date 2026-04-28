import "./SignIn.css";
import { useRef, useState } from "react";
import { Alert, Button, Center, Container, Paper, PasswordInput, Stack, Text, TextInput } from "@mantine/core";
import { signIn, signUp, turnstileSiteKey } from "../../api/auth";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { notifications } from "@mantine/notifications";

export type AuthTab = "signIn" | "signUp";

export interface SignInProps {
    defaultTab?: AuthTab;
}

export function SignIn(props: SignInProps) {
    const {
        defaultTab = "signIn"
    } = props;
    const [activeTab, setActiveTab] = useState<AuthTab>(defaultTab);

    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState(false);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");

    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const turnstileRef = useRef<TurnstileInstance>(null);

    const resetCaptcha = () => {
        setCaptchaToken(null);
        turnstileRef.current?.reset();
    }

    const onSubmit = async (e: React.SubmitEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!captchaToken) {
          setLoading(false);
          return;
        }

        try {
            if (activeTab == "signIn") {
                await signIn(email, password, captchaToken);
            } else {
                await signUp(email, password, displayName, captchaToken);
            }
        } catch (error) {
            setError(error as Error);
            resetCaptcha();
        } finally {
            setLoading(false);
        }
    }

    const disabled = loading || (activeTab == "signUp" ? !displayName : false) || !email || !password || !captchaToken;

    return (
        <Container p="md" size="xs">
            <Paper p="md" radius="xl" shadow="md" withBorder>
                <div className={`auth-switch ${ activeTab === "signUp" ? "auth-switch--sign-up" : "" }`}>
                    <button
                        type="button"
                        className={`auth-switch__option ${ activeTab === "signIn" ? "is-active" : "" }`}
                        onClick={() => setActiveTab("signIn")}
                    >
                        Sign in
                    </button>

                    <button
                        type="button"
                        className={`auth-switch__option ${ activeTab === "signUp" ? "is-active" : "" }`}
                        onClick={() => setActiveTab("signUp")}
                    >
                        Sign up
                    </button>
                </div>

                <div className="auth-content">
                    <form className="auth-form" onSubmit={e => void(onSubmit(e))}>
                        <Stack gap="md">
                            { error &&
                                <Alert variant="light" color="red">
                                        <Center>
                                                <Text>{error.message}</Text>
                                        </Center>
                                </Alert>
                            }

                            { activeTab == "signUp" &&
                                <TextInput
                                    label="Name"
                                    type="text"
                                    placeholder="Your name"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                />
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

                            <Turnstile ref={turnstileRef} siteKey={turnstileSiteKey} onSuccess={setCaptchaToken} />

                            <Button type="submit" variant="primary" disabled={disabled} loading={loading}>
                                {activeTab == "signIn" ? "Sign in" : "Sign up" }
                            </Button>
                        </Stack>
                    </form>
                </div>
            </Paper>
        </Container>
    );
}
