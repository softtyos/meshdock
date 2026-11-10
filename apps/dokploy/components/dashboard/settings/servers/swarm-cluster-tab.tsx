import { useState } from "react";
import {
	AlertCircle,
	Boxes,
	Check,
	CheckCircle2,
	Copy,
	HelpCircle,
	Loader2,
	MoreHorizontal,
	Play,
	Power,
	RefreshCw,
	Server,
	ShieldCheck,
	Zap,
} from "lucide-react";
import { toast } from "sonner";
import { DateTooltip } from "@/components/shared/date-tooltip";
import { DialogAction } from "@/components/shared/dialog-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/utils/api";
import { AddNode } from "../cluster/nodes/add-node";
import { ShowNodeData } from "../cluster/nodes/show-node-data";

interface Props {
	serverId?: string;
}

export const SwarmClusterTab = ({ serverId }: Props) => {
	const [copiedWorker, setCopiedWorker] = useState(false);
	const [copiedManager, setCopiedManager] = useState(false);
	const [showManagerJoin, setShowManagerJoin] = useState(false);

	const {
		data: nodes,
		isPending: isNodesPending,
		refetch: refetchNodes,
	} = api.cluster.getNodes.useQuery(
		{ serverId },
		{ refetchInterval: 10000 },
	);

	const {
		data: agentStatus,
		isPending: isAgentPending,
		refetch: refetchAgent,
	} = api.cluster.getGlobalAgentStatus.useQuery(
		{ serverId },
		{ refetchInterval: 10000 },
	);

	const { data: workerJoin } = api.cluster.addWorker.useQuery({ serverId });
	const { data: managerJoin } = api.cluster.addManager.useQuery({ serverId });
	const { data: permissions } = api.user.getPermissions.useQuery();

	const { mutateAsync: deployAgent, isPending: isDeployingAgent } =
		api.cluster.deployGlobalAgent.useMutation();
	const { mutateAsync: deleteNode } = api.cluster.removeWorker.useMutation();
	const { mutateAsync: setAvailability } =
		api.cluster.setNodeAvailability.useMutation();

	const handleCopy = (text: string, isWorker: boolean) => {
		navigator.clipboard.writeText(text);
		if (isWorker) {
			setCopiedWorker(true);
			setTimeout(() => setCopiedWorker(false), 2000);
		} else {
			setCopiedManager(true);
			setTimeout(() => setCopiedManager(false), 2000);
		}
		toast.success("Đã sao chép lệnh join Swarm");
	};

	const handleDeployGlobalAgent = async () => {
		try {
			await deployAgent({ serverId });
			toast.success(
				"Meshdock Global Agent đã được triển khai thành công lên Swarm (mode: global)!",
			);
			refetchAgent();
		} catch (err: any) {
			toast.error(`Lỗi triển khai Agent: ${err?.message ?? err}`);
		}
	};

	const handleToggleAvailability = async (
		nodeId: string,
		current: "active" | "pause" | "drain",
	) => {
		const target = current === "active" ? "drain" : "active";
		try {
			await setAvailability({
				nodeId,
				availability: target,
				serverId,
			});
			toast.success(
				`Đã đổi trạng thái node sang: ${target.toUpperCase()}`,
			);
			refetchNodes();
		} catch (err: any) {
			toast.error(`Lỗi cập nhật trạng thái node: ${err?.message ?? err}`);
		}
	};

	const isGlobalMode = agentStatus?.mode === "global";
	const activeCount = agentStatus?.runningNodes ?? 0;
	const totalCount = nodes?.length ?? agentStatus?.totalNodes ?? 0;

	return (
		<div className="space-y-6">
			{/* Swarm Global Agent Banner */}
			<Card className="border-border/60 bg-gradient-to-r from-emerald-500/10 via-background to-blue-500/5">
				<CardHeader className="pb-3">
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
						<div className="flex items-center gap-3">
							<div className="size-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center border border-emerald-500/30">
								<Zap className="size-5" />
							</div>
							<div>
								<div className="flex items-center gap-2">
									<CardTitle className="text-lg font-bold">
										Meshdock Swarm Global Agent
									</CardTitle>
									<Badge
										variant={isGlobalMode ? "default" : "secondary"}
										className={
											isGlobalMode
												? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30"
												: ""
										}
									>
										{isGlobalMode ? "Auto-Agent (mode: global)" : "Chưa kích hoạt Global"}
									</Badge>
								</div>
								<CardDescription className="text-xs sm:text-sm mt-0.5">
									Cơ chế tương tự Portainer Agent: Bất kỳ node nào tham gia Swarm sẽ tự động được cấp phát Agent mà không cần SSH thủ công.
								</CardDescription>
							</div>
						</div>

						<div className="flex items-center gap-2 w-full sm:w-auto">
							<Button
								size="sm"
								variant={isGlobalMode ? "outline" : "default"}
								onClick={handleDeployGlobalAgent}
								disabled={isDeployingAgent}
								className="gap-2 w-full sm:w-auto"
							>
								{isDeployingAgent ? (
									<Loader2 className="size-4 animate-spin" />
								) : (
									<RefreshCw className="size-4" />
								)}
								<span>
									{isGlobalMode ? "Cập nhật Global Agent" : "Kích hoạt Global Agent"}
								</span>
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent className="pt-0">
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
						<div className="p-2.5 rounded-lg border bg-background/50 flex items-center justify-between">
							<span className="text-muted-foreground">Trạng thái Agent:</span>
							<span className="font-semibold flex items-center gap-1.5">
								{agentStatus?.isDeployed ? (
									<>
										<span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
										Đang chạy ({activeCount}/{totalCount} node)
									</>
								) : (
									<>
										<span className="size-2 rounded-full bg-amber-500" />
										Chưa khởi tạo
									</>
								)}
							</span>
						</div>
						<div className="p-2.5 rounded-lg border bg-background/50 flex items-center justify-between">
							<span className="text-muted-foreground">Chế độ phân bổ:</span>
							<span className="font-semibold text-primary">
								{isGlobalMode ? "Global (1 replica / node)" : "Replicated"}
							</span>
						</div>
						<div className="p-2.5 rounded-lg border bg-background/50 flex items-center justify-between">
							<span className="text-muted-foreground">Tổng số node Swarm:</span>
							<span className="font-semibold">{totalCount} node</span>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Join Swarm Quick Onboarding */}
			<Card className="border-border/60">
				<CardHeader className="pb-3">
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
						<div>
							<CardTitle className="text-base flex items-center gap-2">
								<Boxes className="size-5 text-primary" />
								<span>Lệnh tự động kết nối Node (Worker Join)</span>
							</CardTitle>
							<CardDescription className="text-xs mt-1">
								Chạy lệnh bên dưới trên bất kỳ máy chủ VPS nào để gia nhập Swarm. Agent sẽ tự động khởi chạy tức thì.
							</CardDescription>
						</div>
						<Button
							variant="ghost"
							size="sm"
							className="text-xs text-muted-foreground"
							onClick={() => setShowManagerJoin(!showManagerJoin)}
						>
							{showManagerJoin ? "Ẩn lệnh Manager Join" : "Hiện lệnh Manager Join (HA)"}
						</Button>
					</div>
				</CardHeader>
				<CardContent className="space-y-3">
					{workerJoin?.command ? (
						<div className="relative group">
							<pre className="p-3.5 pr-24 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-zinc-800">
								<code>{workerJoin.command}</code>
							</pre>
							<Button
								size="sm"
								variant="secondary"
								className="absolute top-2 right-2 h-7 px-2.5 text-xs gap-1.5"
								onClick={() => handleCopy(workerJoin.command, true)}
							>
								{copiedWorker ? (
									<>
										<Check className="size-3.5 text-emerald-500" />
										<span>Đã copy</span>
									</>
								) : (
									<>
										<Copy className="size-3.5" />
										<span>Copy</span>
									</>
								)}
							</Button>
						</div>
					) : (
						<div className="text-xs text-muted-foreground flex items-center gap-2 p-3 bg-muted/40 rounded-lg">
							<Loader2 className="size-4 animate-spin" />
							<span>Đang tạo join token cho Swarm...</span>
						</div>
					)}

					{showManagerJoin && managerJoin?.command && (
						<div className="pt-2 border-t space-y-1.5">
							<span className="text-xs font-semibold text-muted-foreground">
								Lệnh gia nhập Manager Node (Quản trị & Dự phòng HA):
							</span>
							<div className="relative group">
								<pre className="p-3.5 pr-24 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-zinc-800">
									<code>{managerJoin.command}</code>
								</pre>
								<Button
									size="sm"
									variant="secondary"
									className="absolute top-2 right-2 h-7 px-2.5 text-xs gap-1.5"
									onClick={() => handleCopy(managerJoin.command, false)}
								>
									{copiedManager ? (
										<>
											<Check className="size-3.5 text-emerald-500" />
											<span>Đã copy</span>
										</>
									) : (
										<>
											<Copy className="size-3.5" />
											<span>Copy</span>
										</>
									)}
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Swarm Live Nodes Table */}
			<Card className="border-border/60">
				<CardHeader className="flex flex-row items-center justify-between pb-3">
					<div>
						<CardTitle className="text-base flex items-center gap-2">
							<Server className="size-5 text-muted-foreground" />
							<span>Danh sách Node trong Cụm Swarm</span>
							<Badge variant="outline" className="ml-1 text-xs">
								{nodes?.length || 0} node
							</Badge>
						</CardTitle>
						<CardDescription className="text-xs mt-1">
							Quản lý vai trò, trạng thái vận hành và lưu lượng của từng node.
						</CardDescription>
					</div>

					<div className="flex items-center gap-2">
						{permissions?.server.create && <AddNode serverId={serverId} />}
						<Button
							variant="outline"
							size="icon"
							className="size-8"
							onClick={() => refetchNodes()}
							title="Làm mới danh sách node"
						>
							<RefreshCw className="size-4" />
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{isNodesPending ? (
						<div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
							<Loader2 className="size-6 animate-spin text-primary" />
							<span className="text-xs">Đang tải danh sách node Swarm...</span>
						</div>
					) : !nodes || nodes.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
							<AlertCircle className="size-8 text-amber-500" />
							<div>
								<p className="text-sm font-semibold">Chưa tìm thấy node Swarm nào</p>
								<p className="text-xs text-muted-foreground">
									Hãy chạy lệnh Worker Join ở trên trên máy chủ để tham gia cụm.
								</p>
							</div>
						</div>
					) : (
						<div className="rounded-lg border overflow-hidden">
							<Table>
								<TableHeader>
									<TableRow className="bg-muted/40">
										<TableHead className="text-left font-semibold">Hostname</TableHead>
										<TableHead className="text-center font-semibold">Vai trò</TableHead>
										<TableHead className="text-center font-semibold">Trạng thái</TableHead>
										<TableHead className="text-center font-semibold">Khả dụng</TableHead>
										<TableHead className="text-center font-semibold">Engine Version</TableHead>
										<TableHead className="text-center font-semibold">Thời điểm tạo</TableHead>
										<TableHead className="text-right font-semibold">Thao tác</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{nodes.map((node) => {
										const isManager = node.Spec.Role === "manager";
										const isLeader = !!node.ManagerStatus?.Leader;
										const isReady = node.Status.State === "ready";
										const isDrain = node.Spec.Availability === "drain";

										return (
											<TableRow key={node.ID} className="hover:bg-muted/30">
												<TableCell className="font-mono text-xs">
													<div className="flex items-center gap-2">
														<span className="font-medium text-foreground">
															{node.Description.Hostname}
														</span>
														{isLeader && (
															<Badge
																variant="default"
																className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
															>
																Leader
															</Badge>
														)}
													</div>
													<span className="text-[10px] text-muted-foreground">
														{node.ID.substring(0, 12)}
													</span>
												</TableCell>

												<TableCell className="text-center">
													<Badge
														variant={isManager ? "default" : "secondary"}
														className="text-xs"
													>
														{node.Spec.Role}
													</Badge>
												</TableCell>

												<TableCell className="text-center">
													<Badge
														variant="outline"
														className={
															isReady
																? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
																: "bg-destructive/10 text-destructive border-destructive/20"
														}
													>
														{node.Status.State}
													</Badge>
												</TableCell>

												<TableCell className="text-center">
													<Badge
														variant={isDrain ? "destructive" : "outline"}
														className="text-xs"
													>
														{node.Spec.Availability}
													</Badge>
												</TableCell>

												<TableCell className="text-center text-xs text-muted-foreground font-mono">
													{node.Description.Engine.EngineVersion}
												</TableCell>

												<TableCell className="text-center text-xs text-muted-foreground">
													<DateTooltip date={node.CreatedAt} className="text-xs">
														{new Date(node.CreatedAt).toLocaleDateString()}
													</DateTooltip>
												</TableCell>

												<TableCell className="text-right">
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button variant="ghost" size="icon" className="size-8">
																<MoreHorizontal className="size-4" />
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end" className="w-48">
															<DropdownMenuLabel>Node Actions</DropdownMenuLabel>
															<ShowNodeData data={node} />
															<DropdownMenuSeparator />

															{permissions?.server.terminal && (
																<DropdownMenuItem
																	onClick={() =>
																		handleToggleAvailability(
																			node.ID,
																			node.Spec.Availability as any,
																		)
																	}
																>
																	{isDrain ? (
																		<>
																			<Play className="size-4 mr-2 text-emerald-500" />
																			<span>Kích hoạt (Active)</span>
																		</>
																	) : (
																		<>
																			<Power className="size-4 mr-2 text-amber-500" />
																			<span>Bảo trì (Drain)</span>
																		</>
																	)}
																</DropdownMenuItem>
															)}

															{!isLeader && permissions?.server.delete && (
																<DialogAction
																	title="Xóa node khỏi Swarm"
																	description={`Bạn có chắc chắn muốn ngắt kết nối và xóa node "${node.Description.Hostname}" khỏi cụm cluster không?`}
																	type="destructive"
																	onClick={async () => {
																		try {
																			await deleteNode({
																				nodeId: node.ID,
																				serverId,
																			});
																			refetchNodes();
																			toast.success("Đã xóa node thành công");
																		} catch {
																			toast.error("Lỗi khi xóa node");
																		}
																	}}
																>
																	<DropdownMenuItem
																		className="text-destructive focus:text-destructive"
																		onSelect={(e) => e.preventDefault()}
																	>
																		Xóa node khỏi cụm
																	</DropdownMenuItem>
																</DialogAction>
															)}
														</DropdownMenuContent>
													</DropdownMenu>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
};
