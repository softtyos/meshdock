import type React from "react";

interface LogoProps {
	className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-8 h-8" }) => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 512 512"
			fill="none"
			className={className}
		>
			<defs>
				<linearGradient
					id="meshdockLandingGrad"
					x1="91.5"
					y1="90"
					x2="420.5"
					y2="420"
					gradientUnits="userSpaceOnUse"
				>
					<stop offset="0%" stopColor="#06B6D4" />
					<stop offset="50%" stopColor="#3B82F6" />
					<stop offset="100%" stopColor="#6366F1" />
				</linearGradient>
				<linearGradient id="meshdockLandingNode" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stopColor="#38BDF8" />
					<stop offset="100%" stopColor="#818CF8" />
				</linearGradient>
			</defs>

			{/* Dock Foundation Hexagon */}
			<path
				d="M91.5 351 L256 446 L420.5 351"
				stroke="#64748B"
				strokeWidth="22"
				strokeLinecap="round"
				strokeLinejoin="round"
				opacity="0.4"
			/>
			<path
				d="M256 256 L256 446"
				stroke="#64748B"
				strokeWidth="22"
				strokeLinecap="round"
				strokeLinejoin="round"
				opacity="0.4"
			/>
			<path
				d="M91.5 161 L256 66 L420.5 161"
				stroke="#64748B"
				strokeWidth="22"
				strokeLinecap="round"
				strokeLinejoin="round"
				opacity="0.4"
			/>
			<path
				d="M256 66 L256 256"
				stroke="#64748B"
				strokeWidth="18"
				strokeDasharray="10 10"
				strokeLinecap="round"
				opacity="0.35"
			/>

			{/* Main Mesh Ribbon ('M' Network Architecture) */}
			<path
				d="M91.5 351 L91.5 161 L256 256 L420.5 161 L420.5 351"
				stroke="url(#meshdockLandingGrad)"
				strokeWidth="42"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>

			{/* Topology Node Points */}
			<circle cx="256" cy="66" r="18" fill="#94A3B8" />
			<circle cx="256" cy="446" r="18" fill="#94A3B8" />

			{/* Active Server Nodes */}
			<circle cx="91.5" cy="351" r="24" fill="url(#meshdockLandingNode)" />
			<circle cx="91.5" cy="161" r="26" fill="url(#meshdockLandingNode)" />
			<circle cx="256" cy="256" r="28" fill="#3B82F6" />
			<circle cx="420.5" cy="161" r="26" fill="url(#meshdockLandingNode)" />
			<circle cx="420.5" cy="351" r="24" fill="url(#meshdockLandingNode)" />

			{/* Center Core Highlights */}
			<circle cx="256" cy="256" r="12" fill="#FFFFFF" />
			<circle cx="91.5" cy="161" r="10" fill="#FFFFFF" />
			<circle cx="420.5" cy="161" r="10" fill="#FFFFFF" />
			<circle cx="91.5" cy="351" r="9" fill="#FFFFFF" opacity="0.9" />
			<circle cx="420.5" cy="351" r="9" fill="#FFFFFF" opacity="0.9" />
		</svg>
	);
};
