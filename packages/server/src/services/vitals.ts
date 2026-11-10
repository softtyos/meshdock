import {
	execAsync,
	execAsyncRemote,
} from "@dokploy/server/utils/process/execAsync";
import {
	cleanupAll,
	cleanupBuilders,
	cleanupContainers,
	cleanupImages,
	cleanupVolumes,
} from "../utils/docker/utils";
import { getRemoteDocker } from "../utils/servers/remote-docker";

export interface HostVitalsResult {
	checkedAt: string;
	hostname: string;
	cpu: {
		cores: number;
		load1: number;
		load5: number;
		load15: number;
		loadPercent: number;
	};
	memory: {
		totalBytes: number;
		usedBytes: number;
		availableBytes: number;
		usedPercent: number;
		swapTotalBytes: number;
		swapUsedBytes: number;
	};
	disk: {
		totalBytes: number;
		usedBytes: number;
		freeBytes: number;
		usedPercent: number;
	};
	uptime: {
		seconds: number;
		formatted: string;
	};
	dockerStorage: {
		images: { count: number; size: string; reclaimable: string };
		containers: { count: number; size: string; reclaimable: string };
		volumes: { count: number; size: string; reclaimable: string };
		buildCache: { count: number; size: string; reclaimable: string };
		totalReclaimableText: string;
	};
	healthScore: {
		score: number;
		grade: "A+" | "A" | "B" | "C" | "CRITICAL";
		status: "optimal" | "good" | "warning" | "critical";
		issues: Array<{
			level: "info" | "warning" | "critical";
			message: string;
			recommendation: string;
		}>;
	};
}

export interface ContainerVitalItem {
	id: string;
	fullId: string;
	name: string;
	displayName: string;
	image: string;
	state: "running" | "exited" | "paused" | "restarting" | "dead" | "created";
	status: string;
	health: "healthy" | "unhealthy" | "starting" | "none";
	size: string;
	sizeWritable: string;
	sizeVirtual: string;
	cpuPerc: number;
	cpuRaw: string;
	memUsage: string;
	memPerc: number;
	netIo: string;
	blockIo: string;
	pids: number;
	ports: string;
	createdAt: string;
	isSystem: boolean;
}

const formatUptime = (seconds: number): string => {
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);

	const parts: string[] = [];
	if (days > 0) parts.push(`${days} ngày`);
	if (hours > 0) parts.push(`${hours} giờ`);
	parts.push(`${minutes} phút`);
	return parts.join(" ");
};

/**
 * Executes a high-performance, single-round-trip shell pipeline to retrieve all host vitals.
 */
