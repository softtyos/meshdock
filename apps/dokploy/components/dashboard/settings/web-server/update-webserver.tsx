import {
	AlertTriangle,
	CheckCircle2,
	HardDriveDownload,
	Loader2,
	RefreshCw,
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

const ServiceStatusItem = ({
	name,
	service,
}: {
	name: string;
	service: ServiceStatus;
}) => (
	<div className="flex items-center gap-2">
		{service.status === "healthy" ? (
			<CheckCircle2 className="h-4 w-4 text-green-500" />
		) : (
			<XCircle className="h-4 w-4 text-red-500" />
		)}
		<span className="text-sm font-medium">{name}</span>
		{service.status === "unhealthy" && service.message && (
			<span className="text-xs text-muted-foreground">— {service.message}</span>
		)}
	</div>
);

export const UpdateWebServer = ({
	buttonClassName,
}: {
	buttonClassName?: string;
}) => {
	const [modalState, setModalState] = useState<ModalState>("idle");
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
		targetVersion?: string,
		attempts = 0,
	) => {
		if (attempts > 50) {
			toast.error(
				"Thời gian chờ cập nhật quá lâu. Vui lòng kiểm tra lại dịch vụ hoặc tải lại trang.",
			);
			setModalState("idle");
			return;
		}

		try {
			const response = await fetch(`/api/health?t=${Date.now()}`, {
				cache: "no-store",
			});
			if (!response.ok) {
				throw new Error("Health check failed");
			}

			const data = (await response.json().catch(() => ({}))) as {
				ok?: boolean;
				version?: string;
			};

			// If targetVersion is known, wait until the running container reports the new version
			if (targetVersion && data?.version) {
				const cleanTarget = targetVersion.replace(/^v/, "").trim();
				const cleanCurrent = data.version.replace(/^v/, "").trim();
				if (cleanCurrent !== cleanTarget) {
					// Previous container still serving, wait for swarm rolling replacement
					await new Promise((resolve) => setTimeout(resolve, 3000));
					return checkIsUpdateFinished(targetVersion, attempts + 1);
				}
			}

			await utils.settings.getDokployVersion.invalidate();

			toast.success(
				`Hệ thống đã nâng cấp thành công lên phiên bản ${data?.version || targetVersion || "mới"}! Đang tải lại trang...`,
			);

			setTimeout(() => {
				window.location.reload();
			}, 1500);
		} catch {
			await new Promise((resolve) => setTimeout(resolve, 3000));
			void checkIsUpdateFinished(targetVersion, attempts + 1);
		}
	};

	const handleConfirm = async () => {
		setModalState("updating");
		let targetTag: string | undefined;
		try {
			const res = await updateServer();
			targetTag = res?.version;
		} catch (error) {
			console.log(
				"Server update dispatched (connection drop during restart is normal):",
				error,
			);
		}

		// Initial wait before polling to allow docker pull / service update to initialize
		await new Promise((resolve) => setTimeout(resolve, 5000));
		await checkIsUpdateFinished(targetTag);
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
						<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
						<span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
					</span>
					Nâng cấp ngay
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
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
										<div className="flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3">
											<AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
											<span className="text-sm text-yellow-600 dark:text-yellow-400">
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
								<div className="flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3">
									<AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
									<span className="text-sm text-yellow-600 dark:text-yellow-400">
										Không thể kiểm tra dịch vụ trước. Bạn vẫn có thể tiếp tục tiến hành nâng cấp.
									</span>
								</div>
							)}

							{modalState === "updating" && (
								<div className="flex flex-col items-center justify-center py-4 gap-3">
									<div className="flex items-center gap-2 text-primary font-medium">
										<Loader2 className="animate-spin h-5 w-5" />
										<span>Đang tải image mới và khởi động lại dịch vụ...</span>
									</div>
									<p className="text-xs text-muted-foreground text-center">
										Bảng điều khiển sẽ tự động làm mới trang ngay khi hoàn tất. Quá trình mất khoảng 30 - 60 giây.
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
