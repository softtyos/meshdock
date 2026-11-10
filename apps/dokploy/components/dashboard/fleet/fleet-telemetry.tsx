import {
	Activity,
	Boxes,
	Cpu,
	HardDrive,
	Loader2,
	RefreshCw,
	RotateCw,
	Server,
	Zap,
} from "lucide-react";
import React, { useState } from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { api } from "@/utils/api";

interface FleetTelemetryProps {
	nodeId?: string;
	nodeName?: string;
}

export const FleetTelemetry = ({ nodeId, nodeName }: FleetTelemetryProps) => {
	const utils = api.useUtils();
	const [points, setPoints] = useState<number>(20);

	const {
		data: telemetryData,
		isLoading: isTelemetryLoading,
		refetch: refetchTelemetry,
	} = api.fleet.getFleetTelemetry.useQuery(
		{ points, nodeId },
		{ refetchInterval: 10000 },
	);

	const {
		data: containersData,
		isLoading: isContainersLoading,
		refetch: refetchContainers,
	} = api.fleet.getFleetContainers.useQuery(
		{ serverId: nodeId && nodeId !== "local-host" ? nodeId : null },
		{ refetchInterval: 15000 },
	);

	const { mutateAsync: restartContainer, isPending: isRestarting } =
		api.fleet.restartContainer.useMutation();

	const handleRestart = async (containerId: string) => {
		try {
			await restartContainer({
				containerId,
				serverId: nodeId && nodeId !== "local-host" ? nodeId : null,
			});
			toast.success(`Container ${containerId.slice(0, 10)} restarted`);
			void utils.fleet.getFleetContainers.invalidate();
		} catch (err: any) {
			toast.error(err?.message || "Failed to restart container");
		}
	};

	const latest = telemetryData?.[telemetryData.length - 1];

	return (
		<div className="space-y-6">
			{/* Telemetry Header */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
				<div>
					<h3 className="text-base font-bold text-foreground flex items-center gap-2">
						<Activity className="h-4 w-4 text-emerald-400" />
						Grafana-Grade Live Fleet Telemetry
					</h3>
					<p className="text-xs text-muted-foreground mt-0.5">
						Real-time metrics stream: {nodeName || "Aggregated Fleet"} (Polling every 10s)
					</p>
				</div>

				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						className="h-8 text-xs gap-1.5"
						onClick={() => {
							void refetchTelemetry();
							void refetchContainers();
						}}
					>
						<RefreshCw className="h-3.5 w-3.5" /> Refresh Telemetry
					</Button>
				</div>
			</div>

			{/* Telemetry Charts Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				{/* CPU Usage Chart */}
				<Card className="bg-card/60 border-border/70">
					<CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
						<div>
							<CardTitle className="text-sm font-semibold flex items-center gap-2">
								<Cpu className="h-4 w-4 text-emerald-400" /> CPU Utilization
							</CardTitle>
							<CardDescription className="text-xs">
								Live CPU load percentage over time
							</CardDescription>
						</div>
						<div className="text-right">
							<span className="text-lg font-bold font-mono text-emerald-400">
								{latest?.cpu ?? "--"}%
							</span>
							<p className="text-[10px] text-muted-foreground uppercase">Current Load</p>
						</div>
					</CardHeader>
					<CardContent className="p-4 pt-1">
						<div className="h-[220px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart data={telemetryData || []}>
									<defs>
										<linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
											<stop offset="5%" stopColor="#10b981" stopOpacity={0.7} />
											<stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
										</linearGradient>
									</defs>
									<CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
									<XAxis
										dataKey="timestamp"
										tick={{ fill: "#71717a", fontSize: 10 }}
										stroke="#3f3f46"
									/>
									<YAxis
										domain={[0, 100]}
										tick={{ fill: "#71717a", fontSize: 10 }}
										stroke="#3f3f46"
										unit="%"
									/>
									<Tooltip
										contentStyle={{
											backgroundColor: "#090a0d",
											borderColor: "#27272a",
											borderRadius: 8,
											fontSize: 12,
										}}
									/>
									<Area
										type="monotone"
										dataKey="cpu"
										stroke="#10b981"
										strokeWidth={2}
										fillOpacity={1}
										fill="url(#cpuGrad)"
										name="CPU %"
									/>
								</AreaChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>

				{/* Memory Allocation Chart */}
				<Card className="bg-card/60 border-border/70">
					<CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
						<div>
							<CardTitle className="text-sm font-semibold flex items-center gap-2">
								<Zap className="h-4 w-4 text-cyan-400" /> Memory Allocation
							</CardTitle>
							<CardDescription className="text-xs">
								Resident RAM in use vs capacity
							</CardDescription>
						</div>
						<div className="text-right">
							<span className="text-lg font-bold font-mono text-cyan-400">
								{latest?.memUsedGB ?? "--"} GB
							</span>
							<p className="text-[10px] text-muted-foreground uppercase">
								Of {latest?.memTotalGB ?? 8} GB
							</p>
						</div>
					</CardHeader>
					<CardContent className="p-4 pt-1">
						<div className="h-[220px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart data={telemetryData || []}>
									<defs>
										<linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
											<stop offset="5%" stopColor="#06b6d4" stopOpacity={0.7} />
											<stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
										</linearGradient>
									</defs>
									<CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
									<XAxis
										dataKey="timestamp"
										tick={{ fill: "#71717a", fontSize: 10 }}
										stroke="#3f3f46"
									/>
									<YAxis
										domain={[0, (latest?.memTotalGB || 8) * 1.1]}
										tick={{ fill: "#71717a", fontSize: 10 }}
										stroke="#3f3f46"
										unit="GB"
									/>
									<Tooltip
										contentStyle={{
											backgroundColor: "#090a0d",
											borderColor: "#27272a",
											borderRadius: 8,
											fontSize: 12,
										}}
									/>
									<Area
										type="monotone"
										dataKey="memUsedGB"
										stroke="#06b6d4"
										strokeWidth={2}
										fillOpacity={1}
										fill="url(#memGrad)"
										name="Used GB"
									/>
								</AreaChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>

				{/* Network In/Out Chart */}
				<Card className="bg-card/60 border-border/70 lg:col-span-2">
					<CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
						<div>
							<CardTitle className="text-sm font-semibold flex items-center gap-2">
								<Activity className="h-4 w-4 text-purple-400" /> Network Throughput (I/O)
							</CardTitle>
							<CardDescription className="text-xs">
								Live ingress (Rx) vs egress (Tx) bandwidth
							</CardDescription>
						</div>
						<div className="flex items-center gap-4 text-xs font-mono">
							<span className="flex items-center gap-1.5 text-purple-400 font-semibold">
								<span className="h-2 w-2 rounded-full bg-purple-400" /> Rx: {latest?.netInKB ?? 0} KB/s
							</span>
							<span className="flex items-center gap-1.5 text-amber-400 font-semibold">
								<span className="h-2 w-2 rounded-full bg-amber-400" /> Tx: {latest?.netOutKB ?? 0} KB/s
							</span>
						</div>
					</CardHeader>
					<CardContent className="p-4 pt-1">
						<div className="h-[200px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<LineChart data={telemetryData || []}>
									<CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
									<XAxis
										dataKey="timestamp"
										tick={{ fill: "#71717a", fontSize: 10 }}
										stroke="#3f3f46"
									/>
									<YAxis
										tick={{ fill: "#71717a", fontSize: 10 }}
										stroke="#3f3f46"
										unit="KB/s"
									/>
									<Tooltip
										contentStyle={{
											backgroundColor: "#090a0d",
											borderColor: "#27272a",
											borderRadius: 8,
											fontSize: 12,
										}}
									/>
									<Line
										type="monotone"
										dataKey="netInKB"
										stroke="#a855f7"
										strokeWidth={2}
										dot={false}
										name="Ingress (Rx)"
									/>
									<Line
										type="monotone"
										dataKey="netOutKB"
										stroke="#f59e0b"
										strokeWidth={2}
										dot={false}
										name="Egress (Tx)"
									/>
								</LineChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Top Resource Consuming Containers Table */}
			<Card className="bg-card/60 border-border/70">
				<CardHeader className="p-4 border-b">
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-sm font-bold flex items-center gap-2">
								<Boxes className="h-4 w-4 text-emerald-400" />
								Top Resource-Consuming Containers
							</CardTitle>
							<CardDescription className="text-xs">
								Live CPU and Memory footprint across active containers
							</CardDescription>
						</div>
						<Badge variant="outline" className="text-xs font-mono">
							{containersData?.totalCount ?? 0} Containers Active
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="p-0">
					{isContainersLoading ? (
						<div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
							<Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading container metrics...
						</div>
					) : (containersData?.topCpu?.length ?? 0) === 0 ? (
						<div className="text-center py-8 text-xs text-muted-foreground">
							No running containers detected on this node/cluster.
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow className="border-border/60 hover:bg-transparent">
									<TableHead className="text-xs">Container Name</TableHead>
									<TableHead className="text-xs">CPU %</TableHead>
									<TableHead className="text-xs">Memory</TableHead>
									<TableHead className="text-xs">Network I/O</TableHead>
									<TableHead className="text-xs">Block I/O</TableHead>
									<TableHead className="text-xs text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{containersData?.topCpu.map((c) => (
									<TableRow key={c.ID} className="border-border/40 hover:bg-muted/30">
										<TableCell className="font-medium text-xs">
											<div className="flex items-center gap-2">
												<span className="h-2 w-2 rounded-full bg-emerald-500" />
												<span className="font-mono text-foreground font-bold">
													{c.Name?.replace(/^\//, "") || c.Container}
												</span>
											</div>
										</TableCell>
										<TableCell className="font-mono text-xs text-emerald-400 font-semibold">
											{c.CPUPerc || "0%"}
										</TableCell>
										<TableCell className="font-mono text-xs text-muted-foreground">
											{c.MemUsage || "0B"} ({c.MemPerc || "0%"})
										</TableCell>
										<TableCell className="font-mono text-xs text-muted-foreground">
											{c.NetIO || "0B / 0B"}
										</TableCell>
										<TableCell className="font-mono text-xs text-muted-foreground">
											{c.BlockIO || "0B / 0B"}
										</TableCell>
										<TableCell className="text-right">
											<Button
												variant="ghost"
												size="sm"
												className="h-7 text-xs gap-1 hover:text-amber-400"
												onClick={() => handleRestart(c.ID || c.Container)}
												disabled={isRestarting}
											>
												<RotateCw className="h-3 w-3" /> Restart
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
};
