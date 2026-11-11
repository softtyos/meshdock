#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execSync as exec } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const dokployPkgPath = path.join(rootDir, "apps", "dokploy", "package.json");
const rootPkgPath = path.join(rootDir, "package.json");

function parseSemver(v) {
	const cleaned = (v || "").replace(/^v/, "").trim();
	const parts = cleaned.split(".").map(Number);
	return {
		major: parts[0] || 0,
		minor: parts[1] || 0,
		patch: parts[2] || 0,
		raw: cleaned,
	};
}

function compareSemver(a, b) {
	const sa = parseSemver(a);
	const sb = parseSemver(b);
	if (sa.major !== sb.major) return sa.major - sb.major;
	if (sa.minor !== sb.minor) return sa.minor - sb.minor;
	return sa.patch - sb.patch;
}

function getHighestTag() {
	try {
		const raw = exec("git tag -l", { cwd: rootDir }).toString();
		const tags = raw
			.split("\n")
			.map((t) => t.trim())
			.filter((t) => /^v?\d+\.\d+\.\d+$/.test(t));

		if (tags.length === 0) return "v1.0.0";
		tags.sort(compareSemver);
		const highest = tags[tags.length - 1];
		return highest.startsWith("v") ? highest : `v${highest}`;
	} catch (err) {
		console.warn("Could not get git tags:", err.message);
		return "v1.0.0";
	}
}

function main() {
	const args = process.argv.slice(2);
	const isCi = args.includes("--ci");
	const bumpType = args.find((a) => ["patch", "minor", "major"].includes(a)) || "patch";

	const dokployPkg = JSON.parse(fs.readFileSync(dokployPkgPath, "utf8"));
	const currentPkgVersion = dokployPkg.version || "v1.0.0";
	const highestTag = getHighestTag();

	console.log(`Current apps/dokploy/package.json version: ${currentPkgVersion}`);
	console.log(`Highest existing Git tag: ${highestTag}`);

	// Base is maximum of pkg version and highest tag
	const baseVersion = compareSemver(currentPkgVersion, highestTag) > 0
		? currentPkgVersion
		: highestTag;

	const parsed = parseSemver(baseVersion);
	let nextVersion = "";

	if (bumpType === "major") {
		nextVersion = `v${parsed.major + 1}.0.0`;
	} else if (bumpType === "minor") {
		nextVersion = `v${parsed.major}.${parsed.minor + 1}.0`;
	} else {
		// patch
		nextVersion = `v${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
	}

	console.log(`-> Bumping version to: ${nextVersion}`);

	// 1. Update apps/dokploy/package.json
	dokployPkg.version = nextVersion;
	fs.writeFileSync(dokployPkgPath, JSON.stringify(dokployPkg, null, "\t") + "\n");

	// 2. Update root package.json if present
	if (fs.existsSync(rootPkgPath)) {
		const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf8"));
		rootPkg.version = nextVersion.replace(/^v/, "");
		fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, "\t") + "\n");
	}

	console.log(`Successfully updated package.json files to ${nextVersion}`);

	// 3. If in CI or requested, write to GITHUB_OUTPUT
	if (process.env.GITHUB_OUTPUT) {
		fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${nextVersion}\n`);
		fs.appendFileSync(process.env.GITHUB_OUTPUT, `clean_version=${nextVersion.replace(/^v/, "")}\n`);
	}

	// 4. If --commit flag or --ci, commit and tag
	if (isCi || args.includes("--commit")) {
		try {
			exec(`git config user.name "github-actions[bot]"`, { cwd: rootDir });
			exec(`git config user.email "github-actions[bot]@users.noreply.github.com"`, { cwd: rootDir });
			exec(`git add apps/dokploy/package.json package.json`, { cwd: rootDir });
			exec(`git commit -m "chore(release): bump version to ${nextVersion} [skip ci]"`, { cwd: rootDir });
			exec(`git tag "${nextVersion}"`, { cwd: rootDir });
			console.log(`Committed and tagged ${nextVersion}`);

			if (isCi) {
				exec(`git push origin HEAD:main --tags`, { cwd: rootDir });
				console.log(`Pushed ${nextVersion} and tags to origin main`);
			}
		} catch (err) {
			console.error("Git commit/tag/push error:", err.message);
		}
	}
}

main();
