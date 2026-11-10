import { IS_CLOUD } from "@dokploy/server/constants";
import { validateRequest } from "@dokploy/server/lib/auth";
import { hasPermission } from "@dokploy/server/services/permission";
import {
	Activity,
	BarChart3,
	Cpu,
	Database,
	HardDrive,
	Layers,
	Loader2,
	RefreshCw,
	Server,
	Sparkles,
} from "lucide-react";
import type { GetServerSidePropsContext } from "next";
import React, { type ReactElement, useState } from "react";
import { ContainerFreeMonitoring } from "@/components/dashboard/monitoring/free/container/show-free-container-monitoring";
import { ShowPaidMonitoring } from "@/components/dashboard/monitoring/paid/servers/show-paid-monitoring";
import { ContainerVitalsTable } from "@/components/dashboard/vitals/container-vitals-table";
import { HealthScoreCard } from "@/components/dashboard/vitals/health-score-card";
import { HostVitalsCard } from "@/components/dashboard/vitals/host-vitals-card";
import { OptimizerDialog } from "@/components/dashboard/vitals/optimizer-dialog";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { api } from "@/utils/api";

const BASE_URL = "http://localhost:3001/metrics";
const DEFAULT_TOKEN = "metrics";

const MonitoringPage = () => {
	const [activeTab, setActiveTab] = useState<"vitals" | "charts">("vitals");
	const [selectedServerId, setSelectedServerId] = useState<string>("local");
	const [pollInterval, setPollInterval] = useState<number | false>(10000);

	const serverIdQuery =
		selectedServerId === "local" ? undefined : selectedServerId;

	// Server fleet list
	const { data: servers } = api.server.all.useQuery();

	// Host Vitals Query
	const {
		data: hostVitals,
		isLoading: isHostLoading,
		isRefetching: isHostRefetching,
		refetch: refetchHost,
	} = api.vitals.getHostVitals.useQuery(
		{ serverId: serverIdQuery },
		{
			refetchInterval: pollInterval,
			refetchOnWindowFocus: false,
		},
	);

	// Container Vitals Query
	const {
		data: containerVitals = [],
		isLoading: isContainersLoading,
		isRefetching: isContainersRefetching,
		refetch: refetchContainers,
	} = api.vitals.getContainerVitals.useQuery(
		{ serverId: serverIdQuery },
		{
			refetchInterval: pollInterval,
			refetchOnWindowFocus: false,
		},
	);

	// Legacy Prometheus monitoring query
	const [toggleMonitoring] = useLocalStorage("monitoring-enabled", false);
	const { data: monitoring } = api.user.getMetricsToken.useQuery(undefined, {
		enabled: activeTab === "charts",
	});

	const isRefreshing = isHostRefetching || isContainersRefetching;
	const isLoading = isHostLoading || isContainersLoading;

	const handleManualRefresh = () => {
		refetchHost();
		refetchContainers();
	};

	return (
		<div className="space-y-6 pb-12 w-full">
			{/* Page Header */}
			<div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-border/60 pb-5">
				<div>
					<div className="flex items-center gap-2.5">
						<div className="size-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-sm">
							<Activity className="size-5" />
						</div>
						<div>
							<h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
								System Vitals & Giám Sát VPS
								<span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
									Pro Max
								</span>
							</h1>
							<p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
								Theo dõi thời gian thực tải CPU/RAM, dung lượng ổ đĩa, AI Health Score và trạng thái container.
							</p>
						</div>
					</div>
				</div>

				{/* Global Control Bar */}
				<div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
					{/* Server Selector */}
					{servers && servers.length > 0 && (
						<div className="w-[180px] sm:w-[210px]">
							<Select
								value={selectedServerId}
								onValueChange={(val) => setSelectedServerId(val)}
							>
								<SelectTrigger className="h-9 text-xs">
									<Server className="size-3.5 mr-1.5 text-muted-foreground" />
									<SelectValue placeholder="Chọn máy chủ" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="local" className="text-xs font-medium">
										Máy chủ Cục bộ (Host)
									</SelectItem>
									{servers.map((srv) => (
										<SelectItem
											key={srv.serverId}
											value={srv.serverId}
											className="text-xs"
										>
											{srv.name} ({srv.ipAddress})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					{/* Auto-refresh interval */}
					<div className="w-[130px]">
						<Select
							value={pollInterval === false ? "pause" : String(pollInterval)}
							onValueChange={(val) => {
								if (val === "pause") setPollInterval(false);
								else setPollInterval(Number(val));
							}}
						>
							<SelectTrigger className="h-9 text-xs">
								<SelectValue placeholder="Tự động cập nhật" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="5000" className="text-xs">
									5 giây / lần
								</SelectItem>
								<SelectItem value="10000" className="text-xs">
									10 giây / lần
								</SelectItem>
								<SelectItem value="30000" className="text-xs">
									30 giây / lần
								</SelectItem>
								<SelectItem value="pause" className="text-xs text-amber-500 font-medium">
									Tạm dừng
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Manual Refresh */}
					<Button
						variant="outline"
						size="sm"
						className="h-9 gap-1.5 text-xs"
						onClick={handleManualRefresh}
						disabled={isLoading || isRefreshing}
					>
						<RefreshCw
							className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`}
						/>
						<span className="hidden sm:inline">Làm mới</span>
					</Button>

					{/* 1-Click Optimizer */}
					<OptimizerDialog
						serverId={serverIdQuery}
						onOptimized={handleManualRefresh}
					/>
				</div>
			</div>

			{/* Mode Tabs */}
			<Tabs
				value={activeTab}
				onValueChange={(val) => setActiveTab(val as "vitals" | "charts")}
				className="w-full space-y-6"
			>
				<div className="flex items-center justify-between">
					<TabsList className="bg-muted/60 p-1 border border-border/50">
						<TabsTrigger
							value="vitals"
							className="text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
						>
							<Activity className="size-3.5 text-emerald-500" />
							<span>System Vitals & Containers</span>
						</TabsTrigger>
						<TabsTrigger
							value="charts"
							className="text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
						>
							<BarChart3 className="size-3.5 text-blue-500" />
							<span>Biểu Đồ Lịch Sử</span>
						</TabsTrigger>
					</TabsList>
				</div>

				{/* TAB 1: PRO MAX SYSTEM VITALS */}
				<TabsContent value="vitals" className="space-y-6 mt-0">
					{/* AI Health Score Card */}
					<HealthScoreCard
						vitals={hostVitals}
						serverId={serverIdQuery}
						onOptimized={handleManualRefresh}
					/>

					{/* 4 Host Metric Cards (CPU, RAM, Disk, Docker Storage) */}
					<HostVitalsCard vitals={hostVitals} />

					{/* Detailed Container Vitals Table */}
					<ContainerVitalsTable
						containers={containerVitals}
						isLoading={isLoading}
						serverId={serverIdQuery}
						onRefresh={handleManualRefresh}
					/>
				</TabsContent>

				{/* TAB 2: HISTORICAL / PROMETHEUS TIME-SERIES CHARTS */}
				<TabsContent value="charts" className="space-y-4 mt-0">
					{toggleMonitoring ? (
						<Card className="bg-card p-4 rounded-xl border border-border shadow-sm">
							<ShowPaidMonitoring
								BASE_URL={
									process.env.NODE_ENV === "production"
										? `http://${monitoring?.serverIp}:${monitoring?.metricsConfig?.server?.port}/metrics`
										: BASE_URL
								}
								token={
									process.env.NODE_ENV === "production"
										? monitoring?.metricsConfig?.server?.token
										: DEFAULT_TOKEN
								}
							/>
						</Card>
					) : (
						<Card className="bg-card p-6 rounded-xl border border-border shadow-sm">
							<ContainerFreeMonitoring appName="dokploy" />
						</Card>
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
};

export default MonitoringPage;

MonitoringPage.getLayout = (page: ReactElement) => {
	return <DashboardLayout metaName="System Vitals">{page}</DashboardLayout>;
};

export async function getServerSideProps(
	ctx: GetServerSidePropsContext<{ serviceId: string }>,
) {
	if (IS_CLOUD) {
		return {
			redirect: {
				permanent: false,
				destination: "/dashboard/home",
			},
		};
	}
	const { user, session } = await validateRequest(ctx.req);
	if (!user) {
		return {
			redirect: {
				permanent: false,
				destination: "/",
			},
		};
	}

	const permissionCtx = {
		user: { id: user.id },
		session: { activeOrganizationId: session?.activeOrganizationId || "" },
	};
	const [canReadMonitoring, canReadDocker] = await Promise.all([
		hasPermission(permissionCtx, { monitoring: ["read"] }),
		hasPermission(permissionCtx, { docker: ["read"] }),
	]);
	const canView = canReadMonitoring || canReadDocker;

	if (!canView) {
		return {
			redirect: {
				permanent: false,
				destination: "/dashboard/home",
			},
		};
	}

	return {
		props: {},
	};
}
