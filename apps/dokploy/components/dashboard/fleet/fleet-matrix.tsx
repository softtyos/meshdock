import {
	Activity,
	ArrowUpDown,
	CheckCircle2,
	Cpu,
	Filter,
	Globe,
	HardDrive,
	Layers,
	MemoryStick,
	Network,
	Radio,
	Search,
	Server,
	ShieldCheck,
	SlidersHorizontal,
	Terminal,
	XCircle,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TerminalModal } from "../settings/web-server/terminal-modal";
import type { ClusterGroup, FleetNodeInfo } from "@/server/api/routers/fleet";

interface FleetMatrixProps {
	nodes: FleetNodeInfo[];
	clusters: ClusterGroup[];
	onSelectNode: (node: FleetNodeInfo) => void;
}

export const FleetMatrix = ({
	nodes,
	clusters,
	onSelectNode,
}: FleetMatrixProps) => {
	const [activeTab, setActiveTab] = useState<string>("all");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [sortBy, setSortBy] = useState<"name" | "status" | "cores">("name");

	// Filter nodes
	const filteredNodes = useMemo(() => {
		return nodes.filter((node) => {
			// Tab filtering
			if (activeTab === "swarm" && node.role === "standalone") return false;
			if (activeTab === "standalone" && node.role !== "standalone") return false;
			if (activeTab === "issues" && node.status === "online") return false;
			if (activeTab !== "all" && activeTab !== "swarm" && activeTab !== "standalone" && activeTab !== "issues") {
				if (node.clusterId !== activeTab) return false;
			}

			// Text search
			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase();
				const matchName = node.name.toLowerCase().includes(query);
				const matchIp = node.ip.toLowerCase().includes(query);
				const matchCluster = node.clusterName.toLowerCase().includes(query);
				const matchRole = node.role.toLowerCase().includes(query);
				return matchName || matchIp || matchCluster || matchRole;
			}

			return true;
		}).sort((a, b) => {
			if (sortBy === "name") return a.name.localeCompare(b.name);
			if (sortBy === "status") {
				const order = { online: 0, degraded: 1, offline: 2 };
				return order[a.status] - order[b.status];
			}
			if (sortBy === "cores") return b.cpuCores - a.cpuCores;
			return 0;
		});
	}, [nodes, activeTab, searchQuery, sortBy]);

	return (
		<div className="space-y-4">
			{/* Filter & Search Bar */}
			<div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
				{/* Cluster Filter Tabs */}
				<Tabs
					value={activeTab}
					onValueChange={setActiveTab}
					className="w-full md:w-auto"
				>
					<TabsList className="bg-muted/50 p-1 flex-wrap h-auto">
						<TabsTrigger value="all" className="text-xs">
							All ({nodes.length})
						</TabsTrigger>
						<TabsTrigger value="swarm" className="text-xs gap-1.5">
							<Layers className="h-3 w-3 text-blue-400" />
							Swarm Clusters ({nodes.filter((n) => n.role !== "standalone").length})
						</TabsTrigger>
						<TabsTrigger value="standalone" className="text-xs gap-1.5">
							<HardDrive className="h-3 w-3 text-amber-400" />
							Standalone ({nodes.filter((n) => n.role === "standalone").length})
						</TabsTrigger>
						<TabsTrigger value="issues" className="text-xs gap-1.5">
							<span className="h-2 w-2 rounded-full bg-rose-500" />
							Issues ({nodes.filter((n) => n.status !== "online").length})
						</TabsTrigger>
					</TabsList>
				</Tabs>

				{/* Search & Sort Controls */}
				<div className="flex items-center gap-2">
					<div className="relative flex-1 md:w-64">
						<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search by name, IP, cluster..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-9 h-9 text-xs"
						/>
					</div>

					<Select
						value={sortBy}
						onValueChange={(val: "name" | "status" | "cores") => setSortBy(val)}
					>
						<SelectTrigger className="w-[130px] h-9 text-xs">
							<SlidersHorizontal className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
							<SelectValue placeholder="Sort by" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="name" className="text-xs">Sort: Name</SelectItem>
							<SelectItem value="status" className="text-xs">Sort: Status</SelectItem>
							<SelectItem value="cores" className="text-xs">Sort: vCPUs</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Nodes Heatmap Grid */}
			{filteredNodes.length === 0 ? (
				<Card className="p-8 text-center bg-card/40 border-dashed">
					<Server className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
					<p className="text-sm font-semibold text-foreground">No servers match your criteria</p>
					<p className="text-xs text-muted-foreground mt-1">
						Try clearing filters or adding more nodes to the fleet.
					</p>
				</Card>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
					{filteredNodes.map((node) => {
						const isOnline = node.status === "online";
						const memoryGB = Math.round((node.memoryBytes / (1024 * 1024 * 1024)) * 10) / 10;

						return (
							<Card
								key={node.id}
								className={`group relative transition-all duration-200 cursor-pointer overflow-hidden border ${
									isOnline
										? "hover:border-emerald-500/50 hover:shadow-md bg-card/60"
										: "border-rose-500/30 bg-rose-950/10"
								}`}
								onClick={() => onSelectNode(node)}
							>
								{/* Top Status Stripe */}
								<div
									className={`h-1 w-full ${
										isOnline
											? "bg-linear-to-r from-emerald-500 to-teal-400"
											: "bg-linear-to-r from-rose-500 to-amber-500"
									}`}
								/>

								<CardContent className="p-3.5 space-y-3">
									{/* Header: Name + Status Beacon */}
									<div className="flex items-start justify-between gap-2">
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-1.5">
												<span
													className={`h-2 w-2 rounded-full shrink-0 ${
														isOnline
															? "bg-emerald-500 ring-2 ring-emerald-500/20"
															: "bg-rose-500 ring-2 ring-rose-500/20"
													}`}
												/>
												<h4
													className="text-sm font-bold truncate text-foreground group-hover:text-primary transition-colors"
													title={node.name}
												>
													{node.name}
												</h4>
											</div>
											<p className="text-xs font-mono text-muted-foreground ml-3.5 mt-0.5">
												{node.ip}
											</p>
										</div>

										{/* Role Pill */}
										<Badge
											variant="outline"
											className={`text-[10px] uppercase font-semibold shrink-0 ${
												node.role === "swarm-manager"
													? "border-blue-500/40 text-blue-400 bg-blue-500/10"
													: node.role === "swarm-worker"
														? "border-cyan-500/40 text-cyan-400 bg-cyan-500/10"
														: "border-zinc-500/40 text-zinc-400 bg-zinc-500/10"
											}`}
										>
											{node.role === "swarm-manager"
												? "Swarm Mgr"
												: node.role === "swarm-worker"
													? "Swarm Wkr"
													: "Standalone"}
										</Badge>
									</div>

									{/* Cluster Name & Specs */}
									<div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
										<span className="truncate max-w-[140px]" title={node.clusterName}>
											{node.clusterName}
										</span>
										<div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
											<span>{node.cpuCores} vCPU</span>
											<span>·</span>
											<span>{memoryGB} GB</span>
										</div>
									</div>

									{/* Containers & Actions */}
									<div className="flex items-center justify-between pt-1">
										<div className="flex items-center gap-1 text-xs text-foreground/80 font-medium">
											<Activity className="h-3 w-3 text-emerald-400" />
											<span>{node.containersRunning} running</span>
										</div>

										<div
											className="flex items-center gap-1"
											onClick={(e) => e.stopPropagation()}
										>
											{node.serverId ? (
												<TerminalModal serverId={node.serverId} asButton>
													<Button
														variant="ghost"
														size="icon"
														className="h-7 w-7 text-muted-foreground hover:text-foreground"
														title="SSH Terminal"
													>
														<Terminal className="h-3.5 w-3.5" />
													</Button>
												</TerminalModal>
											) : node.isLocal ? (
												<TerminalModal serverId="local" asButton>
													<Button
														variant="ghost"
														size="icon"
														className="h-7 w-7 text-muted-foreground hover:text-foreground"
														title="Host Terminal"
													>
														<Terminal className="h-3.5 w-3.5" />
													</Button>
												</TerminalModal>
											) : null}
										</div>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}
		</div>
	);
};
