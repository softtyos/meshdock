export const Languages = {
	vietnamese: { code: "vi", name: "Tiếng Việt 🇻🇳" },
	english: { code: "en", name: "English 🇺🇸" },
} as const;

export type Language = keyof typeof Languages;
export type LanguageCode = (typeof Languages)[keyof typeof Languages]["code"];
