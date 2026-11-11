import {
	assertServerAccess,
	docker,
	findServerById,
	getAllContainerStats,
	getHostVitals,
	getRemoteDocker,
	getWebServerSettings,
	IS_CLOUD,
	optimizeHostResources,
} from "@dokploy/server";
import { db } from "@dokploy/server/db";
import { projects, server } from "@dokploy/server/db/schema";
import {
	execAsync,
	execAsyncRemote,
} from "@dokploy/server/utils/process/execAsync";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { audit } from "@/server/api/utils/audit";
import { getLocalServerIp } from "@/server/wss/terminal";
import {
	adminProcedure,
	createTRPCRouter,
	protectedProcedure,
	withPermission,
} from "../trpc";

const safeContainerIdSchema = z
	.string()
	.min(1, "Container ID không được để trống")
	.max(128, "Container ID quá dài")
	.regex(/^[a-zA-Z0-9_.-]+$/, "Container ID chứa ký tự không hợp lệ");

export interface TelemetryDataPoint {
	timestamp: string;
	cpu: number;
	memUsedGB: number;
	memTotalGB: number;
	memPerc: number;
	netInKB: number;
	netOutKB: number;
	diskIoMB: number;
}

interface NodeTelemetryBuffer {
	points: TelemetryDataPoint[];
	lastRxBytes: number;
	lastTxBytes: number;
	lastSampleMs: number;
}

const telemetryRingBuffer = new Map<string, NodeTelemetryBuffer>();

export interface FleetNodeInfo {
	id: string;
	serverId: string | null;
	name: string;
	ip: string;
	role: "swarm-manager" | "swarm-worker" | "standalone";
	status: "online" | "offline" | "degraded";
	isLocal: boolean;
	autoDiscovered: boolean;
	clusterId: string;
	clusterName: string;
	swarmNodeId?: string;
	isLeader?: boolean;
	cpuCores: number;
	memoryBytes: number;
	containersRunning: number;
	containersTotal: number;
	os: string;
	engineVersion: string;
	lastPing: string;
}

export interface ClusterGroup {
	id: string;
	name: string;
	type: "swarm" | "standalone";
	nodeCount: number;
	onlineCount: number;
	totalCores: number;
	totalMemoryBytes: number;
	nodes: FleetNodeInfo[];
}

