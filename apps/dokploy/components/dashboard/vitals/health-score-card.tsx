import {
	AlertCircle,
	AlertTriangle,
	CheckCircle2,
	Info,
	ShieldCheck,
	Sparkles,
	Zap,
} from "lucide-react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { HostVitalsResult } from "@dokploy/server";
import { OptimizerDialog } from "./optimizer-dialog";

interface Props {
	vitals?: HostVitalsResult;
	serverId?: string | null;
	onOptimized?: () => void;
}

export const HealthScoreCard = ({ vitals, serverId, onOptimized }: Props) => {
	const healthScore = vitals?.healthScore;
	const score = healthScore?.score ?? 100;
	const grade = healthScore?.grade ?? "A+";
	const issues = healthScore?.issues ?? [];

	const getScoreColor = () => {
		if (score >= 90) return "text-emerald-500";
		if (score >= 75) return "text-teal-500";
		if (score >= 60) return "text-amber-500";
		return "text-rose-500";
	};

	const getGradeBadge = () => {
		switch (grade) {
			case "A+":
				return (
					<Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs px-2.5 py-0.5">
						Hạng A+ • Tối Ưu Tuyệt Đối
					</Badge>
				);
			case "A":
				return (
					<Badge className="bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30 text-xs px-2.5 py-0.5">
						Hạng A • Khỏe Mạnh
					</Badge>
				);
			case "B":
				return (
					<Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs px-2.5 py-0.5">
						Hạng B • Cần Lưu Ý
					</Badge>
				);
			default:
				return (
					<Badge variant="destructive" className="text-xs px-2.5 py-0.5">
						Hạng {grade} • Nguy Cơ Quá Tải
					</Badge>
				);
		}
	};

	return (
		<Card className="border-border/70 bg-gradient-to-br from-card via-card to-emerald-500/5 shadow-sm">
			<CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3">
				<div className="flex items-center gap-3">
					<div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
						<ShieldCheck className="size-5" />
					</div>
					<div>
						<CardTitle className="text-base flex items-center gap-2">
							<span>Chẩn đoán & Điểm Sức khỏe Hệ thống AI</span>
							{getGradeBadge()}
						</CardTitle>
						<p className="text-xs text-muted-foreground mt-0.5">
							Hệ thống tự động phân tích độ bão hòa CPU, tiêu hao RAM, tỷ lệ ổ cứng và trạng thái các container.
						</p>
					</div>
				</div>

				<OptimizerDialog serverId={serverId} onOptimized={onOptimized} />
			</CardHeader>

			<CardContent className="space-y-4 pt-1">
				<div className="flex flex-col md:flex-row items-start md:items-center gap-6 p-4 rounded-xl bg-muted/40 border border-border/60">
					{/* Big Score Visual */}
					<div className="flex items-baseline gap-2 shrink-0">
						<span className={`text-5xl font-black font-mono tracking-tight ${getScoreColor()}`}>
							{score}
						</span>
						<span className="text-sm font-semibold text-muted-foreground font-mono">
							/ 100
						</span>
					</div>

					{/* Issues & Diagnosis List */}
					<div className="flex-1 space-y-2 w-full">
						{issues.map((issue, idx) => (
							<div
								key={idx}
								className="flex items-start gap-2.5 text-xs p-2 rounded-lg bg-background/80 border border-border/50"
							>
								{issue.level === "critical" ? (
									<AlertCircle className="size-4 text-rose-500 shrink-0 mt-0.5" />
								) : issue.level === "warning" ? (
									<AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
								) : (
									<CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
								)}
								<div className="flex-1">
									<p className="font-semibold text-foreground">{issue.message}</p>
									<p className="text-muted-foreground mt-0.5">{issue.recommendation}</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</CardContent>
		</Card>
	);
};
