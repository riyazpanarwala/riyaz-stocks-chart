import { GOOGLE_ANALYTICS_GA_ID } from "../components/config";

export const pageview = (url) => {
    if (typeof window !== "undefined") {
        window.gtag("config", GOOGLE_ANALYTICS_GA_ID, {
            page_path: url,
        });
    }
};