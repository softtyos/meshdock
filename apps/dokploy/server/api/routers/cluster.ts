import {
	assertServerAccess,
	type DockerNode,
	execAsync,
	execAsyncRemote,
	findServerById,
	getRemoteDocker,
} from "@dokploy/server";
import { TRPCError } from "@trpc/server";
import { quote } from "shell-quote";
import { z } from "zod";
import { audit } from "@/server/api/utils/audit";
import { getLocalServerIp } from "@/server/wss/terminal";
import { createTRPCRouter, withPermission } from "../trpc";

export const clusterRouter = createTRPCRouter({
	getNodes: withPermission("docker", "read")
		.input(
			z.object({
				serverId: z.string().optional(),
			}),
		)
		.query(async ({ input, ctx }) => {
			await assertServerAccess(ctx.session, input.serverId ?? null);
			if (input.serverId) {
				const targetServer = await findServerById(input.serverId);
				if (targetServer.organizationId !== ctx.session.activeOrganizationId) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "You don't have access to this server.",
					});
				}
			}
			const docker = await getRemoteDocker(input.serverId);
			const workers: DockerNode[] = await docker.listNodes();
			return workers;
		}),

	removeWorker: withPermission("server", "delete")
		.input(
			z.object({
				nodeId: z.string(),
				serverId: z.string().optional(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			await assertServerAccess(ctx.session, input.serverId ?? null);
			if (input.serverId) {
				const targetServer = await findServerById(input.serverId);
				if (targetServer.organizationId !== ctx.session.activeOrganizationId) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "You don't have access to this server.",
					});
				}
			}
			try {
				const drainCommand = `docker node update --availability drain ${quote([input.nodeId])}`;
				const removeCommand = `docker node rm ${quote([input.nodeId])} --force`;

				if (input.serverId) {
					await execAsyncRemote(input.serverId, drainCommand);
					await execAsyncRemote(input.serverId, removeCommand);
				} else {
					await execAsync(drainCommand);
					await execAsync(removeCommand);
				}
				await audit(ctx, {
					action: "delete",
					resourceType: "cluster",
					resourceId: input.nodeId,
					resourceName: input.nodeId,
				});
				return true;
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Error removing the node",
					cause: error,
				});
			}
		}),

	addWorker: withPermission("server", "create")
		.input(
			z.object({
				serverId: z.string().optional(),
			}),
		)
		.query(async ({ input, ctx }) => {
			await assertServerAccess(ctx.session, input.serverId ?? null);
			if (input.serverId) {
				const targetServer = await findServerById(input.serverId);
				if (targetServer.organizationId !== ctx.session.activeOrganizationId) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "You don't have access to this server.",
					});
				}
			}
			const docker = await getRemoteDocker(input.serverId);
			const result = await docker.swarmInspect();
			const docker_version = await docker.version();
			const info = await docker.info();

			const swarmNodeAddr = info?.Swarm?.NodeAddr;
			let ip = swarmNodeAddr || (await getLocalServerIp());
			if (!swarmNodeAddr && input.serverId) {
				const server = await findServerById(input.serverId);
				ip = server?.ipAddress;
			}

			return {
				command: `docker swarm join --token ${result.JoinTokens.Worker} ${ip}:2377`,
				version: docker_version.Version,
			};
		}),

	addManager: withPermission("server", "create")
		.input(
			z.object({
				serverId: z.string().optional(),
			}),
		)
		.query(async ({ input, ctx }) => {
			await assertServerAccess(ctx.session, input.serverId ?? null);
			if (input.serverId) {
				const targetServer = await findServerById(input.serverId);
				if (targetServer.organizationId !== ctx.session.activeOrganizationId) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "You don't have access to this server.",
					});
				}
			}
			const docker = await getRemoteDocker(input.serverId);
			const result = await docker.swarmInspect();
			const docker_version = await docker.version();
			const info = await docker.info();

			const swarmNodeAddr = info?.Swarm?.NodeAddr;
			let ip = swarmNodeAddr || (await getLocalServerIp());
			if (!swarmNodeAddr && input.serverId) {
				const server = await findServerById(input.serverId);
				ip = server?.ipAddress;
			}
			return {
				command: `docker swarm join --token ${result.JoinTokens.Manager} ${ip}:2377`,
				version: docker_version.Version,
			};
		}),

	getGlobalAgentStatus: withPermission("docker", "read")
		.input(
			z.object({
				serverId: z.string().optional(),
			}),
		)
		.query(async ({ input, ctx }) => {
			await assertServerAccess(ctx.session, input.serverId ?? null);
			const docker = await getRemoteDocker(input.serverId);

			try {
				const service = docker.getService("dokploy-monitoring");
				const inspect = await service.inspect();
				const isGlobal = !!inspect.Spec?.Mode?.Global;

				const nodes: DockerNode[] = await docker.listNodes().catch(() => []);
				const tasks = await docker.listTasks({
					filters: { service: ["dokploy-monitoring"], "desired-state": ["running"] },
				}).catch(() => []);

				const runningTasks = tasks.filter((t: any) => t.Status?.State === "running");

				return {
					isDeployed: true,
					mode: isGlobal ? ("global" as const) : ("replicated" as const),
					totalNodes: nodes.length,
					runningNodes: runningTasks.length,
					image: inspect.Spec?.TaskTemplate?.ContainerSpec?.Image || "softtynet/monitoring:latest",
					updatedAt: inspect.UpdatedAt,
				};
			} catch {
				return {
					isDeployed: false,
					mode: "none" as const,
					totalNodes: 0,
					runningNodes: 0,
					image: null,
					updatedAt: null,
				};
			}
		}),

	deployGlobalAgent: withPermission("server", "create")
		.input(
			z.object({
				serverId: z.string().optional(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			await assertServerAccess(ctx.session, input.serverId ?? null);
			const { setupGlobalSwarmAgent } = await import("@dokploy/server/setup/monitoring-setup");
			await setupGlobalSwarmAgent(input.serverId);
			await audit(ctx, {
				action: "create",
				resourceType: "cluster",
				resourceId: "dokploy-monitoring-global",
				resourceName: "Swarm Global Agent",
			});
			return { ok: true };
		}),

	setNodeAvailability: withPermission("server", "terminal")
		.input(
			z.object({
				nodeId: z.string(),
				availability: z.enum(["active", "pause", "drain"]),
				serverId: z.string().optional(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			await assertServerAccess(ctx.session, input.serverId ?? null);
			const docker = await getRemoteDocker(input.serverId);
			const node = docker.getNode(input.nodeId);
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
});
