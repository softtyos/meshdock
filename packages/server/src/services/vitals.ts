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

const parseDockerSizeToBytes = (raw?: string): number => {
	if (!raw) return 0;
	// Extract first numeric + unit token, e.g. "49.27GB (52%)" -> 49.27, "GB"
	const match = raw.trim().match(/^([0-9]+(?:\.[0-9]+)?)\s*(kB|KB|MB|GB|TB|KiB|MiB|GiB|TiB|B)/i);
	if (!match) return 0;
	const value = Number.parseFloat(match[1] || "0");
	const unit = (match[2] || "B").toUpperCase();
	if (unit === "B") return value;
	if (unit === "KB" || unit === "KIB") return value * 1024;
	if (unit === "MB" || unit === "MIB") return value * 1024 ** 2;
	if (unit === "GB" || unit === "GIB") return value * 1024 ** 3;
	if (unit === "TB" || unit === "TIB") return value * 1024 ** 4;
	return value;
};

const formatBytesShort = (bytes: number): string => {
	if (bytes <= 0) return "0 B";
	if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
	if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
	if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${Math.round(bytes)} B`;
};

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

	// Compute total safe reclaimable storage (Images + Containers + Build Cache; excludes Volumes)
	const safeReclaimableBytes =
		parseDockerSizeToBytes(dockerStorage.images.reclaimable) +
		parseDockerSizeToBytes(dockerStorage.containers.reclaimable) +
		parseDockerSizeToBytes(dockerStorage.buildCache.reclaimable);
	dockerStorage.totalReclaimableText = formatBytesShort(safeReclaimableBytes);

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

	const unusedImageBytes = parseDockerSizeToBytes(dockerStorage.images.reclaimable);
	if (unusedImageBytes >= 5 * 1024 ** 3) {
		score -= 5;
		issues.push({
			level: "warning",
			message: `Dung lượng Docker Images cũ không sử dụng lớn: ${dockerStorage.images.reclaimable}`,
			recommendation:
				"Sử dụng chế độ 'Tối ưu Toàn diện An toàn' để thu hồi dung lượng Images cũ mà vẫn bảo toàn 100% dữ liệu Volumes.",
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
): Promise<{ success: boolean; message: string; reclaimedText?: string }> => {
	const sid = serverId ?? undefined;

	// Measure reclaimable Docker storage prior to cleanup for accurate feedback
	let beforeVitals: HostVitalsResult | null = null;
	try {
		beforeVitals = await getHostVitals(serverId);
	} catch {}

	switch (target) {
		case "buildCache": {
			const est = beforeVitals?.dockerStorage.buildCache.reclaimable || "0 B";
			await cleanupBuilders(sid);
			return {
				success: true,
				reclaimedText: est,
				message: `Đã dọn sạch Docker Build Cache (thu hồi ~${est}).`,
			};
		}
		case "images": {
			const est = beforeVitals?.dockerStorage.images.reclaimable || "0 B";
			await cleanupImages(sid);
			return {
				success: true,
				reclaimedText: est,
				message: `Đã dọn sạch Docker Images không sử dụng (thu hồi ~${est}).`,
			};
		}
		case "containers": {
			const est = beforeVitals?.dockerStorage.containers.reclaimable || "0 B";
			await cleanupContainers(sid);
			return {
				success: true,
				reclaimedText: est,
				message: `Đã xóa các container đã dừng hoạt động (thu hồi ~${est}).`,
			};
		}
		case "volumes": {
			const est = beforeVitals?.dockerStorage.volumes.reclaimable || "0 B";
			await cleanupVolumes(sid);
			return {
				success: true,
				reclaimedText: est,
				message: `Đã dọn dẹp các Volume mồ côi (thu hồi ~${est}).`,
			};
		}
		case "all":
		default: {
			const est = beforeVitals?.dockerStorage.totalReclaimableText || "0 B";
			await cleanupAll(sid);
			return {
				success: true,
				reclaimedText: est,
				message: `Đã dọn toàn diện Images + Build Cache + Containers rác (thu hồi ~${est}, bảo toàn Volumes).`,
			};
		}
	}
};

export interface ListeningPortItem {
	protocol: "TCP" | "UDP";
	port: number;
	ip: string;
	isPublic: boolean;
	service: string;
	containerName?: string;
	processName?: string;
	riskLevel: "safe" | "info" | "warning" | "danger";
	description: string;
}

export interface SecurityInspectionResult {
	checkedAt: string;
	firewallStatus: "active" | "inactive" | "unsupported";
	firewallDetails?: string;
	totalOpenPorts: number;
	publicPortsCount: number;
	highRiskPortsCount: number;
	ports: ListeningPortItem[];
	securityScore: number;
	recommendations: string[];
}

const classifyPortRisk = (
	port: number,
	protocol: string,
	isPublic: boolean,
	serviceName: string,
): { risk: "safe" | "info" | "warning" | "danger"; desc: string } => {
	const dangerousDbPorts: Record<number, string> = {
		5432: "PostgreSQL Database",
		3306: "MySQL / MariaDB Database",
		6379: "Redis In-Memory Cache",
		27017: "MongoDB Database",
		9200: "Elasticsearch Engine",
		2375: "Unencrypted Docker Daemon API",
	};

	if (isPublic && dangerousDbPorts[port]) {
		return {
			risk: "danger",
			desc: `Cổng ${dangerousDbPorts[port]} mở trực tiếp ra internet công cộng (0.0.0.0). Nguy cơ cao bị brute-force hoặc quét lỗ hổng!`,
		};
	}

	if (port === 22 && isPublic) {
		return {
			risk: "warning",
			desc: "Cổng SSH 22 mở công khai cho mọi địa chỉ IP. Khuyến nghị bật SSH Key và tắt Password Auth.",
		};
	}

	if (port === 3000 && isPublic) {
		return {
			risk: "info",
			desc: "Cổng Web Dashboard quản trị Meshdock.",
		};
	}

	if ((port === 80 || port === 443) && isPublic) {
		return {
			risk: "safe",
			desc: "Cổng Ingress Web tiêu chuẩn (HTTP / HTTPS) được định tuyến và mã hóa qua Traefik.",
		};
	}

	if (port === 2377 || port === 7946 || port === 4789) {
		return {
			risk: "info",
			desc: "Cổng giao tiếp nội bộ cụm Docker Swarm Mesh.",
		};
	}

	if (!isPublic) {
		return {
			risk: "safe",
			desc: "Cổng cục bộ (Localhost / Loopback), an toàn không thể truy cập từ mạng ngoài.",
		};
	}

	return {
		risk: "info",
		desc: `Cổng ${protocol} công khai được mở bởi dịch vụ ${serviceName || "hệ thống"}.`,
	};
};

/**
 * Enterprise Host Security & Open Port Matrix Inspector
 */
export const getSecurityInspection = async (
	serverId?: string | null,
): Promise<SecurityInspectionResult> => {
	const sid = serverId ?? undefined;
	const checkedAt = new Date().toISOString();

	// 1. Gather container port mappings
	const containerPortMap = new Map<number, string>();
	try {
		const psCmd = "docker ps -a --no-trunc --format '{{json .}}'";
		const { stdout: psOut } = sid
			? await execAsyncRemote(sid, psCmd)
			: await execAsync(psCmd);

		for (const line of psOut.trim().split("\n")) {
			if (!line) continue;
			try {
				const item = JSON.parse(line);
				const portsStr = item.Ports || "";
				const containerName = item.Names || item.ID || "container";
				// Parse e.g. 0.0.0.0:80->80/tcp or 5432/tcp
				const portMatches = portsStr.matchAll(/(?:([0-9.]+):)?([0-9]+)->/g);
				for (const match of portMatches) {
					const hostPort = parseInt(match[2], 10);
					if (!isNaN(hostPort)) {
						containerPortMap.set(hostPort, containerName);
					}
				}
			} catch {}
		}
	} catch (err) {
		console.warn("Could not query docker ps for security inspection:", err);
	}

	// 2. Query open sockets and firewall
	let rawSockets = "";
	let firewallStatus: "active" | "inactive" | "unsupported" = "inactive";
	let firewallDetails = "";

	if (sid) {
		try {
			const cmd =
				"ss -tulpn 2>/dev/null || netstat -tulpn 2>/dev/null; echo '===UFW==='; which ufw >/dev/null 2>&1 && ufw status 2>/dev/null || echo 'not-found'";
			const { stdout } = await execAsyncRemote(sid, cmd);
			const parts = stdout.split("===UFW===");
			rawSockets = parts[0] || "";
			const ufwOut = (parts[1] || "").trim();
			if (ufwOut.includes("Status: active")) {
				firewallStatus = "active";
				firewallDetails = "Tường lửa UFW đang kích hoạt và bảo vệ hệ thống.";
			} else if (ufwOut.includes("Status: inactive")) {
				firewallStatus = "inactive";
				firewallDetails = "Tường lửa UFW đang tắt. Khuyến nghị bật UFW để chặn quét cổng trái phép.";
			} else {
				firewallStatus = "unsupported";
				firewallDetails = "Không phát hiện UFW (sử dụng iptables hoặc security group nhà cung cấp đám mây).";
			}
		} catch (err) {
			console.warn("Could not query remote sockets:", err);
		}
	} else {
		// Local host query
		try {
			const { stdout } = await execAsync(
				"docker run --rm --net=host alpine:3.20 netstat -tulpn 2>/dev/null || netstat -tulpn 2>/dev/null || ss -tulpn 2>/dev/null",
			);
			rawSockets = stdout;
		} catch {
			// Fallback: build socket list from published container ports
			for (const [port, container] of containerPortMap.entries()) {
				rawSockets += `tcp 0 0 0.0.0.0:${port} 0.0.0.0:* LISTEN -\n`;
			}
		}

		// Local firewall check
		try {
			const { stdout } = await execAsync("which ufw >/dev/null 2>&1 && ufw status 2>/dev/null || echo 'not-found'");
			if (stdout.includes("Status: active")) {
				firewallStatus = "active";
				firewallDetails = "Tường lửa UFW đang kích hoạt.";
			} else if (stdout.includes("Status: inactive")) {
				firewallStatus = "inactive";
				firewallDetails = "Tường lửa UFW đang tắt.";
			} else {
				firewallStatus = "unsupported";
				firewallDetails = "UFW không được cài đặt (quản lý bởi cloud security group).";
			}
		} catch {
			firewallStatus = "unsupported";
		}
	}

	// 3. Parse listening sockets into structured items
	const portMap = new Map<string, ListeningPortItem>();
	const lines = rawSockets.trim().split("\n");

	for (const line of lines) {
		const parts = line.trim().split(/\s+/);
		if (parts.length < 4) continue;
		const rawProto = parts[0];
		const localAddr = parts[3];
		if (!rawProto || !localAddr) continue;
		const proto = rawProto.toUpperCase();
		if (proto !== "TCP" && proto !== "UDP") continue;

		// Extract local address
		const lastColon = localAddr.lastIndexOf(":");
		if (lastColon === -1) continue;

		const ip = localAddr.substring(0, lastColon);
		const port = parseInt(localAddr.substring(lastColon + 1), 10);
		if (isNaN(port)) continue;

		const isPublic = ip === "0.0.0.0" || ip === "::" || ip === "*" || ip === ":::";
		const cleanIp = isPublic ? "0.0.0.0" : ip;
		const containerName = containerPortMap.get(port);

		let service = containerName ? `Docker: ${containerName}` : "";
		let processName = "";

		// Detect standard system daemons
		if (!service) {
			if (port === 22) {
				service = "OpenSSH Server";
				processName = "sshd";
			} else if (port === 53) {
				service = "DNS Resolver";
				processName = "systemd-resolve";
			} else if (port === 323) {
				service = "NTP Time Sync";
				processName = "chronyd";
			} else if (port === 2377 || port === 7946 || port === 4789) {
				service = "Docker Swarm Mesh";
				processName = "dockerd";
			} else if (port === 80 || port === 443) {
				service = "Web Ingress (Traefik)";
				processName = "traefik";
			} else if (port === 3000) {
				service = "Meshdock Dashboard";
				processName = "node";
			} else {
				service = `Port ${port} (${proto})`;
			}
		}

		const { risk, desc } = classifyPortRisk(port, proto, isPublic, service);
		const key = `${proto}:${port}`;

		if (!portMap.has(key)) {
			portMap.set(key, {
				protocol: proto as "TCP" | "UDP",
				port,
				ip: cleanIp,
				isPublic,
				service,
				containerName,
				processName,
				riskLevel: risk,
				description: desc,
			});
		} else {
			const existing = portMap.get(key)!;
			if (isPublic && !existing.isPublic) {
				existing.isPublic = true;
				existing.ip = "0.0.0.0";
				const updated = classifyPortRisk(port, proto, true, existing.service);
				existing.riskLevel = updated.risk;
				existing.description = updated.desc;
			}
		}
	}

	const ports = Array.from(portMap.values()).sort((a, b) => {
		// Sort by risk priority: danger > warning > info > safe, then by port
		const priority = { danger: 0, warning: 1, info: 2, safe: 3 };
		if (priority[a.riskLevel] !== priority[b.riskLevel]) {
			return priority[a.riskLevel] - priority[b.riskLevel];
		}
		return a.port - b.port;
	});

	const publicPortsCount = ports.filter((p) => p.isPublic).length;
	const highRiskPortsCount = ports.filter((p) => p.riskLevel === "danger").length;

	// Calculate security score (0 - 100)
	let score = 100;
	if (highRiskPortsCount > 0) score -= highRiskPortsCount * 25;
	if (ports.some((p) => p.riskLevel === "warning")) score -= 10;
	if (firewallStatus === "inactive") score -= 15;
	score = Math.max(20, Math.min(100, score));

	const recommendations: string[] = [];
	if (highRiskPortsCount > 0) {
		recommendations.push(
			"Phát hiện cổng cơ sở dữ liệu mở công khai! Hãy đóng cổng trực tiếp trên host và chỉ cho phép truy cập qua mạng nội bộ Docker hoặc qua Traefik xác thực.",
		);
	}
	if (ports.some((p) => p.port === 22 && p.isPublic)) {
		recommendations.push(
			"Cổng SSH 22 đang mở toàn bộ ra 0.0.0.0. Bạn nên dùng SSH Key thay cho mật khẩu và hạn chế dải IP quản trị.",
		);
	}
	if (firewallStatus === "inactive") {
		recommendations.push(
			"Tường lửa UFW của VPS đang tắt. Khuyến nghị bật UFW ('ufw enable') để chặn việc mở cổng ngoài ý muốn.",
		);
	}
	if (recommendations.length === 0) {
		recommendations.push("Hạ tầng mạng và cổng mở của máy chủ đang ở mức an toàn cao.");
	}

	return {
		checkedAt,
		firewallStatus,
		firewallDetails,
		totalOpenPorts: ports.length,
		publicPortsCount,
		highRiskPortsCount,
		ports,
		securityScore: score,
		recommendations,
	};
};
