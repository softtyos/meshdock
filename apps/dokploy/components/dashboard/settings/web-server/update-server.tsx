import type { IUpdateData } from "@dokploy/server/index";
import {
	Bug,
	Download,
	Info,
	RefreshCcw,
	Server,
	Sparkles,
	Stars,
	X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/utils/api";
import { ToggleAutoCheckUpdates } from "./toggle-auto-check-updates";
import { UpdateWebServer } from "./update-webserver";

interface Props {
	updateData?: IUpdateData;
	children?: React.ReactNode;
	isOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export const UpdateServer = ({
	updateData,
	children,
	isOpen: isOpenProp,
	onOpenChange: onOpenChangeProp,
}: Props) => {
	const [hasCheckedUpdate, setHasCheckedUpdate] = useState(!!updateData);
	const [isUpdateAvailable, setIsUpdateAvailable] = useState(
		!!updateData?.updateAvailable,
	);
	const utils = api.useUtils();
	const { mutateAsync: getUpdateData, isPending } =
		api.settings.getUpdateData.useMutation();
	const { data: dokployVersion } = api.settings.getDokployVersion.useQuery();
	const { data: releaseTag } = api.settings.getReleaseTag.useQuery();
	const [latestVersion, setLatestVersion] = useState(
		updateData?.latestVersion ?? "",
	);
	const [isOpenInternal, setIsOpenInternal] = useState(false);

	useEffect(() => {
		if (updateData) {
			setHasCheckedUpdate(true);
			setIsUpdateAvailable(!!updateData.updateAvailable);
			setLatestVersion(updateData.latestVersion ?? "");
		}
	}, [updateData]);

	const handleCheckUpdates = async () => {
		try {
			await utils.settings.getDokployVersion.invalidate();
			const fetchedData = await getUpdateData();
			const versionToUpdate = fetchedData.latestVersion || "";
			setHasCheckedUpdate(true);
			setIsUpdateAvailable(fetchedData.updateAvailable);
			setLatestVersion(versionToUpdate);

			if (fetchedData.updateAvailable) {
				toast.success(versionToUpdate, {
					description: "New version available!",
				});
			} else {
				toast.info("No updates available");
			}
		} catch (error) {
			console.error("Error checking for updates:", error);
			setHasCheckedUpdate(true);
			setIsUpdateAvailable(false);
			toast.error(
				"An error occurred while checking for updates, please try again.",
			);
		}
	};

	const isOpen = isOpenInternal || isOpenProp;
	const onOpenChange = (open: boolean) => {
		setIsOpenInternal(open);
		onOpenChangeProp?.(open);
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogTrigger asChild>
				{children ? (
					children
				) : (
					<TooltipProvider delayDuration={0}>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant={updateData ? "outline" : "secondary"}
									size="sm"
									onClick={() => onOpenChange?.(true)}
								>
									<Download className="h-4 w-4 shrink-0" />
									{updateData ? (
										<span className="font-medium truncate group-data-[collapsible=icon]:hidden">
											Update Available
										</span>
									) : (
										<span className="font-medium truncate group-data-[collapsible=icon]:hidden">
											Check for updates
										</span>
									)}
									{updateData && (
										<span className="absolute right-2 flex h-2 w-2 group-data-[collapsible=icon]:hidden">
											<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
											<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
										</span>
									)}
								</Button>
							</TooltipTrigger>
							{updateData && (
								<TooltipContent side="right" sideOffset={10}>
									<p>Update Available</p>
								</TooltipContent>
							)}
						</Tooltip>
					</TooltipProvider>
				)}
			</DialogTrigger>
			<DialogContent className="max-w-lg" showCloseButton={false}>
				<div className="flex items-center gap-2 mb-8">
					<DialogTitle className="text-2xl font-semibold mr-auto">
						Web Server Update
					</DialogTitle>
					{dokployVersion && (
						<div className="flex items-center gap-1.5 rounded-full px-3 py-1 bg-muted">
							<Server className="h-4 w-4 text-muted-foreground" />
							<span className="text-sm text-muted-foreground">
								{dokployVersion}{" "}
								{(releaseTag === "canary" || releaseTag === "feature") &&
									`(${releaseTag})`}
							</span>
						</div>
					)}
					<DialogClose asChild>
						<Button variant="ghost" size="icon-sm" className="shrink-0">
							<X />
							<span className="sr-only">Close</span>
						</Button>
					</DialogClose>
				</div>

				{/* Initial state */}
				{!hasCheckedUpdate && (
					<div className="mb-8">
						<p className="text text-muted-foreground">
							Check for new releases and update Meshdock.
							<br />
							<br />
							We recommend checking for updates regularly to ensure you have the
							latest features and security improvements.
						</p>
					</div>
				)}

				{/* Update available state */}
				{isUpdateAvailable && latestVersion && (
					<div className="mb-6">
						<div className="flex flex-col gap-2.5 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 mb-4 w-full">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
									<span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
										Đã có phiên bản nâng cấp mới
									</span>
								</div>
								<span className="relative flex h-2 w-2">
									<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
									<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
								</span>
							</div>

							<div className="flex items-center justify-between p-3 rounded-lg bg-background/80 border border-border/50 text-xs">
								<div className="flex flex-col">
									<span className="text-[10px] text-muted-foreground uppercase font-medium">Bản hiện tại</span>
									<span className="font-mono font-bold text-foreground text-sm">{dokployVersion || "v1.0.3"}</span>
								</div>
								<div className="flex items-center gap-1.5 text-emerald-500 font-bold text-base px-2">
									<span>➔</span>
								</div>
								<div className="flex flex-col items-end">
									<span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-medium">Bản nâng cấp</span>
									<span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">{latestVersion}</span>
								</div>
							</div>
						</div>

						<div className="space-y-4 text-muted-foreground">
							<p className="text">
								A new version of the server software is available. Consider
								updating if you:
							</p>
							<ul className="space-y-3">
								<li className="flex items-start gap-2">
									<Stars className="h-5 w-5 mt-0.5 text-[#5B9DFF]" />
									<span className="text">
										Want to access the latest features and improvements
									</span>
								</li>
								<li className="flex items-start gap-2">
									<Bug className="h-5 w-5 mt-0.5 text-[#5B9DFF]" />
									<span className="text">
										Are experiencing issues that may be resolved in the new
										version
									</span>
								</li>
							</ul>
						</div>
					</div>
				)}

				{/* Up to date state */}
				{hasCheckedUpdate && !isUpdateAvailable && !isPending && (
					<div className="mb-8">
						<div className="flex flex-col items-center gap-6 mb-6">
							<div className="rounded-full p-4 bg-emerald-500/15 border border-emerald-500/20">
								<Sparkles className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
							</div>
							<div className="text-center space-y-2">
								<h3 className="text-lg font-medium">
									You are using the latest version
								</h3>
								<p className="text text-muted-foreground">
									Your server is up to date with all the latest features and
									security improvements.
								</p>
							</div>
						</div>
					</div>
				)}

				{hasCheckedUpdate && isPending && (
					<div className="mb-8">
						<div className="flex flex-col items-center gap-6 mb-6">
							<div className="rounded-full p-4 bg-primary/10 text-primary">
								<RefreshCcw className="h-8 w-8 animate-spin" />
							</div>
							<div className="text-center space-y-2">
								<h3 className="text-lg font-medium">Checking for updates...</h3>
								<p className="text text-muted-foreground">
									Please wait while we pull the latest version information from
									Docker Hub.
								</p>
							</div>
						</div>
					</div>
				)}

				{isUpdateAvailable && (
					<div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4 mb-8 text-blue-600 dark:text-blue-400">
						<div className="flex gap-2">
							<Info className="h-5 w-5 shrink-0 text-blue-500" />
							<div>
								We recommend reviewing the{" "}
								<Link
									href="https://github.com/softtyos/meshdock/releases"
									target="_blank"
									className="underline hover:opacity-80 font-medium"
								>
									release notes
								</Link>{" "}
								for any breaking changes before updating.
							</div>
						</div>
					</div>
				)}

				<div className="flex items-center justify-between pt-2">
					<ToggleAutoCheckUpdates disabled={isPending} />
				</div>

				<div className="flex items-center justify-end mt-4">
					<div className="flex items-center gap-2">
						<Button variant="outline" onClick={() => onOpenChange?.(false)}>
							Cancel
						</Button>
						{isUpdateAvailable ? (
							<UpdateWebServer
								buttonClassName="w-auto"
								fromVersion={dokployVersion}
								targetVersion={latestVersion}
							/>
						) : (
							<Button
								variant="secondary"
								onClick={handleCheckUpdates}
								disabled={isPending}
							>
								{isPending ? (
									<>
										<RefreshCcw className="h-4 w-4 animate-spin" />
										Checking for updates
									</>
								) : (
									<>
										<RefreshCcw className="h-4 w-4" />
										Check for updates
									</>
								)}
							</Button>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default UpdateServer;
