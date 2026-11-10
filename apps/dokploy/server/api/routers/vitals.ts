import {
	assertServerAccess,
	getDetailedContainerVitals,
	getHostVitals,
	getRemoteDocker,
	optimizeHostResources,
} from "@dokploy/server";
import { execAsync, execAsyncRemote } from "@dokploy/server/utils/process/execAsync";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { audit } from "@/server/api/utils/audit";
import { createTRPCRouter, protectedProcedure, withPermission } from "../trpc";

export const vitalsRouter = createTRPCRouter({
	/**
	 * Real-time Host VPS Health & Vitals (CPU, RAM, Disk, Uptime, Docker Storage, AI Health Score)
	 */
	getHostVitals: protectedProcedure
		.input(
			z
				.object({
					serverId: z.string().optional().nullable(),
				})
				.optional(),
		)
		.query(async ({ input, ctx }) => {
			if (input?.serverId) {
				await assertServerAccess(ctx.session, input.serverId);
			}
			return await getHostVitals(input?.serverId);
		}),

	/**
	 * Comprehensive Container Matrix: Health, CPU%, RAM Usage, Writable/Virtual Disk Size, Net/Block I/O
	 */
	getContainerVitals: withPermission("docker", "read")
		.input(
			z
				.object({
					serverId: z.string().optional().nullable(),
				})
				.optional(),
		)
		.query(async ({ input, ctx }) => {
			if (input?.serverId) {
				await assertServerAccess(ctx.session, input.serverId);
			}
			return await getDetailedContainerVitals(input?.serverId);
		}),

	/**
	 * 1-Click Resource Optimizer & Disk Cleaner
	 */
	optimize: withPermission("docker", "read")
		.input(
			z.object({
				serverId: z.string().optional().nullable(),
				target: z.enum(["all", "buildCache", "images", "containers", "volumes"]),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			if (input.serverId) {
				await assertServerAccess(ctx.session, input.serverId);
			}
			const result = await optimizeHostResources(input.serverId, input.target);
			await audit(ctx, {
				action: "delete",
				resourceType: "docker",
				resourceName: `optimize-${input.target}`,
			});
			return result;
		}),

	/**
	 * Container Quick Operations
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
			await audit(ctx, {
				action: "update",
				resourceType: "docker",
				resourceId: input.containerId,
				resourceName: "restart-container",
			});
			return { ok: true };
		}),

	stopContainer: withPermission("docker", "read")
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
			await container.stop();
			await audit(ctx, {
				action: "update",
				resourceType: "docker",
				resourceId: input.containerId,
				resourceName: "stop-container",
			});
			return { ok: true };
		}),

	startContainer: withPermission("docker", "read")
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
			await container.start();
			await audit(ctx, {
				action: "update",
				resourceType: "docker",
				resourceId: input.containerId,
				resourceName: "start-container",
			});
			return { ok: true };
		}),

	getContainerLogs: withPermission("docker", "read")
		.input(
			z.object({
				containerId: z.string(),
				serverId: z.string().optional().nullable(),
				tail: z.number().default(100),
			}),
		)
		.query(async ({ input, ctx }) => {
			if (input.serverId) {
				await assertServerAccess(ctx.session, input.serverId);
			}
			const safeTail = Math.min(Math.max(10, input.tail), 500);
			const cmd = `docker logs --tail ${safeTail} --timestamps "${input.containerId}" 2>&1`;
			let stdout = "";
			if (input.serverId) {
				const res = await execAsyncRemote(input.serverId, cmd).catch((e: any) => ({
					stdout: e?.message || "Failed to read logs",
				}));
				stdout = res.stdout;
			} else {
				const res = await execAsync(cmd).catch((e: any) => ({
					stdout: e?.message || "Failed to read logs",
				}));
				stdout = res.stdout;
			}
			return { logs: stdout };
		}),
});
