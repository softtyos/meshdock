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
import { useTheme } from "next-themes";
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
	const { resolvedTheme } = useTheme();
	const isDark = resolvedTheme === "dark";

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
			toast.success(`Đã khởi động lại container ${containerId.slice(0, 10)}`);
			void utils.fleet.getFleetContainers.invalidate();
		} catch (err: any) {
			toast.error(err?.message || "Không thể khởi động lại container");
		}
	};

	const latest = telemetryData?.[telemetryData.length - 1];

	const chartGridColor = isDark ? "#27272a" : "#e2e8f0";
	const chartAxisTextColor = isDark ? "#71717a" : "#64748b";
	const chartAxisLineColor = isDark ? "#3f3f46" : "#cbd5e1";
	const tooltipStyle = {
		backgroundColor: isDark ? "#090a0d" : "#ffffff",
		borderColor: isDark ? "#27272a" : "#e2e8f0",
		color: isDark ? "#f8fafc" : "#0f172a",
		borderRadius: 8,
		fontSize: 12,
		boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
	};

	return (
		<div className="space-y-6">
			{/* Telemetry Header */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
				<div>
					<h3 className="text-base font-bold text-foreground flex items-center gap-2">
						<Activity className="h-4 w-4 text-emerald-400" />
						Biểu Đồ Telemetry Phần Cứng Thời Gian Thực
						<Badge
							variant="outline"
							className="text-[10px] border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
						>
							Real Metrics
						</Badge>
					</h3>
					<p className="text-xs text-muted-foreground mt-0.5">
						Nguồn dữ liệu phần cứng trực tiếp: {nodeName || "Local Controller (application.softty.net)"} • Chu kỳ lấy mẫu 10s
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
						<RefreshCw className="h-3.5 w-3.5" /> Làm mới số liệu
					</Button>
				</div>
			</div>

			{/* Telemetry Charts Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				{/* CPU Usage Chart */}
				<Card className="bg-card/60 border-border/60">
					<CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
						<div>
							<CardTitle className="text-sm font-semibold flex items-center gap-2">
								<Cpu className="h-4 w-4 text-emerald-400" /> Hiệu Suất CPU
							</CardTitle>
							<CardDescription className="text-xs">
								Tỷ lệ tải vi xử lý thực tế theo thời gian
							</CardDescription>
						</div>
						<div className="text-right">
							<span className="text-lg font-bold font-mono tabular-nums text-emerald-400">
								{latest?.cpu ?? "--"}%
							</span>
							<p className="text-[10px] text-muted-foreground uppercase">Tải hiện tại</p>
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
									<CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
									<XAxis
										dataKey="timestamp"
										tick={{ fill: chartAxisTextColor, fontSize: 10 }}
										stroke={chartAxisLineColor}
									/>
									<YAxis
										domain={[0, 100]}
										tick={{ fill: chartAxisTextColor, fontSize: 10 }}
										stroke={chartAxisLineColor}
										unit="%"
									/>
									<Tooltip contentStyle={tooltipStyle} />
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
				<Card className="bg-card/60 border-border/60">
					<CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
						<div>
							<CardTitle className="text-sm font-semibold flex items-center gap-2">
								<Zap className="h-4 w-4 text-cyan-400" /> Phân Bổ Bộ Nhớ RAM
							</CardTitle>
							<CardDescription className="text-xs">
								Dung lượng RAM thực tế đang cấp phát trên tổng dung lượng
							</CardDescription>
						</div>
						<div className="text-right">
							<span className="text-lg font-bold font-mono tabular-nums text-cyan-400">
								{latest?.memUsedGB ?? "--"} GB
							</span>
							<p className="text-[10px] text-muted-foreground uppercase">
								Trên {latest?.memTotalGB ?? "--"} GB ({latest?.memPerc ?? 0}%)
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
									<CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
									<XAxis
										dataKey="timestamp"
										tick={{ fill: chartAxisTextColor, fontSize: 10 }}
										stroke={chartAxisLineColor}
									/>
									<YAxis
										domain={[0, Math.ceil((latest?.memTotalGB || 8) * 1.05)]}
										tick={{ fill: chartAxisTextColor, fontSize: 10 }}
										stroke={chartAxisLineColor}
										unit="GB"
									/>
									<Tooltip contentStyle={tooltipStyle} />
									<Area
										type="monotone"
										dataKey="memUsedGB"
										stroke="#06b6d4"
										strokeWidth={2}
										fillOpacity={1}
										fill="url(#memGrad)"
										name="RAM đã dùng (GB)"
									/>
								</AreaChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>

				{/* Network In/Out Chart */}
				<Card className="bg-card/60 border-border/60 lg:col-span-2">
					<CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
						<div>
							<CardTitle className="text-sm font-semibold flex items-center gap-2">
								<Activity className="h-4 w-4 text-purple-400" /> Băng Thông Mạng (Network I/O)
							</CardTitle>
							<CardDescription className="text-xs">
								Lưu lượng nhận vào (Rx) và truyền ra (Tx) theo thời gian thực
							</CardDescription>
						</div>
						<div className="flex items-center gap-4 text-xs font-mono tabular-nums">
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
									<CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
									<XAxis
										dataKey="timestamp"
										tick={{ fill: chartAxisTextColor, fontSize: 10 }}
										stroke={chartAxisLineColor}
									/>
									<YAxis
										tick={{ fill: chartAxisTextColor, fontSize: 10 }}
										stroke={chartAxisLineColor}
										unit="KB/s"
									/>
									<Tooltip contentStyle={tooltipStyle} />
									<Line
										type="monotone"
										dataKey="netInKB"
										stroke="#a855f7"
										strokeWidth={2}
										dot={false}
										name="Nhận vào (Rx KB/s)"
									/>
									<Line
										type="monotone"
										dataKey="netOutKB"
										stroke="#f59e0b"
										strokeWidth={2}
										dot={false}
										name="Truyền ra (Tx KB/s)"
									/>
								</LineChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Top Resource Consuming Containers Table */}
			<Card className="bg-card/60 border-border/60">
				<CardHeader className="p-4 border-b border-border/60">
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-sm font-bold flex items-center gap-2">
								<Boxes className="h-4 w-4 text-emerald-400" />
								Top Container Tiêu Thụ Tài Nguyên Cao Nhất
							</CardTitle>
							<CardDescription className="text-xs">
								Thống kê trực tiếp CPU, RAM và I/O của các container đang hoạt động
							</CardDescription>
						</div>
						<Badge variant="outline" className="text-xs font-mono">
							{containersData?.totalCount ?? 0} Container đang chạy
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="p-0">
					{isContainersLoading ? (
						<div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
							<Loader2 className="h-4 w-4 animate-spin mr-2" /> Đang tải chỉ số container...
						</div>
					) : (containersData?.topCpu?.length ?? 0) === 0 ? (
						<div className="text-center py-8 text-xs text-muted-foreground">
							Không có container nào đang chạy trên node này.
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow className="border-border/60 hover:bg-transparent">
									<TableHead className="text-xs">Tên Container</TableHead>
									<TableHead className="text-xs">CPU %</TableHead>
									<TableHead className="text-xs">Bộ nhớ RAM</TableHead>
									<TableHead className="text-xs">Network I/O</TableHead>
									<TableHead className="text-xs">Block I/O</TableHead>
									<TableHead className="text-xs text-right">Thao tác</TableHead>
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
										<TableCell className="font-mono tabular-nums text-xs text-emerald-400 font-semibold">
											{c.CPUPerc || "0%"}
										</TableCell>
										<TableCell className="font-mono tabular-nums text-xs text-muted-foreground">
											{c.MemUsage || "0B"} ({c.MemPerc || "0%"})
										</TableCell>
										<TableCell className="font-mono tabular-nums text-xs text-muted-foreground">
											{c.NetIO || "0B / 0B"}
										</TableCell>
										<TableCell className="font-mono tabular-nums text-xs text-muted-foreground">
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
												<RotateCw className="h-3 w-3" /> Khởi động lại
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