export const getHostVitals = async (
	serverId?: string | null,
): Promise<HostVitalsResult> => {
	const cmd = `
cpuCores=$(nproc 2>/dev/null || echo 1)
loadAvg=$(cat /proc/loadavg 2>/dev/null | awk '{print $1,$2,$3}')
uptimeSec=$(cat /proc/uptime 2>/dev/null | awk '{print int($1)}')
memData=$(free -b 2>/dev/null | awk '/^Mem:/{print $2,$3,$7}')
swapData=$(free -b 2>/dev/null | awk '/^Swap:/{print $2,$3}')
diskData=$(df -B1 / 2>/dev/null | awk 'NR==2{print $2,$3,$4}')
hostName=$(hostname 2>/dev/null || echo "localhost")
dfJson=$(docker system df --format '{{json .}}' 2>/dev/null | tr '\\n' '@')
echo "host:$hostName|cores:$cpuCores|load:$loadAvg|uptime:$uptimeSec|mem:$memData|swap:$swapData|disk:$diskData|df:$dfJson"
`.trim();

	let rawOutput = "";
	try {
		if (serverId) {
			const res = await execAsyncRemote(serverId, cmd);
			rawOutput = res.stdout.trim();
		} else {
			const res = await execAsync(cmd);
			rawOutput = res.stdout.trim();
		}
	} catch (err) {
		console.warn("Could not retrieve full host vitals via script:", err);
	}

	// Parse fields
	let hostname = "server";
	let cores = 1;
	let load1 = 0;
	let load5 = 0;
	let load15 = 0;
	let uptimeSeconds = 0;
	let memTotal = 0;
	let memUsed = 0;
	let memAvail = 0;
	let swapTotal = 0;
	let swapUsed = 0;
	let diskTotal = 0;
	let diskUsed = 0;
	let diskFree = 0;

	const dockerStorage = {
		images: { count: 0, size: "0 B", reclaimable: "0 B" },
		containers: { count: 0, size: "0 B", reclaimable: "0 B" },
		volumes: { count: 0, size: "0 B", reclaimable: "0 B" },
		buildCache: { count: 0, size: "0 B", reclaimable: "0 B" },
		totalReclaimableText: "0 B",
	};

	if (rawOutput) {
		const parts = rawOutput.split("|");
		for (const part of parts) {
			const [key, ...vals] = part.split(":");
			const val = vals.join(":");
			if (key === "host") hostname = val.trim();
			else if (key === "cores") cores = Number.parseInt(val.trim(), 10) || 1;
			else if (key === "load") {
				const [l1, l5, l15] = val.trim().split(" ");
				load1 = Number.parseFloat(l1 || "0") || 0;
				load5 = Number.parseFloat(l5 || "0") || 0;
				load15 = Number.parseFloat(l15 || "0") || 0;
			} else if (key === "uptime") {
				uptimeSeconds = Number.parseInt(val.trim(), 10) || 0;
			} else if (key === "mem") {
				const [t, u, a] = val.trim().split(" ");
				memTotal = Number.parseInt(t || "0", 10) || 0;
				memUsed = Number.parseInt(u || "0", 10) || 0;
				memAvail = Number.parseInt(a || "0", 10) || 0;
			} else if (key === "swap") {
				const [st, su] = val.trim().split(" ");
				swapTotal = Number.parseInt(st || "0", 10) || 0;
				swapUsed = Number.parseInt(su || "0", 10) || 0;
			} else if (key === "disk") {
				const [dt, du, df] = val.trim().split(" ");
				diskTotal = Number.parseInt(dt || "0", 10) || 0;
				diskUsed = Number.parseInt(du || "0", 10) || 0;
				diskFree = Number.parseInt(df || "0", 10) || 0;
			} else if (key === "df") {
				const dfEntries = val.split("@").filter(Boolean);
				for (const jsonStr of dfEntries) {
					try {
						const item = JSON.parse(jsonStr);
						const type = item.Type?.toLowerCase() || "";
						if (type.includes("image")) {
							dockerStorage.images = {
								count: Number.parseInt(item.TotalCount || "0", 10),
								size: item.Size || "0 B",
								reclaimable: item.Reclaimable || "0 B",
							};
						} else if (type.includes("container")) {
							dockerStorage.containers = {
								count: Number.parseInt(item.TotalCount || "0", 10),
								size: item.Size || "0 B",
								reclaimable: item.Reclaimable || "0 B",
							};
						} else if (type.includes("volume")) {
							dockerStorage.volumes = {
								count: Number.parseInt(item.TotalCount || "0", 10),
								size: item.Size || "0 B",
								reclaimable: item.Reclaimable || "0 B",
							};
						} else if (type.includes("build cache")) {
							dockerStorage.buildCache = {
								count: Number.parseInt(item.TotalCount || "0", 10),
								size: item.Size || "0 B",
								reclaimable: item.Reclaimable || "0 B",
							};
						}
					} catch {}
				}
			}
		}
	}

	// Calculate percentages
	const loadPercent = Math.min(100, Math.round((load1 / (cores || 1)) * 100));
	const memUsedPercent = memTotal > 0 ? Math.round((memUsed / memTotal) * 100) : 0;
	const diskUsedPercent = diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0;

	// Calculate AI Health Score
	let score = 100;
	const issues: HostVitalsResult["healthScore"]["issues"] = [];

	if (loadPercent > 85) {
		score -= 15;
		issues.push({
			level: "warning",
			message: `Tải CPU đang ở mức cao (${loadPercent}%)`,
			recommendation: "Kiểm tra các container đang ngốn CPU hoặc nâng cấp số lõi máy chủ.",
		});
	}

	if (memUsedPercent > 85) {
		score -= 20;
		issues.push({
			level: "warning",
			message: `Dung lượng RAM đang sử dụng ở mức cao (${memUsedPercent}%)`,
			recommendation: "Tối ưu hóa các tiến trình hoặc tăng dung lượng RAM cho VPS.",
		});
	}

	if (diskUsedPercent > 85) {
		score -= 25;
		issues.push({
			level: "critical",
			message: `Dung lượng ổ cứng root đã dùng ${diskUsedPercent}%`,
			recommendation: "Dọn dẹp Build Cache và Docker Images rác để tránh đầy ổ đĩa.",
		});
	}

	if (
		dockerStorage.buildCache.reclaimable &&
		(dockerStorage.buildCache.reclaimable.includes("GB") ||
			dockerStorage.buildCache.reclaimable.includes("giB"))
	) {
		issues.push({
			level: "info",
			message: `Dung lượng Build Cache có thể thu hồi: ${dockerStorage.buildCache.reclaimable}`,
			recommendation: "Nhấn nút 'Dọn dẹp Build Cache' để giải phóng bộ nhớ lưu trữ.",
		});
	}

	if (issues.length === 0) {
		issues.push({
			level: "info",
			message: "Hạ tầng máy chủ đang vận hành ở trạng thái tối ưu.",
			recommendation: "Không cần hành động nào, tất cả chỉ số đều trong ngưỡng an toàn.",
		});
	}

	let grade: HostVitalsResult["healthScore"]["grade"] = "A+";
	let status: HostVitalsResult["healthScore"]["status"] = "optimal";

	if (score >= 95) {
		grade = "A+";
		status = "optimal";
	} else if (score >= 80) {
		grade = "A";
		status = "good";
	} else if (score >= 65) {
		grade = "B";
		status = "warning";
	} else if (score >= 50) {
		grade = "C";
		status = "warning";
	} else {
		grade = "CRITICAL";
		status = "critical";
	}

	return {
		checkedAt: new Date().toISOString(),
		hostname,
		cpu: {
			cores,
			load1,
			load5,
			load15,
			loadPercent,
		},
		memory: {
			totalBytes: memTotal,
			usedBytes: memUsed,
			availableBytes: memAvail,
			usedPercent: memUsedPercent,
			swapTotalBytes: swapTotal,
			swapUsedBytes: swapUsed,
		},
		disk: {
			totalBytes: diskTotal,
			usedBytes: diskUsed,
			freeBytes: diskFree,
			usedPercent: diskUsedPercent,
		},
		uptime: {
			seconds: uptimeSeconds,
			formatted: formatUptime(uptimeSeconds),
		},
		dockerStorage,
		healthScore: {
			score: Math.max(0, score),
			grade,
			status,
			issues,
		},
	};
};

