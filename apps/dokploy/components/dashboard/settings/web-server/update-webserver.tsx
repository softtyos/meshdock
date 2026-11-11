import {
	AlertTriangle,
	CheckCircle2,
	HardDriveDownload,
	Loader2,
	RefreshCw,
	Sparkles,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/utils/api";

type ServiceStatus = {
	status: "healthy" | "unhealthy";
	message?: string;
};

type HealthResult = {
	postgres: ServiceStatus;
	traefik: ServiceStatus;
};

type ModalState = "idle" | "checking" | "results" | "updating";
type UpdatePhase = "dispatching" | "pulling" | "restarting" | "ready";

interface Props {
	buttonClassName?: string;
	fromVersion?: string;
	targetVersion?: string;
}

const ServiceStatusItem = ({
	name,
	service,
}: {
	name: string;
	service: ServiceStatus;
}) => (
	<div className="flex items-center gap-2">
		{service.status === "healthy" ? (
			<CheckCircle2 className="h-4 w-4 text-emerald-500" />
		) : (
			<XCircle className="h-4 w-4 text-rose-500" />
		)}
		<span className="text-sm font-medium">{name}</span>
		{service.status === "unhealthy" && service.message && (
			<span className="text-xs text-muted-foreground">— {service.message}</span>
		)}
	</div>
);

export const UpdateWebServer = ({
	buttonClassName,
	fromVersion,
	targetVersion: propTargetVersion,
}: Props) => {
	const [modalState, setModalState] = useState<ModalState>("idle");
	const [updatePhase, setUpdatePhase] = useState<UpdatePhase>("dispatching");
	const [pollingAttempts, setPollingAttempts] = useState<number>(0);
	const [open, setOpen] = useState(false);
	const [healthResult, setHealthResult] = useState<HealthResult | null>(null);

	const utils = api.useUtils();
	const { mutateAsync: updateServer } = api.settings.updateServer.useMutation();
	const { refetch: checkHealth } =
		api.settings.checkInfrastructureHealth.useQuery(undefined, {
			enabled: false,
		});

	const handleVerify = async () => {
		setModalState("checking");
		setHealthResult(null);

		try {
			const result = await checkHealth();
			if (result.data) {
				setHealthResult(result.data);
			}
		} catch {
			// checkHealth failed entirely
		}
		setModalState("results");
	};

	const allHealthy =
		healthResult &&
		healthResult.postgres.status === "healthy" &&
		healthResult.traefik.status === "healthy";

	const checkIsUpdateFinished = async (
		effectiveTarget?: string,
		effectiveFrom?: string,
		attempts = 0,
	) => {
		setPollingAttempts(attempts);
		if (attempts > 60) {
			toast.error(
				"Thời gian chờ nâng cấp kéo dài hơn dự kiến. Dịch vụ có thể đã cập nhật xong, vui lòng tải lại trang bằng phím F5 để kiểm tra.",
			);
			setModalState("idle");
			return;
		}

		try {
			const response = await fetch(`/api/health?t=${Date.now()}`, {
				cache: "no-store",
			});
			if (!response.ok) {
				// Server is shutting down or returning 502/503 during container restart -> good, Phase 2!
				setUpdatePhase("restarting");
				await new Promise((resolve) => setTimeout(resolve, 3000));
				return checkIsUpdateFinished(effectiveTarget, effectiveFrom, attempts + 1);
			}

			const data = (await response.json().catch(() => ({}))) as {
				ok?: boolean;
				version?: string;
			};

			const cleanCurrent = data?.version?.replace(/^v/, "").trim();
			const cleanFrom = effectiveFrom?.replace(/^v/, "").trim();
			const cleanTarget = effectiveTarget?.replace(/^v/, "").trim();

			// CASE 1: Old container is still serving while Docker is downloading layers
			if (cleanFrom && cleanCurrent === cleanFrom) {
				setUpdatePhase("pulling");
				await new Promise((resolve) => setTimeout(resolve, 3000));
				return checkIsUpdateFinished(effectiveTarget, effectiveFrom, attempts + 1);
			}

			// CASE 2: Target is specified (not "latest") and current does not match yet
			if (
				cleanTarget &&
				cleanTarget !== "latest" &&
				cleanCurrent &&
				cleanCurrent !== cleanTarget
			) {
				setUpdatePhase("restarting");
				await new Promise((resolve) => setTimeout(resolve, 3000));
				return checkIsUpdateFinished(effectiveTarget, effectiveFrom, attempts + 1);
			}

			// CASE 3: SUCCESS! New container is live!
			setUpdatePhase("ready");
			await utils.settings.getDokployVersion.invalidate();

			const finalVersion = data?.version || effectiveTarget || "mới";
			toast.success(
				`Hệ thống đã nâng cấp thành công lên phiên bản ${finalVersion}! Đang làm mới bảng điều khiển...`,
			);

			setTimeout(() => {
				window.location.href = window.location.pathname + "?v=" + Date.now();
			}, 1200);
		} catch {
			// Network error / connection refused while container is restarting
			setUpdatePhase("restarting");
			await new Promise((resolve) => setTimeout(resolve, 3000));
			return checkIsUpdateFinished(effectiveTarget, effectiveFrom, attempts + 1);
		}
	};

	const handleConfirm = async () => {
		setModalState("updating");
		setUpdatePhase("dispatching");
		setPollingAttempts(0);
		let targetTag = propTargetVersion;
		let fromTag = fromVersion;

		try {
			const res = await updateServer();
			if (res?.targetVersion) targetTag = res.targetVersion;
			if (res?.currentVersion) fromTag = res.currentVersion;
		} catch (error) {
			console.log(
				"Server update dispatched (connection drop during restart is normal):",
				error,
			);
		}

		setUpdatePhase("pulling");
		// Initial wait before polling to allow docker service command to be dispatched
		await new Promise((resolve) => setTimeout(resolve, 4000));
		await checkIsUpdateFinished(targetTag, fromTag);
	};

	const handleClose = () => {
		if (modalState !== "updating") {
			setOpen(false);
			setModalState("idle");
			setHealthResult(null);
		}
	};

	return (
		<AlertDialog open={open}>
			<AlertDialogTrigger asChild>
				<Button
					className={cn("relative w-full", buttonClassName)}
					variant="secondary"
					onClick={() => setOpen(true)}
				>
					<HardDriveDownload className="h-4 w-4" />
					<span className="absolute -right-1 -top-2 flex h-3 w-3">
						<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
						<span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
					</span>
					Nâng cấp ngay
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent className="max-w-md">
				<AlertDialogHeader>
					<AlertDialogTitle>
						{modalState === "idle" && "Xác nhận nâng cấp hệ thống"}
						{modalState === "checking" && "Đang kiểm tra dịch vụ..."}
						{modalState === "results" &&
							(allHealthy ? "Sẵn sàng nâng cấp" : "Phát hiện cảnh báo dịch vụ")}
						{modalState === "updating" && "Đang tiến hành nâng cấp hệ thống..."}
					</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div>
							{modalState === "idle" && (
								<span>
									Bảng điều khiển Meshdock sẽ được nâng cấp lên phiên bản mới nhất.
									Trong thời gian nâng cấp (khoảng 1 - 2 phút), trang quản trị sẽ tạm thời khởi động lại để áp dụng bản cập nhật.
									<br />
									<br />
									<strong>Lưu ý:</strong> Mọi ứng dụng và website của bạn vẫn tiếp tục chạy bình thường qua cổng Traefik mà không bị gián đoạn.
								</span>
							)}

							{modalState === "checking" && (
								<span className="flex items-center gap-2">
									<Loader2 className="animate-spin h-4 w-4" />
									Đang kiểm tra trạng thái PostgreSQL và Traefik...
								</span>
							)}

							{modalState === "results" && healthResult && (
								<div className="flex flex-col gap-3">
									<div className="flex flex-col gap-2">
										<ServiceStatusItem
											name="PostgreSQL"
											service={healthResult.postgres}
										/>
										<ServiceStatusItem
											name="Traefik"
											service={healthResult.traefik}
										/>
									</div>

									{!allHealthy && (
										<div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
											<AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
											<span className="text-sm text-amber-600 dark:text-amber-400">
												Một số dịch vụ chưa tối ưu. Bạn vẫn có thể tiếp tục tiến trình nâng cấp.
											</span>
										</div>
									)}

									{allHealthy && (
										<span className="text-sm text-muted-foreground">
											Tất cả dịch vụ đang hoạt động tốt. Bạn có thể tiến hành nâng cấp.
										</span>
									)}
								</div>
							)}

							{modalState === "results" && !healthResult && (
								<div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
									<AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
									<span className="text-sm text-amber-600 dark:text-amber-400">
										Không thể kiểm tra dịch vụ trước. Bạn vẫn có thể tiếp tục tiến hành nâng cấp.
									</span>
								</div>
							)}

							{modalState === "updating" && (
								<div className="flex flex-col gap-4 py-3">
									<div className="flex flex-col gap-3 p-3.5 rounded-xl border border-border/60 bg-muted/30">
										{/* Step 1: Pre-pulling image */}
										<div className="flex items-center gap-3">
											{updatePhase === "dispatching" || updatePhase === "pulling" ? (
												<Loader2 className="h-4 w-4 animate-spin text-cyan-500 shrink-0" />
											) : (
												<CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
											)}
											<div className="flex flex-col">
												<span className="text-xs font-semibold text-foreground">
													1. Tải Docker Image mới từ Docker Hub
												</span>
												<span className="text-[11px] text-muted-foreground">
													{updatePhase === "pulling"
														? `Đang tải image ngầm (~30 - 60s)... (${pollingAttempts * 3}s)`
														: "Đã tải xong image"}
												</span>
											</div>
										</div>

										{/* Step 2: Restarting container */}
										<div className="flex items-center gap-3">
											{updatePhase === "restarting" ? (
												<Loader2 className="h-4 w-4 animate-spin text-amber-500 shrink-0" />
											) : updatePhase === "ready" ? (
												<CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
											) : (
												<div className="h-4 w-4 rounded-full border border-border shrink-0" />
											)}
											<div className="flex flex-col">
												<span className="text-xs font-semibold text-foreground">
													2. Khởi động lại dịch vụ Meshdock
												</span>
												<span className="text-[11px] text-muted-foreground">
													{updatePhase === "restarting"
														? "Docker Swarm đang khởi chạy container mới..."
														: "Chờ thay thế container"}
												</span>
											</div>
										</div>

										{/* Step 3: Refreshing page */}
										<div className="flex items-center gap-3">
											{updatePhase === "ready" ? (
												<Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
											) : (
												<div className="h-4 w-4 rounded-full border border-border shrink-0" />
											)}
											<div className="flex flex-col">
												<span className="text-xs font-semibold text-foreground">
													3. Đồng bộ & Làm mới Bảng Điều Khiển
												</span>
												<span className="text-[11px] text-muted-foreground">
													{updatePhase === "ready"
														? "Đã sẵn sàng! Đang làm mới trang..."
														: "Tự động tải lại giao diện khi hoàn tất"}
												</span>
											</div>
										</div>
									</div>

									<p className="text-xs text-muted-foreground text-center">
										Vui lòng giữ nguyên tab trình duyệt. Hệ thống sẽ tự động chuyển hướng ngay khi dịch vụ mới phản hồi.
									</p>
								</div>
							)}
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				{modalState === "idle" && (
					<AlertDialogFooter>
						<AlertDialogCancel onClick={handleClose}>Để sau</AlertDialogCancel>
						<Button variant="secondary" onClick={handleVerify}>
							<RefreshCw className="h-4 w-4" />
							Kiểm tra trạng thái
						</Button>
						<AlertDialogAction onClick={handleConfirm}>
							Nâng cấp ngay
						</AlertDialogAction>
					</AlertDialogFooter>
				)}
				{modalState === "results" && (
					<AlertDialogFooter>
						<AlertDialogCancel onClick={handleClose}>Để sau</AlertDialogCancel>
						<Button variant="secondary" onClick={handleVerify}>
							<RefreshCw className="h-4 w-4" />
							Kiểm tra lại
						</Button>
						<AlertDialogAction onClick={handleConfirm}>
							{allHealthy ? "Nâng cấp ngay" : "Vẫn nâng cấp"}
						</AlertDialogAction>
					</AlertDialogFooter>
				)}
			</AlertDialogContent>
		</AlertDialog>
	);
};
