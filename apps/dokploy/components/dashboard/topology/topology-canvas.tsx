import {
	Activity,
	ArrowDown,
	ArrowRight,
	Boxes,
	CheckCircle2,
	ChevronRight,
	Cpu,
	Database,
	ExternalLink,
	Filter,
	Globe,
	HardDrive,
	Layers,
	Minus,
	Network,
	Plus,
	Radio,
	RefreshCw,
	RotateCcw,
	Search,
	Server,
	Share2,
	Shield,
	SlidersHorizontal,
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
import useLocale from "@/utils/hooks/use-locale";

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
	systemKey?: string;
	subServices?: any[];
	communications?: any[];
	stats?: {
		cpu?: number | string;
		memory?: string;
		replicas?: string;
		ports?: string;
		routesCount?: string;
	};
}

export interface TopologyEdge {
	id: string;
	source: string;
	target: string;
	label?: string;
	animated?: boolean;
}

export interface SubServiceItem {
	id: string;
	name: string;
	role: string;
	image?: string;
	cpu: string;
	memory: string;
	status: "healthy" | "warning" | "offline";
	replicas: string;
	ports?: string;
	network?: string;
	storageMount?: string;
}

export interface CommunicationLink {
	id: string;
	source: string;
	target: string;
	label: string;
	protocol: string;
}

export interface SystemArchitecture {
	id: string;
	name: string;
	key: string;
	category: string;
	description: string;
	domains: string[];
	hostServerId: string;
	hostServerName: string;
	subServices: SubServiceItem[];
	communications: CommunicationLink[];
	stats: {
		totalCpu: string;
		totalMemory: string;
		subServiceCount: number;
		status: "healthy" | "warning" | "offline";
	};
}

interface TopologyCanvasProps {
	nodes: TopologyNode[];
	edges: TopologyEdge[];
	infrastructure?: any[];
	systems?: SystemArchitecture[];
	onRefresh?: () => void;
}

/**
 * Animated Pulse Connector between architectural layers
 */
const ArchitectureConnector = ({
	label,
	color = "#06b6d4",
	enabled = true,
}: {
	label?: string;
	color?: string;
	enabled?: boolean;
}) => (
	<div className="w-full flex flex-col items-center my-4 py-1 select-none relative z-10">
		<div className="relative flex flex-col items-center">
			{/* Animated Vertical Line */}
			<div className="w-0.5 h-10 bg-gradient-to-b from-border/40 via-primary/50 to-border/40 relative overflow-hidden">
				{enabled && (
					<div
						className="absolute top-0 left-0 w-full h-4 animate-pulse-down rounded-full"
						style={{ backgroundColor: color }}
					/>
				)}
			</div>

			{/* Label badge */}
			{label && (
				<div className="my-1.5 px-3 py-1 rounded-full bg-card/90 border border-border/80 shadow-xs backdrop-blur-md flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
					{enabled && (
						<span className="relative flex h-2 w-2">
							<span
								className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
								style={{ backgroundColor: color }}
							/>
							<span
								className="relative inline-flex rounded-full h-2 w-2"
								style={{ backgroundColor: color }}
							/>
						</span>
					)}
					<span>{label}</span>
				</div>
			)}

			<ArrowDown
				className="h-4 w-4 transition-transform duration-300"
				style={{ color }}
			/>
		</div>
	</div>
);

