"use client";
import React, { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { Session } from "next-auth";
import "react-loading-skeleton/dist/skeleton.css";
import { SkeletonTheme } from "react-loading-skeleton";
import { toast } from "sonner";

type AuthProviderProps = {
    children: React.ReactNode;
    session: Session | null;
};

export function AuthProvider({ children, session }: AuthProviderProps) {
    useEffect(() => {
        if (typeof window !== "undefined") {
        const hasToastShown = sessionStorage.getItem("toastShown");

        if (!hasToastShown && session?.user) {
            toast.success(
            `Welcome Back, ${session.user.name}! You are currently logged in. Enjoy your time with us.`
            );
            sessionStorage.setItem("toastShown", "true");
        }
        }
    }, [session]);

    return (
        <SessionProvider session={session}>
        <SkeletonTheme baseColor="#18181b" highlightColor="#1e1e24" borderRadius={"0.5rem"}>
            {children}
        </SkeletonTheme>
        {/* <ProgressBar
            height="3px"
            color="#CA1313"
            options={{ showSpinner: true }}
            // shallowRouting
        /> */}
        </SessionProvider>
    );
}
