import { Check, Copy, Info, Layers, Terminal } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { AlertBlock } from "@/components/shared/alert-block";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/utils/api";

export const SwarmGlobalAgentModal = () => {
	const { data } = api.fleet.getSwarmAgentSpec.useQuery();
	const [copiedCli, setCopiedCli] = useState(false);
	const [copiedCompose, setCopiedCompose] = useState(false);

	const copyToClipboard = (text: string, isCli: boolean) => {
		navigator.clipboard.writeText(text);
		if (isCli) {
			setCopiedCli(true);
			setTimeout(() => setCopiedCli(false), 2000);
		} else {
			setCopiedCompose(true);
			setTimeout(() => setCopiedCompose(false), 2000);
		}
		toast.success("Copied to clipboard!");
	};

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
				>
					<Layers className="h-4 w-4" /> Swarm Auto-Discovery Agent
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<div className="flex items-center gap-2">
						<div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
							<Layers className="h-4 w-4" />
						</div>
						<div>
							<DialogTitle className="text-base font-bold">
								Swarm Global Agent Auto-Discovery
							</DialogTitle>
							<DialogDescription className="text-xs">
								Portainer-grade automated agent deployment for Docker Swarm
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className="space-y-4 pt-2">
					<AlertBlock className="text-xs leading-relaxed">
						By deploying the monitoring agent in Docker Swarm <strong>mode: global</strong>,
						every current node and any future VPS joined to this Swarm cluster
						(e.g. via <code>docker swarm join</code>) will <strong>automatically launch</strong> the Meshdock
						Agent with zero manual SSH or agent install steps.
					</AlertBlock>

					{/* CLI Command */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
								<Terminal className="h-3.5 w-3.5 text-primary" /> 1-Click Swarm Manager CLI Command
							</span>
							<Button
								variant="ghost"
								size="sm"
								className="h-7 text-xs gap-1.5"
								onClick={() => copyToClipboard(data?.cliCommand || "", true)}
							>
								{copiedCli ? (
									<>
										<Check className="h-3.5 w-3.5 text-emerald-400" /> Copied
									</>
								) : (
									<>
										<Copy className="h-3.5 w-3.5" /> Copy CLI
									</>
								)}
							</Button>
						</div>
						<pre className="p-3 bg-muted/60 border rounded-lg text-xs font-mono text-emerald-400/90 overflow-x-auto whitespace-pre-wrap select-all">
							{data?.cliCommand}
						</pre>
					</div>

					{/* Compose YAML */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
								<Layers className="h-3.5 w-3.5 text-blue-400" /> Docker Compose Swarm Stack Spec
							</span>
							<Button
								variant="ghost"
								size="sm"
								className="h-7 text-xs gap-1.5"
								onClick={() =>
									copyToClipboard(data?.composeYaml || "", false)
								}
							>
								{copiedCompose ? (
									<>
										<Check className="h-3.5 w-3.5 text-emerald-400" /> Copied
									</>
								) : (
									<>
										<Copy className="h-3.5 w-3.5" /> Copy YAML
									</>
								)}
							</Button>
						</div>
						<pre className="p-3 bg-muted/60 border rounded-lg text-xs font-mono text-blue-400/90 overflow-x-auto whitespace-pre-wrap select-all">
							{data?.composeYaml}
						</pre>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
