import {
	Activity,
	Boxes,
	CheckCircle2,
	Clock,
	Cpu,
	Globe,
	HardDrive,
	Layers,
	MemoryStick,
	Radio,
	Server,
	Shield,
	Terminal,
	XCircle,
} from "lucide-react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { TerminalModal } from "../settings/web-server/terminal-modal";
import type { FleetNodeInfo } from "@/server/api/routers/fleet";

interface FleetNodeDrawerProps {
	node: FleetNodeInfo | null;
	isOpen: boolean;
	onClose: () => void;
}

export const FleetNodeDrawer = ({
	node,
	isOpen,
	onClose,
}: FleetNodeDrawerProps) => {
	if (!node) return null;

	const memoryGB =
		Math.round((node.memoryBytes / (1024 * 1024 * 1024)) * 10) / 10;
	const isOnline = node.status === "online";

	return (
		<Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<SheetContent className="sm:max-w-xl w-full overflow-y-auto">
				<SheetHeader className="pb-4 border-b">
					<div className="flex items-center justify-between gap-3">
						<div className="flex items-center gap-3">
							<div
								className={`h-10 w-10 rounded-lg flex items-center justify-center ${
									isOnline
										? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
										: "bg-rose-500/10 text-rose-400 border border-rose-500/20"
								}`}
							>
								<Server className="h-5 w-5" />
							</div>
							<div>
								<SheetTitle className="text-lg font-bold">
									{node.name}
								</SheetTitle>
								<SheetDescription className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
									<span>{node.ip}</span>
									<span>•</span>
									<span className="capitalize">{node.clusterName}</span>
								</SheetDescription>
							</div>
						</div>
						<Badge
							variant={
								isOnline
									? "default"
									: node.status === "degraded"
										? "secondary"
										: "destructive"
							}
							className="uppercase text-xs"
						>
							{node.status}
						</Badge>
					</div>
				</SheetHeader>

				<div className="py-6 space-y-6">
					{/* Status & Role Section */}
					<div className="grid grid-cols-2 gap-3">
						<div className="p-3.5 rounded-lg border bg-muted/30">
							<p className="text-xs text-muted-foreground font-medium">
								Cluster Role
							</p>
							<div className="flex items-center gap-2 mt-1.5">
								<Layers className="h-4 w-4 text-primary" />
								<span className="font-semibold text-sm capitalize">
									{node.role.replace("-", " ")}
								</span>
								{node.isLeader && (
									<Badge
										variant="outline"
										className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30"
									>
										Leader
									</Badge>
								)}
							</div>
						</div>

						<div className="p-3.5 rounded-lg border bg-muted/30">
							<p className="text-xs text-muted-foreground font-medium">
								Discovery Type
							</p>
							<div className="flex items-center gap-2 mt-1.5">
								<Radio className="h-4 w-4 text-cyan-400" />
								<span className="font-semibold text-sm">
									{node.autoDiscovered ? "Auto Swarm Mesh" : "Direct Managed"}
								</span>
							</div>
						</div>
					</div>

					{/* Hardware Specs */}
					<div>
						<h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
							<Cpu className="h-4 w-4 text-primary" /> Hardware & Engine Specs
						</h4>
						<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
							<div className="p-3 rounded-lg border bg-card/60">
								<span className="text-xs text-muted-foreground">vCPU Cores</span>
								<p className="text-base font-bold text-foreground mt-0.5">
									{node.cpuCores} Cores
								</p>
							</div>
							<div className="p-3 rounded-lg border bg-card/60">
								<span className="text-xs text-muted-foreground">Total Memory</span>
								<p className="text-base font-bold text-foreground mt-0.5">
									{memoryGB} GB RAM
								</p>
							</div>
							<div className="p-3 rounded-lg border bg-card/60">
								<span className="text-xs text-muted-foreground">Live Containers</span>
								<p className="text-base font-bold text-foreground mt-0.5">
									{node.containersRunning} / {node.containersTotal}
								</p>
							</div>
						</div>
					</div>

					{/* Operating System & Docker details */}
					<div>
						<h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
							<Globe className="h-4 w-4 text-primary" /> System Environment
						</h4>
						<div className="rounded-lg border bg-muted/20 p-4 space-y-2.5 text-sm">
							<div className="flex justify-between items-center text-xs sm:text-sm">
								<span className="text-muted-foreground">Operating System:</span>
								<span className="font-medium text-foreground">{node.os}</span>
							</div>
							<div className="flex justify-between items-center text-xs sm:text-sm">
								<span className="text-muted-foreground">Docker Engine:</span>
								<span className="font-medium text-foreground">
									v{node.engineVersion}
								</span>
							</div>
							<div className="flex justify-between items-center text-xs sm:text-sm">
								<span className="text-muted-foreground">Cluster ID:</span>
								<span className="font-mono text-xs text-foreground bg-muted px-2 py-0.5 rounded">
									{node.clusterId}
								</span>
							</div>
							{node.swarmNodeId && (
								<div className="flex justify-between items-center text-xs sm:text-sm">
									<span className="text-muted-foreground">Swarm Node ID:</span>
									<span className="font-mono text-xs text-foreground bg-muted px-2 py-0.5 rounded truncate max-w-[200px]">
										{node.swarmNodeId}
									</span>
								</div>
							)}
							<div className="flex justify-between items-center text-xs sm:text-sm">
								<span className="text-muted-foreground">Last Heartbeat:</span>
								<span className="font-medium text-foreground">
									{new Date(node.lastPing).toLocaleTimeString()}
								</span>
							</div>
						</div>
					</div>

					{/* Quick Actions */}
					<div className="pt-2 border-t flex flex-wrap gap-2">
						{node.serverId ? (
							<TerminalModal serverId={node.serverId} asButton>
								<Button className="gap-2">
									<Terminal className="h-4 w-4" /> Open SSH Terminal
								</Button>
							</TerminalModal>
						) : node.isLocal ? (
							<TerminalModal serverId="local" asButton>
								<Button className="gap-2">
									<Terminal className="h-4 w-4" /> Open Host Terminal
								</Button>
							</TerminalModal>
						) : (
							<Button disabled variant="outline" className="gap-2">
								<Terminal className="h-4 w-4" /> Managed via Swarm Manager
							</Button>
						)}
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
};
