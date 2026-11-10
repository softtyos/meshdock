import {
	Activity,
	AlertCircle,
	ArrowDownUp,
	Boxes,
	CheckCircle2,
	Clock,
	Cpu,
	Database,
	HardDrive,
	Loader2,
	MoreHorizontal,
	Network,
	Play,
	RefreshCw,
	RotateCw,
	Search,
	Square,
	Terminal,
	Zap,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { ContainerVitalItem } from "@dokploy/server";
import { api } from "@/utils/api";
import { ContainerLogsModal } from "./container-logs-modal";

interface Props {
	containers: ContainerVitalItem[];
	isLoading?: boolean;
	serverId?: string | null;
	onRefresh?: () => void;
}

export const ContainerVitalsTable = ({
	containers,
	isLoading,
	serverId,
	onRefresh,
}: Props) => {
	const [search, setSearch] = useState("");
	const [activeFilter, setActiveFilter] = useState<
		"all" | "running" | "stopped" | "unhealthy" | "topCpu" | "topMem" | "topSize"
	>("all");
	const [selectedLogContainer, setSelectedLogContainer] = useState<{
		id: string;
		name: string;
	} | null>(null);

	const { mutateAsync: restartContainer, isPending: isRestarting } =
		api.vitals.restartContainer.useMutation();
	const { mutateAsync: stopContainer, isPending: isStopping } =
		api.vitals.stopContainer.useMutation();
	const { mutateAsync: startContainer, isPending: isStarting } =
		api.vitals.startContainer.useMutation();

	const handleRestart = async (containerId: string, name: string) => {
		try {
			await restartContainer({ containerId, serverId });
			toast.success(`Đã khởi động lại container ${name}`);
			if (onRefresh) onRefresh();
		} catch (err: any) {
			toast.error(`Lỗi restart container: ${err?.message || err}`);
		}
	};

	const handleTogglePower = async (
		containerId: string,
		name: string,
		currentState: string,
	) => {
		try {
			if (currentState === "running") {
				await stopContainer({ containerId, serverId });
				toast.success(`Đã dừng container ${name}`);
			} else {
				await startContainer({ containerId, serverId });
				toast.success(`Đã bật container ${name}`);
			}
			if (onRefresh) onRefresh();
		} catch (err: any) {
			toast.error(`Lỗi thao tác: ${err?.message || err}`);
		}
	};

	// Metrics counters
	const runningCount = containers.filter((c) => c.state === "running").length;
	const stoppedCount = containers.filter((c) => c.state !== "running").length;
	const unhealthyCount = containers.filter((c) => c.health === "unhealthy").length;

	// Filter and Sort
	const filteredContainers = useMemo(() => {
		let list = [...containers];
		const q = search.toLowerCase().trim();

		if (q) {
			list = list.filter(
				(c) =>
					c.name.toLowerCase().includes(q) ||
					c.displayName.toLowerCase().includes(q) ||
					c.image.toLowerCase().includes(q) ||
					c.id.toLowerCase().includes(q),
			);
		}

		if (activeFilter === "running") {
			list = list.filter((c) => c.state === "running");
		} else if (activeFilter === "stopped") {
			list = list.filter((c) => c.state !== "running");
		} else if (activeFilter === "unhealthy") {
			list = list.filter((c) => c.health === "unhealthy");
		} else if (activeFilter === "topCpu") {
			list.sort((a, b) => b.cpuPerc - a.cpuPerc);
		} else if (activeFilter === "topMem") {
			list.sort((a, b) => b.memPerc - a.memPerc);
		} else if (activeFilter === "topSize") {
			list.sort((a, b) => {
				const aBytes = a.size.includes("GB") ? 1000 : 1;
				const bBytes = b.size.includes("GB") ? 1000 : 1;
				return bBytes - aBytes;
			});
		}

		return list;
	}, [containers, search, activeFilter]);

	return (
		<Card className="border-border/70 shadow-sm">
			<CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-3 gap-4">
				<div>
					<CardTitle className="text-base flex items-center gap-2">
						<Boxes className="size-5 text-emerald-500" />
						<span>Chi tiết Vitals Ứng dụng & Toàn bộ Containers</span>
						<Badge variant="outline" className="text-xs ml-1 font-mono">
							{containers.length} containers
						</Badge>
					</CardTitle>
					<CardDescription className="text-xs mt-0.5">
						Theo dõi chính xác CPU, RAM, dung lượng đĩa Writable/Virtual và trạng thái Healthcheck của từng container.
					</CardDescription>
				</div>

				<div className="flex items-center gap-2">
					<div className="relative w-full sm:w-64">
						<Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
						<Input
							placeholder="Tìm container, image, service..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="pl-8 h-8 text-xs bg-background"
						/>
					</div>
					{onRefresh && (
						<Button
							variant="outline"
							size="icon"
							className="size-8"
							onClick={onRefresh}
							title="Làm mới ma trận containers"
						>
							<RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
						</Button>
					)}
				</div>
			</CardHeader>

			{/* Filter Pills */}
			<div className="px-6 py-2 border-b bg-muted/20 flex flex-wrap items-center gap-1.5 text-xs">
				<Button
					size="sm"
					variant={activeFilter === "all" ? "default" : "ghost"}
					className="h-7 text-xs px-2.5"
					onClick={() => setActiveFilter("all")}
				>
					Tất cả ({containers.length})
				</Button>
				<Button
					size="sm"
					variant={activeFilter === "running" ? "default" : "ghost"}
					className="h-7 text-xs px-2.5 gap-1.5"
					onClick={() => setActiveFilter("running")}
				>
					<span className="size-1.5 rounded-full bg-emerald-500" />
					<span>Đang chạy ({runningCount})</span>
				</Button>
				<Button
					size="sm"
					variant={activeFilter === "stopped" ? "default" : "ghost"}
					className="h-7 text-xs px-2.5 gap-1.5"
					onClick={() => setActiveFilter("stopped")}
				>
					<span className="size-1.5 rounded-full bg-zinc-400" />
					<span>Đã dừng ({stoppedCount})</span>
				</Button>
				{unhealthyCount > 0 && (
					<Button
						size="sm"
						variant={activeFilter === "unhealthy" ? "destructive" : "ghost"}
						className="h-7 text-xs px-2.5 gap-1.5 text-rose-500"
						onClick={() => setActiveFilter("unhealthy")}
					>
						<AlertCircle className="size-3.5" />
						<span>Lỗi / Unhealthy ({unhealthyCount})</span>
					</Button>
				)}
				<div className="h-4 w-px bg-border/60 mx-1 hidden sm:block" />
				<Button
					size="sm"
					variant={activeFilter === "topCpu" ? "secondary" : "ghost"}
					className="h-7 text-xs px-2 gap-1"
					onClick={() => setActiveFilter("topCpu")}
				>
					<Zap className="size-3 text-amber-500" />
					<span>Top CPU</span>
				</Button>
				<Button
					size="sm"
					variant={activeFilter === "topMem" ? "secondary" : "ghost"}
					className="h-7 text-xs px-2 gap-1"
					onClick={() => setActiveFilter("topMem")}
				>
					<Activity className="size-3 text-blue-500" />
					<span>Top RAM</span>
				</Button>
			</div>

			<CardContent className="p-0">
				{isLoading && containers.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
						<Loader2 className="size-6 animate-spin text-emerald-500" />
						<span className="text-xs">Đang nạp ma trận tài nguyên containers...</span>
					</div>
				) : filteredContainers.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground text-xs">
						Không tìm thấy container nào phù hợp với bộ lọc.
					</div>
				) : (
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
									<TableHead className="text-left font-semibold">Container / Ứng dụng</TableHead>
									<TableHead className="text-center font-semibold">Sức khỏe & Trạng thái</TableHead>
									<TableHead className="text-left font-semibold">Tải CPU</TableHead>
									<TableHead className="text-left font-semibold">Bộ nhớ RAM</TableHead>
									<TableHead className="text-left font-semibold">Dung lượng Đĩa (Size)</TableHead>
									<TableHead className="text-left font-semibold">Mạng & Disk I/O</TableHead>
									<TableHead className="text-right font-semibold">Thao tác</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredContainers.map((item) => {
									const isRunning = item.state === "running";

									const getHealthBadge = () => {
										if (item.health === "healthy") {
											return (
												<Badge
													variant="outline"
													className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] inline-flex items-center gap-1 font-medium"
												>
													<span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
													<span>Healthy</span>
												</Badge>
											);
										}
										if (item.health === "unhealthy") {
											return (
												<Badge
													variant="destructive"
													className="text-[10px] inline-flex items-center gap-1 font-medium"
												>
													<AlertCircle className="size-3" />
													<span>Unhealthy</span>
												</Badge>
											);
										}
										if (item.health === "starting") {
											return (
												<Badge
													variant="outline"
													className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] inline-flex items-center gap-1 font-medium"
												>
													<span className="size-1.5 rounded-full bg-amber-500" />
													<span>Starting</span>
												</Badge>
											);
										}
										return (
											<Badge
												variant={isRunning ? "secondary" : "outline"}
												className="text-[10px] font-medium"
											>
												{item.state}
											</Badge>
										);
									};

									return (
										<TableRow key={item.fullId} className="hover:bg-muted/30 text-xs">
											{/* Column 1: Container / Service */}
											<TableCell className="max-w-[260px]">
												<div className="flex items-center gap-2.5">
													<div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
														<Boxes className="size-4 text-muted-foreground" />
													</div>
													<div className="min-w-0">
														<div className="flex items-center gap-1.5">
															<span className="font-semibold text-foreground truncate block">
																{item.displayName}
															</span>
															{item.isSystem && (
																<Badge
																	variant="secondary"
																	className="text-[9px] px-1 py-0 h-3.5 bg-muted-foreground/15"
																>
																	Core
																</Badge>
															)}
														</div>
														<p
															className="text-[11px] font-mono text-muted-foreground truncate"
															title={item.name}
														>
															{item.id} • {item.image}
														</p>
													</div>
												</div>
											</TableCell>

											{/* Column 2: Health & Status */}
											<TableCell className="text-center whitespace-nowrap">
												<div className="flex flex-col items-center gap-1">
													{getHealthBadge()}
													<span className="text-[10px] text-muted-foreground truncate max-w-[130px]" title={item.status}>
														{item.status}
													</span>
												</div>
											</TableCell>

											{/* Column 3: CPU Usage */}
											<TableCell>
												{isRunning ? (
													<div className="space-y-1 min-w-[110px]">
														<div className="flex items-center justify-between text-xs font-mono">
															<span className="font-semibold">{item.cpuRaw}</span>
														</div>
														<Progress
															value={Math.min(100, item.cpuPerc)}
															className="h-1.5"
														/>
													</div>
												) : (
													<span className="text-muted-foreground text-xs font-mono">—</span>
												)}
											</TableCell>

											{/* Column 4: Memory Usage */}
											<TableCell>
												{isRunning ? (
													<div className="space-y-1 min-w-[130px]">
														<div className="flex items-center justify-between text-xs font-mono">
															<span className="font-semibold">{item.memPerc.toFixed(1)}%</span>
														</div>
														<Progress
															value={Math.min(100, item.memPerc)}
															className="h-1.5"
														/>
														<span className="text-[10px] text-muted-foreground font-mono block truncate" title={item.memUsage}>
															{item.memUsage}
														</span>
													</div>
												) : (
													<span className="text-muted-foreground text-xs font-mono">—</span>
												)}
											</TableCell>

											{/* Column 5: Disk Size */}
											<TableCell className="font-mono text-xs whitespace-nowrap">
												<div className="space-y-0.5">
													<div className="flex items-center gap-1">
														<span className="text-muted-foreground text-[10px]">Writable:</span>
														<span className="font-semibold text-foreground">{item.sizeWritable}</span>
													</div>
													<div className="flex items-center gap-1">
														<span className="text-muted-foreground text-[10px]">Virtual:</span>
														<span className="text-muted-foreground">{item.sizeVirtual}</span>
													</div>
												</div>
											</TableCell>

											{/* Column 6: Network & Block I/O */}
											<TableCell className="font-mono text-[11px] whitespace-nowrap">
												<div className="space-y-0.5 text-muted-foreground">
													<p>Net: <span className="text-foreground">{item.netIo}</span></p>
													<p>Disk: <span className="text-foreground">{item.blockIo}</span></p>
												</div>
											</TableCell>

											{/* Column 7: Actions */}
											<TableCell className="text-right whitespace-nowrap">
												<div className="flex items-center justify-end gap-1">
													<Button
														size="icon"
														variant="ghost"
														className="size-7"
														title="Xem Logs trực tiếp"
														onClick={() =>
															setSelectedLogContainer({
																id: item.fullId,
																name: item.displayName,
															})
														}
													>
														<Terminal className="size-3.5 text-emerald-500" />
													</Button>

													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button size="icon" variant="ghost" className="size-7">
																<MoreHorizontal className="size-3.5" />
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end" className="w-44">
															<DropdownMenuLabel className="text-xs">
																Thao tác Container
															</DropdownMenuLabel>
															<DropdownMenuSeparator />
															<DropdownMenuItem
																className="text-xs gap-2 cursor-pointer"
																onClick={() => handleRestart(item.fullId, item.displayName)}
																disabled={isRestarting}
															>
																<RotateCw className="size-3.5 text-emerald-500" />
																<span>Khởi động lại (Restart)</span>
															</DropdownMenuItem>

															<DropdownMenuItem
																className="text-xs gap-2 cursor-pointer"
																onClick={() =>
																	handleTogglePower(item.fullId, item.displayName, item.state)
																}
																disabled={isStopping || isStarting}
															>
																{isRunning ? (
																	<>
																		<Square className="size-3.5 text-rose-500" />
																		<span>Dừng (Stop)</span>
																	</>
																) : (
																	<>
																		<Play className="size-3.5 text-emerald-500" />
																		<span>Bật (Start)</span>
																	</>
																)}
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												</div>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>
				)}
			</CardContent>

			{/* Container Logs Modal */}
			<ContainerLogsModal
				containerId={selectedLogContainer?.id || null}
				containerName={selectedLogContainer?.name || ""}
				serverId={serverId}
				onClose={() => setSelectedLogContainer(null)}
			/>
		</Card>
	);
};
