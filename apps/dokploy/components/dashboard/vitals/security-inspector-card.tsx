import {
	AlertCircle,
	AlertTriangle,
	CheckCircle2,
	Filter,
	Globe,
	Info,
	Lock,
	RefreshCw,
	Search,
	Server,
	Shield,
	ShieldAlert,
	ShieldCheck,
	Unlock,
	Zap,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { ListeningPortItem, SecurityInspectionResult } from "@dokploy/server";

interface Props {
	security?: SecurityInspectionResult;
	isLoading?: boolean;
	onRefresh?: () => void;
}

export const SecurityInspectorCard = ({
	security,
	isLoading,
	onRefresh,
}: Props) => {
	const [search, setSearch] = useState("");
	const [riskFilter, setRiskFilter] = useState<string>("all");

	const ports = security?.ports ?? [];
	const firewallStatus = security?.firewallStatus ?? "inactive";
	const securityScore = security?.securityScore ?? 100;
	const recommendations = security?.recommendations ?? [];

	const filteredPorts = useMemo(() => {
		const q = search.toLowerCase().trim();
		return ports.filter((p) => {
			if (riskFilter !== "all" && p.riskLevel !== riskFilter) return false;
			if (q) {
				return (
					p.port.toString().includes(q) ||
					p.protocol.toLowerCase().includes(q) ||
					p.service.toLowerCase().includes(q) ||
					p.ip.includes(q) ||
					p.description.toLowerCase().includes(q)
				);
			}
			return true;
		});
	}, [ports, search, riskFilter]);

	const getScoreColor = () => {
		if (securityScore >= 80) return "text-emerald-500";
		if (securityScore >= 60) return "text-amber-500";
		return "text-rose-500";
	};

	const getRiskBadge = (risk: ListeningPortItem["riskLevel"]) => {
		switch (risk) {
			case "danger":
				return (
					<Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[11px] gap-1 px-2 py-0.5">
						<ShieldAlert className="size-3" />
						Nguy Hiểm
					</Badge>
				);
			case "warning":
				return (
					<Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px] gap-1 px-2 py-0.5">
						<AlertTriangle className="size-3" />
						Lưu Ý
					</Badge>
				);
			case "info":
				return (
					<Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[11px] gap-1 px-2 py-0.5">
						<Info className="size-3" />
						Quản Trị
					</Badge>
				);
			case "safe":
			default:
				return (
					<Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] gap-1 px-2 py-0.5">
						<CheckCircle2 className="size-3" />
						An Toàn
					</Badge>
				);
		}
	};

	return (
		<div className="space-y-6 w-full">
			{/* Top Metric Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{/* 1. Điểm An Toàn */}
				<Card className="border-border/70 bg-card p-4 space-y-3 shadow-xs">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
								<ShieldCheck className="size-4" />
							</div>
							<div>
								<span className="text-xs font-semibold text-foreground">
									Điểm Bảo Mật Mạng
								</span>
								<p className="text-[10px] text-muted-foreground">
									Đánh giá an toàn cổng mở
								</p>
							</div>
						</div>
						<span className={`text-xl font-bold font-mono ${getScoreColor()}`}>
							{securityScore}
							<span className="text-xs text-muted-foreground font-normal">
								/100
							</span>
						</span>
					</div>
					<Progress value={securityScore} className="h-2" />
					<p className="text-[11px] text-muted-foreground">
						{securityScore >= 80
							? "Hạ tầng mạng đang được bảo vệ tốt."
							: securityScore >= 60
								? "Có một số cổng cần được siết chặt bảo mật."
								: "Phát hiện lỗ hổng nghiêm trọng cần xử lý ngay!"}
					</p>
				</Card>

				{/* 2. Trạng thái Tường Lửa UFW */}
				<Card className="border-border/70 bg-card p-4 space-y-3 shadow-xs">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div
								className={`size-8 rounded-lg flex items-center justify-center ${
									firewallStatus === "active"
										? "bg-emerald-500/10 text-emerald-500"
										: "bg-amber-500/10 text-amber-500"
								}`}
							>
								{firewallStatus === "active" ? (
									<Lock className="size-4" />
								) : (
									<Unlock className="size-4" />
								)}
							</div>
							<div>
								<span className="text-xs font-semibold text-foreground">
									Tường Lửa UFW
								</span>
								<p className="text-[10px] text-muted-foreground">
									Host Firewall
								</p>
							</div>
						</div>
						{firewallStatus === "active" ? (
							<Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs px-2 py-0.5">
								Đang Bật
							</Badge>
						) : firewallStatus === "inactive" ? (
							<Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs px-2 py-0.5">
								Đang Tắt
							</Badge>
						) : (
							<Badge className="bg-muted text-muted-foreground border-border text-xs px-2 py-0.5">
								Không Có Sẵn
							</Badge>
						)}
					</div>
					<p className="text-[11px] text-muted-foreground pt-1">
						{security?.firewallDetails ||
							(firewallStatus === "active"
								? "Tường lửa đang kiểm soát các kết nối vào máy chủ."
								: "Khuyến nghị bật tường lửa UFW để tránh rò rỉ cổng nội bộ.")}
					</p>
				</Card>

				{/* 3. Tổng số Cổng Đang Lắng Nghe */}
				<Card className="border-border/70 bg-card p-4 space-y-3 shadow-xs">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div className="size-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
								<Server className="size-4" />
							</div>
							<div>
								<span className="text-xs font-semibold text-foreground">
									Cổng Đang Mở
								</span>
								<p className="text-[10px] text-muted-foreground">
									Listening Ports
								</p>
							</div>
						</div>
						<span className="text-xl font-bold font-mono text-foreground">
							{security?.totalOpenPorts ?? 0}
						</span>
					</div>
					<div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1">
						<span>Cổng toàn cầu (0.0.0.0):</span>
						<span className="font-semibold text-foreground font-mono">
							{security?.publicPortsCount ?? 0}
						</span>
					</div>
				</Card>

				{/* 4. Cổng Nguy Cơ Cao */}
				<Card className="border-border/70 bg-card p-4 space-y-3 shadow-xs">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div
								className={`size-8 rounded-lg flex items-center justify-center ${
									(security?.highRiskPortsCount ?? 0) > 0
										? "bg-rose-500/10 text-rose-500"
										: "bg-emerald-500/10 text-emerald-500"
								}`}
							>
								<ShieldAlert className="size-4" />
							</div>
							<div>
								<span className="text-xs font-semibold text-foreground">
									Cổng Nguy Cơ Cao
								</span>
								<p className="text-[10px] text-muted-foreground">
									Rò rỉ Database/API
								</p>
							</div>
						</div>
						<span
							className={`text-xl font-bold font-mono ${
								(security?.highRiskPortsCount ?? 0) > 0
									? "text-rose-500"
									: "text-emerald-500"
							}`}
						>
							{security?.highRiskPortsCount ?? 0}
						</span>
					</div>
					<p className="text-[11px] text-muted-foreground pt-1">
						{(security?.highRiskPortsCount ?? 0) > 0
							? "Có cổng nhạy cảm mở ra ngoài không có tường lửa!"
							: "Không có cổng cơ sở dữ liệu nào bị phơi ra internet."}
					</p>
				</Card>
			</div>

			{/* Recommendations Banner */}
			{recommendations.length > 0 && (
				<div className="rounded-xl border border-border/70 bg-card p-4 space-y-2 shadow-xs">
					<div className="flex items-center gap-2">
						<Shield className="size-4 text-emerald-500" />
						<h4 className="text-xs font-semibold text-foreground">
							Khuyến Nghị An Ninh Mạng Cho VPS
						</h4>
					</div>
					<div className="space-y-1.5 pl-6">
						{recommendations.map((rec, idx) => (
							<div
								key={idx}
								className="text-xs text-muted-foreground flex items-start gap-1.5"
							>
								<span className="text-primary font-bold">•</span>
								<span>{rec}</span>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Port Matrix Table */}
			<Card className="border-border/70 shadow-xs">
				<CardHeader className="p-4 sm:p-5 border-b border-border/60">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<div>
							<CardTitle className="text-base font-bold flex items-center gap-2">
								<Globe className="size-4 text-blue-500" />
								Ma Trận Cổng Lắng Nghe & Dịch Vụ Host
							</CardTitle>
							<CardDescription className="text-xs mt-0.5">
								Kiểm soát chi tiết mọi cổng mạng TCP/UDP đang mở trên VPS, ứng dụng sở hữu và mức độ an toàn.
							</CardDescription>
						</div>

						{/* Search & Filter Controls */}
						<div className="flex flex-wrap items-center gap-2">
							<div className="relative w-48 sm:w-60">
								<Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
								<Input
									placeholder="Tìm cổng, container, giao thức..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="h-8 pl-8 text-xs"
								/>
							</div>

							<div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/60">
								<Button
									variant={riskFilter === "all" ? "default" : "ghost"}
									size="sm"
									className="h-7 text-[11px] px-2"
									onClick={() => setRiskFilter("all")}
								>
									Tất cả
								</Button>
								<Button
									variant={riskFilter === "danger" ? "default" : "ghost"}
									size="sm"
									className="h-7 text-[11px] px-2 text-rose-500"
									onClick={() => setRiskFilter("danger")}
								>
									Nguy hiểm
								</Button>
								<Button
									variant={riskFilter === "warning" ? "default" : "ghost"}
									size="sm"
									className="h-7 text-[11px] px-2 text-amber-500"
									onClick={() => setRiskFilter("warning")}
								>
									Lưu ý
								</Button>
								<Button
									variant={riskFilter === "safe" ? "default" : "ghost"}
									size="sm"
									className="h-7 text-[11px] px-2 text-emerald-500"
									onClick={() => setRiskFilter("safe")}
								>
									An toàn
								</Button>
							</div>

							{onRefresh && (
								<Button
									variant="outline"
									size="sm"
									className="h-8 gap-1.5 text-xs"
									onClick={onRefresh}
									disabled={isLoading}
								>
									<RefreshCw
										className={`size-3.5 ${isLoading ? "animate-spin" : ""}`}
									/>
									<span className="hidden sm:inline">Quét lại</span>
								</Button>
							)}
						</div>
					</div>
				</CardHeader>

				<CardContent className="p-0">
					<div className="overflow-x-auto">
						<Table>
							<TableHeader className="bg-muted/40">
								<TableRow>
									<TableHead className="text-xs font-semibold">Cổng / Port</TableHead>
									<TableHead className="text-xs font-semibold">Giao thức</TableHead>
									<TableHead className="text-xs font-semibold">Địa chỉ Bind</TableHead>
									<TableHead className="text-xs font-semibold">Dịch vụ / Container</TableHead>
									<TableHead className="text-xs font-semibold">Mức Độ Rủi Ro</TableHead>
									<TableHead className="text-xs font-semibold">Mô Tả & Khuyến Nghị</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredPorts.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={6}
											className="h-32 text-center text-xs text-muted-foreground"
										>
											{isLoading
												? "Đang quét các cổng mạng trên máy chủ..."
												: "Không tìm thấy cổng mạng nào phù hợp với bộ lọc."}
										</TableCell>
									</TableRow>
								) : (
									filteredPorts.map((p, idx) => (
										<TableRow key={`${p.protocol}-${p.port}-${idx}`} className="hover:bg-muted/30">
											<TableCell className="font-mono text-xs font-bold text-foreground">
												:{p.port}
											</TableCell>
											<TableCell>
												<Badge
													variant="outline"
													className={`text-[10px] font-mono font-semibold ${
														p.protocol === "TCP"
															? "text-blue-500 border-blue-500/30"
															: "text-purple-500 border-purple-500/30"
													}`}
												>
													{p.protocol}
												</Badge>
											</TableCell>
											<TableCell>
												{p.isPublic ? (
													<span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
														<Globe className="size-3" />
														0.0.0.0 (Public)
													</span>
												) : (
													<span className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
														<Lock className="size-3" />
														{p.ip} (Local)
													</span>
												)}
											</TableCell>
											<TableCell>
												<div className="flex flex-col">
													<span className="text-xs font-medium text-foreground">
														{p.service}
													</span>
													{p.containerName && (
														<span className="text-[10px] text-muted-foreground font-mono">
															Container: {p.containerName}
														</span>
													)}
												</div>
											</TableCell>
											<TableCell>{getRiskBadge(p.riskLevel)}</TableCell>
											<TableCell className="text-xs text-muted-foreground max-w-md">
												{p.description}
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};
