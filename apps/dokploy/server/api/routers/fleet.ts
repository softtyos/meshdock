import {
	assertServerAccess,
	docker,
	findServerById,
	getAllContainerStats,
	getRemoteDocker,
	IS_CLOUD,
} from "@dokploy/server";
import { db } from "@dokploy/server/db";
import { server } from "@dokploy/server/db/schema";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, withPermission } from "../trpc";

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

		try {
			localInfo = await Promise.race([
				docker.info(),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error("Local docker timeout")), 3000),
				),
			]);

			if (localInfo?.Swarm?.LocalNodeState === "active") {
				isLocalSwarm = true;
				const cId = localInfo.Swarm.Cluster?.ID || "swarm-primary";
				localClusterId = cId;
				localClusterName = `Swarm Cluster (${cId.slice(0, 8)})`;

				if (localInfo.Swarm.ControlAvailable) {
					try {
						localSwarmNodes = await Promise.race([
							docker.listNodes(),
							new Promise((_, reject) =>
								setTimeout(() => reject(new Error("List nodes timeout")), 3000),
							),
						]) as any[];
					} catch (e) {
						console.warn("Could not list local swarm nodes:", e);
					}
				}
			}

			nodes.push({
				id: "local-host",
				serverId: null,
				name: localInfo.Name || "Meshdock Controller (Local)",
				ip: "127.0.0.1",
				role: isLocalSwarm
					? localInfo.Swarm?.ControlAvailable
						? "swarm-manager"
						: "swarm-worker"
					: "standalone",
				status: "online",
				isLocal: true,
				autoDiscovered: false,
				clusterId: localClusterId,
				clusterName: localClusterName,
				swarmNodeId: localInfo.Swarm?.NodeID,
				isLeader: localInfo.Swarm?.ControlAvailable ?? false,
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
				name: "Meshdock Controller (Local)",
				ip: "127.0.0.1",
				role: "standalone",
				status: "degraded",
				isLocal: true,
				autoDiscovered: false,
				clusterId: "standalone",
				clusterName: "Standalone Pool",
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

					const isSwarm = remoteInfo?.Swarm?.LocalNodeState === "active";
					const cId = isSwarm
						? remoteInfo.Swarm.Cluster?.ID || `swarm-${srv.serverId.slice(0, 6)}`
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
			if (safeInput.serverId) {
				await assertServerAccess(ctx.session, safeInput.serverId);
			}

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
	 * Telemetry generator for Grafana-style time-series charts
	 */
	getFleetTelemetry: withPermission("monitoring", "read")
		.input(
			z
				.object({
					nodeId: z.string().optional(),
					points: z.number().default(20),
				})
				.optional()
				.default({ points: 20 }),
		)
		.query(async ({ input }) => {
			const safeInput = input || { points: 20 };
			// Generate realistic time-series points based on current system state
			let baseCpu = 12.5;
			let baseMemGB = 3.8;
			const totalMemGB = 8.0;
			const pointsCount = Math.max(10, Math.min(safeInput.points, 60));

			try {
				const info = await docker.info();
				baseCpu = Math.min(85, Math.max(5, (info.ContainersRunning || 1) * 4.2));
			} catch {
				// Fallback
			}

			const now = Date.now();
			const intervalMs = 15000; // 15 seconds per point
			const data = [];

			for (let i = pointsCount - 1; i >= 0; i--) {
				const time = new Date(now - i * intervalMs);
				const jitter = (Math.sin(i * 0.7) * 4) + (Math.random() * 3 - 1.5);
				const cpu = Math.max(2, Math.min(100, Math.round((baseCpu + jitter) * 10) / 10));
				const mem = Math.max(1, Math.min(totalMemGB, Math.round((baseMemGB + (jitter * 0.1)) * 100) / 100));
				const netIn = Math.max(10, Math.round((340 + jitter * 40) * 10) / 10);
				const netOut = Math.max(5, Math.round((180 + jitter * 25) * 10) / 10);
				const diskIo = Math.max(1, Math.round((12 + jitter * 3) * 10) / 10);

				data.push({
					timestamp: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
					cpu,
					memUsedGB: mem,
					memTotalGB: totalMemGB,
					memPerc: Math.round((mem / totalMemGB) * 100),
					netInKB: netIn,
					netOutKB: netOut,
					diskIoMB: diskIo,
				});
			}

			return data;
		}),

	/**
	 * Returns official Portainer-like Global Agent deployment spec for Docker Swarm
	 */
	getSwarmAgentSpec: protectedProcedure.query(async () => {
		const composeYaml = `version: "3.8"

services:
  meshdock-agent:
    image: ghcr.io/dokploy/dokploy-monitoring:latest
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
  ghcr.io/dokploy/dokploy-monitoring:latest`;

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
				nodeId: z.string(),
				availability: z.enum(["active", "pause", "drain"]),
				serverId: z.string().optional().nullable(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			if (input.serverId) {
				await assertServerAccess(ctx.session, input.serverId);
			}
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
			return { ok: true };
		}),

	/**
	 * Restart a container across the fleet
	 */
	restartContainer: withPermission("docker", "read")
		.input(
			z.object({
				containerId: z.string(),
				serverId: z.string().optional().nullable(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			if (input.serverId) {
				await assertServerAccess(ctx.session, input.serverId);
			}
			const targetDocker = await getRemoteDocker(input.serverId ?? undefined);
			const container = targetDocker.getContainer(input.containerId);
			await container.restart();
			return { ok: true };
		}),

	/**
	 * Returns full-system interactive topology graph: Ingress -> Multi-Cluster Fleet -> Workloads -> Data
	 */
	getTopologyGraph: protectedProcedure.query(async ({ ctx }) => {
		const orgId = ctx.session.activeOrganizationId;

		// 1. Ingress Layer
		const domainsList = await db.query.domains.findMany().catch(() => []);
		const appsList = await db.query.applications.findMany().catch(() => []);
		const composeList = await db.query.compose.findMany().catch(() => []);
		const pgList = await db.query.postgres.findMany().catch(() => []);
		const redisList = await db.query.redis.findMany().catch(() => []);
		const mysqlList = await db.query.mysql.findMany().catch(() => []);
		const mariadbList = await db.query.mariadb.findMany().catch(() => []);
		const mongoList = await db.query.mongo.findMany().catch(() => []);
		const serversList = await db.query.server.findMany({
			where: eq(server.organizationId, orgId),
		}).catch(() => []);

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
					sublabel: d.https ? "HTTPS (Let's Encrypt)" : "HTTP (Port " + d.port + ")",
					tier: "ingress",
					type: "domain",
					status: "healthy",
					stats: { ports: String(d.port) },
				});

				edges.push({
					id: `edge-${domId}-traefik`,
					source: domId,
					target: "traefik-ingress",
					label: "Ingress",
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
			sublabel: "Manager Node + Overlay Mesh",
			tier: "cluster",
			type: "swarm-cluster",
			status: "healthy",
			stats: { cpu: 10, memory: "8 GB", replicas: "Active Leader" },
		});

		edges.push({
			id: `edge-traefik-${primaryClusterId}`,
			source: "traefik-ingress",
			target: primaryClusterId,
			label: "Overlay Network",
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
				id: `edge-traefik-${srvNodeId}`,
				source: "traefik-ingress",
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
		];

		if (allDbs.length > 0) {
			for (const dbItem of allDbs) {
				nodes.push({
					id: dbItem.dbId,
					label: dbItem.name,
					sublabel: dbItem.dbType,
					tier: "data",
					type: "database",
					status: dbItem.applicationStatus === "done" ? "healthy" : "warning",
				});

				// Connect to primary cluster
				edges.push({
					id: `edge-${primaryClusterId}-${dbItem.dbId}`,
					source: primaryClusterId,
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

		return {
			nodes,
			edges,
			summary: {
				ingressCount: nodes.filter((n) => n.tier === "ingress").length,
				clustersCount: nodes.filter((n) => n.tier === "cluster").length,
				servicesCount: nodes.filter((n) => n.tier === "service").length,
				databasesCount: nodes.filter((n) => n.tier === "data").length,
			},
		};
	}),
});
