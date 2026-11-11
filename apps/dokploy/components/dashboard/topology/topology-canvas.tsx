import {
	Activity,
	ArrowDown,
	ArrowRight,
	Boxes,
	CheckCircle2,
	ChevronRight,
	Cpu,
	Database,
	Filter,
	Globe,
	HardDrive,
	Layers,
	Minus,
	Network,
	Plus,
	RefreshCw,
	RotateCcw,
	Search,
	Server,
	Shield,
	Sparkles,
	Terminal,
	Workflow,
	X,
	Zap,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";

export interface TopologyNode {
	id: string;
	label: string;
	sublabel?: string;
	tier: "ingress" | "cluster" | "service" | "data";
	type:
		| "domain"
		| "traefik"
		| "swarm-cluster"
		| "host"
		| "application"
		| "compose"
		| "database"
		| "volume"
		| string;
	status: "healthy" | "warning" | "offline";
	targetAppId?: string;
	targetAppName?: string;
	targetServerId?: string;
	serverId?: string;
	domains?: string[];
	stats?: {
		cpu?: number;
		memory?: string;
		replicas?: string;
		ports?: string;
	};
}

export interface TopologyEdge {
	id: string;
	source: string;
	target: string;
	label?: string;
	animated?: boolean;
}

const TrafficPulseConnector = ({
	pulseColor = "#06b6d4",
	enabled = true,
	label,
}: {
	fromColor?: string;
	toColor?: string;
	pulseColor?: string;
	enabled?: boolean;
	label?: string;
}) => {
	return (
		<div className="flex flex-col items-center py-2 relative my-1">
			{label && (
				<div className="mb-2 px-3 py-1 rounded-full bg-background/90 border border-border/70 shadow-xs text-[11px] font-sans font-medium text-muted-foreground flex items-center gap-2 backdrop-blur-xs">
					<span className="relative flex h-2 w-2">
						<span
							className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
							style={{ backgroundColor: pulseColor }}
						/>
						<span
							className="relative inline-flex rounded-full h-2 w-2"
							style={{ backgroundColor: pulseColor }}
						/>
					</span>
					<span>{label}</span>
				</div>
			)}
			<svg className="w-6 h-10 overflow-visible" viewBox="0 0 24 40">
				<line
					x1="12"
					y1="0"
					x2="12"
					y2="32"
					stroke="currentColor"
					strokeWidth="2"
					strokeOpacity="0.2"
				/>
				{enabled && (
					<>
						<line
							x1="12"
							y1="0"
							x2="12"
							y2="32"
							stroke={pulseColor}
							strokeWidth="2"
							strokeDasharray="4 6"
							strokeOpacity="0.75"
						/>
						{/* Particle 1 */}
						<circle r="2.5" fill={pulseColor}>
							<animate
								attributeName="cy"
								from="0"
								to="32"
								dur="1.2s"
								repeatCount="indefinite"
							/>
							<animate
								attributeName="opacity"
								values="0;1;1;0"
								dur="1.2s"
								repeatCount="indefinite"
							/>
						</circle>
						{/* Particle 2 */}
						<circle r="2" fill="#ffffff">
							<animate
								attributeName="cy"
								from="0"
								to="32"
								dur="1.2s"
								begin="0.6s"
								repeatCount="indefinite"
							/>
							<animate
								attributeName="opacity"
								values="0;1;1;0"
								dur="1.2s"
								begin="0.6s"
								repeatCount="indefinite"
							/>
						</circle>
					</>
				)}
				<polygon
					points="8,32 16,32 12,38"
					fill={enabled ? pulseColor : "currentColor"}
					opacity={enabled ? 0.9 : 0.4}
				/>
			</svg>
		</div>
	);
};

export interface InfrastructureHost {
	id: string;
	name: string;
	ip: string;
	role: string;
	type: string;
	status: string;
	isLocal: boolean;
	specs: { cores: number; memory: string };
	ingress: Array<{
		id: string;
		name: string;
		type: string;
		ports: string;
	}>;
	domains: Array<{
		id: string;
		host: string;
		port: number | null;
		https: boolean;
		targetType: string;
		targetName: string;
	}>;
	workloads: Array<{
		id: string;
		name: string;
		subname?: string;
		type: string;
		status: string;
		domains: string[];
	}>;
	databases: Array<{
		id: string;
		name: string;
		type: string;
		status: string;
	}>;
	volumes: Array<{
		id: string;
		name: string;
		sublabel?: string;
		type: string;
		status: string;
	}>;
}

interface TopologyCanvasProps {
	nodes: TopologyNode[];
	edges: TopologyEdge[];
	infrastructure?: InfrastructureHost[];
	onRefresh?: () => void;
}

export const TopologyCanvas = ({
	nodes,
	edges,
	infrastructure,
	onRefresh,
}: TopologyCanvasProps) => {
	const [viewMode, setViewMode] = useState<"infrastructure" | "pipeline">(
		"infrastructure",
	);
	const [zoom, setZoom] = useState<number>(1);
	const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [activeTier, setActiveTier] = useState<string>("all");
	const [trafficPulseEnabled, setTrafficPulseEnabled] = useState<boolean>(true);
	const [activeTraceId, setActiveTraceId] = useState<string | null>(null);

	// 5 Sequential Architecture Stages (Computed dynamically from nodes)
	const stage1Domains = useMemo(() => {
		const q = searchQuery.toLowerCase().trim();
		return nodes.filter(
			(n) =>
				n.type === "domain" &&
				(!q ||
					n.label.toLowerCase().includes(q) ||
					(n.sublabel && n.sublabel.toLowerCase().includes(q)) ||
					(n.targetAppName && n.targetAppName.toLowerCase().includes(q))),
		);
	}, [nodes, searchQuery]);

	const stage2Gateways = useMemo(() => {
		const q = searchQuery.toLowerCase().trim();
		const list = nodes.filter(
			(n) =>
				(n.type === "traefik" || n.type === "gateway" || n.id === "traefik-ingress") &&
				(!q || n.label.toLowerCase().includes(q) || (n.sublabel && n.sublabel.toLowerCase().includes(q))),
		);
		if (list.length === 0) {
			return [
				{
					id: "traefik-ingress",
					label: "Traefik Ingress Gateway",
					sublabel: "TLS / Reverse Proxy (:80, :443)",
					tier: "ingress" as const,
					type: "traefik",
					status: "healthy" as const,
				},
			];
		}
		return list;
	}, [nodes, searchQuery]);

	const stage3Hosts = useMemo(() => {
		const q = searchQuery.toLowerCase().trim();
		return nodes.filter(
			(n) =>
				(n.type === "swarm-cluster" || n.type === "host" || n.type === "standalone" || n.tier === "cluster") &&
				(!q || n.label.toLowerCase().includes(q) || (n.sublabel && n.sublabel.toLowerCase().includes(q))),
		);
	}, [nodes, searchQuery]);

	const stage4Workloads = useMemo(() => {
		const q = searchQuery.toLowerCase().trim();
		return nodes.filter(
			(n) =>
				(n.type === "application" || n.type === "compose" || n.tier === "service") &&
				(!q ||
					n.label.toLowerCase().includes(q) ||
					(n.sublabel && n.sublabel.toLowerCase().includes(q)) ||
					(n.domains && n.domains.some((d) => d.toLowerCase().includes(q)))),
		);
	}, [nodes, searchQuery]);

	const stage5Storage = useMemo(() => {
		const q = searchQuery.toLowerCase().trim();
		return nodes.filter(
			(n) =>
				(n.type === "database" || n.type === "volume" || n.tier === "data") &&
				(!q || n.label.toLowerCase().includes(q) || (n.sublabel && n.sublabel.toLowerCase().includes(q))),
		);
	}, [nodes, searchQuery]);

	// Active Trace Path Computation
	const activeTrace = useMemo(() => {
		if (!activeTraceId) return null;
		const clicked = nodes.find((n) => n.id === activeTraceId);
		if (!clicked) return null;

		const highlightedIds = new Set<string>();
		highlightedIds.add(clicked.id);

		let domainNode: TopologyNode | undefined;
		let gatewayNode: TopologyNode | undefined = nodes.find(
			(n) => n.type === "traefik" || n.type === "gateway" || n.id === "traefik-ingress",
		);
		let serverNode: TopologyNode | undefined;
		let appNode: TopologyNode | undefined;
		let dbNode: TopologyNode | undefined;

		if (gatewayNode) highlightedIds.add(gatewayNode.id);

		if (clicked.type === "domain") {
			domainNode = clicked;
			if (clicked.targetAppId) {
				appNode = nodes.find((n) => n.id === clicked.targetAppId);
			}
			if (clicked.targetServerId) {
				serverNode = nodes.find((n) => n.id === clicked.targetServerId);
			}
		} else if (clicked.type === "application" || clicked.type === "compose") {
			appNode = clicked;
			domainNode = nodes.find(
				(n) =>
					n.type === "domain" &&
					(n.targetAppId === clicked.id || (clicked.domains && clicked.domains.includes(n.label))),
			);
			if (clicked.serverId) {
				serverNode = nodes.find((n) => n.id === clicked.serverId);
			}
		} else if (
			clicked.type === "swarm-cluster" ||
			clicked.type === "host" ||
			clicked.type === "standalone"
		) {
			serverNode = clicked;
			nodes
				.filter((n) => n.serverId === clicked.id)
				.forEach((a) => {
					highlightedIds.add(a.id);
					const d = nodes.find((dom) => dom.targetAppId === a.id);
					if (d) highlightedIds.add(d.id);
				});
		} else if (clicked.type === "database") {
			dbNode = clicked;
			if (clicked.serverId) {
				serverNode = nodes.find((n) => n.id === clicked.serverId);
			}
		}

		if (domainNode) highlightedIds.add(domainNode.id);
		if (appNode) {
			highlightedIds.add(appNode.id);
			if (!serverNode && appNode.serverId) {
				serverNode = nodes.find((n) => n.id === appNode.serverId);
			}
		}
		if (!serverNode) {
			serverNode = nodes.find((n) => n.id === "cluster-primary");
		}
		if (serverNode) highlightedIds.add(serverNode.id);

		// Find databases and storage
		const storageNode = nodes.find((n) => n.id === "storage-volumes");
		if (storageNode) highlightedIds.add(storageNode.id);

		if (!dbNode && serverNode) {
			const relatedDb = nodes.find((n) => n.type === "database" && n.serverId === serverNode?.id);
			if (relatedDb) {
				dbNode = relatedDb;
				highlightedIds.add(relatedDb.id);
			}
		}

		return {
			highlightedIds,
			domain: domainNode?.label || (clicked.type === "domain" ? clicked.label : null),
			gateway: gatewayNode?.label || "Traefik Ingress Gateway (:443)",
			server: serverNode?.label || "Softty Server 1 (Master)",
			app:
				appNode?.label ||
				(clicked.type === "application" || clicked.type === "compose" ? clicked.label : null),
			db: dbNode?.label || "Mesh Persistent Volumes",
		};
	}, [activeTraceId, nodes]);

	// Group nodes by tier for pipeline view fallback
	const tiers = useMemo(() => {
		const q = searchQuery.toLowerCase().trim();
		const filterFn = (n: TopologyNode) => {
			if (activeTier !== "all" && n.tier !== activeTier) return false;
			if (q) {
				return (
					n.label.toLowerCase().includes(q) ||
					(n.sublabel && n.sublabel.toLowerCase().includes(q))
				);
			}
			return true;
		};

		return {
			ingress: nodes.filter((n) => n.tier === "ingress" && filterFn(n)),
			cluster: nodes.filter((n) => n.tier === "cluster" && filterFn(n)),
			service: nodes.filter((n) => n.tier === "service" && filterFn(n)),
			data: nodes.filter((n) => n.tier === "data" && filterFn(n)),
		};
	}, [nodes, searchQuery, activeTier]);

	// Filtered infrastructure servers
	const filteredInfrastructure = useMemo(() => {
		if (!infrastructure || infrastructure.length === 0) return [];
		const q = searchQuery.toLowerCase().trim();
		if (!q) return infrastructure;

		return infrastructure.filter((host) => {
			const matchHost =
				host.name.toLowerCase().includes(q) ||
				host.ip.toLowerCase().includes(q) ||
				host.role.toLowerCase().includes(q);
			const matchWorkload = host.workloads.some(
				(w) =>
					w.name.toLowerCase().includes(q) ||
					(w.subname && w.subname.toLowerCase().includes(q)) ||
					w.domains.some((d) => d.toLowerCase().includes(q)),
			);
			const matchDb = host.databases.some((d) =>
				d.name.toLowerCase().includes(q),
			);
			const matchDomain = host.domains.some((d) =>
				d.host.toLowerCase().includes(q),
			);
			return matchHost || matchWorkload || matchDb || matchDomain;
		});
	}, [infrastructure, searchQuery]);

	const getNodeIcon = (type: TopologyNode["type"] | string) => {
		switch (type) {
			case "domain":
				return <Globe className="h-4 w-4 text-emerald-400" />;
			case "traefik":
			case "gateway":
				return <Shield className="h-4 w-4 text-cyan-400" />;
			case "swarm-cluster":
			case "swarm-manager":
				return <Layers className="h-4 w-4 text-blue-400" />;
			case "host":
			case "standalone":
				return <Server className="h-4 w-4 text-amber-400" />;
			case "application":
				return <Zap className="h-4 w-4 text-purple-400" />;
			case "compose":
				return <Boxes className="h-4 w-4 text-indigo-400" />;
			case "database":
				return <Database className="h-4 w-4 text-emerald-400" />;
			case "volume":
				return <HardDrive className="h-4 w-4 text-zinc-400" />;
			default:
				return <Workflow className="h-4 w-4 text-primary" />;
		}
	};

	const getStatusDot = (status: string) => {
		switch (status) {
			case "healthy":
			case "online":
			case "done":
				return "bg-emerald-500 ring-2 ring-emerald-500/20";
			case "warning":
			case "degraded":
				return "bg-amber-500 ring-2 ring-amber-500/20";
			case "offline":
			case "error":
				return "bg-rose-500 ring-2 ring-rose-500/20";
			default:
				return "bg-emerald-500 ring-2 ring-emerald-500/20";
		}
	};

	return (
		<div className="relative w-full rounded-xl border border-border/80 bg-slate-50/70 dark:bg-[#090A0D] overflow-hidden shadow-sm transition-colors duration-200">
			{/* Architecture blueprint grid texture */}
			<div
				className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-10"
				style={{
					backgroundImage:
						"radial-gradient(circle, currentColor 1px, transparent 1px)",
					backgroundSize: "20px 20px",
					color: "var(--border)",
				}}
			/>

			{/* Canvas Toolbar */}
			<div className="p-4 border-b border-border/70 flex flex-wrap items-center justify-between gap-3 bg-card/70 backdrop-blur-md relative z-20">
				{/* View Mode Toggle + Search */}
				<div className="flex flex-wrap items-center gap-2.5">
					<div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/60">
						<Button
							variant={viewMode === "infrastructure" ? "default" : "ghost"}
							size="sm"
							className="h-7 text-xs px-3 gap-1.5 font-medium"
							onClick={() => setViewMode("infrastructure")}
						>
							<Server className="h-3.5 w-3.5" />
							<span>Phân Bổ Theo Máy Chủ (Host Infrastructure)</span>
						</Button>
						<Button
							variant={viewMode === "pipeline" ? "default" : "ghost"}
							size="sm"
							className="h-7 text-xs px-3 gap-1.5 font-medium"
							onClick={() => setViewMode("pipeline")}
						>
							<Workflow className="h-3.5 w-3.5" />
							<span>Sơ Đồ Hệ Thống (End-to-End Pipeline)</span>
						</Button>
					</div>

					<div className="relative w-48 sm:w-60">
						<Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
						<Input
							placeholder="Tìm kiếm node, domain, app, server..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-8 h-8 text-xs bg-background/80 border-border/70"
						/>
					</div>

					{/* Realtime Traffic Pulse Toggle */}
					<Button
						variant={trafficPulseEnabled ? "secondary" : "outline"}
						size="sm"
						className={`h-7 text-xs px-2.5 gap-1.5 font-medium border transition-all ${
							trafficPulseEnabled
								? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20"
								: "text-muted-foreground border-border/70 hover:bg-muted"
						}`}
						onClick={() => setTrafficPulseEnabled(!trafficPulseEnabled)}
						title="Bật/Tắt hiệu ứng mô phỏng lưu lượng truy cập thực tế (Traffic Pulse)"
					>
						<span className="relative flex h-2 w-2">
							{trafficPulseEnabled && (
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
							)}
							<span
								className={`relative inline-flex rounded-full h-2 w-2 ${
									trafficPulseEnabled ? "bg-cyan-500" : "bg-muted-foreground/50"
								}`}
							/>
						</span>
						<span>Traffic Pulse</span>
					</Button>
				</div>

				{/* Zoom & Canvas Actions */}
				<div className="flex items-center gap-1.5 bg-background/80 border border-border/70 rounded-lg p-1">
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 text-xs"
						onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
						title="Zoom In"
					>
						<Plus className="h-3.5 w-3.5" />
					</Button>
					<span className="text-[11px] font-mono px-1 text-muted-foreground">
						{Math.round(zoom * 100)}%
					</span>
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 text-xs"
						onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
						title="Zoom Out"
					>
						<Minus className="h-3.5 w-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 text-xs"
						onClick={() => setZoom(1)}
						title="Reset Zoom"
					>
						<RotateCcw className="h-3.5 w-3.5" />
					</Button>
					{onRefresh && (
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 text-xs"
							onClick={onRefresh}
							title="Refresh Graph"
						>
							<RefreshCw className="h-3.5 w-3.5" />
						</Button>
					)}
				</div>
			</div>

			{/* ========================================================
			    VIEW 1: SERVER & CLUSTER INFRASTRUCTURE TOPOLOGY (DEFAULT)
			======================================================== */}
			{viewMode === "infrastructure" ? (
				<div
					className="min-h-[640px] p-6 transition-transform duration-150 origin-top select-none relative z-10 space-y-6"
					style={{ transform: `scale(${zoom})` }}
				>
					{/* Cluster Interconnect Bar */}
					<div className="flex items-center justify-between px-4 py-2 rounded-xl bg-card/60 border border-border/60 text-xs">
						<div className="flex items-center gap-2">
							<Network className="h-4 w-4 text-emerald-500" />
							<span className="font-semibold text-foreground">
								Multi-Host Mesh Topology
							</span>
							<span className="text-muted-foreground">
								• Quản trị tập trung {filteredInfrastructure.length} máy chủ (Swarm + VPS Độc lập)
							</span>
						</div>
						<div className="flex items-center gap-2">
							<Badge
								variant="outline"
								className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
							>
								WireGuard Mesh / SSH Active
							</Badge>
						</div>
					</div>

					{/* Server Infrastructure Containers */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
						{filteredInfrastructure.map((host) => {
							const isOnline = host.status === "online";
							const isSwarm = host.type === "swarm-manager" || host.isLocal;

							return (
								<Card
									key={host.id}
									className={`border rounded-2xl overflow-hidden transition-all duration-200 shadow-sm ${
										isOnline
											? "border-border/80 bg-card/80 hover:border-primary/40"
											: "border-rose-500/30 bg-rose-500/5"
									}`}
								>
									{/* Server Rack Header */}
									<CardHeader className="p-4 pb-3 border-b bg-muted/40">
										<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
											<div className="flex items-center gap-3">
												<div
													className={`size-10 rounded-xl flex items-center justify-center border ${
														isSwarm
															? "bg-blue-500/15 border-blue-500/30 text-blue-500"
															: "bg-amber-500/15 border-amber-500/30 text-amber-500"
													}`}
												>
													{isSwarm ? (
														<Layers className="size-5" />
													) : (
														<Server className="size-5" />
													)}
												</div>
												<div>
													<div className="flex items-center gap-2">
														<span
															className={`size-2.5 rounded-full ${getStatusDot(host.status)}`}
														/>
														<CardTitle className="text-base font-bold font-mono">
															{host.name}
														</CardTitle>
													</div>
													<div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
														<span className="font-mono">{host.ip}</span>
														<span>•</span>
														<span>
															{host.specs.cores} vCPU - {host.specs.memory}
														</span>
													</div>
												</div>
											</div>

											<div className="flex items-center gap-2 flex-wrap">
												<Badge
													variant={isSwarm ? "default" : "secondary"}
													className="text-[10px] uppercase font-semibold"
												>
													{host.role}
												</Badge>
												<Badge
													variant="outline"
													className="text-[10px] bg-background/60"
												>
													{host.workloads.length} Workloads
												</Badge>
											</div>
										</div>
									</CardHeader>

									<CardContent className="p-4 space-y-4">
										{/* Section 1: Ingress & Public Domains */}
										{host.domains && host.domains.length > 0 && (
											<div className="space-y-2 p-3 rounded-xl bg-background/50 border border-border/50">
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
														<Shield className="size-3.5" />
														<span>Cổng Ingress & Tên Miền Đã Cấu Hình ({host.domains.length})</span>
													</div>
													<Badge
														variant="outline"
														className="text-[10px] font-mono"
													>
														Traefik TLS (:80, :443)
													</Badge>
												</div>

												<div className="flex flex-wrap gap-1.5 pt-1">
													{host.domains.map((dom) => (
														<div
															key={dom.id}
															onClick={() =>
																setSelectedNode({
																	id: `dom-${dom.id}`,
																	label: dom.host,
																	sublabel: `Port ${dom.port} • Target: ${dom.targetName}`,
																	tier: "ingress",
																	type: "domain",
																	status: "healthy",
																	stats: { ports: String(dom.port) },
																})
															}
															className="group cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted/60 hover:bg-cyan-500/10 hover:border-cyan-500/30 border border-border/50 text-[11px] font-mono transition-colors"
															title={`Trỏ tới: ${dom.targetName}`}
														>
															<Globe className="size-3 text-cyan-500" />
															<span className="text-foreground group-hover:text-cyan-500">
																{dom.host}
															</span>
															<span className="text-[9px] text-muted-foreground flex items-center gap-1">
																➔ {dom.targetName}
																{trafficPulseEnabled && (
																	<span className="relative flex h-1.5 w-1.5 shrink-0 ml-0.5">
																		<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
																		<span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500" />
																	</span>
																)}
															</span>
														</div>
													))}
												</div>
											</div>
										)}

										{/* Section 2: Workload Applications & Compose Stacks */}
										<div className="space-y-2">
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
													<Zap className="size-3.5" />
													<span>Ứng Dụng & Dịch Vụ Vận Hành ({host.workloads.length})</span>
												</div>
												<span className="text-[10px] text-muted-foreground">
													{host.workloads.length > 0
														? "Đang chạy trực tiếp trên máy chủ này"
														: "Chưa có dịch vụ"}
												</span>
											</div>

											{host.workloads.length === 0 ? (
												<div className="p-4 rounded-xl border border-dashed border-border/70 bg-muted/20 text-center space-y-1">
													<p className="text-xs font-medium text-foreground">
														Máy chủ rảnh (0 Workload)
													</p>
													<p className="text-[11px] text-muted-foreground">
														Máy chủ này đã kết nối SSH thành công và sẵn sàng để triển khai ứng dụng, cơ sở dữ liệu mới.
													</p>
												</div>
											) : (
												<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
													{host.workloads.map((item) => (
														<div
															key={item.id}
															onClick={() =>
																setSelectedNode({
																	id: item.id,
																	label: item.name,
																	sublabel: item.subname || "Workload Service",
																	tier: "service",
																	type: item.type,
																	status:
																		item.status === "done"
																			? "healthy"
																			: "warning",
																})
															}
															className="p-2.5 rounded-xl border border-border/60 bg-background/60 hover:border-purple-500/40 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
														>
															<div className="flex items-start justify-between gap-1.5">
																<div className="flex items-center gap-2 min-w-0">
																	<div className="size-7 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0 text-purple-500">
																		{item.type === "compose" ? (
																			<Boxes className="size-3.5" />
																		) : (
																			<Zap className="size-3.5" />
																		)}
																	</div>
																	<div className="min-w-0">
																		<p className="text-xs font-bold truncate text-foreground">
																			{item.name}
																		</p>
																		<p className="text-[10px] text-muted-foreground truncate font-mono">
																			{item.subname || item.type}
																		</p>
																	</div>
																</div>
																<span
																	className={`size-2 rounded-full shrink-0 ${getStatusDot(item.status)}`}
																/>
															</div>

															{item.domains && item.domains.length > 0 && (
																<div className="mt-2 pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px] text-cyan-600 dark:text-cyan-400 font-mono truncate">
																	<div className="flex items-center gap-1 truncate">
																		<Globe className="size-2.5 shrink-0" />
																		<span className="truncate">
																			{item.domains[0]}
																		</span>
																		{item.domains.length > 1 && (
																			<span className="text-[9px] text-muted-foreground">
																				+{item.domains.length - 1}
																			</span>
																		)}
																	</div>
																	{trafficPulseEnabled && (
																		<div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[9px] font-sans font-medium text-cyan-600 dark:text-cyan-400 shrink-0">
																			<span className="relative flex h-1.5 w-1.5">
																				<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
																				<span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500" />
																			</span>
																			<span>Live Flow</span>
																		</div>
																	)}
																</div>
															)}
														</div>
													))}
												</div>
											)}
										</div>

										{/* Section 3: Databases & Volumes */}
										{((host.databases && host.databases.length > 0) ||
											(host.volumes && host.volumes.length > 0)) && (
											<div className="space-y-2 pt-2 border-t border-border/50">
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
														<Database className="size-3.5" />
														<span>Cơ Sở Dữ Liệu & Storage ({host.databases.length + host.volumes.length})</span>
													</div>
												</div>

												<div className="flex flex-wrap gap-2">
													{host.databases.map((db) => (
														<div
															key={db.id}
															onClick={() =>
																setSelectedNode({
																	id: db.id,
																	label: db.name,
																	sublabel: db.type,
																	tier: "data",
																	type: "database",
																	status:
																		db.status === "done"
																			? "healthy"
																			: "warning",
																})
															}
															className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 transition-colors"
														>
															<Database className="size-3.5" />
															<span>{db.name}</span>
															<span className="text-[10px] opacity-75 font-mono">
																({db.type})
															</span>
														</div>
													))}

													{host.volumes.map((vol) => (
														<div
															key={vol.id}
															className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/60 border border-border/50 text-xs font-medium text-muted-foreground"
														>
															<HardDrive className="size-3.5" />
															<span>{vol.name}</span>
														</div>
													))}
												</div>
											</div>
										)}
									</CardContent>
								</Card>
							);
						})}
					</div>
				</div>
			) : (
				/* ========================================================
				    VIEW 2: END-TO-END SYSTEM ARCHITECTURE PIPELINE
				======================================================== */
				<div
					className="min-h-[680px] p-6 pt-10 transition-transform duration-150 origin-top flex flex-col items-center justify-start space-y-10 select-none overflow-x-auto relative z-10"
					style={{ transform: `scale(${zoom})` }}
				>
					{/* Active Trace Path Indicator Banner */}
					{activeTrace && (
						<div className="w-full max-w-5xl mx-auto p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-emerald-500/10 animate-in fade-in slide-in-from-top-2">
							<div className="flex items-center gap-2 flex-wrap text-xs">
								<span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500 text-white font-bold text-[11px] uppercase tracking-wide">
									<Sparkles className="size-3.5" />
									Đang Soi Luồng Thực Tế
								</span>
								{activeTrace.domain && (
									<>
										<span className="font-mono font-bold text-foreground bg-background/90 px-2.5 py-1 rounded-lg border border-border/70 shadow-2xs">
											{activeTrace.domain}
										</span>
										<ArrowRight className="h-3.5 w-3.5 text-emerald-500" />
									</>
								)}
								<span className="font-mono font-medium text-cyan-600 dark:text-cyan-400 bg-background/90 px-2.5 py-1 rounded-lg border border-border/70 shadow-2xs">
									{activeTrace.gateway}
								</span>
								<ArrowRight className="h-3.5 w-3.5 text-cyan-500" />
								<span className="font-mono font-medium text-blue-600 dark:text-blue-400 bg-background/90 px-2.5 py-1 rounded-lg border border-border/70 shadow-2xs">
									{activeTrace.server}
								</span>
								{activeTrace.app && (
									<>
										<ArrowRight className="h-3.5 w-3.5 text-purple-500" />
										<span className="font-mono font-bold text-purple-600 dark:text-purple-400 bg-background/90 px-2.5 py-1 rounded-lg border border-border/70 shadow-2xs">
											{activeTrace.app}
										</span>
									</>
								)}
								{activeTrace.db && (
									<>
										<ArrowRight className="h-3.5 w-3.5 text-amber-500" />
										<span className="font-mono font-medium text-emerald-600 dark:text-emerald-400 bg-background/90 px-2.5 py-1 rounded-lg border border-border/70 shadow-2xs">
											{activeTrace.db}
										</span>
									</>
								)}
							</div>
							<Button
								size="sm"
								variant="ghost"
								className="h-7 text-xs px-2.5 hover:bg-emerald-500/20 text-muted-foreground hover:text-foreground"
								onClick={() => setActiveTraceId(null)}
							>
								<X className="h-3.5 w-3.5 mr-1" />
								Xem toàn bộ luồng
							</Button>
						</div>
					)}

					{/* CHẶNG 1: BÊN NGOÀI MẠNG INTERNET (Tên Miền Công Khai) */}
					<div className="w-full flex flex-col items-center space-y-3">
						<div className="flex flex-col items-center text-center gap-1">
							<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider shadow-xs backdrop-blur-xs">
								<Globe className="h-3.5 w-3.5" />
								<span>Chặng 1: Bên Ngoài Mạng Internet (Tên Miền Đăng Ký - {stage1Domains.length})</span>
							</div>
							<p className="text-[11px] text-muted-foreground">
								Khách hàng & thiết bị truy cập qua DNS công khai • Click vào bất kỳ tên miền nào để soi luồng đi từ ngoài vào trong
							</p>
						</div>

						<div className="flex flex-wrap items-center justify-center gap-2.5 max-w-5xl">
							{stage1Domains.map((node) => {
								const isHighlighted = activeTrace ? activeTrace.highlightedIds.has(node.id) : false;
								const isDimmed = activeTrace ? !isHighlighted : false;
								return (
									<div
										key={node.id}
										onClick={() => {
											if (activeTraceId === node.id) {
												setActiveTraceId(null);
											} else {
												setActiveTraceId(node.id);
											}
											setSelectedNode(node);
										}}
										className={`group px-3 py-2 rounded-xl border bg-card cursor-pointer transition-all duration-200 shadow-xs flex items-center gap-2.5 ${
											isHighlighted
												? "border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-500/10 scale-105 shadow-md shadow-emerald-500/20"
												: isDimmed
													? "opacity-25 grayscale-[60%] scale-95"
													: "border-border/70 hover:border-cyan-500/60 hover:scale-102"
										}`}
									>
										<div className="size-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 text-cyan-500">
											<Globe className="h-3.5 w-3.5" />
										</div>
										<div className="min-w-0">
											<div className="flex items-center gap-1.5">
												<span className={`h-1.5 w-1.5 rounded-full shrink-0 ${getStatusDot(node.status)}`} />
												<h5 className="text-xs font-bold text-foreground font-mono truncate max-w-[170px]">
													{node.label}
												</h5>
											</div>
											<div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
												<span className="font-semibold text-emerald-600 dark:text-emerald-400">
													{node.sublabel?.includes("HTTPS") ? "HTTPS (:443)" : "HTTP (:80)"}
												</span>
												{node.targetAppName && (
													<span className="text-muted-foreground truncate max-w-[110px]">
														➔ {node.targetAppName}
													</span>
												)}
											</div>
										</div>
									</div>
								);
							})}
						</div>

						<TrafficPulseConnector
							pulseColor="#06b6d4"
							enabled={trafficPulseEnabled}
							label="Lưu lượng Internet ➔ Cổng tiếp nhận công khai :80 / :443"
						/>
					</div>

					{/* CHẶNG 2: CỬA NGÕ PROXY GIAO TIẾP (Traefik Ingress Gateway) */}
					<div className="w-full flex flex-col items-center space-y-3">
						<div className="flex flex-col items-center text-center gap-1">
							<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider shadow-xs backdrop-blur-xs">
								<Shield className="h-3.5 w-3.5" />
								<span>Chặng 2: Cửa Ngõ Proxy Giao Tiếp (Traefik Ingress Gateway)</span>
							</div>
							<p className="text-[11px] text-muted-foreground">
								Cổng giao tiếp duy nhất mở ra Internet • Bóc tách mã hoá SSL/TLS & Đọc Host Header tên miền để điều hướng
							</p>
						</div>

						<div className="flex flex-wrap items-center justify-center gap-4 max-w-2xl">
							{stage2Gateways.map((node) => {
								const isHighlighted = activeTrace ? activeTrace.highlightedIds.has(node.id) : false;
								const isDimmed = activeTrace ? !isHighlighted : false;
								return (
									<div
										key={node.id}
										onClick={() => {
											setSelectedNode(node);
											setActiveTraceId(node.id);
										}}
										className={`px-6 py-4 rounded-2xl border bg-card cursor-pointer transition-all duration-200 shadow-md flex items-center gap-4 ${
											isHighlighted
												? "border-cyan-500 ring-2 ring-cyan-500/30 bg-cyan-500/10 scale-105 shadow-cyan-500/20"
												: isDimmed
													? "opacity-25 grayscale-[60%] scale-95"
													: "border-border/80 hover:border-cyan-500/60 hover:scale-102"
										}`}
									>
										<div className="size-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 text-cyan-500">
											<Shield className="h-6 w-6" />
										</div>
										<div>
											<div className="flex items-center gap-2">
												<span className={`h-2 w-2 rounded-full ${getStatusDot(node.status)}`} />
												<h4 className="text-sm font-bold text-foreground">
													{node.label}
												</h4>
												<span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
													Let&apos;s Encrypt Auto-SSL
												</span>
											</div>
											<p className="text-xs text-muted-foreground mt-1">
												{node.sublabel || "TLS / Reverse Proxy (:80, :443)"} • Mạng nội bộ: <span className="font-mono text-cyan-600 dark:text-cyan-400">dokploy-network</span>
											</p>
										</div>
									</div>
								);
							})}
						</div>

						<TrafficPulseConnector
							pulseColor="#3b82f6"
							enabled={trafficPulseEnabled}
							label="Chuyển tiếp gói tin qua mạng ảo nội bộ dokploy-network vào Máy Chủ đích"
						/>
					</div>

					{/* CHẶNG 3: HẠ TẦNG MÁY CHỦ & MẠNG NỘI BỘ (Compute Hosts) */}
					<div className="w-full flex flex-col items-center space-y-3">
						<div className="flex flex-col items-center text-center gap-1">
							<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider shadow-xs backdrop-blur-xs">
								<Server className="h-3.5 w-3.5" />
								<span>Chặng 3: Phân Phối Máy Chủ & Mạng Cụm (Compute Hosts - {stage3Hosts.length})</span>
							</div>
							<p className="text-[11px] text-muted-foreground">
								Hạ tầng máy chủ vật lý chứa các container ứng dụng đang chạy
							</p>
						</div>

						<div className="flex flex-wrap items-center justify-center gap-5 max-w-4xl">
							{stage3Hosts.map((node) => {
								const isHighlighted = activeTrace ? activeTrace.highlightedIds.has(node.id) : false;
								const isDimmed = activeTrace ? !isHighlighted : false;
								const isPrimary = node.id === "cluster-primary" || node.type === "swarm-cluster";
								return (
									<div
										key={node.id}
										onClick={() => {
											setSelectedNode(node);
											setActiveTraceId(node.id);
										}}
										className={`px-5 py-3.5 rounded-2xl border bg-card cursor-pointer transition-all duration-200 shadow-sm flex items-center gap-3.5 ${
											isHighlighted
												? "border-blue-500 ring-2 ring-blue-500/30 bg-blue-500/10 scale-105 shadow-blue-500/20"
												: isDimmed
													? "opacity-25 grayscale-[60%] scale-95"
													: "border-border/80 hover:border-blue-500/60 hover:scale-102"
										}`}
									>
										<div className={`size-10 rounded-xl flex items-center justify-center shrink-0 border ${
											isPrimary
												? "bg-blue-500/10 border-blue-500/30 text-blue-500"
												: "bg-amber-500/10 border-amber-500/30 text-amber-500"
										}`}>
											{getNodeIcon(node.type)}
										</div>
										<div>
											<div className="flex items-center gap-2">
												<span className={`h-2 w-2 rounded-full ${getStatusDot(node.status)}`} />
												<h5 className="text-xs font-bold text-foreground">
													{node.label}
												</h5>
												<span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
													isPrimary
														? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
														: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
												}`}>
													{isPrimary ? "Swarm Leader (Chính)" : "Node Mở Rộng / Sẵn Sàng"}
												</span>
											</div>
											<p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
												{node.sublabel} {isPrimary ? `• ${stage4Workloads.length} Workloads` : "• 0 Workload (Rảnh)"}
											</p>
										</div>
									</div>
								);
							})}
						</div>

						<TrafficPulseConnector
							pulseColor="#a855f7"
							enabled={trafficPulseEnabled}
							label="Phân phối trực tiếp vào Container ứng dụng thực thi"
						/>
					</div>

					{/* CHẶNG 4: THÀNH PHẦN ỨNG DỤNG ĐÍCH (Target Workload Services) */}
					<div className="w-full flex flex-col items-center space-y-3">
						<div className="flex flex-col items-center text-center gap-1">
							<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wider shadow-xs backdrop-blur-xs">
								<Zap className="h-3.5 w-3.5" />
								<span>Chặng 4: Thành Phần Ứng Dụng Đích (Workload Containers - {stage4Workloads.length})</span>
							</div>
							<p className="text-[11px] text-muted-foreground">
								Container xử lý logic nghiệp vụ • Click vào ứng dụng để soi ngược lại tên miền và database liên kết
							</p>
						</div>

						<div className="flex flex-wrap items-center justify-center gap-3 max-w-5xl">
							{stage4Workloads.map((node) => {
								const isHighlighted = activeTrace ? activeTrace.highlightedIds.has(node.id) : false;
								const isDimmed = activeTrace ? !isHighlighted : false;
								return (
									<div
										key={node.id}
										onClick={() => {
											if (activeTraceId === node.id) {
												setActiveTraceId(null);
											} else {
												setActiveTraceId(node.id);
											}
											setSelectedNode(node);
										}}
										className={`px-3.5 py-2.5 rounded-xl border bg-card cursor-pointer transition-all duration-200 shadow-xs flex items-center gap-2.5 ${
											isHighlighted
												? "border-purple-500 ring-2 ring-purple-500/30 bg-purple-500/10 scale-105 shadow-md shadow-purple-500/20"
												: isDimmed
													? "opacity-25 grayscale-[60%] scale-95"
													: "border-border/70 hover:border-purple-500/50 hover:scale-102"
										}`}
									>
										<div className="size-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 text-purple-500">
											{getNodeIcon(node.type)}
										</div>
										<div className="min-w-0">
											<div className="flex items-center gap-1.5">
												<span className={`h-1.5 w-1.5 rounded-full ${getStatusDot(node.status)}`} />
												<h5 className="text-xs font-bold text-foreground truncate max-w-[160px]">
													{node.label}
												</h5>
											</div>
											<div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5 truncate">
												<span className="font-mono">{node.sublabel || node.type}</span>
												{node.domains && node.domains.length > 0 && (
													<span className="text-cyan-600 dark:text-cyan-400 font-mono">
														({node.domains[0]})
													</span>
												)}
											</div>
										</div>
									</div>
								);
							})}
						</div>

						<TrafficPulseConnector
							pulseColor="#10b981"
							enabled={trafficPulseEnabled}
							label="Truy xuất Database nội bộ & Ghi dữ liệu ổ đĩa bền vững (SSD/VPC)"
						/>
					</div>

					{/* CHẶNG 5: HẬU ĐÀI DỮ LIỆU & LƯU TRỮ BỀN VỮNG (Internal Databases & Storage) */}
					<div className="w-full flex flex-col items-center space-y-3">
						<div className="flex flex-col items-center text-center gap-1">
							<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider shadow-xs backdrop-blur-xs">
								<Database className="h-3.5 w-3.5" />
								<span>Chặng 5: Hậu Đài Dữ Liệu & Lưu Trữ (Databases & Storage - {stage5Storage.length})</span>
							</div>
							<p className="text-[11px] text-muted-foreground">
								Hạ tầng dữ liệu nội bộ • Đóng hoàn toàn với Internet bên ngoài, chỉ giao tiếp nội bộ qua mạng ảo
							</p>
						</div>

						<div className="flex flex-wrap items-center justify-center gap-3.5 max-w-4xl">
							{stage5Storage.map((node) => {
								const isHighlighted = activeTrace ? activeTrace.highlightedIds.has(node.id) : false;
								const isDimmed = activeTrace ? !isHighlighted : false;
								return (
									<div
										key={node.id}
										onClick={() => {
											if (activeTraceId === node.id) {
												setActiveTraceId(null);
											} else {
												setActiveTraceId(node.id);
											}
											setSelectedNode(node);
										}}
										className={`px-3.5 py-2.5 rounded-xl border bg-card cursor-pointer transition-all duration-200 shadow-xs flex items-center gap-2.5 ${
											isHighlighted
												? "border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-500/10 scale-105 shadow-md shadow-emerald-500/20"
												: isDimmed
													? "opacity-25 grayscale-[60%] scale-95"
													: "border-border/70 hover:border-emerald-500/50 hover:scale-102"
										}`}
									>
										<div className="size-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-500">
											{getNodeIcon(node.type)}
										</div>
										<div className="min-w-0">
											<div className="flex items-center gap-1.5">
												<span className={`h-1.5 w-1.5 rounded-full ${getStatusDot(node.status)}`} />
												<h5 className="text-xs font-bold text-foreground">
													{node.label}
												</h5>
											</div>
											<p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
												{node.sublabel} • <span className="text-emerald-600 dark:text-emerald-400">VPC Internal Only</span>
											</p>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</div>
			)}

			{/* Interactive Node Inspector Sheet */}
			<Sheet
				open={!!selectedNode}
				onOpenChange={(open) => !open && setSelectedNode(null)}
			>
				<SheetContent className="sm:max-w-md w-full">
					{selectedNode && (
						<>
							<SheetHeader className="pb-4 border-b">
								<div className="flex items-center gap-3">
									<div className="size-10 rounded-xl bg-muted flex items-center justify-center">
										{getNodeIcon(selectedNode.type)}
									</div>
									<div>
										<SheetTitle className="text-base font-bold font-mono">
											{selectedNode.label}
										</SheetTitle>
										<SheetDescription className="text-xs capitalize">
											Tier: {selectedNode.tier} • {selectedNode.type}
										</SheetDescription>
									</div>
								</div>
							</SheetHeader>

							<div className="py-6 space-y-4">
								<div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
									<span className="text-xs text-muted-foreground font-medium">
										Trạng thái Vận hành
									</span>
									<Badge
										variant={
											selectedNode.status === "healthy"
												? "default"
												: "destructive"
										}
										className="capitalize text-xs"
									>
										{selectedNode.status}
									</Badge>
								</div>

								{selectedNode.stats && (
									<div className="grid grid-cols-2 gap-3">
										{selectedNode.stats.ports && (
											<div className="p-3 rounded-lg border bg-card/60">
												<span className="text-xs text-muted-foreground">Ports</span>
												<p className="text-sm font-bold font-mono mt-0.5">
													{selectedNode.stats.ports}
												</p>
											</div>
										)}
										{selectedNode.stats.memory && (
											<div className="p-3 rounded-lg border bg-card/60">
												<span className="text-xs text-muted-foreground">Memory</span>
												<p className="text-sm font-bold font-mono mt-0.5">
													{selectedNode.stats.memory}
												</p>
											</div>
										)}
										{selectedNode.stats.replicas && (
											<div className="p-3 rounded-lg border bg-card/60 col-span-2">
												<span className="text-xs text-muted-foreground">Vai trò</span>
												<p className="text-sm font-bold mt-0.5">
													{selectedNode.stats.replicas}
												</p>
											</div>
										)}
									</div>
								)}

								<div className="p-3 rounded-lg border bg-muted/20 text-xs text-muted-foreground space-y-1.5">
									<p>
										<strong>Định danh Node:</strong>{" "}
										<span className="font-mono text-foreground">
											{selectedNode.id}
										</span>
									</p>
									<p>
										<strong>Mô tả:</strong>{" "}
										{selectedNode.sublabel || "Active node"}
									</p>
								</div>
							</div>
						</>
					)}
				</SheetContent>
			</Sheet>
		</div>
	);
};
