import { format } from "date-fns";
import {
	Activity,
	BarChartHorizontalBigIcon,
	Boxes,
	Clock,
	Key,
	KeyIcon,
	Loader2,
	Network,
	Pencil,
	ServerIcon,
	Settings,
	ShieldCheck,
	Terminal,
	Trash2,
	User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
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
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/utils/api";
import { TerminalModal } from "../web-server/terminal-modal";
import { ShowServerActions } from "./actions/show-server-actions";
import { DeleteServerModal } from "./delete-server-modal";
import { HandleServers } from "./handle-servers";
import { ShowServerSecurity } from "./security/show-server-security";
import { SetupServer } from "./setup-server";
import { ShowMonitoringModal } from "./show-monitoring-modal";
import { SwarmClusterTab } from "./swarm-cluster-tab";
import { WelcomeSubscription } from "./welcome-stripe/welcome-subscription";

export const ShowServers = () => {
	const router = useRouter();
	const query = router.query;
	const { data, isPending } = api.server.all.useQuery();
	const { data: sshKeys } = api.sshKey.all.useQuery();
	const { data: isCloud } = api.settings.isCloud.useQuery();
	const { data: permissions } = api.user.getPermissions.useQuery();

	return (
		<div className="w-full max-w-6xl mx-auto space-y-6">
			{query?.success && isCloud && <WelcomeSubscription />}

			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
						<ServerIcon className="size-6 text-primary" />
						Quản lý Máy chủ & Cụm Cluster
					</h1>
					<p className="text-sm text-muted-foreground mt-0.5">
						Quản lý linh hoạt cụm Docker Swarm tự động hóa Agent hoặc các máy chủ VPS độc lập qua SSH.
					</p>
				</div>
			</div>

			<Tabs defaultValue="swarm" className="w-full space-y-6">
				<TabsList className="grid grid-cols-2 w-full sm:w-[460px] h-11 p-1 bg-muted/70">
					<TabsTrigger value="swarm" className="flex items-center gap-2 text-xs sm:text-sm font-medium">
						<Boxes className="size-4 text-emerald-500" />
						<span>Cụm Docker Swarm</span>
						<Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
							Auto Agent
						</Badge>
					</TabsTrigger>
					<TabsTrigger value="standalone" className="flex items-center gap-2 text-xs sm:text-sm font-medium">
						<ServerIcon className="size-4 text-blue-500" />
						<span>Máy chủ Độc lập</span>
						<Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
							SSH
						</Badge>
					</TabsTrigger>
				</TabsList>

				<TabsContent value="swarm" className="space-y-6 m-0">
					<SwarmClusterTab />
				</TabsContent>

				<TabsContent value="standalone" className="space-y-6 m-0">
					<Card className="h-full p-2.5 rounded-xl">
						<div className="rounded-xl bg-background shadow-md">
							<CardHeader className="flex flex-row items-center justify-between">
								<div>
									<CardTitle className="text-xl flex flex-row gap-2">
										<ServerIcon className="size-6 text-muted-foreground self-center" />
										Máy chủ Độc lập (Standalone VPS)
									</CardTitle>
									<CardDescription className="text-xs sm:text-sm mt-0.5">
										Kết nối máy chủ qua SSH. Khi khởi tạo, hệ thống sẽ tự động cài đặt Docker và Meshdock Agent để kết nối về trung tâm.
									</CardDescription>
								</div>
								{permissions?.server.create && <HandleServers />}
							</CardHeader>
							<CardContent className="space-y-2 py-8 border-t">
								{isPending ? (
									<div className="flex flex-row gap-2 items-center justify-center text-sm text-muted-foreground min-h-[25vh]">
										<span>Loading...</span>
										<Loader2 className="animate-spin size-4" />
									</div>
								) : (
									<>
										{sshKeys?.length === 0 && data?.length === 0 ? (
											<div className="flex flex-col items-center gap-3 min-h-[25vh] justify-center">
												<KeyIcon className="size-8" />
												<span className="text-base text-muted-foreground">
													No SSH Keys found. Add a SSH Key to start adding servers.{" "}
													<Link
														href="/dashboard/settings/ssh-keys"
														className="text-primary"
													>
														Add SSH Key
													</Link>
												</span>
											</div>
										) : (
											<>
												{data?.length === 0 ? (
													<div className="flex flex-col items-center gap-3 min-h-[25vh] justify-center">
														<ServerIcon className="size-8 self-center text-muted-foreground" />
														<span className="text-base text-muted-foreground">
															Chưa có máy chủ độc lập nào. Thêm máy chủ để triển khai ứng dụng từ xa.
														</span>
														{permissions?.server.create && <HandleServers />}
													</div>
												) : (
													<div className="flex flex-col gap-4 min-h-[25vh]">
														<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
															{data?.map((server) => {
																const isActive = server.serverStatus === "active";
																const isBuildServer = server.serverType === "build";
																return (
																	<Card
																		key={server.serverId}
																		className="relative hover:shadow-lg transition-shadow flex flex-col bg-transparent"
																	>
																		<CardHeader className="pb-3">
																			<div className="flex items-start justify-between gap-2 min-w-0">
																				<div className="flex min-w-0 items-center gap-2">
																					<ServerIcon className="size-5 shrink-0 text-muted-foreground" />
																					<CardTitle
																						className="text-lg truncate min-w-0"
																						title={server.name}
																					>
																						{server.name}
																					</CardTitle>
																				</div>
																			</div>
																			<TooltipProvider>
																				<div className="flex gap-2 mt-2 flex-wrap">
																					<Badge variant={server.serverStatus === "active" ? "default" : "secondary"}>
																						{server.serverStatus}
																					</Badge>
																					<Badge
																						variant={
																							isBuildServer
																								? "secondary"
																								: "default"
																						}
																					>
																						{server.serverType}
																					</Badge>
																				</div>
																			</TooltipProvider>
																		</CardHeader>
																		<CardContent className="space-y-3 flex-1 flex flex-col">
																			<div className="flex items-center gap-2 text-sm">
																				<Network className="size-4 text-muted-foreground" />
																				<span className="text-muted-foreground">
																					IP:
																				</span>
																				<Badge variant="outline">
																					{server.ipAddress}
																				</Badge>
																				<span className="text-muted-foreground">
																					Port:
																				</span>
																				<span className="font-medium">
																					{server.port}
																				</span>
																			</div>
																			<div className="flex items-center gap-2 text-sm">
																				<User className="size-4 text-muted-foreground" />
																				<span className="text-muted-foreground">
																					User:
																				</span>
																				<span className="font-medium">
																					{server.username}
																				</span>
																			</div>
																			<div className="flex items-center gap-2 text-sm">
																				<Key className="size-4 text-muted-foreground" />
																				<span className="text-muted-foreground">
																					SSH Key:
																				</span>
																				<span className="font-medium">
																					{server.sshKeyId ? "Yes" : "No"}
																				</span>
																			</div>
																			<div className="flex items-center gap-2 text-sm pt-2 border-t">
																				<Clock className="size-4 text-muted-foreground" />
																				<span className="text-xs text-muted-foreground">
																					Created{" "}
																					{format(
																						new Date(server.createdAt),
																						"PPp",
																					)}
																				</span>
																			</div>

																			{/* Compact Actions */}
																			{isActive && (
																				<div className="flex items-center gap-2 pt-3 border-t mt-auto flex-wrap">
																					<div className="flex items-center gap-2 w-full">
																						<Tooltip>
																							<SetupServer
																								serverId={server.serverId}
																							>
																								<TooltipTrigger asChild>
																									<Button
																										className="w-full cursor-pointer"
																										size="sm"
																									>
																										Setup Server{" "}
																										<Settings className="size-4" />
																									</Button>
																								</TooltipTrigger>
																							</SetupServer>
																							<TooltipContent
																								className="max-w-xs"
																								side="bottom"
																							>
																								<div className="space-y-1">
																									<p className="font-semibold">
																										Setup Server
																									</p>
																									<p className="text-xs text-muted-foreground">
																										Configure and initialize your
																										server with Docker, Traefik, and
																										Meshdock Agent
																									</p>
																								</div>
																							</TooltipContent>
																						</Tooltip>
																					</div>

																					<TooltipProvider>
																						{server.sshKeyId &&
																							permissions?.server.terminal && (
																								<Tooltip>
																									<TerminalModal
																										serverId={server.serverId}
																										asButton={true}
																									>
																										<TooltipTrigger asChild>
																											<Button
																												variant="outline"
																												size="icon"
																												className="h-9 w-9"
																											>
																												<Terminal className="h-4 w-4" />
																											</Button>
																										</TooltipTrigger>
																									</TerminalModal>
																									<TooltipContent>
																										<p>Terminal</p>
																									</TooltipContent>
																								</Tooltip>
																							)}

																						{server.sshKeyId &&
																							permissions?.server.read && (
																								<Tooltip>
																									<ShowServerSecurity
																										serverId={server.serverId}
																									>
																										<TooltipTrigger asChild>
																											<Button
																												variant="outline"
																												size="icon"
																												className="h-9 w-9"
																											>
																												<ShieldCheck className="h-4 w-4" />
																											</Button>
																										</TooltipTrigger>
																									</ShowServerSecurity>
																									<TooltipContent>
																										<p>Security</p>
																									</TooltipContent>
																								</Tooltip>
																							)}

																						<Tooltip>
																							<HandleServers
																								serverId={server.serverId}
																							>
																								<TooltipTrigger asChild>
																									<Button
																										variant="outline"
																										size="icon"
																										className="h-9 w-9"
																									>
																										<Pencil className="h-4 w-4" />
																									</Button>
																								</TooltipTrigger>
																							</HandleServers>
																							<TooltipContent>
																								<p>Edit Server</p>
																							</TooltipContent>
																						</Tooltip>

																						{server.sshKeyId && !isBuildServer && (
																							<Tooltip>
																								<ShowServerActions
																									serverId={server.serverId}
																								>
																									<TooltipTrigger asChild>
																										<Button
																											variant="outline"
																											size="icon"
																											className="h-9 w-9"
																										>
																											<Activity className="h-4 w-4" />
																										</Button>
																									</TooltipTrigger>
																								</ShowServerActions>
																								<TooltipContent>
																									<p>Web Server Actions</p>
																								</TooltipContent>
																							</Tooltip>
																						)}

																						{server.sshKeyId &&
																							!isBuildServer && (
																								<Tooltip>
																									<ShowMonitoringModal
																										url={`http://${server.ipAddress}:${server?.metricsConfig?.server?.port}/metrics`}
																										token={
																											server?.metricsConfig?.server
																												?.token
																										}
																									>
																										<TooltipTrigger asChild>
																											<Button
																												variant="outline"
																												size="icon"
																												className="h-9 w-9"
																											>
																												<BarChartHorizontalBigIcon className="h-4 w-4" />
																											</Button>
																										</TooltipTrigger>
																									</ShowMonitoringModal>
																									<TooltipContent>
																										<p>Monitoring</p>
																									</TooltipContent>
																								</Tooltip>
																							)}

																						<div className="flex-1" />

																						{permissions?.server.delete && (
																							<Tooltip>
																								<DeleteServerModal
																									serverId={server.serverId}
																									serverName={server.name}
																								>
																									<TooltipTrigger asChild>
																										<Button
																											variant="ghost"
																											size="icon"
																											className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
																										>
																											<Trash2 className="h-4 w-4" />
																										</Button>
																									</TooltipTrigger>
																								</DeleteServerModal>
																								<TooltipContent>
																									<p>Delete Server</p>
																								</TooltipContent>
																							</Tooltip>
																						)}
																					</TooltipProvider>
																				</div>
																			)}
																		</CardContent>
																	</Card>
																);
															})}
														</div>
													</div>
												)}
											</>
										)}
									</>
								)}
							</CardContent>
						</div>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
};
