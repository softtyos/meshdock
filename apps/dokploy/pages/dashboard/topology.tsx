import { validateRequest } from "@dokploy/server/lib/auth";
import { createServerSideHelpers } from "@trpc/react-query/server";
import dynamic from "next/dynamic";
import {
	Boxes,
	Database,
	Layers,
	Loader2,
	RefreshCw,
	Shield,
	Workflow,
	Zap,
} from "lucide-react";
import type { GetServerSidePropsContext } from "next";
import React, { type ReactElement } from "react";
import superjson from "superjson";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { appRouter } from "@/server/api/root";
import { api } from "@/utils/api";
import useLocale from "@/utils/hooks/use-locale";

const TopologyCanvas = dynamic(
	() =>
		import("@/components/dashboard/topology/topology-canvas").then(
			(m) => m.TopologyCanvas,
		),
	{ ssr: false },
);

const TopologyPage = () => {
	const { locale, t } = useLocale();
	const {
		data: topologyData,
		isLoading,
		isRefetching,
		refetch,
	} = api.fleet.getTopologyGraph.useQuery(undefined, {
		refetchInterval: 30000,
	});

	return (
		<div className="space-y-6 pb-12 w-full">
			{/* Header */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
				<div>
					<div className="flex items-center gap-2">
						<div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
							<Workflow className="h-4 w-4" />
						</div>
						<h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
							{t("System Architecture Map")}
						</h1>
					</div>
					<p className="text-xs sm:text-sm text-muted-foreground mt-1">
						{t("Topology Map Subtitle")}
					</p>
				</div>

				<div className="flex items-center gap-3">
					{topologyData?.summary && (
						<div className="hidden lg:flex items-center gap-2 bg-muted/30 border border-border/70 rounded-lg p-1.5 text-xs">
							<span className="flex items-center gap-1 text-cyan-400 px-1 font-medium">
								<Shield className="h-3 w-3" /> {topologyData.summary.ingressCount} Ingress
							</span>
							<span className="text-border">|</span>
							<span className="flex items-center gap-1 text-blue-400 px-1 font-medium">
								<Layers className="h-3 w-3" /> {topologyData.summary.clustersCount} {locale === "vi" ? "Máy chủ" : "Clusters"}
							</span>
							<span className="text-border">|</span>
							<span className="flex items-center gap-1 text-purple-400 px-1 font-medium">
								<Boxes className="h-3 w-3" /> {(topologyData.summary as any).systemsCount || 6} {locale === "vi" ? "Hệ thống" : "Systems"}
							</span>
							<span className="text-border">|</span>
							<span className="flex items-center gap-1 text-emerald-400 px-1 font-medium">
								<Database className="h-3 w-3" /> {topologyData.summary.databasesCount} {locale === "vi" ? "Dữ liệu" : "Data"}
							</span>
						</div>
					)}

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
						<span className="hidden sm:inline">{t("Refresh Map")}</span>
					</Button>
				</div>
			</div>

			{/* Main Canvas View */}
			{isLoading ? (
				<div className="flex flex-col items-center justify-center min-h-[500px] border border-border/60 rounded-xl bg-card/20 gap-3 text-muted-foreground font-mono">
					<Loader2 className="h-7 w-7 animate-spin text-emerald-400" />
					<p className="text-sm">
						{locale === "vi"
							? "Đang tải và đồng bộ sơ đồ kiến trúc hệ thống..."
							: "Mapping infrastructure topology & cluster routes..."}
					</p>
				</div>
			) : (
				<TopologyCanvas
					nodes={topologyData?.nodes || []}
					edges={topologyData?.edges || []}
					infrastructure={topologyData?.infrastructure || []}
					systems={topologyData?.systems || []}
					onRefresh={() => refetch()}
				/>
			)}
		</div>
	);
};

export default TopologyPage;

TopologyPage.getLayout = (page: ReactElement) => {
	return <DashboardLayout metaName="Topology">{page}</DashboardLayout>;
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
