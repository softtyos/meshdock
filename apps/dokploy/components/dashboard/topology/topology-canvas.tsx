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

	// Group nodes by tier for pipeline view
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
							<span>Phân Bổ Theo Máy Chủ (Host Centric)</span>
						</Button>
						<Button
							variant={viewMode === "pipeline" ? "default" : "ghost"}
							size="sm"
							className="h-7 text-xs px-3 gap-1.5 font-medium"
							onClick={() => setViewMode("pipeline")}
						>
							<Workflow className="h-3.5 w-3.5" />
							<span>Luồng Điều Hướng Tên Miền (Routing Flow)</span>
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
															<span className="text-[9px] text-muted-foreground">
																➔ {dom.targetName}
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
																<div className="mt-2 pt-1.5 border-t border-border/40 flex items-center gap-1 text-[10px] text-cyan-600 dark:text-cyan-400 font-mono truncate">
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
				    VIEW 2: MULTI-TIER ROUTING PIPELINE FLOW
				======================================================== */
				<div
					className="min-h-[680px] p-6 pt-16 transition-transform duration-150 origin-top flex flex-col items-center justify-start space-y-12 select-none overflow-x-auto relative z-10"
					style={{ transform: `scale(${zoom})` }}
				>
					{/* LAYER 1: Edge & Ingress */}
					{(activeTier === "all" || activeTier === "ingress") && (
						<div className="w-full flex flex-col items-center space-y-3">
							<div className="flex items-center gap-2">
								<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 bg-background/80 dark:bg-muted/30 px-3 py-1 rounded-full border border-border/60 shadow-xs backdrop-blur-xs">
									<Shield className="h-3.5 w-3.5 text-cyan-500 dark:text-cyan-400" />
									Tier 1: Ingress Domains & Gateway ({tiers.ingress.length})
								</span>
							</div>
							<div className="flex flex-wrap items-center justify-center gap-3.5 max-w-5xl">
								{tiers.ingress.map((node) => (
									<div
										key={node.id}
										onClick={() => setSelectedNode(node)}
										className={`px-3.5 py-2 rounded-xl border bg-card cursor-pointer transition-all duration-200 hover:scale-105 shadow-xs flex items-center gap-2.5 ${
											selectedNode?.id === node.id
												? "border-emerald-500 ring-2 ring-emerald-500/20"
												: "border-border/70 hover:border-cyan-500/50"
										}`}
									>
										<div className="size-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
											{getNodeIcon(node.type)}
										</div>
										<div className="min-w-0">
											<div className="flex items-center gap-1.5">
												<span
													className={`h-1.5 w-1.5 rounded-full shrink-0 ${getStatusDot(node.status)}`}
												/>
												<h5 className="text-xs font-bold text-foreground font-mono truncate max-w-[180px]">
													{node.label}
												</h5>
											</div>
											<p className="text-[10px] text-muted-foreground mt-0.5 truncate">
												{node.sublabel}
											</p>
										</div>
									</div>
								))}
							</div>

							{/* Connector Down */}
							<div className="flex flex-col items-center text-muted-foreground/40 py-1">
								<div className="w-0.5 h-6 bg-linear-to-b from-cyan-500/60 to-blue-500/60" />
								<ArrowDown className="h-4 w-4 text-blue-500 dark:text-blue-400" />
							</div>
						</div>
					)}

					{/* LAYER 2: Compute Infrastructure */}
					{(activeTier === "all" || activeTier === "cluster") && (
						<div className="w-full flex flex-col items-center space-y-3">
							<div className="flex items-center gap-2">
								<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 bg-background/80 dark:bg-muted/30 px-3 py-1 rounded-full border border-border/60 shadow-xs backdrop-blur-xs">
									<Layers className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
									Tier 2: Compute Hosts & Swarm Clusters ({tiers.cluster.length})
								</span>
							</div>
							<div className="flex flex-wrap items-center justify-center gap-5 max-w-5xl">
								{tiers.cluster.map((node) => (
									<div
										key={node.id}
										onClick={() => setSelectedNode(node)}
										className={`px-5 py-3 rounded-xl border bg-card cursor-pointer transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md flex items-center gap-3.5 ${
											selectedNode?.id === node.id
												? "border-blue-500 ring-2 ring-blue-500/20"
												: "border-border/70 hover:border-blue-500/50"
										}`}
									>
										<div className="size-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
											{getNodeIcon(node.type)}
										</div>
										<div>
											<div className="flex items-center gap-1.5">
												<span
													className={`h-2 w-2 rounded-full ${getStatusDot(node.status)}`}
												/>
												<h5 className="text-xs font-bold text-foreground">
													{node.label}
												</h5>
											</div>
											<p className="text-[10px] text-muted-foreground mt-0.5">
												{node.sublabel}
											</p>
										</div>
									</div>
								))}
							</div>

							{/* Connector Down */}
							<div className="flex flex-col items-center text-muted-foreground/40 py-1">
								<div className="w-0.5 h-6 bg-linear-to-b from-blue-500/60 to-purple-500/60" />
								<ArrowDown className="h-4 w-4 text-purple-500 dark:text-purple-400" />
							</div>
						</div>
					)}

					{/* LAYER 3: Workload Applications & Stacks */}
					{(activeTier === "all" || activeTier === "service") && (
						<div className="w-full flex flex-col items-center space-y-3">
							<div className="flex items-center gap-2">
								<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 bg-background/80 dark:bg-muted/30 px-3 py-1 rounded-full border border-border/60 shadow-xs backdrop-blur-xs">
									<Zap className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" />
									Tier 3: Workload Services & Stacks ({tiers.service.length})
								</span>
							</div>
							<div className="flex flex-wrap items-center justify-center gap-3 max-w-5xl">
								{tiers.service.map((node) => (
									<div
										key={node.id}
										onClick={() => setSelectedNode(node)}
										className={`px-3.5 py-2.5 rounded-xl border bg-card cursor-pointer transition-all duration-200 hover:scale-105 shadow-xs flex items-center gap-2.5 ${
											selectedNode?.id === node.id
												? "border-purple-500 ring-2 ring-purple-500/20"
												: "border-border/70 hover:border-purple-500/50"
										}`}
									>
										<div className="size-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
											{getNodeIcon(node.type)}
										</div>
										<div className="min-w-0">
											<div className="flex items-center gap-1.5">
												<span
													className={`h-1.5 w-1.5 rounded-full ${getStatusDot(node.status)}`}
												/>
												<h5 className="text-xs font-bold text-foreground truncate max-w-[150px]">
													{node.label}
												</h5>
											</div>
											<p className="text-[10px] text-muted-foreground mt-0.5 truncate">
												{node.sublabel}
											</p>
										</div>
									</div>
								))}
							</div>

							{/* Connector Down */}
							<div className="flex flex-col items-center text-muted-foreground/40 py-1">
								<div className="w-0.5 h-6 bg-linear-to-b from-purple-500/60 to-emerald-500/60" />
								<ArrowDown className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
							</div>
						</div>
					)}

					{/* LAYER 4: Databases & Storage Volumes */}
					{(activeTier === "all" || activeTier === "data") && (
						<div className="w-full flex flex-col items-center space-y-3">
							<div className="flex items-center gap-2">
								<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 bg-background/80 dark:bg-muted/30 px-3 py-1 rounded-full border border-border/60 shadow-xs backdrop-blur-xs">
									<Database className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
									Tier 4: Databases & Storage ({tiers.data.length})
								</span>
							</div>
							<div className="flex flex-wrap items-center justify-center gap-3.5 max-w-5xl">
								{tiers.data.map((node) => (
									<div
										key={node.id}
										onClick={() => setSelectedNode(node)}
										className={`px-3.5 py-2.5 rounded-xl border bg-card cursor-pointer transition-all duration-200 hover:scale-105 shadow-xs flex items-center gap-2.5 ${
											selectedNode?.id === node.id
												? "border-emerald-500 ring-2 ring-emerald-500/20"
												: "border-border/70 hover:border-emerald-500/50"
										}`}
									>
										<div className="size-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
											{getNodeIcon(node.type)}
										</div>
										<div className="min-w-0">
											<div className="flex items-center gap-1.5">
												<span
													className={`h-1.5 w-1.5 rounded-full ${getStatusDot(node.status)}`}
												/>
												<h5 className="text-xs font-bold text-foreground">
													{node.label}
												</h5>
											</div>
											<p className="text-[10px] text-muted-foreground mt-0.5">
												{node.sublabel}
											</p>
										</div>
									</div>
								))}
							</div>
						</div>
					)}
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
