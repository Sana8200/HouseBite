import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<{outcome: "accepted" | "dismissed"}>;
}

const globalPromptEventTarget = new EventTarget();
let globalPromptEvent: BeforeInstallPromptEvent | null = null;

self.window.addEventListener("beforeinstallprompt", ev => {
    ev.preventDefault();
    globalPromptEvent = ev as BeforeInstallPromptEvent;
    globalPromptEventTarget.dispatchEvent(new Event("change"));
});

export class AppInstaller {
    public async prompt() {
        if (!globalPromptEvent) return;

        const { outcome } = await globalPromptEvent.prompt();

        if (outcome == "dismissed") return;
        
        globalPromptEvent = null;
        globalPromptEventTarget.dispatchEvent(new Event("change"));
    }

    public get canPrompt(): boolean {
        return !!globalPromptEvent;
    }
}

export function useAppInstaller(): AppInstaller {
    const [appInstaller, setAppInstaller] = useState(new AppInstaller());

    useEffect(() => {
        const onChange = () => {
            setAppInstaller(new AppInstaller());
        };

        globalPromptEventTarget.addEventListener("change", onChange);

        return () => {
            globalPromptEventTarget.removeEventListener("change", onChange);
        }
    }, []);

    return appInstaller;
}
