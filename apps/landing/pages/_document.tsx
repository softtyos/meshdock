import { Head, Html, Main, NextScript } from "next/document";

export default function Document() {
	return (
		<Html lang="vi" className="dark">
			<Head>
				<link rel="icon" href="/icon.svg" />
				<meta name="theme-color" content="#070B14" />
			</Head>
			<body className="bg-[#070B14] text-slate-100 antialiased selection:bg-cyan-500/20 selection:text-cyan-300">
				<Main />
				<NextScript />
			</body>
		</Html>
	);
}