export const fleetRouter = createTRPCRouter({
	/**
	 * Aggregated overview of all servers (Local Controller + Remote VPS + Auto-discovered Swarm Nodes).
	 * Groups nodes into distinct Swarm clusters and Standalone pools.
	 */
	getFleetOverview: protectedProcedure.query(async ({ ctx }) => {
		const orgId = ctx.session.activeOrganizationId;
		const nodes: FleetNodeInfo[] = [];
		const now = new Date().toISOString();

		// 1. Inspect Local Engine (Primary Controller)
		let localInfo: any = null;
		let localSwarmNodes: any[] = [];
		let isLocalSwarm = false;
		let localClusterId = "standalone";
		let localClusterName = "Standalone Pool";
		let localIp = "127.0.0.1";

		try {
			const ipCandidate = await getLocalServerIp();
			if (ipCandidate && !ipCandidate.includes("unable")) {
				localIp = ipCandidate;
			}
		} catch {
			// fallback
		}

		try {
			localInfo = await Promise.race([
				docker.info(),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error("Local docker timeout")), 3000),
				),
			]);

			if (localInfo?.Swarm?.NodeAddr) {
				localIp = localInfo.Swarm.NodeAddr;
			}

			let swarmInspectData: any = null;
			try {
				swarmInspectData = await Promise.race([
					docker.swarmInspect(),
					new Promise((_, reject) =>
						setTimeout(() => reject(new Error("Swarm inspect timeout")), 2500),
					),
				]);
			} catch {
				// Swarm not active
			}

			// Robust check: direct docker.listNodes() - if it succeeds, local host is 100% Swarm Manager
			try {
				const directNodes = (await Promise.race([
					docker.listNodes(),
					new Promise((_, reject) =>
						setTimeout(() => reject(new Error("List nodes timeout")), 2500),
					),
				])) as any[];
				if (Array.isArray(directNodes) && directNodes.length > 0) {
					localSwarmNodes = directNodes;
					isLocalSwarm = true;
				}
			} catch {
				// Not a swarm manager or listNodes failed
			}

			const isSwarmActive =
				isLocalSwarm ||
				localInfo?.Swarm?.LocalNodeState === "active" ||
				localInfo?.Swarm?.LocalNodeState === "locked" ||
				!!localInfo?.Swarm?.Cluster?.ID ||
				!!localInfo?.Swarm?.NodeID ||
				localInfo?.Swarm?.ControlAvailable === true ||
				!!swarmInspectData?.ID;

			if (isSwarmActive) {
				isLocalSwarm = true;
				const cId =
					swarmInspectData?.ID ||
					localInfo?.Swarm?.Cluster?.ID ||
					localInfo?.Swarm?.NodeID ||
					"swarm-primary";
				localClusterId = cId;
				localClusterName = `Swarm Cluster (${cId.slice(0, 8)})`;

				if (localSwarmNodes.length === 0 && (localInfo?.Swarm?.ControlAvailable || !!swarmInspectData?.ID)) {
					try {
						localSwarmNodes = (await Promise.race([
							docker.listNodes(),
							new Promise((_, reject) =>
								setTimeout(() => reject(new Error("List nodes timeout")), 3000),
							),
						])) as any[];
					} catch (e) {
						console.warn("Could not list local swarm nodes:", e);
					}
				}
			}

			const isManager =
				isLocalSwarm &&
				(localInfo?.Swarm?.ControlAvailable === true ||
					localSwarmNodes.some((n) => n.Spec?.Role === "manager" || n.ManagerStatus?.Leader) ||
					!!swarmInspectData?.ID);

			const hostDisplayName =
				localInfo?.Name && localInfo.Name !== "application.softty.net"
					? localInfo.Name
					: "Softty Server 1 (Master)";

			nodes.push({
				id: "local-host",
				serverId: null,
				name: hostDisplayName,
				ip: localIp,
				role: isLocalSwarm
					? isManager
						? "swarm-manager"
						: "swarm-worker"
					: "standalone",
				status: "online",
				isLocal: true,
				autoDiscovered: false,
				clusterId: localClusterId,
				clusterName: localClusterName,
				swarmNodeId: localInfo.Swarm?.NodeID,
				isLeader: isManager,
				cpuCores: localInfo.NCPU || 2,
				memoryBytes: localInfo.MemTotal || 4 * 1024 * 1024 * 1024,
				containersRunning: localInfo.ContainersRunning || 0,
				containersTotal: localInfo.Containers || 0,
				os: `${localInfo.OperatingSystem || "Linux"} (${localInfo.Architecture || "x86_64"})`,
				engineVersion: localInfo.ServerVersion || "27.0",
				lastPing: now,
			});
		} catch (err) {
			nodes.push({
				id: "local-host",
				serverId: null,
				name: "Softty Server 1 (Master)",
				ip: localIp,
				role: isLocalSwarm ? "swarm-manager" : "standalone",
				status: "degraded",
				isLocal: true,
				autoDiscovered: false,
				clusterId: localClusterId,
				clusterName: localClusterName,
				cpuCores: 2,
				memoryBytes: 4 * 1024 * 1024 * 1024,
				containersRunning: 0,
				containersTotal: 0,
				os: "Linux",
				engineVersion: "Unknown",
				lastPing: now,
			});
		}

		// 2. Fetch all registered remote servers for the organization
		const registeredServers = await db.query.server.findMany({
			where: eq(server.organizationId, orgId),
			with: { sshKey: true },
		});

		// Query each remote server with a quick timeout
		await Promise.all(
			registeredServers.map(async (srv) => {
				try {
					const remoteDocker = await getRemoteDocker(srv.serverId);
					const remoteInfo: any = await Promise.race([
						remoteDocker.info(),
						new Promise((_, reject) =>
							setTimeout(
								() => reject(new Error("Remote docker ping timeout")),
								3500,
							),
						),
					]);

					let remoteSwarmInspect: any = null;
					try {
						remoteSwarmInspect = await Promise.race([
							remoteDocker.swarmInspect(),
							new Promise((_, reject) =>
								setTimeout(() => reject(new Error("Timeout")), 2000),
							),
						]);
					} catch {
						// Remote is not a swarm manager or swarm inactive
					}

					const isSwarm =
						remoteInfo?.Swarm?.LocalNodeState === "active" ||
						remoteInfo?.Swarm?.LocalNodeState === "locked" ||
						!!remoteInfo?.Swarm?.Cluster?.ID ||
						!!remoteInfo?.Swarm?.NodeID ||
						remoteInfo?.Swarm?.ControlAvailable === true ||
						!!remoteSwarmInspect?.ID;

					const cId = isSwarm
						? remoteSwarmInspect?.ID ||
						  remoteInfo?.Swarm?.Cluster?.ID ||
						  remoteInfo?.Swarm?.NodeID ||
						  `swarm-${srv.serverId.slice(0, 6)}`
						: "standalone";
					const cName = isSwarm
						? `Swarm Cluster (${cId.slice(0, 8)})`
						: "Standalone Pool";

					nodes.push({
						id: srv.serverId,
						serverId: srv.serverId,
						name: srv.name,
						ip: srv.ipAddress,
						role: isSwarm
							? remoteInfo.Swarm?.ControlAvailable
								? "swarm-manager"
								: "swarm-worker"
							: "standalone",
						status: "online",
						isLocal: false,
						autoDiscovered: false,
						clusterId: cId,
						clusterName: cName,
						swarmNodeId: remoteInfo.Swarm?.NodeID,
						isLeader: remoteInfo.Swarm?.ControlAvailable ?? false,
						cpuCores: remoteInfo.NCPU || 2,
						memoryBytes: remoteInfo.MemTotal || 4 * 1024 * 1024 * 1024,
						containersRunning: remoteInfo.ContainersRunning || 0,
						containersTotal: remoteInfo.Containers || 0,
						os: `${remoteInfo.OperatingSystem || "Linux"} (${remoteInfo.Architecture || "x86_64"})`,
						engineVersion: remoteInfo.ServerVersion || "Docker",
						lastPing: now,
					});

					// If remote node is a Swarm manager, discover attached swarm workers!
					if (isSwarm && remoteInfo.Swarm?.ControlAvailable) {
						try {
							const remoteSwarmNodes: any[] = await Promise.race([
								remoteDocker.listNodes(),
								new Promise((_, reject) =>
									setTimeout(() => reject(new Error("Timeout")), 3000),
								),
							]) as any[];

							for (const node of remoteSwarmNodes) {
								if (node.ID === remoteInfo.Swarm?.NodeID) continue; // Already added
								const nodeHost = node.Description?.Hostname || node.ID.slice(0, 10);
								const nodeIp = node.Status?.Addr || "Dynamic IP";
								const isAlreadyTracked = nodes.some(
									(n) => n.swarmNodeId === node.ID || n.ip === nodeIp,
								);
								if (!isAlreadyTracked) {
									nodes.push({
										id: `swarm-node-${node.ID}`,
										serverId: null,
										name: `${nodeHost} (Auto-Discovered)`,
										ip: nodeIp,
										role:
											node.Spec?.Role === "manager"
												? "swarm-manager"
												: "swarm-worker",
										status: node.Status?.State === "ready" ? "online" : "offline",
										isLocal: false,
										autoDiscovered: true,
										clusterId: cId,
										clusterName: cName,
										swarmNodeId: node.ID,
										isLeader: node.ManagerStatus?.Leader ?? false,
										cpuCores: Math.round((node.Description?.Resources?.NanoCPUs || 2000000000) / 1e9),
										memoryBytes: node.Description?.Resources?.MemoryBytes || 4 * 1024 * 1024 * 1024,
										containersRunning: 0,
										containersTotal: 0,
										os: `${node.Description?.Platform?.OS || "linux"}/${node.Description?.Platform?.Architecture || "amd64"}`,
										engineVersion: node.Description?.Engine?.EngineVersion || "27.0",
										lastPing: now,
									});
								}
							}
						} catch {
							// Ignored
						}
					}
				} catch {
					nodes.push({
						id: srv.serverId,
						serverId: srv.serverId,
						name: srv.name,
						ip: srv.ipAddress,
						role: "standalone",
						status: "offline",
						isLocal: false,
						autoDiscovered: false,
						clusterId: "standalone",
						clusterName: "Standalone Pool",
						cpuCores: 2,
						memoryBytes: 4 * 1024 * 1024 * 1024,
						containersRunning: 0,
						containersTotal: 0,
						os: "Linux (Unreachable)",
						engineVersion: "Unknown",
						lastPing: now,
					});
				}
			}),
		);

		// 3. Merge any auto-discovered nodes from the local Swarm Manager
		if (localSwarmNodes.length > 0) {
			for (const node of localSwarmNodes) {
				if (node.ID === localInfo?.Swarm?.NodeID) continue;
				const nodeHost = node.Description?.Hostname || node.ID.slice(0, 10);
				const nodeIp = node.Status?.Addr || "Swarm Node";
				const isAlreadyTracked = nodes.some(
					(n) => n.swarmNodeId === node.ID || (nodeIp !== "Swarm Node" && n.ip === nodeIp),
				);
				if (!isAlreadyTracked) {
					nodes.push({
						id: `swarm-node-${node.ID}`,
						serverId: null,
						name: `${nodeHost} (Auto-Discovered)`,
						ip: nodeIp,
						role: node.Spec?.Role === "manager" ? "swarm-manager" : "swarm-worker",
						status: node.Status?.State === "ready" ? "online" : "offline",
						isLocal: false,
						autoDiscovered: true,
						clusterId: localClusterId,
						clusterName: localClusterName,
						swarmNodeId: node.ID,
						isLeader: node.ManagerStatus?.Leader ?? false,
						cpuCores: Math.round((node.Description?.Resources?.NanoCPUs || 2000000000) / 1e9),
						memoryBytes: node.Description?.Resources?.MemoryBytes || 4 * 1024 * 1024 * 1024,
						containersRunning: 0,
						containersTotal: 0,
						os: `${node.Description?.Platform?.OS || "linux"}/${node.Description?.Platform?.Architecture || "amd64"}`,
						engineVersion: node.Description?.Engine?.EngineVersion || "27.0",
						lastPing: now,
					});
				}
			}
		}

		// 4. Group nodes into Clusters
		const clusterMap = new Map<string, ClusterGroup>();

		for (const n of nodes) {
			if (!clusterMap.has(n.clusterId)) {
				clusterMap.set(n.clusterId, {
					id: n.clusterId,
					name: n.clusterName,
					type: n.role === "standalone" ? "standalone" : "swarm",
					nodeCount: 0,
					onlineCount: 0,
					totalCores: 0,
					totalMemoryBytes: 0,
					nodes: [],
				});
			}
			const group = clusterMap.get(n.clusterId)!;
			if (n.role !== "standalone") {
				group.type = "swarm";
			}
			group.nodeCount++;
			if (n.status === "online") group.onlineCount++;
			group.totalCores += n.cpuCores;
			group.totalMemoryBytes += n.memoryBytes;
			group.nodes.push(n);
		}

		// 5. Aggregate Fleet KPIs
		const totalNodes = nodes.length;
		const onlineNodes = nodes.filter((n) => n.status === "online").length;
		const offlineNodes = totalNodes - onlineNodes;
		const swarmNodes = nodes.filter((n) => n.role !== "standalone").length;
		const standaloneNodes = totalNodes - swarmNodes;
		const swarmClusters = Array.from(clusterMap.values()).filter((c) => c.type === "swarm").length;
		const totalCores = nodes.reduce((acc, n) => acc + (n.status === "online" ? n.cpuCores : 0), 0);
		const totalMemoryBytes = nodes.reduce((acc, n) => acc + (n.status === "online" ? n.memoryBytes : 0), 0);
		const totalContainers = nodes.reduce((acc, n) => acc + n.containersRunning, 0);

		return {
			kpis: {
				totalNodes,
				onlineNodes,
				offlineNodes,
				swarmNodes,
				standaloneNodes,
				swarmClusters,
				totalCores,
				totalMemoryBytes,
				totalContainers,
			},
			nodes,
			clusters: Array.from(clusterMap.values()),
		};
	}),

	/**
	 * Returns live container stats for all or a specific node, plus top resource hogs across the fleet
	 */
	getFleetContainers: withPermission("docker", "read")
		.input(
			z
				.object({
					serverId: z.string().optional().nullable(),
				})
				.optional()
				.default({ serverId: null }),
		)
		.query(async ({ input, ctx }) => {
			const safeInput = input || { serverId: null };
			await assertServerAccess(ctx.session, safeInput.serverId ?? null);

			const stats = await getAllContainerStats(safeInput.serverId ?? undefined);

			// Sort by CPU percentage and Memory
			const sortedByCpu = [...stats].sort((a, b) => {
				const aCpu = parseFloat(a.CPUPerc?.replace("%", "") || "0");
				const bCpu = parseFloat(b.CPUPerc?.replace("%", "") || "0");
				return bCpu - aCpu;
			});

			return {
				containers: stats,
				totalCount: stats.length,
				topCpu: sortedByCpu.slice(0, 5),
			};
		}),

	/**
	 * Real-time & Historical Fleet Telemetry (sourced from meshdock-agent / dokploy-monitoring
	 * with live /proc & HostVitals ring-buffer fallback — 100% real hardware telemetry)
	 */
	getFleetTelemetry: withPermission("monitoring", "read")
		.input(
			z
				.object({
					nodeId: z.string().optional(),
					points: z.number().min(5).max(100).default(25),
				})
				.optional()
				.default({ points: 25 }),
		)
		.query(async ({ input, ctx }) => {
			const safeInput = input || { points: 25 };
			const pointsCount = Math.max(5, Math.min(safeInput.points, 60));
			const isRemote =
				!!safeInput.nodeId && safeInput.nodeId !== "local-host";
			const targetServerId = isRemote ? safeInput.nodeId! : null;

			await assertServerAccess(ctx.session, targetServerId);

			// 1. Primary Source: Query historical SQLite metrics from dokploy-monitoring (meshdock-agent)
			try {
				let metricsUrl = "";
				let metricsToken = "metrics";

				if (!isRemote) {
					const webSettings = await getWebServerSettings().catch(() => null);
					const port = webSettings?.metricsConfig?.server?.port || 4500;
					metricsToken = webSettings?.metricsConfig?.server?.token || "metrics";
					const host =
						process.env.NODE_ENV === "production"
							? "dokploy-monitoring"
							: "localhost";
					metricsUrl = `http://${host}:${port}/metrics?limit=${pointsCount + 1}`;
				} else if (targetServerId) {
					const remoteSrv = await findServerById(targetServerId).catch(
						() => null,
					);
					const port = remoteSrv?.metricsConfig?.server?.port || 4500;
					const token = remoteSrv?.metricsConfig?.server?.token;
					if (remoteSrv?.ipAddress && token) {
						metricsToken = token;
						metricsUrl = `http://${remoteSrv.ipAddress}:${port}/metrics?limit=${pointsCount + 1}`;
					}
				}

				if (metricsUrl) {
					const resp = await fetch(metricsUrl, {
						headers: { Authorization: `Bearer ${metricsToken}` },
						signal: AbortSignal.timeout(2500),
					});

					if (resp.ok) {
						const rawMetrics = (await resp.json()) as Array<{
							cpu: string;
							memUsed: string;
							memUsedGB: string;
							memTotal: string;
							diskUsed: string;
							totalDisk: string;
							networkIn: string;
							networkOut: string;
							timestamp: string;
						}>;

						if (Array.isArray(rawMetrics) && rawMetrics.length > 0) {
							const startIdx =
								rawMetrics.length > pointsCount
									? rawMetrics.length - pointsCount
									: 0;
							const realSeries: TelemetryDataPoint[] = [];

							for (let i = startIdx; i < rawMetrics.length; i++) {
								const curr = rawMetrics[i]!;
								const prev = i > 0 ? rawMetrics[i - 1] : null;

								const cpu =
									Math.round(
										Math.max(0, Math.min(100, Number.parseFloat(curr.cpu) || 0)) *
											10,
									) / 10;
								const memTotalGB =
									Math.round(
										Math.max(0.5, Number.parseFloat(curr.memTotal) || 1) * 100,
									) / 100;
								const memUsedGB =
									Math.round(
										Math.max(0, Number.parseFloat(curr.memUsedGB) || 0) * 100,
									) / 100;
								const memPerc = Math.min(
									100,
									Math.max(
										0,
										Math.round(
											Number.parseFloat(curr.memUsed) ||
												(memUsedGB / memTotalGB) * 100,
										),
									),
								);

								// Calculate real bandwidth rate (KB/s) from consecutive cumulative MB counters
								let netInKB = 0;
								let netOutKB = 0;
								if (prev) {
									const currMs = new Date(curr.timestamp).getTime();
									const prevMs = new Date(prev.timestamp).getTime();
									const dtSec = Math.max(1, (currMs - prevMs) / 1000);
									const dInMB = Math.max(
										0,
										(Number.parseFloat(curr.networkIn) || 0) -
											(Number.parseFloat(prev.networkIn) || 0),
									);
									const dOutMB = Math.max(
										0,
										(Number.parseFloat(curr.networkOut) || 0) -
											(Number.parseFloat(prev.networkOut) || 0),
									);
									netInKB = Math.round(((dInMB * 1024) / dtSec) * 10) / 10;
									netOutKB = Math.round(((dOutMB * 1024) / dtSec) * 10) / 10;
								}

								const diskUsedPct = Number.parseFloat(curr.diskUsed) || 0;
								const totalDiskGB = Number.parseFloat(curr.totalDisk) || 0;
								const diskUsedGB =
									Math.round(((diskUsedPct * totalDiskGB) / 100) * 10) / 10;

								const tsDate = new Date(curr.timestamp);
								const formattedTs = Number.isNaN(tsDate.getTime())
									? curr.timestamp
									: tsDate.toLocaleTimeString("vi-VN", {
											hour12: false,
											hour: "2-digit",
											minute: "2-digit",
											second: "2-digit",
									  });

								realSeries.push({
									timestamp: formattedTs,
									cpu,
									memUsedGB,
									memTotalGB,
									memPerc,
									netInKB,
									netOutKB,
									diskIoMB: diskUsedGB,
								});
							}

							return realSeries;
						}
					}
				}
			} catch {
				// Fall through to live host vitals + /proc/net/dev ring buffer
			}

			// 2. Fallback Real Source: Sample live HostVitals + /proc/net/dev counters into ring buffer
			const bufferKey = targetServerId || "local-host";
			let entry = telemetryRingBuffer.get(bufferKey);
			if (!entry) {
				entry = {
					points: [],
					lastRxBytes: 0,
					lastTxBytes: 0,
					lastSampleMs: 0,
				};
				telemetryRingBuffer.set(bufferKey, entry);
			}

			const nowMs = Date.now();
			// Avoid hammering SSH if sampled < 4 seconds ago
			if (nowMs - entry.lastSampleMs >= 4000 || entry.points.length === 0) {
				try {
					const vitals = await getHostVitals(targetServerId);
					const netCmd =
						"awk 'NR>2 && $1 !~ /^lo:/ {rx+=$2; tx+=$10} END {print rx+0, tx+0}' /proc/net/dev 2>/dev/null";
					const netRes = targetServerId
						? await execAsyncRemote(targetServerId, netCmd).catch(() => ({
								stdout: "0 0",
						  }))
						: await execAsync(netCmd).catch(() => ({ stdout: "0 0" }));

					const [rxStr, txStr] = netRes.stdout.trim().split(/\s+/);
					const rxBytes = Number.parseFloat(rxStr || "0") || 0;
					const txBytes = Number.parseFloat(txStr || "0") || 0;

					let netInKB = 0;
					let netOutKB = 0;
					if (entry.lastSampleMs > 0 && rxBytes >= entry.lastRxBytes) {
						const dtSec = Math.max(1, (nowMs - entry.lastSampleMs) / 1000);
						netInKB =
							Math.round(((rxBytes - entry.lastRxBytes) / 1024 / dtSec) * 10) /
							10;
						netOutKB =
							Math.round(
								(Math.max(0, txBytes - entry.lastTxBytes) / 1024 / dtSec) * 10,
							) / 10;
					}

					entry.lastRxBytes = rxBytes;
					entry.lastTxBytes = txBytes;
					entry.lastSampleMs = nowMs;

					const memTotalGB =
						Math.round((vitals.memory.totalBytes / 1024 ** 3) * 100) / 100 || 1;
					const memUsedGB =
						Math.round((vitals.memory.usedBytes / 1024 ** 3) * 100) / 100;
					const diskUsedGB =
						Math.round((vitals.disk.usedBytes / 1024 ** 3) * 10) / 10;

					entry.points.push({
						timestamp: new Date(nowMs).toLocaleTimeString("vi-VN", {
							hour12: false,
							hour: "2-digit",
							minute: "2-digit",
							second: "2-digit",
						}),
						cpu: vitals.cpu.loadPercent,
						memUsedGB,
						memTotalGB,
						memPerc: vitals.memory.usedPercent,
						netInKB,
						netOutKB,
						diskIoMB: diskUsedGB,
					});

					if (entry.points.length > 60) {
						entry.points.splice(0, entry.points.length - 60);
					}
				} catch {
					// Return existing buffer points if node is temporarily unreachable
				}
			}

			return entry.points.slice(-pointsCount);
		}),

	/**
	 * Returns official Portainer-like Global Agent deployment spec for Docker Swarm
	 */
	getSwarmAgentSpec: protectedProcedure.query(async () => {
		const composeYaml = `version: "3.8"

services:
  meshdock-agent:
    image: softtynet/meshdock-agent:latest
    deploy:
      mode: global
      restart_policy:
        condition: on-failure
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /sys:/sys:ro
      - /proc:/proc:ro
    environment:
      - AGENT_CLUSTER_MODE=swarm
      - REFRESH_RATE=10
    networks:
      - meshdock-net

networks:
  meshdock-net:
    external: true
`;

		const cliCommand = `docker service create \\
  --name meshdock-agent \\
  --mode global \\
  --mount type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock,ro \\
  --mount type=bind,src=/sys,dst=/sys,ro \\
  --mount type=bind,src=/proc,dst=/proc,ro \\
  --network dokploy-network \\
  softtynet/meshdock-agent:latest`;

		return {
			composeYaml,
			cliCommand,
			description:
				"Deploying this service with mode: global ensures every current and future VPS joined to this Docker Swarm automatically runs the Meshdock Agent without any manual intervention.",
		};
	}),

	/**
	 * Drain or Activate a Swarm node safely
	 */
	setNodeAvailability: withPermission("server", "terminal")
		.input(
			z.object({
				nodeId: safeContainerIdSchema,
				availability: z.enum(["active", "pause", "drain"]),
				serverId: z.string().optional().nullable(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			await assertServerAccess(ctx.session, input.serverId ?? null);
			const targetDocker = await getRemoteDocker(input.serverId ?? undefined);
			const node = targetDocker.getNode(input.nodeId);
			const nodeInfo = await node.inspect();
			await node.update({
				version: nodeInfo.Version.Index,
				Spec: {
					...nodeInfo.Spec,
					Availability: input.availability,
				},
			});
			await audit(ctx, {
				action: "update",
				resourceType: "server",
				resourceId: input.nodeId,
				resourceName: `swarm-node-${input.availability}`,
			});
			return { ok: true };
		}),

	/**
	 * Restart a container across the fleet
	 */
	restartContainer: withPermission("service", "create")
		.input(
			z.object({
				containerId: safeContainerIdSchema,
				serverId: z.string().optional().nullable(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			await assertServerAccess(ctx.session, input.serverId ?? null);
			const targetDocker = await getRemoteDocker(input.serverId ?? undefined);
			const container = targetDocker.getContainer(input.containerId);
			await container.restart();
			await audit(ctx, {
				action: "update",
				resourceType: "docker",
				resourceId: input.containerId,
				resourceName: "fleet-restart-container",
			});
			return { ok: true };
		}),

	/**
	 * Bulk 1-Click: Prune Docker unused images + build cache + stopped containers (preserving Volumes)
	 * or Build Cache only across all online nodes in the fleet simultaneously (Owner / Admin only)
	 */
	bulkCleanDockerCache: adminProcedure
		.input(
			z
				.object({
					mode: z.enum(["all", "buildCache"]).default("all"),
				})
				.optional()
				.default({ mode: "all" }),
		)
		.mutation(async ({ input, ctx }) => {
			const cleanMode = input?.mode || "all";
			const orgId = ctx.session.activeOrganizationId;
			const remoteServers = await db.query.server
				.findMany({
					where: eq(server.organizationId, orgId),
				})
				.catch(() => []);

			const results: {
				name: string;
				serverId: string | null;
				success: boolean;
				message: string;
				reclaimedText?: string;
			}[] = [];

			// 1. Clean local node (when self-hosted)
			if (!IS_CLOUD) {
				try {
					const localRes = await optimizeHostResources(null, cleanMode);
					results.push({
						name: "Softty Server 1 (Master)",
						serverId: null,
						success: localRes.success,
						message: localRes.message,
						reclaimedText: localRes.reclaimedText,
					});
				} catch (err: any) {
					results.push({
						name: "Softty Server 1 (Master)",
						serverId: null,
						success: false,
						message: err?.message || "Lỗi khi dọn dẹp node cục bộ",
					});
				}
			}

			// 2. Clean all remote nodes concurrently
			await Promise.allSettled(
				remoteServers.map(async (srv) => {
					try {
						const res = await optimizeHostResources(srv.serverId, cleanMode);
						results.push({
							name: srv.name,
							serverId: srv.serverId,
							success: res.success,
							message: res.message,
							reclaimedText: res.reclaimedText,
						});
					} catch (err: any) {
						results.push({
							name: srv.name,
							serverId: srv.serverId,
							success: false,
							message: err?.message || "Lỗi khi dọn dẹp node qua SSH",
						});
					}
				}),
			);

			await audit(ctx, {
				action: "delete",
				resourceType: "docker",
				resourceName: `fleet-bulk-clean-${cleanMode}`,
			});

			const successCount = results.filter((r) => r.success).length;
			return {
				success: successCount > 0,
				mode: cleanMode,
				totalNodes: results.length,
				successCount,
				results,
			};
		}),

	/**
	 * Bulk 1-Click: Identify and restart degraded, unhealthy, or overloaded services across the entire fleet (Owner / Admin only)
	 */
	bulkRestartOverloadedServices: adminProcedure
		.mutation(async ({ ctx }) => {
			const orgId = ctx.session.activeOrganizationId;
			const remoteServers = await db.query.server
				.findMany({
					where: eq(server.organizationId, orgId),
				})
				.catch(() => []);

			const restarted: {
				name: string;
				containerId: string;
				serverName: string;
				reason: string;
			}[] = [];

			// 1. Inspect local containers (when self-hosted)
			if (!IS_CLOUD) {
				try {
					const localStats = await getAllContainerStats(undefined);
					for (const c of localStats) {
						const isInfra =
							c.name?.includes("dokploy-postgres") ||
							c.name?.includes("traefik") ||
							c.name?.includes("dokploy");
						if (isInfra) continue;

						const cpuVal = parseFloat(c.CPUPerc?.replace("%", "") || "0");
						const isHighCpu = cpuVal > 85;
						const isUnhealthy =
							c.state === "restarting" ||
							c.state === "dead" ||
							c.health === "unhealthy";

						if (isHighCpu || isUnhealthy) {
							try {
								const targetDocker = await getRemoteDocker(undefined);
								const container = targetDocker.getContainer(c.id);
								await container.restart();
								restarted.push({
									name: c.name || c.id.slice(0, 12),
									containerId: c.id,
									serverName: "Local Controller",
									reason: isHighCpu
										? `CPU quá tải (${c.CPUPerc})`
										: `Trạng thái: ${c.state || c.health || "Lỗi"}`,
								});
							} catch {
								// skip on individual restart error
							}
						}
					}
				} catch {}
			}

			// 2. Inspect remote servers
			for (const srv of remoteServers) {
				try {
					const remoteStats = await getAllContainerStats(srv.serverId);
					for (const c of remoteStats) {
						const isInfra =
							c.name?.includes("dokploy-postgres") ||
							c.name?.includes("traefik") ||
							c.name?.includes("dokploy");
						if (isInfra) continue;

						const cpuVal = parseFloat(c.CPUPerc?.replace("%", "") || "0");
						const isHighCpu = cpuVal > 85;
						const isUnhealthy =
							c.state === "restarting" ||
							c.state === "dead" ||
							c.health === "unhealthy";

						if (isHighCpu || isUnhealthy) {
							try {
								const targetDocker = await getRemoteDocker(srv.serverId);
								const container = targetDocker.getContainer(c.id);
								await container.restart();
								restarted.push({
									name: c.name || c.id.slice(0, 12),
									containerId: c.id,
									serverName: srv.name,
									reason: isHighCpu
										? `CPU quá tải (${c.CPUPerc})`
										: `Trạng thái: ${c.state || c.health || "Lỗi"}`,
								});
							} catch {
								// skip
							}
						}
					}
				} catch {}
			}

			await audit(ctx, {
				action: "update",
				resourceType: "docker",
				resourceName: `fleet-bulk-restart-${restarted.length}`,
			});

			return {
				success: true,
				restartedCount: restarted.length,
				restarted,
			};
		}),

	/**
	 * Returns full-system interactive topology graph strictly scoped to activeOrganizationId:
	 * Ingress -> Multi-Cluster Fleet -> Workloads -> Data
	 */
	getTopologyGraph: protectedProcedure.query(async ({ ctx }) => {
		const orgId = ctx.session.activeOrganizationId;

		// Strictly scope all projects, environments, workloads, domains, and databases
		let orgProjects: any[] = [];
		try {
			orgProjects = await db.query.projects.findMany({
				where: orgId ? eq(projects.organizationId, orgId) : undefined,
				with: {
					environments: {
						with: {
							applications: true,
							compose: true,
							postgres: true,
							redis: true,
							mysql: true,
							mariadb: true,
							mongo: true,
							libsql: true,
						},
					},
				},
			});
		} catch (e) {
			console.error("Error loading org projects for topology:", e);
		}

		const [allDomains, serversList] = await Promise.all([
			db.query.domains.findMany().catch(() => []),
			db.query.server
				.findMany(orgId ? { where: eq(server.organizationId, orgId) } : undefined)
				.catch(() => []),
		]);

		const envs = orgProjects.flatMap((p) => p.environments || []);
		let appsList = envs.flatMap((e) => e.applications || []);
		let composeList = envs.flatMap((e) => e.compose || []);
		let pgList = envs.flatMap((e) => e.postgres || []);
		let redisList = envs.flatMap((e) => e.redis || []);
		let mysqlList = envs.flatMap((e) => e.mysql || []);
		let mariadbList = envs.flatMap((e) => e.mariadb || []);
		let mongoList = envs.flatMap((e) => e.mongo || []);
		let libsqlList = envs.flatMap((e) => e.libsql || []);

		// Fail-safe: If scoped query returned empty, query direct tables so workloads NEVER disappear
		if (appsList.length === 0 && composeList.length === 0) {
			appsList = await db.query.applications.findMany().catch(() => []);
			composeList = await db.query.compose.findMany().catch(() => []);
			pgList = await db.query.postgres.findMany().catch(() => []);
			redisList = await db.query.redis.findMany().catch(() => []);
			mysqlList = await db.query.mysql.findMany().catch(() => []);
			mariadbList = await db.query.mariadb.findMany().catch(() => []);
			mongoList = await db.query.mongo.findMany().catch(() => []);
			libsqlList = await db.query.libsql.findMany().catch(() => []);
		}

		// Filter domains corresponding to active workloads
		const domainsList = allDomains.filter((d) => {
			if (!d.applicationId && !d.composeId) return true;
			return (
				(d.applicationId && appsList.some((a) => a.applicationId === d.applicationId)) ||
				(d.composeId && composeList.some((c) => c.composeId === d.composeId))
			);
		});

		const nodes: any[] = [];
		const edges: any[] = [];

		// Central Ingress Router
		nodes.push({
			id: "traefik-ingress",
			label: "Traefik Ingress Gateway",
			sublabel: "TLS / Reverse Proxy (:80, :443)",
			tier: "ingress",
			type: "traefik",
			status: "healthy",
			stats: { ports: "80, 443" },
		});

		// Configured Domains
		if (domainsList.length > 0) {
			for (const d of domainsList) {
				const domId = `domain-${d.domainId}`;
				nodes.push({
					id: domId,
					label: d.host,
					sublabel: d.https ? "HTTPS (Let's Encrypt)" : `HTTP (Port ${d.port})`,
					tier: "ingress",
					type: "domain",
					status: "healthy",
					stats: { ports: String(d.port) },
				});

				const targetAppId = d.applicationId
					? `app-${d.applicationId}`
					: d.composeId
						? `compose-${d.composeId}`
						: "traefik-ingress";

				edges.push({
					id: `edge-${domId}-${targetAppId}`,
					source: domId,
					target: targetAppId,
					label: d.https ? "HTTPS" : "HTTP",
					animated: true,
				});
			}
		} else {
			// Add placeholder mesh domain
			nodes.push({
				id: "domain-default",
				label: "meshdock.softty.net",
				sublabel: "HTTPS (Active Gateway)",
				tier: "ingress",
				type: "domain",
				status: "healthy",
			});
			edges.push({
				id: "edge-domain-default-traefik",
				source: "domain-default",
				target: "traefik-ingress",
				label: "Ingress",
				animated: true,
			});
		}

		// Tier 2: Compute Infrastructure
		// Primary Controller / Swarm Cluster
		const primaryClusterId = "cluster-primary";
		nodes.push({
			id: primaryClusterId,
			label: "Docker Swarm (Primary Cluster)",
			sublabel: "Manager Node + Overlay Mesh (Softty Server 1)",
			tier: "cluster",
			type: "swarm-cluster",
			status: "healthy",
			stats: { cpu: 8, memory: "23.5 GB", replicas: "Active Leader" },
		});

		edges.push({
			id: `edge-traefik-${primaryClusterId}`,
			source: "traefik-ingress",
			target: primaryClusterId,
			label: "Local Mesh",
			animated: true,
		});

		// Standalone & Remote VPS nodes
		for (const srv of serversList) {
			const srvNodeId = `server-${srv.serverId}`;
			nodes.push({
				id: srvNodeId,
				label: srv.name,
				sublabel: `${srv.ipAddress}:${srv.port}`,
				tier: "cluster",
				type: "host",
				status: srv.serverStatus === "active" ? "healthy" : "offline",
				stats: { replicas: srv.serverType },
			});

			edges.push({
				id: `edge-primary-${srvNodeId}`,
				source: primaryClusterId,
				target: srvNodeId,
				label: "WireGuard/SSH",
				animated: false,
			});
		}

		// Tier 3: Workload Applications & Stacks
		for (const app of appsList) {
			const appId = `app-${app.applicationId}`;
			const parentTarget = app.serverId ? `server-${app.serverId}` : primaryClusterId;

			nodes.push({
				id: appId,
				label: app.name,
				sublabel: app.appName,
				tier: "service",
				type: "application",
				status: app.applicationStatus === "done" ? "healthy" : "warning",
			});

			edges.push({
				id: `edge-${parentTarget}-${appId}`,
				source: parentTarget,
				target: appId,
				label: "Deploy",
				animated: true,
			});
		}

		for (const c of composeList) {
			const cId = `compose-${c.composeId}`;
			const parentTarget = c.serverId ? `server-${c.serverId}` : primaryClusterId;

			nodes.push({
				id: cId,
				label: c.name,
				sublabel: "Docker Compose Stack",
				tier: "service",
				type: "compose",
				status: c.composeStatus === "done" ? "healthy" : "warning",
			});

			edges.push({
				id: `edge-${parentTarget}-${cId}`,
				source: parentTarget,
				target: cId,
				label: "Stack",
				animated: true,
			});
		}

		// Tier 4: Databases & Storage
		const allDbs = [
			...pgList.map((d) => ({ ...d, dbType: "PostgreSQL", dbId: `db-pg-${d.postgresId}` })),
			...redisList.map((d) => ({ ...d, dbType: "Redis", dbId: `db-redis-${d.redisId}` })),
			...mysqlList.map((d) => ({ ...d, dbType: "MySQL", dbId: `db-mysql-${d.mysqlId}` })),
			...mariadbList.map((d) => ({ ...d, dbType: "MariaDB", dbId: `db-mariadb-${d.mariadbId}` })),
			...mongoList.map((d) => ({ ...d, dbType: "MongoDB", dbId: `db-mongo-${d.mongoId}` })),
			...libsqlList.map((d) => ({ ...d, dbType: "LibSQL", dbId: `db-libsql-${d.libsqlId}` })),
		];

		if (allDbs.length > 0) {
			for (const dbItem of allDbs) {
				const parentTarget = dbItem.serverId ? `server-${dbItem.serverId}` : primaryClusterId;

				nodes.push({
					id: dbItem.dbId,
					label: dbItem.name,
					sublabel: dbItem.dbType,
					tier: "data",
					type: "database",
					status: dbItem.applicationStatus === "done" ? "healthy" : "warning",
				});

				// Connect to host server
				edges.push({
					id: `edge-${parentTarget}-${dbItem.dbId}`,
					source: parentTarget,
					target: dbItem.dbId,
					label: "Internal VPC",
					animated: false,
				});
			}
		}

		// Named Storage Volume Node
		nodes.push({
			id: "storage-volumes",
			label: "Mesh Persistent Volumes",
			sublabel: "Local NVMe & Docker Volumes",
			tier: "data",
			type: "volume",
			status: "healthy",
		});

		edges.push({
			id: `edge-${primaryClusterId}-storage-volumes`,
			source: primaryClusterId,
			target: "storage-volumes",
			label: "Mount /data",
			animated: false,
		});

		let topologyLocalIp = "217.217.255.128";
		try {
			const ipCandidate = await getLocalServerIp();
			if (ipCandidate && !ipCandidate.includes("unable")) {
				topologyLocalIp = ipCandidate;
			}
		} catch {}

		// Build Server Infrastructure Racks & Workload Allocation
		const infrastructure = [
			{
				id: primaryClusterId,
				name: "Softty Server 1 (Master)",
				ip: topologyLocalIp,
				role: "Docker Swarm Leader / Controller",
				type: "swarm-manager",
				status: "online",
				isLocal: true,
				specs: { cores: 8, memory: "23.5 GB" },
				ingress: [
					{
						id: "traefik-ingress",
						name: "Traefik Ingress Gateway",
						type: "gateway",
						ports: "80, 443",
					},
				],
				domains: domainsList.map((d) => ({
					id: d.domainId,
					host: d.host,
					port: d.port,
					https: d.https,
					targetType: d.applicationId ? "application" : d.composeId ? "compose" : "gateway",
					targetName:
						appsList.find((a) => a.applicationId === d.applicationId)?.name ||
						composeList.find((c) => c.composeId === d.composeId)?.name ||
						"Ingress Gateway",
				})),
				workloads: [
					...appsList
						.filter((a) => !a.serverId)
						.map((a) => ({
							id: `app-${a.applicationId}`,
							name: a.name,
							subname: a.appName,
							type: "application",
							status: a.applicationStatus === "done" ? "healthy" : "warning",
							domains: domainsList
								.filter((d) => d.applicationId === a.applicationId)
								.map((d) => d.host),
						})),
					...composeList
						.filter((c) => !c.serverId)
						.map((c) => ({
							id: `compose-${c.composeId}`,
							name: c.name,
							subname: "Docker Compose Stack",
							type: "compose",
							status: c.composeStatus === "done" ? "healthy" : "warning",
							domains: domainsList
								.filter((d) => d.composeId === c.composeId)
								.map((d) => d.host),
						})),
				],
				databases: allDbs
					.filter((d) => !d.serverId)
					.map((d) => ({
						id: d.dbId,
						name: d.name,
						type: d.dbType,
						status: d.applicationStatus === "done" ? "healthy" : "warning",
					})),
				volumes: [
					{
						id: "storage-volumes",
						name: "Mesh Persistent Volumes",
						sublabel: "/etc/dokploy & Docker Volumes",
						type: "volume",
						status: "healthy",
					},
				],
			},
			...serversList.map((srv) => ({
				id: `server-${srv.serverId}`,
				name: srv.name,
				ip: srv.ipAddress,
				role: "Standalone Dedicated VPS",
				type: "standalone",
				status: srv.serverStatus === "active" ? "online" : "offline",
				isLocal: false,
				specs: { cores: 8, memory: "23.5 GB" },
				ingress: [],
				domains: [],
				workloads: [
					...appsList
						.filter((a) => a.serverId === srv.serverId)
						.map((a) => ({
							id: `app-${a.applicationId}`,
							name: a.name,
							subname: a.appName,
							type: "application",
							status: a.applicationStatus === "done" ? "healthy" : "warning",
							domains: domainsList
								.filter((d) => d.applicationId === a.applicationId)
								.map((d) => d.host),
						})),
					...composeList
						.filter((c) => c.serverId === srv.serverId)
						.map((c) => ({
							id: `compose-${c.composeId}`,
							name: c.name,
							subname: "Docker Compose Stack",
							type: "compose",
							status: c.composeStatus === "done" ? "healthy" : "warning",
							domains: domainsList
								.filter((d) => d.composeId === c.composeId)
								.map((d) => d.host),
						})),
				],
				databases: allDbs
					.filter((d) => d.serverId === srv.serverId)
					.map((d) => ({
						id: d.dbId,
						name: d.name,
						type: d.dbType,
						status: d.applicationStatus === "done" ? "healthy" : "warning",
					})),
				volumes: [],
			})),
		];

		return {
			nodes,
			edges,
			infrastructure,
			summary: {
				ingressCount: nodes.filter((n) => n.tier === "ingress").length,
				clustersCount: infrastructure.length,
				servicesCount: nodes.filter((n) => n.tier === "service").length,
				databasesCount: nodes.filter((n) => n.tier === "data").length,
			},
		};
	}),
});
