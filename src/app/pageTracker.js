"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { GOOGLE_ANALYTICS_GA_ID } from "../components/config";

export default function PageTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (!window.gtag) return;

        const url = pathname + (searchParams.toString() ? "?" + searchParams.toString() : "");
        window.gtag("config", GOOGLE_ANALYTICS_GA_ID, {
            page_path: url,
        });
    }, [pathname, searchParams]);

    return null;
}
