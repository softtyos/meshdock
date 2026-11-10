import {
	AlertTriangle,
	Check,
	Cpu,
	Database,
	HardDrive,
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
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/utils/api";

interface Props {
	serverId?: string | null;
	onOptimized?: () => void;
}

export const OptimizerDialog = ({ serverId, onOptimized }: Props) => {
	const [open, setOpen] = useState(false);
	const [activeTarget, setActiveTarget] = useState<
		"all" | "buildCache" | "images" | "containers" | "volumes"
	>("all");

	const { mutateAsync: optimize, isPending } = api.vitals.optimize.useMutation();

	const handleOptimize = async (
		target: "all" | "buildCache" | "images" | "containers" | "volumes",
	) => {
		setActiveTarget(target);
		try {
			const res = await optimize({ serverId, target });
			toast.success(res.message);
			if (onOptimized) onOptimized();
			setOpen(false);
		} catch (err: any) {
			toast.error(`Lỗi dọn dẹp: ${err?.message || err}`);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					size="sm"
					className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm"
				>
					<Sparkles className="size-4" />
					<span>Tối ưu hóa Tài nguyên 1-Click</span>
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-lg">
						<Sparkles className="size-5 text-emerald-500" />
						<span>Trình Dọn dẹp & Tối ưu hóa Bộ nhớ Pro Max</span>
					</DialogTitle>
					<DialogDescription className="text-xs">
						Thu hồi hàng chục Gigabyte dung lượng ổ đĩa bị lãng phí do Docker Build Cache,
						Images rác và Containers đã dừng mà không ảnh hưởng tới dữ liệu đang chạy.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3 py-3">
					{/* Option 1: Build Cache */}
					<div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 hover:border-emerald-500/40 bg-card transition-colors">
						<div className="flex items-center gap-3">
							<div className="size-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
								<Layers className="size-4" />
							</div>
							<div>
								<h4 className="text-sm font-semibold">Dọn dẹp Docker Build Cache</h4>
								<p className="text-xs text-muted-foreground mt-0.5">
									Giải phóng bộ đệm biên dịch cũ (thường chiếm từ 10GB đến 60GB).
								</p>
							</div>
						</div>
						<Button
							size="sm"
							variant="outline"
							className="text-xs h-8"
							disabled={isPending}
							onClick={() => handleOptimize("buildCache")}
						>
							{isPending && activeTarget === "buildCache" ? (
								<Loader2 className="size-3.5 animate-spin" />
							) : (
								"Dọn Cache"
							)}
						</Button>
					</div>

					{/* Option 2: Dangling Images */}
					<div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 hover:border-emerald-500/40 bg-card transition-colors">
						<div className="flex items-center gap-3">
							<div className="size-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
								<HardDrive className="size-4" />
							</div>
							<div>
								<h4 className="text-sm font-semibold">Xóa Docker Images không dùng</h4>
								<p className="text-xs text-muted-foreground mt-0.5">
									Xóa bỏ các layers và images cũ mồ côi (dangling images).
								</p>
							</div>
						</div>
						<Button
							size="sm"
							variant="outline"
							className="text-xs h-8"
							disabled={isPending}
							onClick={() => handleOptimize("images")}
						>
							{isPending && activeTarget === "images" ? (
								<Loader2 className="size-3.5 animate-spin" />
							) : (
								"Dọn Images"
							)}
						</Button>
					</div>

					{/* Option 3: Stopped Containers */}
					<div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 hover:border-emerald-500/40 bg-card transition-colors">
						<div className="flex items-center gap-3">
							<div className="size-9 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
								<Zap className="size-4" />
							</div>
							<div>
								<h4 className="text-sm font-semibold">Dọn Containers đã dừng</h4>
								<p className="text-xs text-muted-foreground mt-0.5">
									Loại bỏ các container lịch sử build hoặc task Swarm đã shutdown.
								</p>
							</div>
						</div>
						<Button
							size="sm"
							variant="outline"
							className="text-xs h-8"
							disabled={isPending}
							onClick={() => handleOptimize("containers")}
						>
							{isPending && activeTarget === "containers" ? (
								<Loader2 className="size-3.5 animate-spin" />
							) : (
								"Dọn Containers"
							)}
						</Button>
					</div>
				</div>

				<DialogFooter className="pt-2 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
					<p className="text-[11px] text-muted-foreground">
						* Dữ liệu trong database và persistent volumes được giữ an toàn tuyệt đối.
					</p>
					<Button
						className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white gap-2 text-xs"
						disabled={isPending}
						onClick={() => handleOptimize("all")}
					>
						{isPending && activeTarget === "all" ? (
							<>
								<Loader2 className="size-3.5 animate-spin" />
								<span>Đang dọn dẹp...</span>
							</>
						) : (
							<>
								<Sparkles className="size-3.5" />
								<span>Tối ưu hóa Toàn diện</span>
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