/**
 * Retrieves detailed health and resource consumption metrics for all containers on the host.
 */
export const getDetailedContainerVitals = async (
	serverId?: string | null,
): Promise<ContainerVitalItem[]> => {
	const psCmd = `docker ps -a --no-trunc --size --format '{{json .}}'`;
	const statsCmd = `docker stats --no-stream --format '{{json .}}'`;

	let psStdout = "";
	let statsStdout = "";

	try {
		if (serverId) {
			const [psRes, statsRes] = await Promise.all([
				execAsyncRemote(serverId, psCmd).catch(() => ({ stdout: "" })),
				execAsyncRemote(serverId, statsCmd).catch(() => ({ stdout: "" })),
			]);
			psStdout = psRes.stdout;
			statsStdout = statsRes.stdout;
		} else {
			const [psRes, statsRes] = await Promise.all([
				execAsync(psCmd).catch(() => ({ stdout: "" })),
				execAsync(statsCmd).catch(() => ({ stdout: "" })),
			]);
			psStdout = psRes.stdout;
			statsStdout = statsRes.stdout;
		}
	} catch (err) {
		console.warn("Could not retrieve container stats:", err);
	}

	// Parse stats by ID or Name
	const statsMap = new Map<string, any>();
	for (const line of statsStdout.trim().split("\n")) {
		if (!line.trim()) continue;
		try {
			const item = JSON.parse(line.trim());
			if (item.Container) statsMap.set(item.Container, item);
			if (item.ID) statsMap.set(item.ID, item);
			if (item.Name) statsMap.set(item.Name, item);
		} catch {}
	}

	const result: ContainerVitalItem[] = [];

	for (const line of psStdout.trim().split("\n")) {
		if (!line.trim()) continue;
		try {
			const item = JSON.parse(line.trim());
			const fullId = item.ID || "";
			const shortId = fullId.slice(0, 12);
			const rawName = item.Names || item.Name || shortId;
			const cleanName = rawName.startsWith("/") ? rawName.slice(1) : rawName;

			// Extract human-friendly display name (e.g. dokploy.1.xxx -> dokploy)
			let displayName = cleanName;
			if (cleanName.includes(".")) {
				displayName = cleanName.split(".")[0] || cleanName;
			}

			const state = (item.State?.toLowerCase() || "unknown") as ContainerVitalItem["state"];
			const status = item.Status || "";

			// Health determination
			let health: ContainerVitalItem["health"] = "none";
			const rawHealth = (item.HealthStatus || "").toLowerCase();
			if (rawHealth.includes("healthy") && !rawHealth.includes("unhealthy")) {
				health = "healthy";
			} else if (rawHealth.includes("unhealthy")) {
				health = "unhealthy";
			} else if (rawHealth.includes("starting")) {
				health = "starting";
			} else if (status.includes("(healthy)")) {
				health = "healthy";
			} else if (status.includes("(unhealthy)")) {
				health = "unhealthy";
			} else if (status.includes("(health: starting)")) {
				health = "starting";
			}

			// Size parsing: "28.7kB (virtual 3.7GB)"
			const rawSize = item.Size || "";
			let sizeWritable = "—";
			let sizeVirtual = "—";
			if (rawSize.includes("(virtual")) {
				const [w, v] = rawSize.split("(virtual");
				sizeWritable = w.trim();
				sizeVirtual = v.replace(")", "").trim();
			} else if (rawSize) {
				sizeWritable = rawSize.trim();
			}

			// Stats mapping
			const liveStats = statsMap.get(fullId) || statsMap.get(shortId) || statsMap.get(cleanName);
			let cpuPerc = 0;
			let cpuRaw = "0.00%";
			let memUsage = "—";
			let memPerc = 0;
			let netIo = "—";
			let blockIo = "—";
			let pids = 0;

			if (liveStats) {
				cpuRaw = liveStats.CPUPerc || "0.00%";
				cpuPerc = Number.parseFloat(cpuRaw.replace("%", "")) || 0;
				memUsage = liveStats.MemUsage || "—";
				memPerc = Number.parseFloat((liveStats.MemPerc || "0").replace("%", "")) || 0;
				netIo = liveStats.NetIO || "—";
				blockIo = liveStats.BlockIO || "—";
				pids = Number.parseInt(liveStats.PIDs || "0", 10) || 0;
			}

			const isSystem =
				cleanName.includes("dokploy") ||
				cleanName.includes("traefik") ||
				cleanName.includes("postgres") ||
				cleanName.includes("redis") ||
				cleanName.includes("mesh");

			result.push({
				id: shortId,
				fullId,
				name: cleanName,
				displayName,
				image: item.Image || "unknown",
				state,
				status,
				health,
				size: rawSize || "0 B",
				sizeWritable,
				sizeVirtual,
				cpuPerc,
				cpuRaw,
				memUsage,
				memPerc,
				netIo,
				blockIo,
				pids,
				ports: item.Ports || "",
				createdAt: item.CreatedAt || "",
				isSystem,
			});
		} catch {}
	}

	// Sort: Running first, then by CPU usage descending
	return result.sort((a, b) => {
		if (a.state === "running" && b.state !== "running") return -1;
		if (a.state !== "running" && b.state === "running") return 1;
		return b.cpuPerc - a.cpuPerc;
	});
};

/**
 * 1-Click Resource Optimization and Pruning Engine
 */
export const optimizeHostResources = async (
	serverId?: string | null,
	target: "all" | "buildCache" | "images" | "containers" | "volumes" = "all",
): Promise<{ success: boolean; message: string }> => {
	const sid = serverId ?? undefined;
	switch (target) {
		case "buildCache":
			await cleanupBuilders(sid);
			return { success: true, message: "Đã dọn dẹp toàn bộ Docker Build Cache thành công." };
		case "images":
			await cleanupImages(sid);
			return { success: true, message: "Đã dọn dẹp các Docker Images rác không sử dụng." };
		case "containers":
			await cleanupContainers(sid);
			return { success: true, message: "Đã xóa các container đã dừng hoạt động." };
		case "volumes":
			await cleanupVolumes(sid);
			return { success: true, message: "Đã dọn dẹp các Volume mồ côi." };
		case "all":
		default:
			await cleanupAll(sid);
			return {
				success: true,
				message: "Đã kích hoạt tối ưu hóa toàn diện: dọn dẹp Images, Build Cache và Containers rác!",
			};
	}
};
