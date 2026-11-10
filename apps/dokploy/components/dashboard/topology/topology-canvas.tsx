import {
	Activity,
	ArrowDown,
	Boxes,
	CheckCircle2,
	ChevronRight,
	Database,
	Filter,
	Globe,
	HardDrive,
	Layers,
	Minus,
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
import { Card, CardContent } from "@/components/ui/card";
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
		| "volume";
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

interface TopologyCanvasProps {
	nodes: TopologyNode[];
	edges: TopologyEdge[];
	onRefresh?: () => void;
}

export const TopologyCanvas = ({
	nodes,
	edges,
	onRefresh,
}: TopologyCanvasProps) => {
	const [zoom, setZoom] = useState<number>(1);
	const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [activeTier, setActiveTier] = useState<string>("all");

	// Group nodes by tier
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

	const getNodeIcon = (type: TopologyNode["type"]) => {
		switch (type) {
			case "domain":
				return <Globe className="h-4 w-4 text-emerald-400" />;
			case "traefik":
				return <Shield className="h-4 w-4 text-cyan-400" />;
			case "swarm-cluster":
				return <Layers className="h-4 w-4 text-blue-400" />;
			case "host":
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

	const getStatusDot = (status: TopologyNode["status"]) => {
		switch (status) {
			case "healthy":
				return "bg-emerald-500 ring-2 ring-emerald-500/20";
			case "warning":
				return "bg-amber-500 ring-2 ring-amber-500/20";
			case "offline":
				return "bg-rose-500 ring-2 ring-rose-500/20";
		}
	};

	return (
		<div className="relative w-full rounded-xl border border-border/70 bg-[#090A0D] overflow-hidden shadow-2xl">
			{/* Canvas Toolbar */}
			<div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
				{/* Search & Tier Filter */}
				<div className="flex items-center gap-2 pointer-events-auto">
					<div className="relative w-48 sm:w-64">
						<Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
						<Input
							placeholder="Search topology nodes..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-8 h-8 text-xs bg-background/90 backdrop-blur-md border-border/80"
						/>
					</div>

					<div className="flex items-center bg-background/90 backdrop-blur-md border border-border/80 rounded-lg p-0.5">
						<Button
							variant={activeTier === "all" ? "default" : "ghost"}
							size="sm"
							className="h-7 text-[11px] px-2.5"
							onClick={() => setActiveTier("all")}
						>
							All Layers
						</Button>
						<Button
							variant={activeTier === "ingress" ? "default" : "ghost"}
							size="sm"
							className="h-7 text-[11px] px-2.5"
							onClick={() => setActiveTier("ingress")}
						>
							Ingress
						</Button>
						<Button
							variant={activeTier === "cluster" ? "default" : "ghost"}
							size="sm"
							className="h-7 text-[11px] px-2.5"
							onClick={() => setActiveTier("cluster")}
						>
							Clusters
						</Button>
						<Button
							variant={activeTier === "service" ? "default" : "ghost"}
							size="sm"
							className="h-7 text-[11px] px-2.5"
							onClick={() => setActiveTier("service")}
						>
							Apps
						</Button>
						<Button
							variant={activeTier === "data" ? "default" : "ghost"}
							size="sm"
							className="h-7 text-[11px] px-2.5"
							onClick={() => setActiveTier("data")}
						>
							Databases
						</Button>
					</div>
				</div>

				{/* Zoom & Canvas Actions */}
				<div className="flex items-center gap-1.5 pointer-events-auto bg-background/90 backdrop-blur-md border border-border/80 rounded-lg p-1">
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 text-xs"
						onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
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

			{/* Interactive Diagram Flow Area */}
			<div
				className="min-h-[680px] p-6 pt-20 transition-transform duration-150 origin-top flex flex-col items-center justify-start space-y-12 select-none overflow-x-auto"
				style={{ transform: `scale(${zoom})` }}
			>
				{/* LAYER 1: Edge & Ingress */}
				{(activeTier === "all" || activeTier === "ingress") && (
					<div className="w-full flex flex-col items-center space-y-3">
						<div className="flex items-center gap-2">
							<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
								<Shield className="h-3.5 w-3.5 text-cyan-400" />
								Tier 1: Edge Routing & Ingress ({tiers.ingress.length})
							</span>
						</div>
						<div className="flex flex-wrap items-center justify-center gap-4 max-w-4xl">
							{tiers.ingress.map((node) => (
								<div
									key={node.id}
									onClick={() => setSelectedNode(node)}
									className={`px-4 py-2.5 rounded-xl border bg-card/80 backdrop-blur-md cursor-pointer transition-all duration-200 hover:scale-105 shadow-md flex items-center gap-3 ${
										selectedNode?.id === node.id
											? "border-emerald-500 ring-2 ring-emerald-500/20"
											: "border-border/70 hover:border-cyan-500/50"
									}`}
								>
									<div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
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
							<div className="w-0.5 h-6 bg-linear-to-b from-cyan-500/60 to-blue-500/60" />
							<ArrowDown className="h-4 w-4 text-blue-400" />
						</div>
					</div>
				)}

				{/* LAYER 2: Compute Infrastructure */}
				{(activeTier === "all" || activeTier === "cluster") && (
					<div className="w-full flex flex-col items-center space-y-3">
						<div className="flex items-center gap-2">
							<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
								<Layers className="h-3.5 w-3.5 text-blue-400" />
								Tier 2: Multi-Cluster Infrastructure ({tiers.cluster.length})
							</span>
						</div>
						<div className="flex flex-wrap items-center justify-center gap-5 max-w-5xl">
							{tiers.cluster.map((node) => (
								<div
									key={node.id}
									onClick={() => setSelectedNode(node)}
									className={`px-5 py-3 rounded-xl border bg-card/80 backdrop-blur-md cursor-pointer transition-all duration-200 hover:scale-105 shadow-md flex items-center gap-3.5 ${
										selectedNode?.id === node.id
											? "border-blue-500 ring-2 ring-blue-500/20"
											: "border-border/70 hover:border-blue-500/50"
									}`}
								>
									<div className="h-9 w-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
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
							<ArrowDown className="h-4 w-4 text-purple-400" />
						</div>
					</div>
				)}

				{/* LAYER 3: Workload Applications & Stacks */}
				{(activeTier === "all" || activeTier === "service") && (
					<div className="w-full flex flex-col items-center space-y-3">
						<div className="flex items-center gap-2">
							<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
								<Zap className="h-3.5 w-3.5 text-purple-400" />
								Tier 3: Workload Services & Stacks ({tiers.service.length})
							</span>
						</div>
						<div className="flex flex-wrap items-center justify-center gap-4 max-w-5xl">
							{tiers.service.length === 0 ? (
								<div className="text-xs text-muted-foreground py-2 border border-dashed rounded-lg px-6">
									No standalone applications or compose stacks configured yet.
								</div>
							) : (
								tiers.service.map((node) => (
									<div
										key={node.id}
										onClick={() => setSelectedNode(node)}
										className={`px-4 py-2.5 rounded-xl border bg-card/80 backdrop-blur-md cursor-pointer transition-all duration-200 hover:scale-105 shadow-md flex items-center gap-3 ${
											selectedNode?.id === node.id
												? "border-purple-500 ring-2 ring-purple-500/20"
												: "border-border/70 hover:border-purple-500/50"
										}`}
									>
										<div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
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
								))
							)}
						</div>

						{/* Connector Down */}
						<div className="flex flex-col items-center text-muted-foreground/40 py-1">
							<div className="w-0.5 h-6 bg-linear-to-b from-purple-500/60 to-emerald-500/60" />
							<ArrowDown className="h-4 w-4 text-emerald-400" />
						</div>
					</div>
				)}

				{/* LAYER 4: Databases & Storage Volumes */}
				{(activeTier === "all" || activeTier === "data") && (
					<div className="w-full flex flex-col items-center space-y-3">
						<div className="flex items-center gap-2">
							<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
								<Database className="h-3.5 w-3.5 text-emerald-400" />
								Tier 4: Databases & Persistent Storage ({tiers.data.length})
							</span>
						</div>
						<div className="flex flex-wrap items-center justify-center gap-4 max-w-5xl">
							{tiers.data.map((node) => (
								<div
									key={node.id}
									onClick={() => setSelectedNode(node)}
									className={`px-4 py-2.5 rounded-xl border bg-card/80 backdrop-blur-md cursor-pointer transition-all duration-200 hover:scale-105 shadow-md flex items-center gap-3 ${
										selectedNode?.id === node.id
											? "border-emerald-500 ring-2 ring-emerald-500/20"
											: "border-border/70 hover:border-emerald-500/50"
									}`}
								>
									<div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
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
					</div>
				)}
			</div>

			{/* Interactive Node Inspector Sheet */}
			<Sheet open={!!selectedNode} onOpenChange={(open) => !open && setSelectedNode(null)}>
				<SheetContent className="sm:max-w-md w-full">
					{selectedNode && (
						<>
							<SheetHeader className="pb-4 border-b">
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
										{getNodeIcon(selectedNode.type)}
									</div>
									<div>
										<SheetTitle className="text-base font-bold">
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
										Operational Status
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
												<span className="text-xs text-muted-foreground">Mode / Role</span>
												<p className="text-sm font-bold mt-0.5">
													{selectedNode.stats.replicas}
												</p>
											</div>
										)}
									</div>
								)}

								<div className="p-3 rounded-lg border bg-muted/20 text-xs text-muted-foreground space-y-1.5">
									<p>
										<strong>Node Identifier:</strong>{" "}
										<span className="font-mono text-foreground">{selectedNode.id}</span>
									</p>
									<p>
										<strong>Description:</strong> {selectedNode.sublabel || "Active node"}
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
