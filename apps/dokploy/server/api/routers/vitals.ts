import {
	assertServerAccess,
	getDetailedContainerVitals,
	getHostVitals,
	getRemoteDocker,
	getSecurityInspection,
	optimizeHostResources,
} from "@dokploy/server";
import { execAsync, execAsyncRemote } from "@dokploy/server/utils/process/execAsync";
import { quote } from "shell-quote";
import { z } from "zod";
import { audit } from "@/server/api/utils/audit";
import {
	adminProcedure,
	createTRPCRouter,
	withPermission,
} from "../trpc";

const safeContainerIdSchema = z
	.string()
	.min(1, "Container ID không được để trống")
	.max(128, "Container ID quá dài")
	.regex(/^[a-zA-Z0-9_.-]+$/, "Container ID chứa ký tự không hợp lệ");

export const vitalsRouter = createTRPCRouter({
	/**
	 * Real-time Host VPS Health & Vitals (CPU, RAM, Disk, Uptime, Docker Storage, AI Health Score)
	 */
	getHostVitals: withPermission("docker", "read")
		.input(
			z
				.object({
					serverId: z.string().optional().nullable(),
				})
				.optional(),
		)
		.query(async ({ input, ctx }) => {
			await assertServerAccess(ctx.session, input?.serverId ?? null);
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
			await assertServerAccess(ctx.session, input?.serverId ?? null);
			return await getDetailedContainerVitals(input?.serverId);
		}),

	/**
	 * 1-Click Resource Optimizer & Disk Cleaner (Owner / Admin only)
	 */
	optimize: adminProcedure
		.input(
			z.object({
				serverId: z.string().optional().nullable(),
				target: z.enum(["all", "buildCache", "images", "containers", "volumes"]),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			await assertServerAccess(ctx.session, input.serverId ?? null);
			const result = await optimizeHostResources(input.serverId, input.target);
			await audit(ctx, {
				action: "delete",
				resourceType: "docker",
				resourceName: `optimize-${input.target}`,
			});
			return result;
		}),

	/**
	 * Security & Open Port Matrix Inspector: scans listening ports, maps containers/services, and classifies risks
	 */
	getSecurityInspection: withPermission("docker", "read")
		.input(
			z
				.object({
					serverId: z.string().optional().nullable(),
				})
				.optional(),
		)
		.query(async ({ input, ctx }) => {
			await assertServerAccess(ctx.session, input?.serverId ?? null);
			return await getSecurityInspection(input?.serverId);
		}),

	/**
	 * Container Quick Operations
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
				resourceName: "restart-container",
			});
			return { ok: true };
		}),

	stopContainer: withPermission("service", "create")
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
			await container.stop();
			await audit(ctx, {
				action: "update",
				resourceType: "docker",
				resourceId: input.containerId,
				resourceName: "stop-container",
			});
			return { ok: true };
		}),

	startContainer: withPermission("service", "create")
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
				containerId: safeContainerIdSchema,
				serverId: z.string().optional().nullable(),
				tail: z.number().default(100),
			}),
		)
		.query(async ({ input, ctx }) => {
			await assertServerAccess(ctx.session, input.serverId ?? null);
			const safeTail = Math.min(Math.max(10, input.tail), 500);
			const cmd = `${quote([
				"docker",
				"logs",
				"--tail",
				String(safeTail),
				"--timestamps",
				input.containerId,
			])} 2>&1`;
			let stdout = "";
			if (input.serverId) {
				const res = await execAsyncRemote(input.serverId, cmd).catch((e: any) => ({
					stdout: e?.message || "Không thể đọc nhật ký container",
				}));
				stdout = res.stdout;
			} else {
				const res = await execAsync(cmd).catch((e: any) => ({
					stdout: e?.message || "Không thể đọc nhật ký container",
				}));
				stdout = res.stdout;
			}
			return { logs: stdout };
		}),
});
