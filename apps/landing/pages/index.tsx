import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import {
	Activity,
	ArrowRight,
	Boxes,
	Check,
	CheckCircle2,
	ChevronRight,
	Cloud,
	Copy,
	Cpu,
	Database,
	ExternalLink,
	Eye,
	GitBranch,
	Globe,
	HardDrive,
	Headphones,
	Layers,
	Lock,
	Network,
	Radio,
	RefreshCw,
	Server,
	ShieldCheck,
	Sparkles,
	Terminal,
	Users,
	Workflow,
	Zap,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

interface TopologyNode {
	id: string;
	name: string;
	role: string;
	region: string;
	ip: string;
	status: "healthy" | "syncing" | "standby";
	containers: number;
	cpu: string;
	ram: string;
	type: "control" | "worker" | "database" | "router";
}

const TOPOLOGY_NODES: TopologyNode[] = [
	{
		id: "hub",
		name: "Meshdock Central Control",
		role: "Trung tâm điều phối / API Gateway",
		region: "SG-Central-1",
		ip: "103.142.26.10",
		status: "healthy",
		containers: 8,
		cpu: "14%",
		ram: "2.1 / 16 GB",
		type: "control",
	},
	{
		id: "traefik",
		name: "Traefik Ingress Router",
		role: "Cân bằng tải & Cấp SSL Tự động",
		region: "Global Anycast",
		ip: "Edge Ingress",
		status: "healthy",
		containers: 2,
		cpu: "6%",
		ram: "512 MB / 4 GB",
		type: "router",
	},
	{
		id: "node-sg",
		name: "Node-01 (Singapore VPS)",
		role: "Docker Swarm Manager",
		region: "Singapore",
		ip: "103.142.26.11",
		status: "healthy",
		containers: 28,
		cpu: "36%",
		ram: "4.8 / 8 GB",
		type: "worker",
	},
	{
		id: "node-vn",
		name: "Node-02 (Hanoi Bare-metal)",
		role: "Swarm Worker / App Node",
		region: "Hà Nội, VN",
		ip: "14.225.192.45",
		status: "healthy",
		containers: 42,
		cpu: "52%",
		ram: "16.4 / 32 GB",
		type: "worker",
	},
	{
		id: "node-de",
		name: "Node-03 (Frankfurt VPS)",
		role: "Server độc lập (Standalone)",
		region: "Frankfurt, Đức",
		ip: "194.36.14.88",
		status: "syncing",
		containers: 18,
		cpu: "24%",
		ram: "3.2 / 8 GB",
		type: "worker",
	},
	{
		id: "db-cluster",
		name: "Database Cluster",
		role: "PostgreSQL Primary + S3 Backup",
		region: "SG-Storage-Zone",
		ip: "103.142.26.15",
		status: "healthy",
		containers: 6,
		cpu: "18%",
		ram: "7.2 / 16 GB",
		type: "database",
	},
];

export default function LandingHome() {
	const [activeTab, setActiveTab] = useState<"curl" | "docker" | "swarm">("curl");
	const [copied, setCopied] = useState(false);
	const [selectedNode, setSelectedNode] = useState<TopologyNode>(TOPOLOGY_NODES[0]!);
	const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

	const installCommands = {
		curl: "curl -sSL https://meshdock.softty.net/install.sh | bash",
		docker: "docker run -d -p 3000:3000 -v /var/run/docker.sock:/var/run/docker.sock softtynet/meshdock:latest",
		swarm: "docker stack deploy -c meshdock-stack.yml meshdock",
	};

	const handleCopy = (text: string) => {
		navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="min-h-screen bg-[#070B14] text-slate-100 selection:bg-cyan-500/20 selection:text-cyan-300">
			<Head>
				<title>Meshdock - Nền tảng Quản trị &amp; Triển khai Mạng lưới Server Tập trung | SOFTTY.NET</title>
				<meta
					name="description"
					content="Hệ thống điều phối tập trung dành cho đội ngũ quản trị hạ tầng Cloud, Docker Swarm và hàng chục VPS độc lập. Trực quan hóa Topology, tự động hóa deploy và đo kiểm thời gian thực."
				/>
				<meta property="og:title" content="Meshdock - Cloud Deployment & Multi-Server Mesh Management" />
				<meta
					property="og:description"
					content="Giải pháp quản lý tập trung và giám sát sơ đồ hệ thống đa server phát triển bởi SOFTTY.NET."
				/>
				<meta property="og:image" content="/og.png" />
				<meta property="og:url" content="https://meshdock.softty.net" />
				<link rel="icon" href="/icon.svg" />
			</Head>

			{/* Background ambient lighting */}
			<div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
				<div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[1100px] h-[650px] bg-gradient-to-b from-cyan-600/15 via-blue-600/10 to-transparent blur-[140px] rounded-full" />
				<div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 blur-[150px] rounded-full" />
				<div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-cyan-600/10 blur-[140px] rounded-full" />
			</div>

			{/* Top Announcement Bar */}
			<div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 border-b border-cyan-500/20 py-2 px-4 text-center text-xs text-cyan-300">
				<span>
					🚀 <strong>Meshdock v0.31</strong> chính thức phát hành với tính năng <strong>Quản lý Tập trung Đa Node &amp; Sơ đồ Topology</strong>.{" "}
					<a href="#pricing" className="underline font-semibold hover:text-white ml-1">
						Xem các gói giải pháp &rarr;
					</a>
				</span>
			</div>

			{/* Header / Navbar */}
			<header className="sticky top-0 z-50 backdrop-blur-xl bg-[#070B14]/85 border-b border-slate-800/80">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Link href="/" className="flex items-center gap-2.5">
							<Logo className="size-8" />
							<span className="font-bold text-xl tracking-tight text-white">
								Mesh<span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">dock</span>
							</span>
						</Link>
						<span className="hidden sm:inline-flex items-center rounded-full border border-cyan-500/30 text-cyan-400 bg-cyan-500/10 text-xs px-2.5 py-0.5">
							by SOFTTY.NET
						</span>
					</div>

					<nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
						<a href="#topology" className="hover:text-cyan-400 transition-colors">Sơ đồ Mesh</a>
						<a href="#features" className="hover:text-cyan-400 transition-colors">Tính năng</a>
						<a href="#pricing" className="hover:text-cyan-400 transition-colors">Bảng giá</a>
						<a href="#comparison" className="hover:text-cyan-400 transition-colors">So sánh</a>
						<a href="#faq" className="hover:text-cyan-400 transition-colors">Hỏi đáp</a>
						<a
							href="https://github.com/softtyos/meshdock"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
						>
							GitHub
							<ExternalLink className="size-3.5 opacity-70" />
						</a>
					</nav>

					<div className="flex items-center gap-3">
						<a
							href="https://github.com/softtyos/meshdock"
							target="_blank"
							rel="noopener noreferrer"
							className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-xs font-medium text-slate-200 transition-all"
						>
							<GitBranch className="size-3.5 text-cyan-400" />
							<span>Star Repo</span>
						</a>
						<a
							href="https://www.softty.net"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-cyan-500/20 transition-all"
						>
							Liên hệ Tư vấn
							<ArrowRight className="ml-1.5 size-4" />
						</a>
					</div>
				</div>
			</header>

			{/* Hero Section */}
			<section className="relative pt-20 pb-20 md:pt-28 md:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
				<div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 text-xs font-medium mb-8 backdrop-blur-md">
					<Sparkles className="size-3.5 text-cyan-400 animate-pulse" />
					<span>Nền tảng Quản trị Tập trung Đa Cụm Máy Chủ cho Doanh Nghiệp</span>
					<ChevronRight className="size-3.5 opacity-60" />
				</div>

				<h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-[1.15]">
					Hạ Tầng Cloud &amp; Quản Lý Tập Trung <br />
					<span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
						Cho Mọi Cụm VPS, Swarm &amp; Server
					</span>
				</h1>

				<p className="mt-6 text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
					Bạn có 10+ server độc lập, nhiều cụm Docker Swarm phân tán và hàng trăm ứng dụng?
					Meshdock đồng bộ tất cả vào một bảng điều khiển duy nhất, trực quan hóa sơ đồ workflow hệ thống và
					giám sát toàn diện tài nguyên theo thời gian thực.
				</p>

				<div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
					<a
						href="#pricing"
						className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-base shadow-xl shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5"
					>
						Xem Bảng Giá &amp; Thương Mại
						<ArrowRight className="ml-2 size-5" />
					</a>
					<a
						href="#topology"
						className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 font-medium text-base backdrop-blur-sm transition-all"
					>
						<Workflow className="mr-2 size-5 text-cyan-400" />
						Khám Phá Sơ Đồ Topology
					</a>
				</div>

				{/* Quick Install Snippet */}
				<div className="mt-12 max-w-2xl mx-auto">
					<div className="rounded-xl border border-slate-800 bg-[#0C1220]/90 shadow-2xl p-3 backdrop-blur-md">
						<div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 px-3 mb-3 text-xs text-slate-400">
							<div className="flex items-center gap-2">
								<div className="size-2.5 rounded-full bg-rose-500/80" />
								<div className="size-2.5 rounded-full bg-amber-500/80" />
								<div className="size-2.5 rounded-full bg-emerald-500/80" />
								<span className="ml-2 font-mono text-slate-400">Cài đặt nhanh 1 dòng lệnh trên VPS</span>
							</div>
							<div className="flex items-center gap-1.5">
								<button
									onClick={() => setActiveTab("curl")}
									className={cn(
										"px-2 py-0.5 rounded text-xs transition-colors",
										activeTab === "curl" ? "bg-cyan-500/20 text-cyan-300 font-semibold" : "hover:text-slate-200",
									)}
								>
									cURL
								</button>
								<button
									onClick={() => setActiveTab("docker")}
									className={cn(
										"px-2 py-0.5 rounded text-xs transition-colors",
										activeTab === "docker" ? "bg-cyan-500/20 text-cyan-300 font-semibold" : "hover:text-slate-200",
									)}
								>
									Docker
								</button>
								<button
									onClick={() => setActiveTab("swarm")}
									className={cn(
										"px-2 py-0.5 rounded text-xs transition-colors",
										activeTab === "swarm" ? "bg-cyan-500/20 text-cyan-300 font-semibold" : "hover:text-slate-200",
									)}
								>
									Swarm
								</button>
							</div>
						</div>
						<div className="flex items-center justify-between gap-3 px-3 py-2 bg-slate-950/80 rounded-lg border border-slate-900 font-mono text-xs sm:text-sm text-cyan-300">
							<div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none py-1">
								<span className="text-slate-500 select-none">$</span>
								<span>{installCommands[activeTab]}</span>
							</div>
							<button
								onClick={() => handleCopy(installCommands[activeTab])}
								className="shrink-0 p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
								title="Copy to clipboard"
							>
								{copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
							</button>
						</div>
					</div>
				</div>

				{/* Key Metric counters */}
				<div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto pt-8 border-t border-slate-800/60">
					<div>
						<div className="text-3xl font-extrabold text-white">10+ VPS Nodes</div>
						<div className="text-xs text-slate-400 mt-1">Quản lý mạng lưới tập trung</div>
					</div>
					<div>
						<div className="text-3xl font-extrabold text-cyan-400">Zero-Downtime</div>
						<div className="text-xs text-slate-400 mt-1">Cân bằng tải &amp; Auto SSL</div>
					</div>
					<div>
						<div className="text-3xl font-extrabold text-indigo-400">Swarm &amp; Standalone</div>
						<div className="text-xs text-slate-400 mt-1">Điều phối linh hoạt</div>
					</div>
					<div>
						<div className="text-3xl font-extrabold text-emerald-400">100% Mã Nguồn Mở</div>
						<div className="text-xs text-slate-400 mt-1">Giấy phép Apache 2.0</div>
					</div>
				</div>
			</section>

			{/* Interactive Topology Showcase */}
			<section className="py-20 bg-slate-950/60 border-y border-slate-800/80 relative" id="topology">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center max-w-3xl mx-auto mb-16">
						<span className="inline-flex items-center rounded-full border border-cyan-500/40 text-cyan-400 bg-cyan-500/10 text-xs px-3 py-1 mb-3">
							Trực Quan Hóa Sơ Đồ Hệ Thống
						</span>
						<h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
							Mesh Topology &amp; Workflow Trực Quan
						</h2>
						<p className="mt-4 text-slate-300 text-base sm:text-lg">
							Theo dõi chính xác luồng dữ liệu từ Ingress đi vào đâu, các node con xử lý ra sao, tải CPU/RAM của từng máy chủ,
							và nhận cảnh báo ngay khi một node gặp sự cố.
						</p>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
						{/* Interactive Visual Graph Grid */}
						<div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-[#0A0F1D] p-6 shadow-2xl relative overflow-hidden">
							<div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-6">
								<div className="flex items-center gap-2">
									<Radio className="size-4 text-emerald-400 animate-pulse" />
									<span className="text-sm font-semibold text-slate-200">Mạng Lưới Server Đang Hoạt Động (Mesh Fleet)</span>
								</div>
								<span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-full border border-cyan-800/60">
									Protocol: WireGuard / Docker Swarm Overlay
								</span>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								{TOPOLOGY_NODES.map((node) => {
									const isSelected = selectedNode.id === node.id;
									return (
										<div
											key={node.id}
											onClick={() => setSelectedNode(node)}
											className={cn(
												"p-4 rounded-xl border transition-all cursor-pointer text-left relative",
												isSelected
													? "border-cyan-500/80 bg-cyan-950/30 shadow-lg shadow-cyan-500/10"
													: "border-slate-800/90 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/80",
											)}
										>
											<div className="flex items-start justify-between">
												<div className="flex items-center gap-2.5">
													{node.type === "control" && <Logo className="size-5" />}
													{node.type === "router" && <Globe className="size-5 text-indigo-400" />}
													{node.type === "worker" && <Server className="size-5 text-cyan-400" />}
													{node.type === "database" && <Database className="size-5 text-emerald-400" />}
													<div>
														<h4 className="text-sm font-bold text-white">{node.name}</h4>
														<p className="text-xs text-slate-400">{node.role}</p>
													</div>
												</div>
												<span
													className={cn(
														"size-2.5 rounded-full",
														node.status === "healthy"
															? "bg-emerald-400 ring-4 ring-emerald-500/20"
															: "bg-amber-400 ring-4 ring-amber-500/20 animate-pulse",
													)}
												/>
											</div>

											<div className="mt-4 grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-xs">
												<div>
													<span className="text-slate-500 block">Tải CPU</span>
													<span className="font-mono text-slate-300 font-semibold">{node.cpu}</span>
												</div>
												<div>
													<span className="text-slate-500 block">RAM Dùng</span>
													<span className="font-mono text-slate-300 font-semibold">{node.ram.split("/")[0]}</span>
												</div>
												<div>
													<span className="text-slate-500 block">Container</span>
													<span className="font-mono text-cyan-300 font-semibold">{node.containers} apps</span>
												</div>
											</div>
										</div>
									);
								})}
							</div>

							<div className="mt-6 p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
								<span>💡 Nhấp vào bất kỳ server node nào ở trên để xem chi tiết tài nguyên thời gian thực.</span>
								<span className="font-mono text-emerald-400 flex items-center gap-1.5">
									<CheckCircle2 className="size-3.5" /> 6/6 Nodes Đồng Bộ
								</span>
							</div>
						</div>

						{/* Node Detail Inspector Panel */}
						<div className="rounded-2xl border border-slate-800 bg-[#0C1220] p-6 shadow-2xl">
							<div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
								<h3 className="font-bold text-white text-base flex items-center gap-2">
									<Cpu className="size-4 text-cyan-400" />
									Chi Tiết Server Node
								</h3>
								<span className="text-xs bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded">
									{selectedNode.ip}
								</span>
							</div>

							<div className="space-y-4">
								<div>
									<div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Tên Máy Chủ</div>
									<div className="text-base font-bold text-white mt-0.5">{selectedNode.name}</div>
									<div className="text-xs text-slate-400">{selectedNode.role} • {selectedNode.region}</div>
								</div>

								<div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/90 space-y-2.5">
									<div className="flex justify-between text-xs">
										<span className="text-slate-400">Trạng Thái</span>
										<span className="font-semibold text-emerald-400 capitalize">{selectedNode.status}</span>
									</div>
									<div className="flex justify-between text-xs">
										<span className="text-slate-400">Tải CPU</span>
										<span className="font-mono font-semibold text-slate-200">{selectedNode.cpu}</span>
									</div>
									<div className="flex justify-between text-xs">
										<span className="text-slate-400">Bộ Nhớ RAM</span>
										<span className="font-mono font-semibold text-slate-200">{selectedNode.ram}</span>
									</div>
									<div className="flex justify-between text-xs">
										<span className="text-slate-400">Ứng Dụng Đang Chạy</span>
										<span className="font-mono font-semibold text-cyan-300">{selectedNode.containers} Containers</span>
									</div>
								</div>

								<div className="space-y-2 pt-2">
									<div className="text-xs font-semibold text-slate-400">Dịch Vụ Gắn Kèm</div>
									<div className="flex flex-wrap gap-1.5">
										<span className="px-2 py-0.5 rounded text-[11px] bg-cyan-950 border border-cyan-800 text-cyan-300">
											Vector Logs
										</span>
										<span className="px-2 py-0.5 rounded text-[11px] bg-blue-950 border border-blue-800 text-blue-300">
											cAdvisor Metrics
										</span>
										<span className="px-2 py-0.5 rounded text-[11px] bg-indigo-950 border border-indigo-800 text-indigo-300">
											Traefik Ingress
										</span>
										<span className="px-2 py-0.5 rounded text-[11px] bg-emerald-950 border border-emerald-800 text-emerald-300">
											Auto S3 Backup
										</span>
									</div>
								</div>

								<a
									href="https://www.softty.net"
									target="_blank"
									rel="noopener noreferrer"
									className="mt-4 w-full py-2.5 px-4 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
								>
									<Eye className="size-4" />
									Đăng Ký Tư Vấn Triển Khai
								</a>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Core Capabilities */}
			<section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" id="features">
				<div className="text-center max-w-3xl mx-auto mb-16">
					<span className="inline-flex items-center rounded-full border border-cyan-500/40 text-cyan-400 bg-cyan-500/10 text-xs px-3 py-1 mb-3">
						Kiến Trúc Chuẩn Doanh Nghiệp
					</span>
					<h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
						Tính Năng Vượt Trội của Meshdock
					</h2>
					<p className="mt-4 text-slate-300 text-base sm:text-lg">
						Thay thế hoàn toàn các script rời rạc bằng một nền tảng quản trị đồng bộ, sẵn sàng cho hạ tầng chịu tải cao.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div className="bg-[#0A0F1D]/80 border border-slate-800 hover:border-cyan-500/50 transition-all p-6 rounded-2xl group">
						<div className="size-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-5 group-hover:scale-110 transition-transform">
							<Network className="size-6" />
						</div>
						<h3 className="text-xl font-bold text-white mb-2">Quản Trị Đa Server Tập Trung</h3>
						<p className="text-sm text-slate-400 leading-relaxed">
							Kết nối các máy chủ VPS độc lập và Bare Metal qua SSH chỉ với 1 click. Triển khai, cập nhật
							và quản lý ứng dụng từ xa mà không cần chuyển qua chuyển lại giữa hàng chục terminal.
						</p>
					</div>

					<div className="bg-[#0A0F1D]/80 border border-slate-800 hover:border-blue-500/50 transition-all p-6 rounded-2xl group">
						<div className="size-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-5 group-hover:scale-110 transition-transform">
							<Boxes className="size-6" />
						</div>
						<h3 className="text-xl font-bold text-white mb-2">Điều Phối Cụm Docker Swarm</h3>
						<p className="text-sm text-slate-400 leading-relaxed">
							Mở rộng dịch vụ linh hoạt trên cụm Swarm. Tự động chuyển vùng chịu lỗi khi một node sập,
							cân bằng tải mượt mà giữa các worker nodes mà không gây gián đoạn hệ thống.
						</p>
					</div>

					<div className="bg-[#0A0F1D]/80 border border-slate-800 hover:border-emerald-500/50 transition-all p-6 rounded-2xl group">
						<div className="size-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-110 transition-transform">
							<Database className="size-6" />
						</div>
						<h3 className="text-xl font-bold text-white mb-2">Cơ Sở Dữ Liệu &amp; Sao Lưu S3</h3>
						<p className="text-sm text-slate-400 leading-relaxed">
							Khởi tạo tức thì PostgreSQL, MySQL, MariaDB, MongoDB, Redis và LibSQL. Lên lịch tự động
							sao lưu và đẩy thẳng về AWS S3, Cloudflare R2 hoặc MinIO storage.
						</p>
					</div>

					<div className="bg-[#0A0F1D]/80 border border-slate-800 hover:border-indigo-500/50 transition-all p-6 rounded-2xl group">
						<div className="size-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5 group-hover:scale-110 transition-transform">
							<Layers className="size-6" />
						</div>
						<h3 className="text-xl font-bold text-white mb-2">Traefik Routing &amp; Auto SSL</h3>
						<p className="text-sm text-slate-400 leading-relaxed">
							Tự động cấp phát và gia hạn chứng chỉ SSL Let’s Encrypt. Hỗ trợ định tuyến tên miền phụ (subdomain),
							tiền tố path, reverse proxy thông minh và điều hướng HTTP sang HTTPS.
						</p>
					</div>

					<div className="bg-[#0A0F1D]/80 border border-slate-800 hover:border-purple-500/50 transition-all p-6 rounded-2xl group">
						<div className="size-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-5 group-hover:scale-110 transition-transform">
							<Activity className="size-6" />
						</div>
						<h3 className="text-xl font-bold text-white mb-2">Vector Logs &amp; Giám Sát Thời Gian Thực</h3>
						<p className="text-sm text-slate-400 leading-relaxed">
							Thu thập log container và số liệu cAdvisor máy chủ qua Vector pipeline, đẩy về Grafana,
							Loki, Prometheus, Datadog hoặc gửi cảnh báo qua Telegram/Discord khi vượt ngưỡng tải.
						</p>
					</div>

					<div className="bg-[#0A0F1D]/80 border border-slate-800 hover:border-amber-500/50 transition-all p-6 rounded-2xl group">
						<div className="size-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-110 transition-transform">
							<ShieldCheck className="size-6" />
						</div>
						<h3 className="text-xl font-bold text-white mb-2">Bảo Mật SSO, RBAC &amp; Whitelabel</h3>
						<p className="text-sm text-slate-400 leading-relaxed">
							Bảo vệ ứng dụng nội bộ bằng cổng OIDC/SAML SSO (Forward Auth). Phân quyền chi tiết cho thành viên
							nhóm và hỗ trợ đổi toàn bộ logo, thương hiệu riêng cho doanh nghiệp.
						</p>
					</div>
				</div>
			</section>

			{/* COMMERCIAL PRICING SECTION */}
			<section className="py-24 bg-slate-950/70 border-t border-slate-800/80 relative" id="pricing">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center max-w-3xl mx-auto mb-16">
						<span className="inline-flex items-center rounded-full border border-cyan-500/40 text-cyan-400 bg-cyan-500/10 text-xs px-3 py-1 mb-3">
							Mô Hình Thương Mại Linh Hoạt
						</span>
						<h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
							Bảng Giá &amp; Gói Dịch Vụ Meshdock
						</h2>
						<p className="mt-4 text-slate-300 text-base sm:text-lg">
							Sử dụng miễn phí bản mã nguồn mở hoặc chọn các gói hỗ trợ kỹ thuật, vận hành chuyên nghiệp từ SOFTTY.NET.
						</p>

						{/* Monthly / Yearly Toggle */}
						<div className="mt-8 inline-flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
							<button
								onClick={() => setBillingCycle("monthly")}
								className={cn(
									"px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
									billingCycle === "monthly" ? "bg-cyan-500 text-white shadow" : "text-slate-400 hover:text-white",
								)}
							>
								Thanh toán Hàng Tháng
							</button>
							<button
								onClick={() => setBillingCycle("yearly")}
								className={cn(
									"px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
									billingCycle === "yearly" ? "bg-cyan-500 text-white shadow" : "text-slate-400 hover:text-white",
								)}
							>
								<span>Thanh toán Hàng Năm</span>
								<span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
									Tiết kiệm 20%
								</span>
							</button>
						</div>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
						{/* Tier 1: Community Core (Free Forever) */}
						<div className="rounded-3xl border border-slate-800 bg-[#0A0F1D] p-8 flex flex-col justify-between hover:border-slate-700 transition-all">
							<div>
								<div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 mb-4">
									Community Edition
								</div>
								<h3 className="text-2xl font-bold text-white">Mã Nguồn Mở</h3>
								<p className="text-sm text-slate-400 mt-2">Dành cho cá nhân và nhà phát triển tự triển khai trên VPS riêng.</p>

								<div className="my-6">
									<span className="text-4xl font-extrabold text-white">0 VNĐ</span>
									<span className="text-slate-400 text-sm"> / vĩnh viễn</span>
								</div>

								<div className="space-y-3 text-sm text-slate-300 pt-4 border-t border-slate-800">
									<div className="flex items-center gap-2.5">
										<Check className="size-4 text-emerald-400 shrink-0" />
										<span>Không giới hạn số lượng Server Node &amp; VPS</span>
									</div>
									<div className="flex items-center gap-2.5">
										<Check className="size-4 text-emerald-400 shrink-0" />
										<span>Hỗ trợ Docker Swarm &amp; Server độc lập</span>
									</div>
									<div className="flex items-center gap-2.5">
										<Check className="size-4 text-emerald-400 shrink-0" />
										<span>Tự động cấp chứng chỉ SSL Traefik Let’s Encrypt</span>
									</div>
									<div className="flex items-center gap-2.5">
										<Check className="size-4 text-emerald-400 shrink-0" />
										<span>Lên lịch sao lưu cơ sở dữ liệu S3 định kỳ</span>
									</div>
									<div className="flex items-center gap-2.5">
										<Check className="size-4 text-emerald-400 shrink-0" />
										<span>Giấy phép Apache 2.0 toàn quyền mã nguồn</span>
									</div>
									<div className="flex items-center gap-2.5 text-slate-500">
										<span className="size-4 shrink-0 text-center font-bold">✕</span>
										<span>Hỗ trợ kỹ thuật qua GitHub Issues cộng đồng</span>
									</div>
								</div>
							</div>

							<a
								href="https://github.com/softtyos/meshdock"
								target="_blank"
								rel="noopener noreferrer"
								className="mt-8 w-full py-3 px-4 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-white text-sm font-semibold text-center block transition-all"
							>
								Xem Mã Nguồn GitHub
							</a>
						</div>

						{/* Tier 2: Pro Mesh (Popular / SMBs) */}
						<div className="rounded-3xl border-2 border-cyan-500/80 bg-gradient-to-b from-cyan-950/30 to-[#0A0F1D] p-8 flex flex-col justify-between shadow-2xl shadow-cyan-500/10 relative">
							<div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow">
								Phổ Biến Nhất
							</div>

							<div>
								<div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 mb-4">
									Pro Mesh Fleet
								</div>
								<h3 className="text-2xl font-bold text-white">Doanh Nghiệp Vừa &amp; Nhỏ</h3>
								<p className="text-sm text-slate-300 mt-2">Dành cho các đội ngũ quản trị cần sơ đồ trực quan và cảnh báo tức thì.</p>

								<div className="my-6">
									<span className="text-4xl font-extrabold text-white">
										{billingCycle === "monthly" ? "490.000" : "390.000"}
									</span>
									<span className="text-slate-400 text-sm"> VNĐ / tháng</span>
									{billingCycle === "yearly" && (
										<div className="text-xs text-emerald-400 mt-1">Thanh toán 4.680.000 VNĐ / năm</div>
									)}
								</div>

								<div className="space-y-3 text-sm text-slate-200 pt-4 border-t border-cyan-500/20">
									<div className="flex items-center gap-2.5">
										<Check className="size-4 text-cyan-400 shrink-0" />
										<span>Toàn bộ quyền lợi gói Community Edition</span>
									</div>
									<div className="flex items-center gap-2.5">
										<Check className="size-4 text-cyan-400 shrink-0" />
										<span><strong>Sơ đồ Topology Tương Tác</strong> &amp; Workflow luồng dữ liệu</span>
									</div>
									<div className="flex items-center gap-2.5">
										<Check className="size-4 text-cyan-400 shrink-0" />
										<span>Cảnh báo tức thời qua <strong>Telegram, Discord, Slack</strong></span>
									</div>
									<div className="flex items-center gap-2.5">
										<Check className="size-4 text-cyan-400 shrink-0" />
										<span>Giám sát chuyên sâu Vector Telemetry &amp; cAdvisor</span>
									</div>
									<div className="flex items-center gap-2.5">
										<Check className="size-4 text-cyan-400 shrink-0" />
										<span>Hỗ trợ kỹ thuật ưu tiên 24/7 từ đội ngũ SOFTTY.NET</span>
									</div>
									<div className="flex items-center gap-2.5">
										<Check className="size-4 text-cyan-400 shrink-0" />
										<span>Tư vấn tối ưu cấu hình Docker Swarm ban đầu</span>
									</div>
								</div>
							</div>

							<a
								href="https://www.softty.net"
								target="_blank"
								rel="noopener noreferrer"
								className="mt-8 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-bold text-center block shadow-lg shadow-cyan-500/25 transition-all"
							>
								Đăng Ký Gói Pro Mesh
							</a>
						</div>

						{/* Tier 3: Enterprise Dedicated */}
						<div className="rounded-3xl border border-slate-800 bg-[#0A0F1D] p-8 flex flex-col justify-between hover:border-slate-700 transition-all">
							<div>
								<div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 mb-4">
									Enterprise Cloud
								</div>
								<h3 className="text-2xl font-bold text-white">Tập Đoàn &amp; Hạ Tầng Lớn</h3>
								<p className="text-sm text-slate-400 mt-2">Giải pháp riêng tư tối đa, tùy biến thương hiệu và cam kết SLA.</p>

								<div className="my-6">
									<span className="text-4xl font-extrabold text-white">Liên Hệ</span>
									<span className="text-slate-400 text-sm"> / thiết kế riêng</span>
								</div>

								<div className="space-y-3 text-sm text-slate-300 pt-4 border-t border-slate-800">
									<div className="flex items-center gap-2.5">
										<Check className="size-4 text-indigo-400 shrink-0" />
										<span>Toàn quyền <strong>White-Labeling</strong> (Thương hiệu, Logo riêng)</span>
									</div>
									<div className="flex items-center gap-2.5">
										<Check className="size-4 text-indigo-400 shrink-0" />
										<span>Cổng đăng nhập <strong>SSO Doanh nghiệp</strong> (SAML 2.0 / OIDC)</span>
									</div>
									<div className="flex items-center gap-2.5">
										<Check className="size-4 text-indigo-400 shrink-0" />
										<span>Cụm điều phối <strong>High Availability (HA Control Plane)</strong></span>
									</div>
									<div className="flex items-center gap-2.5">
										<Check className="size-4 text-indigo-400 shrink-0" />
										<span>Triển khai On-Premise hoặc Bare-metal riêng biệt</span>
									</div>
									<div className="flex items-center gap-2.5">
										<Check className="size-4 text-indigo-400 shrink-0" />
										<span>Cam kết chất lượng dịch vụ SLA 99.99%</span>
									</div>
									<div className="flex items-center gap-2.5">
										<Check className="size-4 text-indigo-400 shrink-0" />
										<span>Kỹ sư chuyên trách hỗ trợ trực tiếp từ SOFTTY.NET</span>
									</div>
								</div>
							</div>

							<a
								href="https://www.softty.net"
								target="_blank"
								rel="noopener noreferrer"
								className="mt-8 w-full py-3 px-4 rounded-xl border border-indigo-500/40 bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-200 text-sm font-semibold text-center block transition-all"
							>
								Liên Hệ Báo Giá Enterprise
							</a>
						</div>
					</div>
				</div>
			</section>

			{/* Comparison Table */}
			<section className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8" id="comparison">
				<div className="text-center mb-12">
					<h2 className="text-3xl font-extrabold text-white">So Sánh Meshdock Với Các Giải Pháp Khác</h2>
					<p className="mt-3 text-slate-400 text-sm sm:text-base">
						Được tinh chỉnh để giải quyết trọn vẹn bài toán vận hành mạng lưới nhiều máy chủ và Swarm cluster.
					</p>
				</div>

				<div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#0A0F1D]">
					<table className="w-full text-left text-sm">
						<thead>
							<tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60">
								<th className="py-4 px-6 font-semibold">Tính năng</th>
								<th className="py-4 px-6 font-semibold text-cyan-400 bg-cyan-950/20">Meshdock</th>
								<th className="py-4 px-6 font-semibold">Portainer</th>
								<th className="py-4 px-6 font-semibold">Coolify</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-800/80 text-slate-300">
							<tr>
								<td className="py-3.5 px-6 font-medium text-white">Quản trị Mạng lưới Server Đồng Bộ (Mesh)</td>
								<td className="py-3.5 px-6 font-bold text-emerald-400 bg-cyan-950/10">✅ Mạng lưới đồng bộ</td>
								<td className="py-3.5 px-6 text-slate-400">Chuyển từng agent rời rạc</td>
								<td className="py-3.5 px-6 text-slate-400">Remote Server đơn lẻ</td>
							</tr>
							<tr>
								<td className="py-3.5 px-6 font-medium text-white">Sơ đồ Topology &amp; Workflow luồng dữ liệu</td>
								<td className="py-3.5 px-6 font-bold text-emerald-400 bg-cyan-950/10">✅ Trực quan hóa Node Map</td>
								<td className="py-3.5 px-6 text-rose-400/80">❌ Không có</td>
								<td className="py-3.5 px-6 text-rose-400/80">❌ Không có</td>
							</tr>
							<tr>
								<td className="py-3.5 px-6 font-medium text-white">Cụm Docker Swarm Multi-Node</td>
								<td className="py-3.5 px-6 font-bold text-emerald-400 bg-cyan-950/10">✅ Điều phối Swarm tích hợp</td>
								<td className="py-3.5 px-6 text-emerald-400">✅ Có hỗ trợ</td>
								<td className="py-3.5 px-6 text-rose-400/80">❌ Chỉ Standalone</td>
							</tr>
							<tr>
								<td className="py-3.5 px-6 font-medium text-white">Cân bằng tải Ingress &amp; Auto SSL Traefik</td>
								<td className="py-3.5 px-6 font-bold text-emerald-400 bg-cyan-950/10">✅ Cấp phát tự động</td>
								<td className="py-3.5 px-6 text-slate-400">Cấu hình thủ công</td>
								<td className="py-3.5 px-6 text-emerald-400">✅ Có hỗ trợ</td>
							</tr>
							<tr>
								<td className="py-3.5 px-6 font-medium text-white">Đo kiểm &amp; Pipeline Log Vector</td>
								<td className="py-3.5 px-6 font-bold text-emerald-400 bg-cyan-950/10">✅ Đẩy đa nền tảng (Grafana/Loki)</td>
								<td className="py-3.5 px-6 text-rose-400/80">❌ Chỉ log container cơ bản</td>
								<td className="py-3.5 px-6 text-slate-400">Log cơ bản</td>
							</tr>
							<tr>
								<td className="py-3.5 px-6 font-medium text-white">Chi phí &amp; Bản quyền</td>
								<td className="py-3.5 px-6 font-bold text-emerald-400 bg-cyan-950/10">✅ Miễn phí core + Gói Pro linh hoạt</td>
								<td className="py-3.5 px-6 text-slate-400">Giới hạn 5 nodes miễn phí</td>
								<td className="py-3.5 px-6 text-emerald-400">✅ Open Source</td>
							</tr>
						</tbody>
					</table>
				</div>
			</section>

			{/* FAQ Section */}
			<section className="py-20 bg-slate-950/50 border-t border-slate-800" id="faq">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-12">
						<h2 className="text-3xl font-extrabold text-white">Câu Hỏi Thường Gặp (FAQ)</h2>
						<p className="mt-3 text-slate-400 text-sm">Những thắc mắc phổ biến về Meshdock và giải pháp vận hành Cloud.</p>
					</div>

					<div className="space-y-4">
						<div className="rounded-xl border border-slate-800 bg-[#0C1220] p-5">
							<h3 className="font-bold text-white text-base">Meshdock là gì và phù hợp với ai?</h3>
							<p className="mt-2 text-sm text-slate-400 leading-relaxed">
								Meshdock là nền tảng quản trị và tự động hóa triển khai (PaaS) giúp bạn liên kết nhiều máy chủ VPS độc lập,
								cụm máy chủ Bare Metal hoặc Docker Swarm thành một mạng lưới đồng nhất (Mesh). Phù hợp cho lập trình viên,
								DevOps engineers và doanh nghiệp đang vận hành từ 2 đến hàng chục server.
							</p>
						</div>

						<div className="rounded-xl border border-slate-800 bg-[#0C1220] p-5">
							<h3 className="font-bold text-white text-base">Tôi có thể tự cài đặt trên server riêng miễn phí không?</h3>
							<p className="mt-2 text-sm text-slate-400 leading-relaxed">
								Hoàn toàn có! Bản Community Core của Meshdock được phát hành theo giấy phép mã nguồn mở Apache 2.0.
								Bạn có thể tải về và tự do cài đặt không giới hạn số lượng server node trên hạ tầng riêng của bạn.
							</p>
						</div>

						<div className="rounded-xl border border-slate-800 bg-[#0C1220] p-5">
							<h3 className="font-bold text-white text-base">Sơ đồ Topology của Meshdock hoạt động thế nào?</h3>
							<p className="mt-2 text-sm text-slate-400 leading-relaxed">
								Hệ thống tự động phát hiện các máy chủ đã kết nối, vẽ ra sơ đồ luồng dữ liệu (Dataflow &amp; Workflow) từ cổng vào Traefik,
								các container đang chạy, mức tiêu thụ CPU/RAM và trạng thái sức khỏe của từng máy chủ, giúp bạn phát hiện điểm nghẽn
								hoặc node gặp sự cố ngay lập tức.
							</p>
						</div>

						<div className="rounded-xl border border-slate-800 bg-[#0C1220] p-5">
							<h3 className="font-bold text-white text-base">Khi nào tôi nên nâng cấp lên gói Pro hoặc Enterprise?</h3>
							<p className="mt-2 text-sm text-slate-400 leading-relaxed">
								Khi bạn muốn đội ngũ kỹ sư SOFTTY.NET đồng hành hỗ trợ kỹ thuật 24/7, kích hoạt tính năng cảnh báo tự động qua Telegram/Discord,
								cần tùy biến nhận diện thương hiệu riêng (White-labeling), cổng đăng nhập SSO doanh nghiệp, hoặc thiết kế cụm HA chịu tải lớn.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Final CTA Banner */}
			<section className="py-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
				<div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/40 via-slate-900/60 to-[#0A0F1D] p-10 sm:p-16 relative overflow-hidden shadow-2xl">
					<div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 blur-[90px] rounded-full pointer-events-none" />
					<div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 blur-[90px] rounded-full pointer-events-none" />

					<Logo className="size-16 mx-auto mb-6" />

					<h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
						Sẵn Sàng Đồng Bộ Hóa Hệ Thống Máy Chủ?
					</h2>
					<p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
						Triển khai Meshdock ngay hôm nay trên hạ tầng của bạn hoặc liên hệ SOFTTY.NET để được tư vấn thiết kế cụm Cloud tối ưu nhất.
					</p>

					<div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
						<a
							href="https://www.softty.net"
							target="_blank"
							rel="noopener noreferrer"
							className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-base shadow-xl shadow-cyan-500/20 transition-all"
						>
							Liên Hệ Tư Vấn Triển Khai
						</a>
						<a
							href="https://github.com/softtyos/meshdock"
							target="_blank"
							rel="noopener noreferrer"
							className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-base transition-all flex items-center justify-center gap-2"
						>
							<GitBranch className="size-4" />
							GitHub Repository
						</a>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-t border-slate-800/80 bg-[#050810] py-12 text-slate-400 text-xs sm:text-sm">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
					<div className="flex items-center gap-3">
						<Logo className="size-6" />
						<span className="font-bold text-slate-200">Meshdock</span>
						<span className="text-slate-600">•</span>
						<span>Phát triển &amp; Bảo trợ bởi <a href="https://www.softty.net" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-cyan-400 font-medium transition-colors">SOFTTY.NET CO., LTD</a></span>
					</div>

					<div className="flex items-center gap-6">
						<a href="https://github.com/softtyos/meshdock" target="_blank" rel="noopener noreferrer" className="hover:text-slate-200 transition-colors">GitHub</a>
						<a href="#pricing" className="hover:text-slate-200 transition-colors">Bảng giá</a>
						<a href="#topology" className="hover:text-slate-200 transition-colors">Sơ đồ Mesh</a>
						<a href="https://github.com/softtyos/meshdock/blob/main/TERMS_AND_CONDITIONS.md" target="_blank" rel="noopener noreferrer" className="hover:text-slate-200 transition-colors">Điều khoản</a>
						<a href="https://github.com/softtyos/meshdock/blob/main/SECURITY.md" target="_blank" rel="noopener noreferrer" className="hover:text-slate-200 transition-colors">Bảo mật</a>
						<a href="https://github.com/softtyos/meshdock/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="hover:text-slate-200 transition-colors">Apache 2.0</a>
					</div>
				</div>
			</footer>
		</div>
	);
}
