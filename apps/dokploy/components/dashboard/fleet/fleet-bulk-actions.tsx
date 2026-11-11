import {
	Activity,
	AlertTriangle,
	CheckCircle2,
	Layers,
	Loader2,
	RefreshCw,
	Sparkles,
	Trash2,
	Zap,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/utils/api";

export const FleetBulkActions = () => {
	const utils = api.useUtils();
	const [isOpen, setIsOpen] = useState(false);
	const [activeAction, setActiveAction] = useState<"none" | "clean" | "restart">("none");
	const [cleanSummary, setCleanSummary] = useState<any>(null);
	const [restartSummary, setRestartSummary] = useState<any>(null);

	const cleanMutation = api.fleet.bulkCleanDockerCache.useMutation({
		onSuccess: (data) => {
			setCleanSummary(data);
			toast.success(
				`Đã dọn dẹp Docker cache thành công trên ${data.successCount}/${data.totalNodes} máy chủ!`,
			);
			utils.fleet.getFleetOverview.invalidate();
		},
		onError: (err) => {
			toast.error(`Thao tác thất bại: ${err.message}`);
		},
	});

	const restartMutation = api.fleet.bulkRestartOverloadedServices.useMutation({
		onSuccess: (data) => {
			setRestartSummary(data);
			if (data.restartedCount > 0) {
				toast.success(
					`Đã khởi động lại ${data.restartedCount} dịch vụ quá tải/lỗi thành công!`,
				);
			} else {
				toast.info(
					"Toàn bộ dịch vụ trong cụm đều đang hoạt động ổn định (không có dịch vụ nào quá tải hay lỗi).",
				);
			}
			utils.fleet.getFleetOverview.invalidate();
			utils.fleet.getFleetContainers.invalidate();
		},
		onError: (err) => {
			toast.error(`Thao tác thất bại: ${err.message}`);
		},
	});

	const handleExecuteClean = async () => {
		setActiveAction("clean");
		setCleanSummary(null);
		try {
			await cleanMutation.mutateAsync();
		} finally {
			setActiveAction("none");
		}
	};

	const handleExecuteRestart = async () => {
		setActiveAction("restart");
		setRestartSummary(null);
		try {
			await restartMutation.mutateAsync();
		} finally {
			setActiveAction("none");
		}
	};

	const isBusy = cleanMutation.isPending || restartMutation.isPending;

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="gap-1.5 h-9 border-border/80 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all text-foreground"
				>
					<Sparkles className="h-3.5 w-3.5 text-emerald-400" />
					<span className="font-medium">Thao tác Cụm (Bulk)</span>
				</Button>
			</DialogTrigger>

			<DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<div className="flex items-center gap-2 mb-1">
						<div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
							<Layers className="size-4" />
						</div>
						<DialogTitle className="text-lg font-bold">
							Thao tác Hàng Loạt Toàn Cụm (Bulk Fleet Actions)
						</DialogTitle>
					</div>
					<DialogDescription>
						Thực thi các tác vụ tối ưu hóa và bảo trì đồng thời trên toàn bộ các node máy chủ (Controller + Swarm Workers + VPS).
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-3">
					{/* Action 1: Bulk Clean Docker Cache */}
					<div className="p-4 rounded-xl border border-border/70 bg-card/60 space-y-3">
						<div className="flex items-start justify-between gap-3">
							<div className="flex items-center gap-2.5">
								<div className="size-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
									<Trash2 className="size-4" />
								</div>
								<div>
									<h4 className="text-sm font-semibold text-foreground">
										Dọn dẹp Docker Build Cache Toàn Cụm
									</h4>
									<p className="text-xs text-muted-foreground mt-0.5">
										Giải phóng dung lượng ổ cứng bằng cách xóa sạch cache build thừa, dangling layers trên tất cả các node máy chủ.
									</p>
								</div>
							</div>

							<Button
								variant="outline"
								size="sm"
								onClick={handleExecuteClean}
								disabled={isBusy}
								className="shrink-0 gap-1.5 border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 h-8"
							>
								{cleanMutation.isPending && activeAction === "clean" ? (
									<>
										<Loader2 className="size-3.5 animate-spin" />
										<span>Đang dọn dẹp...</span>
									</>
								) : (
									<>
										<Sparkles className="size-3.5" />
										<span>Dọn dẹp ngay</span>
									</>
								)}
							</Button>
						</div>

						{/* Clean Results Display */}
						{cleanSummary && (
							<div className="mt-3 pt-3 border-t border-border/40 space-y-2">
								<div className="flex items-center justify-between text-xs">
									<span className="font-semibold text-foreground">Kết quả thực thi:</span>
									<Badge
										variant="outline"
										className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
									>
										Thành công {cleanSummary.successCount}/{cleanSummary.totalNodes} node
									</Badge>
								</div>
								<div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
									{cleanSummary.results.map((r: any, idx: number) => (
										<div
											key={idx}
											className="flex items-center justify-between p-2 rounded-lg bg-background/60 border border-border/40 text-[11px]"
										>
											<div className="flex items-center gap-1.5 truncate mr-2">
												{r.success ? (
													<CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
												) : (
													<AlertTriangle className="size-3.5 text-rose-500 shrink-0" />
												)}
												<span className="font-medium text-foreground truncate">
													{r.name}
												</span>
											</div>
											<span className="text-muted-foreground truncate shrink-0">
												{r.message}
											</span>
										</div>
									))}
								</div>
							</div>
						)}
					</div>

					{/* Action 2: Bulk Restart Overloaded Services */}
					<div className="p-4 rounded-xl border border-border/70 bg-card/60 space-y-3">
						<div className="flex items-start justify-between gap-3">
							<div className="flex items-center gap-2.5">
								<div className="size-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
									<RefreshCw className="size-4" />
								</div>
								<div>
									<h4 className="text-sm font-semibold text-foreground">
										Khởi Động Lại Dịch Vụ Quá Tải / Bị Lỗi
									</h4>
									<p className="text-xs text-muted-foreground mt-0.5">
										Tự động rà soát CPU cao (&gt;85%) hoặc container trạng thái crash/unhealthy trên toàn cụm để kích hoạt rolling restart an toàn.
									</p>
								</div>
							</div>

							<Button
								variant="outline"
								size="sm"
								onClick={handleExecuteRestart}
								disabled={isBusy}
								className="shrink-0 gap-1.5 border-amber-500/30 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 h-8"
							>
								{restartMutation.isPending && activeAction === "restart" ? (
									<>
										<Loader2 className="size-3.5 animate-spin" />
										<span>Đang kiểm tra...</span>
									</>
								) : (
									<>
										<Zap className="size-3.5" />
										<span>Khởi động lại</span>
									</>
								)}
							</Button>
						</div>

						{/* Restart Results Display */}
						{restartSummary && (
							<div className="mt-3 pt-3 border-t border-border/40 space-y-2">
								<div className="flex items-center justify-between text-xs">
									<span className="font-semibold text-foreground">Kết quả kiểm tra:</span>
									<Badge
										variant="outline"
										className={`text-[10px] ${
											restartSummary.restartedCount > 0
												? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
												: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
										}`}
									>
										{restartSummary.restartedCount > 0
											? `Đã restart ${restartSummary.restartedCount} dịch vụ`
											: "Tất cả dịch vụ đều ổn định"}
									</Badge>
								</div>
								{restartSummary.restarted.length > 0 ? (
									<div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
										{restartSummary.restarted.map((r: any, idx: number) => (
											<div
												key={idx}
												className="flex items-center justify-between p-2 rounded-lg bg-background/60 border border-border/40 text-[11px]"
											>
												<div className="flex items-center gap-1.5 truncate mr-2">
													<RefreshCw className="size-3.5 text-amber-500 shrink-0" />
													<span className="font-medium text-foreground truncate">
														{r.name}
													</span>
													<span className="text-[10px] text-muted-foreground font-mono">
														({r.serverName})
													</span>
												</div>
												<span className="text-amber-600 dark:text-amber-400 font-medium shrink-0">
													{r.reason}
												</span>
											</div>
										))}
									</div>
								) : (
									<p className="text-[11px] text-muted-foreground italic">
										Không phát hiện thấy dịch vụ nào bị quá tải hay crash trong cụm vào thời điểm này.
									</p>
								)}
							</div>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