export const TopologyCanvas: React.FC<TopologyCanvasProps> = ({
	nodes = [],
	edges = [],
	infrastructure = [],
	systems = [],
	onRefresh,
}) => {
	const { locale, t } = useLocale();
	const [viewMode, setViewMode] = useState<"cluster" | "isolated" | "infrastructure">("cluster");
	const [selectedSystemKey, setSelectedSystemKey] = useState<string>("appwrite");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
	const [selectedSubService, setSelectedSubService] = useState<SubServiceItem | null>(null);
	const [zoom, setZoom] = useState(1);
	const [trafficPulseEnabled, setTrafficPulseEnabled] = useState(true);

	// Get Traefik Ingress Node
	const traefikNode = useMemo(() => {
		return nodes.find((n) => n.id === "traefik-ingress") || {
			id: "traefik-ingress",
			label: "Traefik Ingress Gateway",
			sublabel: "TLS Termination & Reverse Proxy (:80, :443)",
			tier: "ingress" as const,
			type: "traefik",
			status: "healthy" as const,
			stats: { ports: "80, 443" },
			domains: [],
		};
	}, [nodes]);

	// Compute Swarm & VPS Hosts
	const computeHosts = useMemo(() => {
		return nodes.filter((n) => n.tier === "cluster");
	}, [nodes]);

	// Databases & Storage Nodes
	const storageNodes = useMemo(() => {
		return nodes.filter((n) => n.tier === "data");
	}, [nodes]);

	// Filtered systems list based on search
	const filteredSystems = useMemo(() => {
		if (!searchQuery.trim()) return systems;
		const q = searchQuery.toLowerCase();
		return systems.filter(
			(s) =>
				s.name.toLowerCase().includes(q) ||
				s.description.toLowerCase().includes(q) ||
				s.domains.some((d) => d.toLowerCase().includes(q)) ||
				s.subServices.some((sub) => sub.name.toLowerCase().includes(q)),
		);
	}, [systems, searchQuery]);

	// Active isolated system for dedicated view
	const activeIsolatedSystem = useMemo(() => {
		return (
			systems.find((s) => s.key === selectedSystemKey) ||
			systems[0] ||
			null
		);
	}, [systems, selectedSystemKey]);

	// Filtered host infrastructure
	const filteredInfrastructure = useMemo(() => {
		if (!searchQuery.trim()) return infrastructure;
		const q = searchQuery.toLowerCase();
		return infrastructure.filter(
			(host) =>
				host.name.toLowerCase().includes(q) ||
				host.ip.toLowerCase().includes(q) ||
				host.workloads.some((w: any) => w.name.toLowerCase().includes(q)),
		);
	}, [infrastructure, searchQuery]);

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

	const getRoleBadge = (role: string) => {
		switch (role) {
			case "api":
				return <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 text-[10px]">API Core</Badge>;
			case "frontend":
				return <Badge className="bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30 text-[10px]">Frontend UI</Badge>;
			case "worker":
				return <Badge className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 text-[10px]">Worker</Badge>;
			case "database":
				return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">Database</Badge>;
			case "cache":
				return <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px]">Cache / Queue</Badge>;
			case "executor":
				return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]">Executor</Badge>;
			case "realtime":
				return <Badge className="bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 text-[10px]">Realtime</Badge>;
			case "scheduler":
				return <Badge className="bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 text-[10px]">Scheduler</Badge>;
			default:
				return <Badge variant="outline" className="text-[10px]">{role}</Badge>;
		}
	};

	return (
		<div className="relative w-full rounded-2xl border border-border/80 bg-slate-50/70 dark:bg-[#090A0D] overflow-hidden shadow-sm transition-colors duration-200">
			{/* Architecture blueprint grid texture */}
			<div
				className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-10"
				style={{
					backgroundImage:
						"radial-gradient(circle, currentColor 1px, transparent 1px)",
					backgroundSize: "24px 24px",
					color: "var(--border)",
				}}
			/>

			{/* Canvas Toolbar */}
			<div className="p-4 border-b border-border/70 flex flex-wrap items-center justify-between gap-3 bg-card/80 backdrop-blur-md relative z-20">
				{/* View Mode Toggle Buttons */}
				<div className="flex flex-wrap items-center gap-2.5">
					<div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/60">
						<Button
							variant={viewMode === "cluster" ? "default" : "ghost"}
							size="sm"
							className="h-8 text-xs px-3 gap-1.5 font-medium rounded-lg"
							onClick={() => setViewMode("cluster")}
						>
							<Workflow className="h-3.5 w-3.5" />
							<span>{t("Entire Cluster Overview")}</span>
						</Button>
						<Button
							variant={viewMode === "isolated" ? "default" : "ghost"}
							size="sm"
							className="h-8 text-xs px-3 gap-1.5 font-medium rounded-lg"
							onClick={() => setViewMode("isolated")}
						>
							<Boxes className="h-3.5 w-3.5" />
							<span>{t("Isolated System Views")}</span>
						</Button>
						<Button
							variant={viewMode === "infrastructure" ? "default" : "ghost"}
							size="sm"
							className="h-8 text-xs px-3 gap-1.5 font-medium rounded-lg"
							onClick={() => setViewMode("infrastructure")}
						>
							<Server className="h-3.5 w-3.5" />
							<span>{t("Host Distribution")}</span>
						</Button>
					</div>

					<div className="relative w-48 sm:w-64">
						<Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
						<Input
							placeholder={t("Search Placeholder")}
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-8 h-8 text-xs bg-background/80 border-border/70 rounded-lg"
						/>
					</div>

					{/* Traffic Pulse Animation Toggle */}
					<Button
						variant={trafficPulseEnabled ? "secondary" : "outline"}
						size="sm"
						className={`h-8 text-xs px-2.5 gap-1.5 font-medium border rounded-lg transition-all ${
							trafficPulseEnabled
								? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20"
								: "text-muted-foreground border-border/70 hover:bg-muted"
						}`}
						onClick={() => setTrafficPulseEnabled(!trafficPulseEnabled)}
						title={t("Traffic Pulse")}
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
				<div className="flex items-center gap-1.5 bg-background/80 border border-border/70 rounded-xl p-1">
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 text-xs rounded-lg"
						onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
						title="Phóng to"
					>
						<Plus className="h-3.5 w-3.5" />
					</Button>
					<span className="text-[11px] font-mono px-1.5 text-muted-foreground">
						{Math.round(zoom * 100)}%
					</span>
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 text-xs rounded-lg"
						onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
						title="Thu nhỏ"
					>
						<Minus className="h-3.5 w-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 text-xs rounded-lg"
						onClick={() => setZoom(1)}
						title="Tỉ lệ chuẩn 100%"
					>
						<RotateCcw className="h-3.5 w-3.5" />
					</Button>
					{onRefresh && (
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 text-xs rounded-lg"
							onClick={onRefresh}
							title={t("Refresh Map")}
						>
							<RefreshCw className="h-3.5 w-3.5" />
						</Button>
					)}
				</div>
			</div>

			{/* ========================================================
			    VIEW 1: ENTIRE CLUSTER ARCHITECTURE
			======================================================== */}
			{viewMode === "cluster" && (
				<div
					className="min-h-[700px] p-6 pt-8 transition-transform duration-150 origin-top flex flex-col items-center justify-start space-y-6 select-none overflow-x-auto relative z-10"
					style={{ transform: `scale(${zoom})` }}
				>
					{/* TẦNG 1: CỔNG VÀO TRAEFIK INGRESS GATEWAY (:80, :443) */}
					<div className="w-full max-w-4xl flex flex-col items-center space-y-3">
						<div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider">
							<Shield className="h-3.5 w-3.5" />
							<span>{t("Tier 1: Ingress Gateway")}</span>
						</div>
						<p className="text-[11px] text-muted-foreground text-center max-w-xl">
							{locale === "vi"
								? "Điểm chạm đầu tiên tiếp nhận lưu lượng mạng ngoài vào hệ thống • Bóc tách mã hóa SSL Let's Encrypt & Điều phối định tuyến theo tên miền"
								: "Primary entry point terminating external network traffic • Automated SSL/TLS certificates and domain host routing"}
						</p>

						<div
							onClick={() => setSelectedNode(traefikNode)}
							className="w-full max-w-2xl px-6 py-4 rounded-2xl border bg-card/90 hover:border-cyan-500/60 transition-all duration-200 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 cursor-pointer hover:scale-101 border-border/80"
						>
							<div className="flex items-center gap-3.5">
								<div className="size-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 text-cyan-500">
									<Shield className="h-6 w-6" />
								</div>
								<div>
									<div className="flex items-center gap-2">
										<span className={`h-2.5 w-2.5 rounded-full ${getStatusDot(traefikNode.status)}`} />
										<h3 className="text-sm font-bold text-foreground font-mono">
											{traefikNode.label}
										</h3>
										<Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
											Let&apos;s Encrypt Auto-SSL
										</Badge>
									</div>
									<p className="text-xs text-muted-foreground mt-1">
										{traefikNode.sublabel} • Mạng ảo nội bộ: <span className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">dokploy-network</span>
									</p>
								</div>
							</div>

							<div className="flex items-center gap-2 shrink-0">
								<Badge variant="outline" className="text-xs font-mono bg-background/80">
									Ports :80, :443
								</Badge>
							</div>
						</div>

						<ArchitectureConnector
							label={locale === "vi" ? "Chuyển tiếp qua mạng ảo dokploy-network vào Cụm Máy Chủ Swarm" : "Forwarding via overlay dokploy-network to Swarm Cluster"}
							color="#3b82f6"
							enabled={trafficPulseEnabled}
						/>
					</div>

					{/* TẦNG 2: HẠ TẦNG ĐIỆN TOÁN & CỤM DOCKER SWARM */}
					<div className="w-full max-w-4xl flex flex-col items-center space-y-3">
						<div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
							<Layers className="h-3.5 w-3.5" />
							<span>{t("Tier 2: Compute Infrastructure")}</span>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
							{computeHosts.map((host) => (
								<div
									key={host.id}
									onClick={() => setSelectedNode(host)}
									className="p-4 rounded-2xl border border-border/80 bg-card/90 hover:border-blue-500/50 transition-all duration-200 shadow-sm flex items-center gap-3.5 cursor-pointer hover:scale-101"
								>
									<div className="size-11 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-500">
										{host.type === "swarm-cluster" ? <Layers className="size-5" /> : <Server className="size-5" />}
									</div>
									<div className="min-w-0">
										<div className="flex items-center gap-2">
											<span className={`size-2 rounded-full ${getStatusDot(host.status)}`} />
											<h4 className="text-xs font-bold text-foreground font-mono truncate">
												{host.label}
											</h4>
										</div>
										<p className="text-[11px] text-muted-foreground mt-0.5 truncate font-mono">
											{host.sublabel}
										</p>
										<div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground font-mono">
											<span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
												<Cpu className="size-3" /> 8 vCPU
											</span>
											<span>•</span>
											<span>23.5 GB RAM</span>
										</div>
									</div>
								</div>
							))}
						</div>

						<ArchitectureConnector
							label={locale === "vi" ? "Phân bổ và vận hành các Khối Hệ Thống & Service Con" : "Allocating & running Workload Systems and Child Services"}
							color="#8b5cf6"
							enabled={trafficPulseEnabled}
						/>
					</div>

					{/* TẦNG 3: CÁC KHỐI HỆ THỐNG & SERVICE CON */}
					<div className="w-full max-w-6xl flex flex-col items-center space-y-4">
						<div className="flex flex-col items-center text-center gap-1">
							<div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wider">
								<Boxes className="h-3.5 w-3.5" />
								<span>{t("Tier 3: Workload Systems")} ({filteredSystems.length})</span>
							</div>
							<p className="text-[11px] text-muted-foreground max-w-xl">
								{locale === "vi"
									? "Mỗi khối thể hiện đầy đủ các service con, tiến trình chạy ngầm (worker), vai trò và tài nguyên tiêu thụ"
									: "Each system card breaks down child containers, background workers, roles, and real hardware telemetry"}
							</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full">
							{filteredSystems.map((sys) => (
								<Card
									key={sys.id}
									className="rounded-2xl border border-border/80 bg-card/90 hover:border-purple-500/50 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between"
								>
									<CardHeader className="p-4 pb-3 border-b bg-muted/40">
										<div className="flex items-center justify-between gap-2">
											<div className="flex items-center gap-2.5 min-w-0">
												<div className="size-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 text-purple-500">
													<Boxes className="size-4" />
												</div>
												<div className="min-w-0">
													<CardTitle className="text-xs font-bold truncate">
														{sys.name}
													</CardTitle>
													<span className="text-[10px] text-muted-foreground font-mono">
														{sys.category}
													</span>
												</div>
											</div>
											<Badge
												variant="outline"
												className="text-[10px] bg-background/80 shrink-0 font-mono"
											>
												{sys.subServices.length} {locale === "vi" ? "service con" : "services"}
											</Badge>
										</div>
									</CardHeader>

									<CardContent className="p-4 space-y-3">
										{/* Domains attached to this system */}
										{sys.domains && sys.domains.length > 0 && (
											<div className="flex flex-wrap gap-1">
												{sys.domains.map((dom) => (
													<span
														key={dom}
														className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/70 text-[10px] font-mono text-cyan-600 dark:text-cyan-400 border border-border/50"
													>
														<Globe className="size-2.5" />
														{dom}
													</span>
												))}
											</div>
										)}

										{/* Child sub-services list preview */}
										<div className="space-y-1.5 pt-1">
											<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
												{t("Subservices Count")} ({sys.subServices.length}):
											</p>
											<div className="space-y-1 max-h-36 overflow-y-auto pr-1">
												{sys.subServices.map((sub) => (
													<div
														key={sub.id}
														onClick={() => setSelectedSubService(sub)}
														className="p-1.5 rounded-lg bg-background/70 border border-border/50 hover:border-purple-500/40 text-[11px] flex items-center justify-between gap-2 cursor-pointer transition-colors"
													>
														<div className="flex items-center gap-1.5 min-w-0">
															<span className={`size-1.5 rounded-full shrink-0 ${getStatusDot(sub.status)}`} />
															<span className="font-mono text-foreground font-medium truncate">
																{sub.name}
															</span>
														</div>
														<div className="flex items-center gap-1 shrink-0">
															{getRoleBadge(sub.role)}
															<span className="text-[10px] text-muted-foreground font-mono">
																{sub.cpu}
															</span>
														</div>
													</div>
												))}
											</div>
										</div>

										{/* Aggregated Resources & Deep-dive Button */}
										<div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs font-mono">
											<div className="flex items-center gap-2 text-[10px] text-muted-foreground">
												<span className="text-purple-600 dark:text-purple-400 font-bold">
													CPU: {sys.stats.totalCpu}
												</span>
												<span>•</span>
												<span>RAM: {sys.stats.totalMemory}</span>
											</div>

											<Button
												size="sm"
												variant="ghost"
												className="h-6 text-[10px] px-2 gap-1 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
												onClick={() => {
													setSelectedSystemKey(sys.key);
													setViewMode("isolated");
												}}
											>
												<span>{locale === "vi" ? "Soi sơ đồ riêng" : "Inspect"}</span>
												<ArrowRight className="size-3" />
											</Button>
										</div>
									</CardContent>
								</Card>
							))}
						</div>

						<ArchitectureConnector
							label={locale === "vi" ? "Ghi nhận & Truy xuất Cơ sở dữ liệu và Ổ cứng NVMe" : "Read/Write persistent storage & database volumes"}
							color="#10b981"
							enabled={trafficPulseEnabled}
						/>
					</div>

					{/* TẦNG 4: CƠ SỞ DỮ LIỆU & LƯU TRỮ NVME */}
					<div className="w-full max-w-4xl flex flex-col items-center space-y-3">
						<div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
							<Database className="h-3.5 w-3.5" />
							<span>{t("Tier 4: Data & Storage")}</span>
						</div>

						<div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-3xl">
							{storageNodes.map((st) => (
								<div
									key={st.id}
									onClick={() => setSelectedNode(st)}
									className="px-4 py-2.5 rounded-xl border border-border/80 bg-card/90 hover:border-emerald-500/50 transition-all duration-200 shadow-xs flex items-center gap-2.5 cursor-pointer hover:scale-102"
								>
									<div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-500">
										{st.type === "volume" ? <HardDrive className="size-4" /> : <Database className="size-4" />}
									</div>
									<div>
										<div className="flex items-center gap-1.5">
											<span className={`size-1.5 rounded-full ${getStatusDot(st.status)}`} />
											<span className="text-xs font-bold text-foreground font-mono">
												{st.label}
											</span>
										</div>
										<p className="text-[10px] text-muted-foreground font-mono">
											{st.sublabel}
										</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			)}

			{/* ========================================================
			    VIEW 2: ISOLATED DEDICATED SYSTEM ARCHITECTURE
			======================================================== */}
			{viewMode === "isolated" && activeIsolatedSystem && (
				<div
					className="min-h-[700px] p-6 pt-8 transition-transform duration-150 origin-top flex flex-col items-center justify-start space-y-6 select-none overflow-x-auto relative z-10"
					style={{ transform: `scale(${zoom})` }}
				>
					{/* System Selector Header Bar */}
					<div className="w-full max-w-5xl flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-muted/50 border border-border/70 backdrop-blur-md">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
								{t("Select System")}:
							</span>
							{systems.map((s) => (
								<Button
									key={s.key}
									size="sm"
									variant={selectedSystemKey === s.key ? "default" : "outline"}
									className="h-7 text-xs px-2.5 font-medium rounded-lg"
									onClick={() => setSelectedSystemKey(s.key)}
								>
									{s.name}
								</Button>
							))}
						</div>

						<Button
							size="sm"
							variant="ghost"
							className="h-7 text-xs px-2.5 gap-1 text-muted-foreground hover:text-foreground"
							onClick={() => setViewMode("cluster")}
						>
							<Workflow className="size-3.5" />
							<span>{t("Back to Cluster")}</span>
						</Button>
					</div>

					{/* Dedicated System Title Banner */}
					<div className="w-full max-w-5xl p-5 rounded-2xl border border-purple-500/30 bg-purple-500/5 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
						<div>
							<div className="flex items-center gap-2">
								<Badge className="bg-purple-500 text-white text-[10px] uppercase font-bold tracking-wider">
									{activeIsolatedSystem.category}
								</Badge>
								<h2 className="text-lg font-bold text-foreground">
									{activeIsolatedSystem.name}
								</h2>
							</div>
							<p className="text-xs text-muted-foreground mt-1 max-w-2xl">
								{activeIsolatedSystem.description}
							</p>
							<div className="flex flex-wrap items-center gap-2 mt-2">
								{activeIsolatedSystem.domains.map((dom) => (
									<span
										key={dom}
										className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 text-xs font-mono"
									>
										<Globe className="size-3" />
										{dom}
									</span>
								))}
							</div>
						</div>

						<div className="flex items-center gap-3 shrink-0 bg-background/80 p-2.5 rounded-xl border border-border/70 font-mono text-xs">
							<div>
								<span className="text-[10px] text-muted-foreground block">{t("CPU Usage")}</span>
								<span className="font-bold text-purple-600 dark:text-purple-400">
									{activeIsolatedSystem.stats.totalCpu}
								</span>
							</div>
							<span className="text-border">|</span>
							<div>
								<span className="text-[10px] text-muted-foreground block">{t("Memory Usage")}</span>
								<span className="font-bold text-foreground">
									{activeIsolatedSystem.stats.totalMemory}
								</span>
							</div>
							<span className="text-border">|</span>
							<div>
								<span className="text-[10px] text-muted-foreground block">{t("Replicas")}</span>
								<span className="font-bold text-emerald-600 dark:text-emerald-400">
									{activeIsolatedSystem.subServices.length} Active
								</span>
							</div>
						</div>
					</div>

					{/* STEP 1 IN ISOLATED VIEW: TRAEFIK GATEWAY ROUTING */}
					<div className="w-full max-w-4xl flex flex-col items-center space-y-2">
						<div className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider">
							{locale === "vi" ? "1. Cổng Tiếp Nhận & Routing Tên Miền (Traefik Gateway)" : "1. Ingress & Domain Routing (Traefik Gateway)"}
						</div>
						<div className="p-3.5 rounded-xl bg-card border border-border/80 flex items-center gap-4 text-xs font-mono">
							<Shield className="size-5 text-cyan-500 shrink-0" />
							<div>
								<span className="text-foreground font-semibold">Traefik Ingress Gateway (:80, :443 TLS)</span>
								<div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
									<span>Host Rules: {activeIsolatedSystem.domains.join(", ") || "Internal Route"}</span>
									<span>➔</span>
									<span className="text-cyan-500">dokploy-network</span>
								</div>
							</div>
						</div>
						<ArchitectureConnector
							label={locale === "vi" ? "Chuyển tiếp gói tin HTTP/HTTPS vào Web & API Core" : "Forwarding HTTP/HTTPS packets to Web & API Core"}
							color="#06b6d4"
							enabled={trafficPulseEnabled}
						/>
					</div>

					{/* STEP 2 IN ISOLATED VIEW: ALL CHILD SUB-SERVICES MESH */}
					<div className="w-full max-w-5xl flex flex-col items-center space-y-3">
						<div className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wider">
							{locale === "vi" ? "2. Danh Sách Tất Cả Service Con Đang Chạy (Sub-Services Mesh)" : "2. Active Child Sub-Services Mesh"}
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 w-full">
							{activeIsolatedSystem.subServices.map((sub) => (
								<div
									key={sub.id}
									onClick={() => setSelectedSubService(sub)}
									className="p-3.5 rounded-xl border border-border/80 bg-card hover:border-purple-500/50 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
								>
									<div>
										<div className="flex items-center justify-between gap-1">
											<div className="flex items-center gap-2 min-w-0">
												<span className={`size-2 rounded-full shrink-0 ${getStatusDot(sub.status)}`} />
												<h4 className="text-xs font-bold text-foreground font-mono truncate">
													{sub.name}
												</h4>
											</div>
											{getRoleBadge(sub.role)}
										</div>

										{sub.image && (
											<p className="text-[10px] text-muted-foreground font-mono truncate mt-1">
												Image: {sub.image}
											</p>
										)}
									</div>

									<div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
										<span className="text-purple-600 dark:text-purple-400 font-semibold">
											CPU: {sub.cpu}
										</span>
										<span>RAM: {sub.memory}</span>
										<Badge variant="outline" className="text-[9px]">
											{sub.replicas}
										</Badge>
									</div>
								</div>
							))}
						</div>
					</div>

					{/* STEP 3 IN ISOLATED VIEW: INTER-SERVICE COMMUNICATION LINKS */}
					{activeIsolatedSystem.communications.length > 0 && (
						<div className="w-full max-w-4xl flex flex-col items-center space-y-3 pt-2">
							<div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
								{locale === "vi" ? "3. Sơ Đồ Giao Tiếp & Kết Nối Nội Bộ Giữa Các Service" : "3. Inter-Service Communication Flow"}
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
								{activeIsolatedSystem.communications.map((comm) => (
									<div
										key={comm.id}
										className="p-3 rounded-xl border border-border/60 bg-muted/40 flex items-center justify-between gap-3 text-xs font-mono"
									>
										<div className="min-w-0">
											<div className="flex items-center gap-1.5 text-foreground font-medium truncate">
												<span>{comm.source}</span>
												<ArrowRight className="size-3 text-indigo-500 shrink-0" />
												<span className="text-purple-600 dark:text-purple-400 font-bold">{comm.target}</span>
											</div>
											<p className="text-[10px] text-muted-foreground mt-0.5 truncate">
												{comm.label}
											</p>
										</div>
										<Badge variant="outline" className="text-[9px] bg-background shrink-0">
											{comm.protocol}
										</Badge>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			)}

			{/* ========================================================
			    VIEW 3: HOST INFRASTRUCTURE RACKS
			======================================================== */}
			{viewMode === "infrastructure" && (
				<div
					className="min-h-[700px] p-6 pt-8 transition-transform duration-150 origin-top flex flex-col items-center justify-start space-y-6 select-none overflow-x-auto relative z-10"
					style={{ transform: `scale(${zoom})` }}
				>
					<div className="w-full max-w-5xl flex items-center justify-between text-xs text-muted-foreground">
						<span>
							{locale === "vi" ? "Phân bổ khối lượng công việc trên 2 máy chủ vật lý / VPS" : "Workload allocation across 2 compute nodes (Docker Swarm Leader + Dedicated VPS)"}
						</span>
						<Badge
							variant="outline"
							className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
						>
							WireGuard Mesh / SSH Active
						</Badge>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start w-full max-w-5xl">
						{filteredInfrastructure.map((host) => {
							const isSwarm = host.type === "swarm-manager" || host.isLocal;
							return (
								<Card
									key={host.id}
									className="border border-border/80 rounded-2xl overflow-hidden bg-card/90 shadow-sm"
								>
									<CardHeader className="p-4 pb-3 border-b bg-muted/40">
										<div className="flex items-center justify-between gap-2">
											<div className="flex items-center gap-3">
												<div
													className={`size-10 rounded-xl flex items-center justify-center border ${
														isSwarm
															? "bg-blue-500/15 border-blue-500/30 text-blue-500"
															: "bg-amber-500/15 border-amber-500/30 text-amber-500"
													}`}
												>
													{isSwarm ? <Layers className="size-5" /> : <Server className="size-5" />}
												</div>
												<div>
													<div className="flex items-center gap-2">
														<span className={`size-2.5 rounded-full ${getStatusDot(host.status)}`} />
														<CardTitle className="text-sm font-bold font-mono">
															{host.name}
														</CardTitle>
													</div>
													<p className="text-xs text-muted-foreground font-mono mt-0.5">
														{host.ip} • {host.specs?.cores || 8} vCPU - {host.specs?.memory || "23.5 GB"}
													</p>
												</div>
											</div>

											<Badge
												variant={isSwarm ? "default" : "secondary"}
												className="text-[10px] uppercase font-semibold"
											>
												{host.role}
											</Badge>
										</div>
									</CardHeader>

									<CardContent className="p-4 space-y-4">
										{/* Workloads running on this host */}
										<div className="space-y-2">
											<div className="flex items-center justify-between text-xs font-semibold">
												<span className="text-purple-600 dark:text-purple-400">
													{locale === "vi" ? "Ứng Dụng & Dịch Vụ Vận Hành" : "Workloads & Applications"} ({host.workloads.length})
												</span>
											</div>

											{host.workloads.length === 0 ? (
												<div className="p-4 rounded-xl border border-dashed border-border/60 text-center text-xs text-muted-foreground font-mono">
													{locale === "vi"
														? "Máy chủ sẵn sàng tiếp nhận triển khai ứng dụng mới"
														: "Dedicated host idle • Ready to deploy new workloads"}
												</div>
											) : (
												<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
													{host.workloads.map((item: any) => (
														<div
															key={item.id}
															className="p-2.5 rounded-xl border border-border/60 bg-background/70 text-xs font-mono flex items-center justify-between gap-1"
														>
															<div className="min-w-0">
																<p className="font-bold truncate text-foreground">
																	{item.name}
																</p>
																<p className="text-[10px] text-muted-foreground truncate">
																	{item.subname || item.type}
																</p>
															</div>
															<span className={`size-2 rounded-full shrink-0 ${getStatusDot(item.status)}`} />
														</div>
													))}
												</div>
											)}
										</div>

										{/* Databases on this host */}
										{host.databases && host.databases.length > 0 && (
											<div className="space-y-2 pt-2 border-t border-border/50">
												<span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block">
													{locale === "vi" ? "Cơ Sở Dữ Liệu & Storage" : "Databases & Storage"} ({host.databases.length})
												</span>
												<div className="flex flex-wrap gap-1.5">
													{host.databases.map((db: any) => (
														<Badge
															key={db.id}
															variant="outline"
															className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-mono"
														>
															<Database className="size-3 mr-1" />
															{db.name} ({db.type})
														</Badge>
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
			)}

			{/* Detailed Sheet Drawer for Inspecting Node or Sub-Service */}
			<Sheet
				open={!!selectedNode || !!selectedSubService}
				onOpenChange={(open) => {
					if (!open) {
						setSelectedNode(null);
						setSelectedSubService(null);
					}
				}}
			>
				<SheetContent className="sm:max-w-md p-6 overflow-y-auto">
					<SheetHeader className="pb-4 border-b">
						<SheetTitle className="text-base font-bold font-mono">
							{selectedSubService?.name || selectedNode?.label}
						</SheetTitle>
						<SheetDescription className="text-xs">
							{selectedSubService?.role
								? `${t("Role")}: ${selectedSubService.role}`
								: selectedNode?.sublabel}
						</SheetDescription>
					</SheetHeader>

					<div className="space-y-4 pt-4 text-xs font-mono">
						{selectedSubService && (
							<>
								<div className="space-y-1">
									<span className="text-muted-foreground block text-[10px]">{t("Role")}</span>
									{getRoleBadge(selectedSubService.role)}
								</div>
								{selectedSubService.image && (
									<div className="space-y-1">
										<span className="text-muted-foreground block text-[10px]">Docker Image</span>
										<p className="p-2 rounded-lg bg-muted text-foreground break-all">
											{selectedSubService.image}
										</p>
									</div>
								)}
								<div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/50 border">
									<div>
										<span className="text-muted-foreground block text-[10px]">{t("CPU Usage")}</span>
										<span className="font-bold text-purple-600 dark:text-purple-400 text-sm">
											{selectedSubService.cpu}
										</span>
									</div>
									<div>
										<span className="text-muted-foreground block text-[10px]">{t("Memory Usage")}</span>
										<span className="font-bold text-foreground text-sm">
											{selectedSubService.memory}
										</span>
									</div>
								</div>
							</>
						)}

						{selectedNode && (
							<>
								<div className="p-3 rounded-xl bg-muted/50 border space-y-2">
									<div className="flex items-center justify-between">
										<span className="text-muted-foreground">{t("Status")}:</span>
										<Badge variant="outline" className="uppercase text-[10px]">
											{selectedNode.status}
										</Badge>
									</div>
									{selectedNode.stats?.ports && (
										<div className="flex items-center justify-between">
											<span className="text-muted-foreground">{t("Port")}:</span>
											<span className="font-bold">{selectedNode.stats.ports}</span>
										</div>
									)}
								</div>

								{selectedNode.domains && selectedNode.domains.length > 0 && (
									<div className="space-y-1.5">
										<span className="text-muted-foreground block text-[10px]">
											{locale === "vi" ? "Tên Miền Điều Hướng (Routing Domains)" : "Routing Domains"}
										</span>
										<div className="flex flex-wrap gap-1.5">
											{selectedNode.domains.map((dom) => (
												<span
													key={dom}
													className="px-2 py-1 rounded bg-muted text-[11px] font-mono border"
												>
													{dom}
												</span>
											))}
										</div>
									</div>
								)}
							</>
						)}
					</div>
				</SheetContent>
			</Sheet>
		</div>
	);
};
