import "./SignIn.css";
import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Container, Paper } from "@mantine/core";
import { SignInForm } from "./SignInForm";
import { SignUpForm } from "./SignUpForm";

type AuthTab = "signIn" | "signUp";

export interface SignInProps {
  setUser: (user: User) => void;
}

export function SignIn({ setUser }: SignInProps) {
  const [activeTab, setActiveTab] = useState<AuthTab>("signIn");

  return (
    <Container p="md" size="xs">
      <Paper p="md" radius="xl" shadow="md" withBorder>
        <div
          className={`auth-switch ${
            activeTab === "signUp" ? "auth-switch--sign-up" : ""
          }`}
        >
          <button
            type="button"
            className={`auth-switch__option ${
              activeTab === "signIn" ? "is-active" : ""
            }`}
            onClick={() => setActiveTab("signIn")}
          >
            Sign in
          </button>

          <button
            type="button"
            className={`auth-switch__option ${
              activeTab === "signUp" ? "is-active" : ""
            }`}
            onClick={() => setActiveTab("signUp")}
          >
            Sign up
          </button>
        </div>

        <div className="auth-content">
          {activeTab === "signIn" ? (
            <SignInForm setUser={setUser} />
          ) : (
            <SignUpForm setUser={setUser} />
          )}
        </div>
      </Paper>
    </Container>
  );
}
