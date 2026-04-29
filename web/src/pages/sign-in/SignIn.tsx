import "./SignIn.css";
import { IconAlertCircle } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { Alert, Button, Container, Paper, PasswordInput, Stack, Text, TextInput } from "@mantine/core";
import { signIn, signUp, turnstileSiteKey } from "../../api/auth";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { notifications } from "@mantine/notifications";

export type AuthTab = "signIn" | "signUp";

export interface SignInProps {
    defaultTab?: AuthTab;
}

function AuthError(err: Error): string {
  const msg = err.message ?? "";
  if (msg.includes("User already registered")) return "An account with this email already exists. Try signing in instead.";
  if (msg.includes("Invalid login credentials")) return "Wrong email or password.";
  if (msg.toLowerCase().includes("email")) return msg;
  if (msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch")) return "Couldn't reach the server. Check your connection.";
  return msg || "Something went wrong. Please try again.";
}

export function SignIn(props: SignInProps) {
    const { defaultTab = "signIn"} = props;
    const [activeTab, setActiveTab] = useState<AuthTab>(defaultTab);
    const [verifyEmailSent, setVerifyEmailSent] = useState(false);

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
                const user = await signUp(email, password, displayName, captchaToken);
                // If email confirmation is enabled, the user has no session yet
                if (!user.confirmed_at && !user.email_confirmed_at) {
                    setVerifyEmailSent(true);
                } else {
                    notifications.show({
                        color: "green",
                        title: "Account created",
                        message: `Welcome, ${displayName}! You're now signed in.`,
                    });
                }
            }
        } catch (e) {
            setError(new Error(AuthError(e as Error)));
            resetCaptcha();
        } finally {
            setLoading(false);
        }
    }

    const nameError = activeTab === "signUp" && displayName.length > 25 ? "Name must be 25 characters or fewer" : null;
    const passwordError = password.length > 50 ? "Password must be 50 characters or fewer" : null;
    const disabled = loading || (activeTab == "signUp" ? !displayName : false) || !email || !password || !captchaToken || !!nameError || !!passwordError;

    if (verifyEmailSent) {
        return (
            <Container p="md" size="xs">
                <Paper p="md" radius="xl" shadow="md" withBorder>
                    <Stack gap="md" align="center">
                        <Text size="xl" fw={600}>Check your email</Text>
                        <Text ta="center" c="dimmed">
                            We sent a verification link to <strong>{email}</strong>.
                            Click it to activate your account.
                        </Text>
                        <Button variant="subtle" onClick={() => { setVerifyEmailSent(false); setActiveTab("signIn"); }}>
                            Back to sign in
                        </Button>
                    </Stack>
                </Paper>
            </Container>
        );
    }

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
                                {error && (
                                    <Alert
                                        variant="light"
                                        color="red"
                                        radius="md"
                                        icon={<IconAlertCircle size={18} />}
                                        title={activeTab === "signIn" ? "Couldn't sign in" : "Couldn't create account"}
                                        withCloseButton
                                        onClose={() => setError(null)}
                                    >
                                        {error.message}
                                    </Alert>
                                )}

                            { activeTab == "signUp" &&
                                <TextInput
                                    label="Name"
                                    type="text"
                                    placeholder="Your name"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    maxLength={25}
                                    error={nameError}
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
                                maxLength={50}
                                error={passwordError}
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
