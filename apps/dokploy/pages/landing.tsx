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
	Layers,
	Lock,
	Network,
	Radio,
	RefreshCw,
	Server,
	ShieldCheck,
	Sparkles,
	Terminal,
	Workflow,
	Zap,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
		name: "Meshdock Central Plane",
		role: "Control Plane / API Gateway",
		region: "SG-Central-1",
		ip: "103.142.26.10",
		status: "healthy",
		containers: 8,
		cpu: "12%",
		ram: "1.8 / 16 GB",
		type: "control",
	},
	{
		id: "traefik",
		name: "Traefik Ingress Edge",
		role: "Reverse Proxy & Auto-SSL",
		region: "Global Anycast",
		ip: "Dynamic Edge",
		status: "healthy",
		containers: 2,
		cpu: "5%",
		ram: "420 MB / 4 GB",
		type: "router",
	},
	{
		id: "node-sg",
		name: "Node-01 (Singapore VPS)",
		role: "Docker Swarm Manager",
		region: "Singapore",
		ip: "103.142.26.11",
		status: "healthy",
		containers: 24,
		cpu: "34%",
		ram: "4.2 / 8 GB",
		type: "worker",
	},
	{
		id: "node-vn",
		name: "Node-02 (Hanoi Bare-metal)",
		role: "Swarm Worker / App Node",
		region: "Vietnam",
		ip: "14.225.192.45",
		status: "healthy",
		containers: 38,
		cpu: "48%",
		ram: "14.8 / 32 GB",
		type: "worker",
	},
	{
		id: "node-de",
		name: "Node-03 (Frankfurt VPS)",
		role: "Independent Remote Node",
		region: "Germany",
		ip: "194.36.14.88",
		status: "syncing",
		containers: 16,
		cpu: "22%",
		ram: "3.1 / 8 GB",
		type: "worker",
	},
	{
		id: "db-cluster",
		name: "PostgreSQL / Redis Mesh",
		role: "Managed Data & S3 Backup",
		region: "SG-Storage-Zone",
		ip: "103.142.26.15",
		status: "healthy",
		containers: 6,
		cpu: "19%",
		ram: "6.5 / 16 GB",
		type: "database",
	},
];

