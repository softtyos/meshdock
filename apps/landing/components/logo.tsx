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
					id="landing_bladeLeft"
					x1="88"
					y1="96"
					x2="192"
					y2="384"
					gradientUnits="userSpaceOnUse"
				>
					<stop offset="0%" stopColor="#34D399" />
					<stop offset="100%" stopColor="#059669" />
				</linearGradient>
				<linearGradient
					id="landing_bladeRight"
					x1="424"
					y1="96"
					x2="320"
					y2="384"
					gradientUnits="userSpaceOnUse"
				>
					<stop offset="0%" stopColor="#10B981" />
					<stop offset="100%" stopColor="#047857" />
				</linearGradient>
				<linearGradient
					id="landing_chevronTop"
					x1="192"
					y1="96"
					x2="320"
					y2="224"
					gradientUnits="userSpaceOnUse"
				>
					<stop offset="0%" stopColor="#6EE7B7" />
					<stop offset="100%" stopColor="#10B981" />
				</linearGradient>
				<linearGradient
					id="landing_cubeTop"
					x1="192"
					y1="244"
					x2="320"
					y2="332"
					gradientUnits="userSpaceOnUse"
				>
					<stop offset="0%" stopColor="#A7F3D0" />
					<stop offset="100%" stopColor="#34D399" />
				</linearGradient>
				<linearGradient
					id="landing_cubeLeft"
					x1="192"
					y1="288"
					x2="256"
					y2="416"
					gradientUnits="userSpaceOnUse"
				>
					<stop offset="0%" stopColor="#059669" />
					<stop offset="100%" stopColor="#064E3B" />
				</linearGradient>
				<linearGradient
					id="landing_cubeRight"
					x1="256"
					y1="332"
					x2="320"
					y2="416"
					gradientUnits="userSpaceOnUse"
				>
					<stop offset="0%" stopColor="#10B981" />
					<stop offset="100%" stopColor="#047857" />
				</linearGradient>
			</defs>

			{/* Left Pillar Blade */}
			<path
				d="M 88 384 L 88 156 L 192 96 L 192 324 Z"
				fill="url(#landing_bladeLeft)"
			/>

			{/* Right Pillar Blade */}
			<path
				d="M 424 384 L 424 156 L 320 96 L 320 324 Z"
				fill="url(#landing_bladeRight)"
			/>

			{/* Top Central Chevron */}
			<path
				d="M 192 96 L 256 152 L 320 96 L 256 224 Z"
				fill="url(#landing_chevronTop)"
			/>

			{/* Central Docked Container Cube */}
			<path
				d="M 256 244 L 320 288 L 256 332 L 192 288 Z"
				fill="url(#landing_cubeTop)"
			/>
			<path
				d="M 192 288 L 256 332 L 256 416 L 192 372 Z"
				fill="url(#landing_cubeLeft)"
			/>
			<path
				d="M 256 332 L 320 288 L 320 372 L 256 416 Z"
				fill="url(#landing_cubeRight)"
			/>

			{/* Core Signal Indicator */}
			<circle cx="256" cy="288" r="8" fill="#FFFFFF" />
			<circle
				cx="256"
				cy="288"
				r="14"
				stroke="#FFFFFF"
				strokeWidth="2"
				opacity="0.6"
			/>
		</svg>
	);
};
