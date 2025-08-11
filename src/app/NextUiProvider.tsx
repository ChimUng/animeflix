"use client";
import React, { ReactNode } from "react";
import { NextUIProvider } from "@nextui-org/react";

interface NextUiProviderProps {
    children: ReactNode;
}

export function NextUiProvider({ children }: NextUiProviderProps) {
    return (
        <NextUIProvider>
        {children}
        </NextUIProvider>
    );
}
