import { Check, Copy, Loader2, RefreshCw, Terminal, X } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/utils/api";

interface Props {
	containerId: string | null;
	containerName: string;
	serverId?: string | null;
	onClose: () => void;
}

export const ContainerLogsModal = ({
	containerId,
	containerName,
	serverId,
	onClose,
}: Props) => {
	const [copied, setCopied] = useState(false);
	const [tailCount, setTailCount] = useState(150);

	const {
		data,
		isPending,
		refetch,
		isRefetching,
	} = api.vitals.getContainerLogs.useQuery(
		{
			containerId: containerId || "",
			serverId,
			tail: tailCount,
		},
		{
			enabled: !!containerId,
			refetchInterval: 8000,
		},
	);

	const handleCopy = () => {
		if (data?.logs) {
			navigator.clipboard.writeText(data.logs);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
			toast.success("Đã sao chép toàn bộ logs vào clipboard");
		}
	};

	return (
		<Dialog open={!!containerId} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col p-6">
				<DialogHeader className="flex flex-row items-center justify-between pb-3 border-b">
					<div>
						<DialogTitle className="flex items-center gap-2 text-base font-mono">
							<Terminal className="size-4 text-emerald-500" />
							<span>Logs: {containerName}</span>
						</DialogTitle>
						<DialogDescription className="text-xs font-mono text-muted-foreground mt-0.5">
							Container ID: {containerId?.slice(0, 12)}
						</DialogDescription>
					</div>

					<div className="flex items-center gap-2">
						<Button
							size="sm"
							variant="outline"
							className="h-8 gap-1.5 text-xs"
							onClick={handleCopy}
							disabled={!data?.logs}
						>
							{copied ? (
								<>
									<Check className="size-3.5 text-emerald-500" />
									<span>Đã chép</span>
								</>
							) : (
								<>
									<Copy className="size-3.5" />
									<span>Sao chép</span>
								</>
							)}
						</Button>

						<Button
							size="sm"
							variant="outline"
							className="h-8 gap-1.5 text-xs"
							onClick={() => refetch()}
							disabled={isPending || isRefetching}
						>
							<RefreshCw
								className={`size-3.5 ${
									isPending || isRefetching ? "animate-spin" : ""
								}`}
							/>
							<span>Làm mới</span>
						</Button>
					</div>
				</DialogHeader>

				<div className="flex-1 min-h-[350px] overflow-hidden rounded-xl bg-zinc-950 p-4 border border-zinc-800 text-zinc-100 font-mono text-xs mt-3 flex flex-col">
					{isPending && !data ? (
						<div className="flex-1 flex flex-col items-center justify-center gap-2 text-zinc-400">
							<Loader2 className="size-5 animate-spin text-emerald-500" />
							<span>Đang tải logs container...</span>
						</div>
					) : !data?.logs || data.logs.trim().length === 0 ? (
						<div className="flex-1 flex items-center justify-center text-zinc-500 text-xs">
							Không có dữ liệu logs nào gần đây.
						</div>
					) : (
						<pre className="flex-1 overflow-auto whitespace-pre-wrap leading-relaxed select-text">
							<code>{data.logs}</code>
						</pre>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
};
