import "./SignIn.css";
import { IconAlertCircle } from "@tabler/icons-react";

// Official Google "G" logo, colored. Used inside the OAuth sign-in button.
function GoogleLogo({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            <path fill="none" d="M0 0h48v48H0z" />
        </svg>
    );
}
import { useRef, useState } from "react";
import { Alert, Button, Container, Divider, Paper, PasswordInput, Stack, Text, TextInput } from "@mantine/core";
import { signIn, signInWithGoogle, signUp, turnstileSiteKey } from "../../api/auth";
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
    const [googleLoading, setGoogleLoading] = useState(false);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");

    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const turnstileRef = useRef<TurnstileInstance>(null);

    const resetCaptcha = () => {
        setCaptchaToken(null);
        turnstileRef.current?.reset();
    }

    const onGoogleClick = async () => {
        setGoogleLoading(true);
        setError(null);
        try {
            const { error: oauthError } = await signInWithGoogle();
            if (oauthError) throw oauthError;
            // On success Supabase redirects to Google — this page unmounts.
        } catch (e) {
            setError(new Error(AuthError(e as Error)));
            setGoogleLoading(false);
        }
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
    const heading = activeTab === "signUp" ? "Create Account" : "Sign In";
    const description = activeTab === "signUp"
        ? "Create your account to start managing your household."
        : "Sign in to continue managing your household.";

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
                <Stack gap="xs">
                    <Text size="xl" fw={600}>{heading}</Text>
                    <Text c="dimmed">{description}</Text>
                </Stack>

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

                                <Button
                                    type="button"
                                    className="auth-google-button"
                                    variant="default"
                                    radius="md"
                                    size="md"
                                    leftSection={<GoogleLogo size={18} />}
                                    loading={googleLoading}
                                    disabled={loading}
                                    onClick={() => void onGoogleClick()}
                                    fullWidth
                                >
                                    Continue with Google
                                </Button>

                                <Divider label="or" labelPosition="center" />

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

                                <Button type="submit" variant="primary" radius="md" size="md" disabled={disabled} loading={loading}>
                                    {activeTab == "signIn" ? "Sign in" : "Sign up" }
                                </Button>
                            </Stack>
                        </form>
                </div>
            </Paper>
        </Container>
    );
}
