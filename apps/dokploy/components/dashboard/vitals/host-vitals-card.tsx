import {
	Activity,
	Boxes,
	Clock,
	Cpu,
	Database,
	HardDrive,
	Layers,
	Server,
	Zap,
} from "lucide-react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { HostVitalsResult } from "@dokploy/server";

interface Props {
	vitals?: HostVitalsResult;
}

const bytesToGb = (bytes: number): string => {
	if (!bytes || bytes === 0) return "0 GB";
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export const HostVitalsCard = ({ vitals }: Props) => {
	const cpu = vitals?.cpu;
	const mem = vitals?.memory;
	const disk = vitals?.disk;
	const storage = vitals?.dockerStorage;

	const cpuLoadPercent = cpu?.loadPercent ?? 0;
	const memUsedPercent = mem?.usedPercent ?? 0;
	const diskUsedPercent = disk?.usedPercent ?? 0;

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
			{/* CPU Vitals */}
			<Card className="border-border/70 bg-card p-4 space-y-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="size-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
							<Cpu className="size-4" />
						</div>
						<div>
							<span className="text-xs font-semibold text-foreground">Bộ xử lý CPU</span>
							<p className="text-[10px] text-muted-foreground">
								{cpu?.cores ?? 1} vCPU Cores
							</p>
						</div>
					</div>
					<Badge
						variant="outline"
						className={`text-xs font-mono font-bold ${
							cpuLoadPercent > 80
								? "text-rose-500 border-rose-500/30"
								: cpuLoadPercent > 60
									? "text-amber-500 border-amber-500/30"
									: "text-blue-500 border-blue-500/30"
						}`}
					>
						{cpuLoadPercent}%
					</Badge>
				</div>

				<div className="space-y-1">
					<Progress
						value={cpuLoadPercent}
						className="h-2"
					/>
					<div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1">
						<span>Load Avg:</span>
						<span className="font-semibold text-foreground">
							{cpu?.load1?.toFixed(2) ?? "0.00"} • {cpu?.load5?.toFixed(2) ?? "0.00"} •{" "}
							{cpu?.load15?.toFixed(2) ?? "0.00"}
						</span>
					</div>
				</div>
			</Card>

			{/* RAM Vitals */}
			<Card className="border-border/70 bg-card p-4 space-y-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
							<Activity className="size-4" />
						</div>
						<div>
							<span className="text-xs font-semibold text-foreground">Bộ nhớ RAM</span>
							<p className="text-[10px] text-muted-foreground">
								Khả dụng: {bytesToGb(mem?.availableBytes ?? 0)}
							</p>
						</div>
					</div>
					<Badge
						variant="outline"
						className={`text-xs font-mono font-bold ${
							memUsedPercent > 85
								? "text-rose-500 border-rose-500/30"
								: memUsedPercent > 70
									? "text-amber-500 border-amber-500/30"
									: "text-emerald-500 border-emerald-500/30"
						}`}
					>
						{memUsedPercent}%
					</Badge>
				</div>

				<div className="space-y-1">
					<Progress
						value={memUsedPercent}
						className="h-2"
					/>
					<div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1">
						<span>Đã dùng:</span>
						<span className="font-semibold text-foreground">
							{bytesToGb(mem?.usedBytes ?? 0)} / {bytesToGb(mem?.totalBytes ?? 0)}
						</span>
					</div>
				</div>
			</Card>

			{/* Disk Vitals */}
			<Card className="border-border/70 bg-card p-4 space-y-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="size-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
							<HardDrive className="size-4" />
						</div>
						<div>
							<span className="text-xs font-semibold text-foreground">Ổ cứng Root /</span>
							<p className="text-[10px] text-muted-foreground">
								Còn trống: {bytesToGb(disk?.freeBytes ?? 0)}
							</p>
						</div>
					</div>
					<Badge
						variant="outline"
						className={`text-xs font-mono font-bold ${
							diskUsedPercent > 85
								? "text-rose-500 border-rose-500/30"
								: diskUsedPercent > 70
									? "text-amber-500 border-amber-500/30"
									: "text-purple-500 border-purple-500/30"
						}`}
					>
						{diskUsedPercent}%
					</Badge>
				</div>

				<div className="space-y-1">
					<Progress
						value={diskUsedPercent}
						className="h-2"
					/>
					<div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1">
						<span>Dung lượng:</span>
						<span className="font-semibold text-foreground">
							{bytesToGb(disk?.usedBytes ?? 0)} / {bytesToGb(disk?.totalBytes ?? 0)}
						</span>
					</div>
				</div>
			</Card>

			{/* Docker Storage Breakdown */}
			<Card className="border-border/70 bg-card p-4 space-y-2.5">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="size-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
							<Boxes className="size-4" />
						</div>
						<div>
							<span className="text-xs font-semibold text-foreground">Dung lượng Docker</span>
							<p className="text-[10px] text-muted-foreground">
								{vitals?.uptime?.formatted ? `Uptime: ${vitals.uptime.formatted}` : "Docker Engine"}
							</p>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
					<div className="p-1.5 rounded-lg bg-muted/40 border border-border/40">
						<span className="text-[10px] text-muted-foreground block">Images:</span>
						<span className="font-mono font-semibold text-foreground">
							{storage?.images?.size || "0 B"}
						</span>
					</div>
					<div className="p-1.5 rounded-lg bg-muted/40 border border-border/40">
						<span className="text-[10px] text-muted-foreground block">Build Cache:</span>
						<span className="font-mono font-semibold text-foreground">
							{storage?.buildCache?.size || "0 B"}
						</span>
					</div>
					<div className="p-1.5 rounded-lg bg-muted/40 border border-border/40">
						<span className="text-[10px] text-muted-foreground block">Containers:</span>
						<span className="font-mono font-semibold text-foreground">
							{storage?.containers?.size || "0 B"}
						</span>
					</div>
					<div className="p-1.5 rounded-lg bg-muted/40 border border-border/40">
						<span className="text-[10px] text-muted-foreground block">Volumes:</span>
						<span className="font-mono font-semibold text-foreground">
							{storage?.volumes?.size || "0 B"}
						</span>
					</div>
				</div>
			</Card>
		</div>
	);
};
