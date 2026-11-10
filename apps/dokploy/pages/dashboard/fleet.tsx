import { validateRequest } from "@dokploy/server/lib/auth";
import { createServerSideHelpers } from "@trpc/react-query/server";
import dynamic from "next/dynamic";
import {
	Activity,
	LayoutGrid,
	Loader2,
	Network,
	Plus,
	RefreshCw,
	Server,
} from "lucide-react";
import type { GetServerSidePropsContext } from "next";
import React, { type ReactElement, useState } from "react";
import superjson from "superjson";
import { HandleServers } from "@/components/dashboard/settings/servers/handle-servers";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { appRouter } from "@/server/api/root";
import type { FleetNodeInfo } from "@/server/api/routers/fleet";
import { api } from "@/utils/api";

const FleetKpis = dynamic(
	() => import("@/components/dashboard/fleet/fleet-kpis").then((m) => m.FleetKpis),
	{ ssr: false },
);
const FleetMatrix = dynamic(
	() => import("@/components/dashboard/fleet/fleet-matrix").then((m) => m.FleetMatrix),
	{ ssr: false },
);
const FleetNodeDrawer = dynamic(
	() => import("@/components/dashboard/fleet/fleet-node-drawer").then((m) => m.FleetNodeDrawer),
	{ ssr: false },
);
const FleetTelemetry = dynamic(
	() => import("@/components/dashboard/fleet/fleet-telemetry").then((m) => m.FleetTelemetry),
	{ ssr: false },
);
const SwarmGlobalAgentModal = dynamic(
	() => import("@/components/dashboard/fleet/swarm-global-agent-modal").then((m) => m.SwarmGlobalAgentModal),
	{ ssr: false },
);

const FleetPage = () => {
	const utils = api.useUtils();
	const [viewMode, setViewMode] = useState<"matrix" | "telemetry">("matrix");
	const [selectedNode, setSelectedNode] = useState<FleetNodeInfo | null>(null);
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);

	const {
		data: fleetData,
		isLoading,
		isRefetching,
		refetch,
	} = api.fleet.getFleetOverview.useQuery(undefined, {
		refetchInterval: 30000,
	});

	const handleSelectNode = (node: FleetNodeInfo) => {
		setSelectedNode(node);
		setIsDrawerOpen(true);
	};

	return (
		<div className="space-y-6 pb-12 w-full">
			{/* Page Header */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
				<div>
					<div className="flex items-center gap-2">
						<div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
							<Network className="h-4 w-4" />
						</div>
						<h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
							Mesh Fleet Controller
						</h1>
					</div>
					<p className="text-xs sm:text-sm text-muted-foreground mt-1">
						Centralized management for multi-cluster Docker Swarms & standalone VPS fleets.
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<SwarmGlobalAgentModal />
					<HandleServers />
					<Button
						variant="outline"
						size="sm"
						className="gap-1.5 h-9"
						onClick={() => refetch()}
						disabled={isLoading || isRefetching}
					>
						<RefreshCw
							className={`h-3.5 w-3.5 ${
								isRefetching ? "animate-spin" : ""
							}`}
						/>
						<span className="hidden sm:inline">Refresh</span>
					</Button>
				</div>
			</div>

			{/* KPI Summary Cards */}
			<FleetKpis kpis={fleetData?.kpis} isLoading={isLoading} />

			{/* View Toggle Tabs */}
			<div className="flex items-center justify-between pt-2 border-t">
				<Tabs
					value={viewMode}
					onValueChange={(val: any) => setViewMode(val)}
					className="w-full sm:w-auto"
				>
					<TabsList className="bg-muted/40 p-1">
						<TabsTrigger value="matrix" className="text-xs gap-1.5">
							<LayoutGrid className="h-3.5 w-3.5" /> Fleet Matrix
						</TabsTrigger>
						<TabsTrigger value="telemetry" className="text-xs gap-1.5">
							<Activity className="h-3.5 w-3.5 text-emerald-400" /> Live Telemetry
						</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>

			{/* Main Content Area */}
			{isLoading ? (
				<div className="flex flex-col items-center justify-center min-h-[300px] gap-2 text-muted-foreground">
					<Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
					<span className="text-sm">Connecting to fleet daemons & swarm nodes...</span>
				</div>
			) : viewMode === "matrix" ? (
				<FleetMatrix
					nodes={fleetData?.nodes || []}
					clusters={fleetData?.clusters || []}
					onSelectNode={handleSelectNode}
				/>
			) : (
				<FleetTelemetry
					nodeId={selectedNode?.serverId || undefined}
					nodeName={selectedNode?.name}
				/>
			)}

			{/* Node Inspection Drawer */}
			<FleetNodeDrawer
				node={selectedNode}
				isOpen={isDrawerOpen}
				onClose={() => {
					setIsDrawerOpen(false);
					setSelectedNode(null);
				}}
			/>
		</div>
	);
};

export default FleetPage;

FleetPage.getLayout = (page: ReactElement) => {
	return <DashboardLayout metaName="Mesh Fleet">{page}</DashboardLayout>;
};

export async function getServerSideProps(
	ctx: GetServerSidePropsContext,
) {
	const { req, res } = ctx;
	const { user, session } = await validateRequest(req);

	const helpers = createServerSideHelpers({
		router: appRouter,
		ctx: {
			req: req as any,
			res: res as any,
			db: null as any,
			session: session as any,
			user: user as any,
		},
		transformer: superjson,
	});

	if (!user) {
		return {
			redirect: {
				permanent: false,
				destination: "/",
			},
		};
	}

	return {
		props: {
			trpcState: helpers.dehydrate(),
		},
	};
}