export default function LandingPage() {
	const [activeTab, setActiveTab] = useState<"curl" | "docker" | "swarm">("curl");
	const [copied, setCopied] = useState(false);
	const [selectedNode, setSelectedNode] = useState<TopologyNode>(TOPOLOGY_NODES[0]!);

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
				<title>Meshdock - Centralized Cloud Deployment &amp; Multi-Server Mesh Management</title>
				<meta
					name="description"
					content="Centralized multi-node control plane for independent VPS nodes, bare-metal servers, and Docker Swarm clusters. Visual topology, automated SSL, and zero-downtime deployment."
				/>
				<meta property="og:title" content="Meshdock - Multi-Server Mesh Control Plane" />
				<meta
					property="og:description"
					content="Connect your distributed VPS nodes into an observable, unified deployment mesh powered by SOFTTY.NET."
				/>
				<meta property="og:image" content="/og.png" />
				<meta property="og:url" content="https://meshdock.softty.net" />
				<link rel="icon" href="/icon.svg" />
			</Head>

			{/* Background ambient lighting */}
			<div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
				<div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-cyan-600/15 via-blue-600/10 to-transparent blur-[120px] rounded-full" />
				<div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 blur-[140px] rounded-full" />
				<div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-600/10 blur-[130px] rounded-full" />
			</div>

			{/* Header / Navbar */}
			<header className="sticky top-0 z-50 backdrop-blur-xl bg-[#070B14]/80 border-b border-slate-800/80">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Link href="/landing" className="flex items-center gap-2.5">
							<Logo className="size-8" />
							<span className="font-bold text-xl tracking-tight text-white">
								Mesh<span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">dock</span>
							</span>
						</Link>
						<Badge variant="outline" className="hidden sm:inline-flex border-cyan-500/30 text-cyan-400 bg-cyan-500/10 text-xs px-2 py-0.5">
							v0.31.0
						</Badge>
					</div>

					<nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
						<a href="#topology" className="hover:text-cyan-400 transition-colors">Mesh Topology</a>
						<a href="#features" className="hover:text-cyan-400 transition-colors">Capabilities</a>
						<a href="#comparison" className="hover:text-cyan-400 transition-colors">Comparison</a>
						<a href="#install" className="hover:text-cyan-400 transition-colors">Self-Host</a>
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
						<Link
							href="https://github.com/softtyos/meshdock"
							target="_blank"
							rel="noopener noreferrer"
							className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-xs font-medium text-slate-200 transition-all"
						>
							<GitBranch className="size-3.5 text-cyan-400" />
							<span>Star on GitHub</span>
						</Link>
						<Link
							href="/"
							className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/30"
						>
							Launch Console
							<ArrowRight className="ml-1.5 size-4" />
						</Link>
					</div>
				</div>
			</header>

			{/* Hero Section */}
			<section className="relative pt-20 pb-24 md:pt-28 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
				{/* Announcement pill */}
				<div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 text-xs font-medium mb-8 backdrop-blur-md">
					<Sparkles className="size-3.5 text-cyan-400 animate-pulse" />
					<span>Meshdock by SOFTTY.NET — Unified Multi-Node Mesh Platform</span>
					<ChevronRight className="size-3.5 opacity-60" />
				</div>

				{/* Headline */}
				<h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-[1.12]">
					Centralized Cloud Deployment <br />
					<span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
						&amp; Multi-Server Mesh Management
					</span>
				</h1>

				{/* Subheadline */}
				<p className="mt-6 text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
					Stop context-switching across 10+ disjointed SSH sessions. Connect all your independent VPS nodes,
					bare-metal servers, and Docker Swarm clusters into a single observable, automated deployment mesh.
				</p>

				{/* CTA Buttons */}
				<div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
					<Link
						href="/"
						className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-base shadow-xl shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5"
					>
						Get Started Free
						<ArrowRight className="ml-2 size-5" />
					</Link>
					<a
						href="#topology"
						className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 font-medium text-base backdrop-blur-sm transition-all"
					>
						<Workflow className="mr-2 size-5 text-cyan-400" />
						Explore Mesh Topology
					</a>
				</div>

				{/* Quick Install Snippet */}
				<div className="mt-12 max-w-2xl mx-auto" id="install">
					<div className="rounded-xl border border-slate-800 bg-[#0C1220]/90 shadow-2xl p-3 backdrop-blur-md">
						<div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 px-3 mb-3 text-xs text-slate-400">
							<div className="flex items-center gap-2">
								<div className="size-2.5 rounded-full bg-rose-500/80" />
								<div className="size-2.5 rounded-full bg-amber-500/80" />
								<div className="size-2.5 rounded-full bg-emerald-500/80" />
								<span className="ml-2 font-mono text-slate-400">One-Line VPS Quickstart</span>
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
						<div className="text-3xl font-extrabold text-white">10+ Nodes</div>
						<div className="text-xs text-slate-400 mt-1">Multi-Server Mesh Fleet</div>
					</div>
					<div>
						<div className="text-3xl font-extrabold text-cyan-400">Zero-Downtime</div>
						<div className="text-xs text-slate-400 mt-1">Rolling Traefik Ingress</div>
					</div>
					<div>
						<div className="text-3xl font-extrabold text-indigo-400">Swarm &amp; Standalone</div>
						<div className="text-xs text-slate-400 mt-1">Hybrid Orchestration</div>
					</div>
					<div>
						<div className="text-3xl font-extrabold text-emerald-400">100% Free &amp; Open</div>
						<div className="text-xs text-slate-400 mt-1">Apache 2.0 Community Core</div>
					</div>
				</div>
			</section>

			{/* Interactive Topology Showcase */}
			<section className="py-20 bg-slate-950/60 border-y border-slate-800/80 relative" id="topology">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center max-w-3xl mx-auto mb-16">
						<Badge variant="outline" className="border-cyan-500/40 text-cyan-400 bg-cyan-500/10 mb-3">
							Live Network Graph
						</Badge>
						<h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
							Visual System Workflow &amp; Mesh Topology
						</h2>
						<p className="mt-4 text-slate-300 text-base sm:text-lg">
							Inspect ingress traffic routing, observe cluster health, trace microservice dependencies,
							and pinpoint node resource bottlenecks in real time.
						</p>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
						{/* Visual Mesh Diagram */}
						<div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-[#0A0F1D] p-6 shadow-2xl relative overflow-hidden">
							<div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-6">
								<div className="flex items-center gap-2">
									<Radio className="size-4 text-emerald-400 animate-pulse" />
									<span className="text-sm font-semibold text-slate-200">Active Deployment Mesh</span>
								</div>
								<span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-full border border-cyan-800/60">
									Mesh Protocol: WireGuard / Docker Overlay
								</span>
							</div>

							{/* Interactive Node Grid Visual */}
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
													<span className="text-slate-500 block">CPU</span>
													<span className="font-mono text-slate-300 font-semibold">{node.cpu}</span>
												</div>
												<div>
													<span className="text-slate-500 block">Memory</span>
													<span className="font-mono text-slate-300 font-semibold">{node.ram.split("/")[0]}</span>
												</div>
												<div>
													<span className="text-slate-500 block">Containers</span>
													<span className="font-mono text-cyan-300 font-semibold">{node.containers} apps</span>
												</div>
											</div>
										</div>
									);
								})}
							</div>

							<div className="mt-6 p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
								<span>💡 Click any node above to inspect real-time telemetry and resource quotas.</span>
								<span className="font-mono text-emerald-400 flex items-center gap-1.5">
									<CheckCircle2 className="size-3.5" /> All systems nominal
								</span>
							</div>
						</div>

						{/* Node Detail Inspector Panel */}
						<div className="rounded-2xl border border-slate-800 bg-[#0C1220] p-6 shadow-2xl">
							<div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
								<h3 className="font-bold text-white text-base flex items-center gap-2">
									<Cpu className="size-4 text-cyan-400" />
									Node Inspector
								</h3>
								<Badge variant="secondary" className="text-xs bg-slate-800 text-slate-300 font-mono">
									{selectedNode.ip}
								</Badge>
							</div>

							<div className="space-y-4">
								<div>
									<div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Instance Name</div>
									<div className="text-base font-bold text-white mt-0.5">{selectedNode.name}</div>
									<div className="text-xs text-slate-400">{selectedNode.role} • {selectedNode.region}</div>
								</div>

								<div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/90 space-y-2.5">
									<div className="flex justify-between text-xs">
										<span className="text-slate-400">Status</span>
										<span className="font-semibold text-emerald-400 capitalize">{selectedNode.status}</span>
									</div>
									<div className="flex justify-between text-xs">
										<span className="text-slate-400">CPU Usage</span>
										<span className="font-mono font-semibold text-slate-200">{selectedNode.cpu}</span>
									</div>
									<div className="flex justify-between text-xs">
										<span className="text-slate-400">Memory Allocation</span>
										<span className="font-mono font-semibold text-slate-200">{selectedNode.ram}</span>
									</div>
									<div className="flex justify-between text-xs">
										<span className="text-slate-400">Active Workloads</span>
										<span className="font-mono font-semibold text-cyan-300">{selectedNode.containers} Containers</span>
									</div>
								</div>

								<div className="space-y-2 pt-2">
									<div className="text-xs font-semibold text-slate-400">Attached Capabilities</div>
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

								<Link
									href="/"
									className="mt-4 w-full py-2.5 px-4 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
								>
									<Eye className="size-4" />
									Manage in Console
								</Link>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Core Capabilities Bento Grid */}
			<section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" id="features">
				<div className="text-center max-w-3xl mx-auto mb-16">
					<Badge variant="outline" className="border-cyan-500/40 text-cyan-400 bg-cyan-500/10 mb-3">
						Architected for Performance
					</Badge>
					<h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
						Everything You Need to Run at Scale
					</h2>
					<p className="mt-4 text-slate-300 text-base sm:text-lg">
						Replace fragmented scripts and scattered monitoring dashboards with an enterprise-grade platform.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{/* Card 1: Multi-Server Mesh */}
					<Card className="bg-[#0A0F1D]/80 border-slate-800 hover:border-cyan-500/50 transition-all p-6 rounded-2xl group">
						<div className="size-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-5 group-hover:scale-110 transition-transform">
							<Network className="size-6" />
						</div>
						<h3 className="text-xl font-bold text-white mb-2">Centralized Multi-Node Mesh</h3>
						<p className="text-sm text-slate-400 leading-relaxed">
							Connect remote VPS nodes and Bare Metal hosts via SSH with a single click. Deploy, update,
							and manage workloads remotely without ever leaving the web console.
						</p>
					</Card>

					{/* Card 2: Docker Swarm Native */}
					<Card className="bg-[#0A0F1D]/80 border-slate-800 hover:border-blue-500/50 transition-all p-6 rounded-2xl group">
						<div className="size-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-5 group-hover:scale-110 transition-transform">
							<Boxes className="size-6" />
						</div>
						<h3 className="text-xl font-bold text-white mb-2">Docker Swarm Orchestration</h3>
						<p className="text-sm text-slate-400 leading-relaxed">
							Native multi-node swarm cluster orchestration. Scale services dynamically, handle worker failovers,
							and balance loads across your server fleet with zero friction.
						</p>
					</Card>

					{/* Card 3: Managed Databases & S3 */}
					<Card className="bg-[#0A0F1D]/80 border-slate-800 hover:border-emerald-500/50 transition-all p-6 rounded-2xl group">
						<div className="size-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-110 transition-transform">
							<Database className="size-6" />
						</div>
						<h3 className="text-xl font-bold text-white mb-2">Managed Databases &amp; S3 Backups</h3>
						<p className="text-sm text-slate-400 leading-relaxed">
							Instant provisioning for PostgreSQL, MySQL, MariaDB, MongoDB, Redis, and LibSQL. Schedule automated
							cron backups directly to AWS S3, Cloudflare R2, or MinIO.
						</p>
					</Card>

					{/* Card 4: Traefik Dynamic Ingress */}
					<Card className="bg-[#0A0F1D]/80 border-slate-800 hover:border-indigo-500/50 transition-all p-6 rounded-2xl group">
						<div className="size-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5 group-hover:scale-110 transition-transform">
							<Layers className="size-6" />
						</div>
						<h3 className="text-xl font-bold text-white mb-2">Traefik Ingress &amp; Auto SSL</h3>
						<p className="text-sm text-slate-400 leading-relaxed">
							Automatic wildcard SSL/TLS certificates via Let’s Encrypt. Route traffic through customized domains,
							subdomains, path prefixes, and HTTP-to-HTTPS redirects.
						</p>
					</Card>

					{/* Card 5: Vector Real-Time Telemetry */}
					<Card className="bg-[#0A0F1D]/80 border-slate-800 hover:border-purple-500/50 transition-all p-6 rounded-2xl group">
						<div className="size-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-5 group-hover:scale-110 transition-transform">
							<Activity className="size-6" />
						</div>
						<h3 className="text-xl font-bold text-white mb-2">Vector Logs &amp; Host Metrics</h3>
						<p className="text-sm text-slate-400 leading-relaxed">
							Stream container logs and cAdvisor host metrics to Grafana, Loki, Prometheus, Datadog,
							or Better Stack with project/environment/service tagging.
						</p>
					</Card>

					{/* Card 6: Enterprise Security & SSO */}
					<Card className="bg-[#0A0F1D]/80 border-slate-800 hover:border-amber-500/50 transition-all p-6 rounded-2xl group">
						<div className="size-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-110 transition-transform">
							<ShieldCheck className="size-6" />
						</div>
						<h3 className="text-xl font-bold text-white mb-2">SSO, RBAC &amp; Forward Auth</h3>
						<p className="text-sm text-slate-400 leading-relaxed">
							Protect deployed web applications behind an OIDC / SAML SSO gate. Granular role-based permissions,
							audit logs, and custom organization whitelabeling.
						</p>
					</Card>
				</div>
			</section>

			{/* Comparison Section */}
			<section className="py-20 bg-slate-950/70 border-t border-slate-800" id="comparison">
				<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-12">
						<h2 className="text-3xl font-extrabold text-white">How Meshdock Compares</h2>
						<p className="mt-3 text-slate-400 text-sm sm:text-base">
							Designed specifically for engineering teams managing distributed clusters and high-volume workloads.
						</p>
					</div>

					<div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#0A0F1D]">
						<table className="w-full text-left text-sm">
							<thead>
								<tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60">
									<th className="py-4 px-6 font-semibold">Capability</th>
									<th className="py-4 px-6 font-semibold text-cyan-400 bg-cyan-950/20">Meshdock</th>
									<th className="py-4 px-6 font-semibold">Portainer</th>
									<th className="py-4 px-6 font-semibold">Coolify</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-800/80 text-slate-300">
								<tr>
									<td className="py-3.5 px-6 font-medium text-white">Centralized Multi-Node Mesh</td>
									<td className="py-3.5 px-6 font-bold text-emerald-400 bg-cyan-950/10">✅ Native Mesh Control</td>
									<td className="py-3.5 px-6 text-slate-400">Agent Switcher</td>
									<td className="py-3.5 px-6 text-slate-400">Remote Servers</td>
								</tr>
								<tr>
									<td className="py-3.5 px-6 font-medium text-white">Visual System Topology Workflow</td>
									<td className="py-3.5 px-6 font-bold text-emerald-400 bg-cyan-950/10">✅ Interactive Node Map</td>
									<td className="py-3.5 px-6 text-rose-400/80">❌ None</td>
									<td className="py-3.5 px-6 text-rose-400/80">❌ None</td>
								</tr>
								<tr>
									<td className="py-3.5 px-6 font-medium text-white">Docker Swarm Cluster Support</td>
									<td className="py-3.5 px-6 font-bold text-emerald-400 bg-cyan-950/10">✅ Built-in Orchestration</td>
									<td className="py-3.5 px-6 text-emerald-400">✅ Supported</td>
									<td className="py-3.5 px-6 text-rose-400/80">❌ Standalone only</td>
								</tr>
								<tr>
									<td className="py-3.5 px-6 font-medium text-white">Zero-Downtime Traefik Ingress</td>
									<td className="py-3.5 px-6 font-bold text-emerald-400 bg-cyan-950/10">✅ Automatic SSL</td>
									<td className="py-3.5 px-6 text-slate-400">Manual Ingress</td>
									<td className="py-3.5 px-6 text-emerald-400">✅ Supported</td>
								</tr>
								<tr>
									<td className="py-3.5 px-6 font-medium text-white">Vector Real-Time Telemetry Pipeline</td>
									<td className="py-3.5 px-6 font-bold text-emerald-400 bg-cyan-950/10">✅ Multi-Provider Sink</td>
									<td className="py-3.5 px-6 text-rose-400/80">❌ Basic Docker Logs</td>
									<td className="py-3.5 px-6 text-slate-400">Basic Logs</td>
								</tr>
								<tr>
									<td className="py-3.5 px-6 font-medium text-white">Licensing &amp; Self-Hostability</td>
									<td className="py-3.5 px-6 font-bold text-emerald-400 bg-cyan-950/10">✅ 100% Free Core</td>
									<td className="py-3.5 px-6 text-slate-400">Freemium (5 nodes limit)</td>
									<td className="py-3.5 px-6 text-emerald-400">✅ Open Source</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</section>

			{/* Final Call to Action */}
			<section className="py-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
				<div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/40 via-slate-900/60 to-[#0A0F1D] p-10 sm:p-16 relative overflow-hidden shadow-2xl">
					<div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 blur-[90px] rounded-full pointer-events-none" />
					<div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 blur-[90px] rounded-full pointer-events-none" />

					<Logo className="size-16 mx-auto mb-6" />

					<h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
						Ready to Unify Your Infrastructure?
					</h2>
					<p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
						Deploy Meshdock in minutes on your own servers or connect to your existing swarm fleet.
					</p>

					<div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
						<Link
							href="/"
							className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-base shadow-xl shadow-cyan-500/20 transition-all"
						>
							Launch Meshdock Console
						</Link>
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
						<span>A product of <a href="https://www.softty.net" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-cyan-400 font-medium transition-colors">SOFTTY.NET CO., LTD</a></span>
					</div>

					<div className="flex items-center gap-6">
						<Link href="/" className="hover:text-slate-200 transition-colors">Console</Link>
						<a href="https://github.com/softtyos/meshdock" target="_blank" rel="noopener noreferrer" className="hover:text-slate-200 transition-colors">GitHub</a>
						<a href="https://github.com/softtyos/meshdock/blob/main/TERMS_AND_CONDITIONS.md" target="_blank" rel="noopener noreferrer" className="hover:text-slate-200 transition-colors">Terms</a>
						<a href="https://github.com/softtyos/meshdock/blob/main/SECURITY.md" target="_blank" rel="noopener noreferrer" className="hover:text-slate-200 transition-colors">Security</a>
						<a href="https://github.com/softtyos/meshdock/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="hover:text-slate-200 transition-colors">License</a>
					</div>
				</div>
			</footer>
		</div>
	);
}
