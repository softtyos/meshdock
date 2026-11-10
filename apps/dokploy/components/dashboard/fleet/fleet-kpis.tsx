import {
	Activity,
	Boxes,
	Cpu,
	HardDrive,
	Layers,
	Network,
	Server,
	ShieldCheck,
	Zap,
} from "lucide-react";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface FleetKpisProps {
	kpis?: {
		totalNodes: number;
		onlineNodes: number;
		offlineNodes: number;
		swarmNodes: number;
		standaloneNodes: number;
		swarmClusters: number;
		totalCores: number;
		totalMemoryBytes: number;
		totalContainers: number;
	};
	isLoading?: boolean;
}

export const FleetKpis = ({ kpis, isLoading }: FleetKpisProps) => {
	const totalNodes = kpis?.totalNodes ?? 0;
	const onlineNodes = kpis?.onlineNodes ?? 0;
	const offlineNodes = kpis?.offlineNodes ?? 0;
	const swarmNodes = kpis?.swarmNodes ?? 0;
	const standaloneNodes = kpis?.standaloneNodes ?? 0;
	const swarmClusters = kpis?.swarmClusters ?? 0;
	const totalCores = kpis?.totalCores ?? 0;
	const totalMemoryGB = Math.round(((kpis?.totalMemoryBytes ?? 0) / (1024 * 1024 * 1024)) * 10) / 10;
	const totalContainers = kpis?.totalContainers ?? 0;

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
			{/* Total Fleet Nodes */}
			<Card className="bg-card/70 border-border/60 hover:border-emerald-500/50 transition-all shadow-sm">
				<CardContent className="p-4 flex items-center justify-between">
					<div>
						<p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
							Fleet Nodes
						</p>
						<div className="flex items-baseline gap-2 mt-1">
							<span className="text-2xl font-bold tracking-tight text-foreground">
								{totalNodes}
							</span>
							<span className="text-xs text-muted-foreground">Servers</span>
						</div>
						<div className="flex items-center gap-1.5 mt-2">
							<span className="relative flex h-2 w-2">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
								<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
							</span>
							<span className="text-xs font-medium text-emerald-500">
								{onlineNodes} Online
							</span>
							{offlineNodes > 0 && (
								<span className="text-xs text-rose-400 font-medium">
									· {offlineNodes} Down
								</span>
							)}
						</div>
					</div>
					<div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
						<Server className="h-5 w-5" />
					</div>
				</CardContent>
			</Card>

			{/* Swarm Clusters */}
			<Card className="bg-card/70 border-border/60 hover:border-blue-500/50 transition-all shadow-sm">
				<CardContent className="p-4 flex items-center justify-between">
					<div>
						<p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
							Swarm Clusters
						</p>
						<div className="flex items-baseline gap-2 mt-1">
							<span className="text-2xl font-bold tracking-tight text-foreground">
								{swarmClusters}
							</span>
							<span className="text-xs text-muted-foreground">Clusters</span>
						</div>
						<div className="flex items-center gap-1.5 mt-2 text-xs text-blue-400 font-medium">
							<Layers className="h-3.5 w-3.5" />
							<span>{swarmNodes} Cluster Nodes</span>
						</div>
					</div>
					<div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
						<Network className="h-5 w-5" />
					</div>
				</CardContent>
			</Card>

			{/* Standalone VPS Pool */}
			<Card className="bg-card/70 border-border/60 hover:border-amber-500/50 transition-all shadow-sm">
				<CardContent className="p-4 flex items-center justify-between">
					<div>
						<p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
							Standalone VPS
						</p>
						<div className="flex items-baseline gap-2 mt-1">
							<span className="text-2xl font-bold tracking-tight text-foreground">
								{standaloneNodes}
							</span>
							<span className="text-xs text-muted-foreground">Dedicated</span>
						</div>
						<div className="flex items-center gap-1.5 mt-2 text-xs text-amber-400 font-medium">
							<ShieldCheck className="h-3.5 w-3.5" />
							<span>Isolated Workloads</span>
						</div>
					</div>
					<div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
						<HardDrive className="h-5 w-5" />
					</div>
				</CardContent>
			</Card>

			{/* Total Compute Pool */}
			<Card className="bg-card/70 border-border/60 hover:border-purple-500/50 transition-all shadow-sm">
				<CardContent className="p-4 flex items-center justify-between">
					<div>
						<p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
							Compute Fleet
						</p>
						<div className="flex items-baseline gap-2 mt-1">
							<span className="text-2xl font-bold tracking-tight text-foreground">
								{totalCores}
							</span>
							<span className="text-xs text-muted-foreground">vCPUs</span>
						</div>
						<div className="flex items-center gap-1.5 mt-2 text-xs text-purple-400 font-medium">
							<Zap className="h-3.5 w-3.5" />
							<span>{totalMemoryGB} GB RAM Pool</span>
						</div>
					</div>
					<div className="h-10 w-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
						<Cpu className="h-5 w-5" />
					</div>
				</CardContent>
			</Card>

			{/* Total Containers */}
			<Card className="bg-card/70 border-border/60 hover:border-cyan-500/50 transition-all shadow-sm">
				<CardContent className="p-4 flex items-center justify-between">
					<div>
						<p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
							Live Containers
						</p>
						<div className="flex items-baseline gap-2 mt-1">
							<span className="text-2xl font-bold tracking-tight text-foreground">
								{totalContainers}
							</span>
							<span className="text-xs text-muted-foreground">Running</span>
						</div>
						<div className="flex items-center gap-1.5 mt-2 text-xs text-cyan-400 font-medium">
							<Activity className="h-3.5 w-3.5" />
							<span>Zero-downtime mesh</span>
						</div>
					</div>
					<div className="h-10 w-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
						<Boxes className="h-5 w-5" />
					</div>
				</CardContent>
			</Card>
		</div>
	);
};
