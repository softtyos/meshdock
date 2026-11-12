import { ChevronsUpDown, Globe } from "lucide-react";
import { useRouter } from "next/router";
import { resetPostHog } from "@/components/shared/analytics";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { authClient } from "@/lib/auth-client";
import { Languages, type LanguageCode } from "@/lib/languages";
import { getFallbackAvatarInitials } from "@/lib/utils";
import { api } from "@/utils/api";
import useLocale from "@/utils/hooks/use-locale";
import { ModeToggle } from "../ui/modeToggle";
import { SidebarMenuButton } from "../ui/sidebar";

const _AUTO_CHECK_UPDATES_INTERVAL_MINUTES = 7;

export const UserNav = () => {
	const router = useRouter();
	const { data } = api.user.get.useQuery();
	const { data: permissions } = api.user.getPermissions.useQuery();
	const { data: isCloud } = api.settings.isCloud.useQuery();

	// const { mutateAsync } = api.auth.logout.useMutation();

	const { locale, setLocale, t } = useLocale();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<SidebarMenuButton
					size="lg"
					className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
				>
					<Avatar className="h-8 w-8 rounded-lg">
						<AvatarImage
							className="object-cover"
							src={data?.user?.image || ""}
							alt={data?.user?.image || ""}
						/>
						<AvatarFallback className="rounded-lg">
							{getFallbackAvatarInitials(
								`${data?.user?.firstName} ${data?.user?.lastName}`.trim(),
							)}
						</AvatarFallback>
					</Avatar>
					<div className="grid flex-1 text-left text-sm leading-tight">
						<span className="truncate font-semibold">{t("Account")}</span>
						<span className="truncate text-xs">{data?.user?.email}</span>
					</div>
					<ChevronsUpDown className="ml-auto size-4" />
				</SidebarMenuButton>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
				side="bottom"
				align="end"
				sideOffset={4}
			>
				<div className="flex items-center justify-between px-2 py-1.5">
					<DropdownMenuLabel className="flex flex-col">
						{t("My Account")}
						<span className="text-xs font-normal text-muted-foreground">
							{data?.user?.email}
						</span>
					</DropdownMenuLabel>
					<ModeToggle />
				</div>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem
						className="cursor-pointer"
						onClick={() => {
							router.push("/dashboard/settings/profile");
						}}
					>
						{t("Profile")}
					</DropdownMenuItem>
					<DropdownMenuItem
						className="cursor-pointer"
						onClick={() => {
							router.push("/dashboard/home");
						}}
					>
						{t("Projects")}
					</DropdownMenuItem>
					{!isCloud ? (
						<>
							{permissions?.monitoring.read && permissions?.docker.read && (
								<DropdownMenuItem
									className="cursor-pointer"
									onClick={() => {
										router.push("/dashboard/monitoring");
									}}
								>
									{t("Monitoring")}
								</DropdownMenuItem>
							)}
							{permissions?.traefikFiles.read && (
								<DropdownMenuItem
									className="cursor-pointer"
									onClick={() => {
										router.push("/dashboard/traefik");
									}}
								>
									{t("Traefik File System")}
								</DropdownMenuItem>
							)}
							{permissions?.docker.read && (
								<DropdownMenuItem
									className="cursor-pointer"
									onClick={() => {
										router.push("/dashboard/docker", undefined, {
											shallow: true,
										});
									}}
								>
									{t("Docker")}
								</DropdownMenuItem>
							)}
						</>
					) : (
						permissions?.organization.update && (
							<DropdownMenuItem
								className="cursor-pointer"
								onClick={() => {
									router.push("/dashboard/settings/servers");
								}}
							>
								{t("Servers")}
							</DropdownMenuItem>
						)
					)}
				</DropdownMenuGroup>
				{isCloud && data?.role === "owner" && (
					<DropdownMenuItem
						className="cursor-pointer"
						onClick={() => {
							router.push("/dashboard/settings/billing");
						}}
					>
						{t("Billing")}
					</DropdownMenuItem>
				)}
				<DropdownMenuSeparator />
				{/* Language Switcher */}
				<div className="px-2 py-1.5 flex items-center justify-between gap-2">
					<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
						<Globe className="size-3.5" />
						<span>{t("Select Language")}</span>
					</div>
					<div className="w-32">
						<Select
							value={locale}
							onValueChange={(val) => setLocale(val as LanguageCode)}
						>
							<SelectTrigger className="h-7 text-xs px-2">
								<SelectValue placeholder="Ngôn ngữ" />
							</SelectTrigger>
							<SelectContent>
								{Object.values(Languages).map((lang) => (
									<SelectItem key={lang.code} value={lang.code} className="text-xs">
										{lang.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					className="cursor-pointer text-rose-500 focus:text-rose-500"
					onClick={async () => {
						await authClient.signOut().then(() => {
							resetPostHog();
							router.push("/");
						});
					}}
				>
					{t("Log out")}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
