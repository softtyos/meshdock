import { useCallback, useEffect, useState } from "react";
import { t, type TranslationKey } from "@/lib/i18n";
import type { LanguageCode } from "@/lib/languages";

const LOCALE_COOKIE = "DOKPLOY_LOCALE";

export default function useLocale() {
	const [locale, setLocaleState] = useState<LanguageCode>("vi");

	useEffect(() => {
		try {
			// Read from cookie first, then localStorage
			const match = document.cookie.match(new RegExp(`(^| )${LOCALE_COOKIE}=([^;]+)`));
			const cookieLocale = match ? match[2] : null;
			const stored = cookieLocale || localStorage.getItem(LOCALE_COOKIE);
			if (stored === "en" || stored === "vi") {
				setLocaleState(stored);
			}
		} catch {}
	}, []);

	const setLocale = useCallback((newLocale: LanguageCode) => {
		try {
			setLocaleState(newLocale);
			// Save in cookie (1 year)
			document.cookie = `${LOCALE_COOKIE}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
			localStorage.setItem(LOCALE_COOKIE, newLocale);
			// Trigger reactive window event so other components update immediately
			window.dispatchEvent(new Event("localeChange"));
		} catch {}
	}, []);

	// Listen for locale changes across tabs/components
	useEffect(() => {
		const handleLocaleChange = () => {
			const match = document.cookie.match(new RegExp(`(^| )${LOCALE_COOKIE}=([^;]+)`));
			const current = (match ? match[2] : localStorage.getItem(LOCALE_COOKIE)) as LanguageCode;
			if (current && (current === "vi" || current === "en")) {
				setLocaleState(current);
			}
		};
		window.addEventListener("localeChange", handleLocaleChange);
		window.addEventListener("storage", handleLocaleChange);
		return () => {
			window.removeEventListener("localeChange", handleLocaleChange);
			window.removeEventListener("storage", handleLocaleChange);
		};
	}, []);

	const translate = useCallback(
		(key: string) => {
			return t(key, locale);
		},
		[locale],
	);

	return {
		locale,
		setLocale,
		t: translate,
	};
}
