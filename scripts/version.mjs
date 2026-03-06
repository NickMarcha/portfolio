#!/usr/bin/env node

import { createInterface } from "readline";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const ROOT = join(import.meta.dirname, "..");
const FRONTEND_PKG = join(ROOT, "portfolio-frontend", "package.json");
const BACKEND_PKG = join(ROOT, "portfolio-backend", "package.json");
const BACKEND_COMPOSE = join(ROOT, "portfolio-backend", "docker-compose.yml");

const TARGETS = ["frontend", "backend"];
const BUMPS = ["patch", "minor", "major"];

function bump(version, type) {
	const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-[\w.]+)?(?:\+[\w.]+)?$/);
	if (!match) throw new Error(`Invalid semver: ${version}`);
	let [, major, minor, patch] = match.map(Number);
	switch (type) {
		case "patch":
			patch++;
			break;
		case "minor":
			minor++;
			patch = 0;
			break;
		case "major":
			major++;
			minor = 0;
			patch = 0;
			break;
		default:
			throw new Error(`Unknown bump type: ${type}`);
	}
	return `${major}.${minor}.${patch}`;
}

function prompt(question, choices = null) {
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	return new Promise((resolve) => {
		const ask = () => {
			rl.question(question, (answer) => {
				const trimmed = answer.trim().toLowerCase();
				if (!choices) {
					rl.close();
					resolve(trimmed);
					return;
				}
				if (choices.includes(trimmed)) {
					rl.close();
					resolve(trimmed);
					return;
				}
				console.log(`Please choose one of: ${choices.join(", ")}`);
				ask();
			});
		};
		ask();
	});
}

async function main() {
	// 1. Abort if there are uncommitted changes
	const status = execSync("git status --porcelain", { cwd: ROOT, encoding: "utf-8" });
	if (status.trim()) {
		console.error("Aborting: you have uncommitted changes. Commit or stash them first.");
		process.exit(1);
	}

	let target = process.argv[2]?.toLowerCase();
	let bumpType = process.argv[3]?.toLowerCase();

	if (!TARGETS.includes(target)) {
		target = await prompt(`Target (frontend/backend): `, TARGETS);
	}
	if (!BUMPS.includes(bumpType)) {
		bumpType = await prompt(`Bump type (patch/minor/major): `, BUMPS);
	}

	const isFrontend = target === "frontend";
	const pkgPath = isFrontend ? FRONTEND_PKG : BACKEND_PKG;
	const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
	const current = pkg.version;
	const next = bump(current, bumpType);

	console.log(`\n${target}: ${current} → ${next}\n`);

	// 2. Bump package.json
	pkg.version = next;
	writeFileSync(pkgPath, JSON.stringify(pkg, null, "\t") + "\n");

	// For backend, also update docker-compose image tag
	if (!isFrontend) {
		let compose = readFileSync(BACKEND_COMPOSE, "utf-8");
		compose = compose.replace(
			/image: portfolio-backend:\d+\.\d+\.\d+/,
			`image: portfolio-backend:${next}`
		);
		writeFileSync(BACKEND_COMPOSE, compose);
	}

	// 3. Commit
	const filesToAdd = isFrontend
		? "portfolio-frontend/package.json"
		: "portfolio-backend/package.json portfolio-backend/docker-compose.yml";
	execSync(`git add ${filesToAdd}`, { cwd: ROOT });
	execSync(`git commit -m "chore: bump ${target} to ${next}"`, { cwd: ROOT });

	// 4. Create git tag
	const tag = `${target}-v${next}`;
	execSync(`git tag ${tag}`, { cwd: ROOT });

	console.log(`Committed and created tag: ${tag}`);

	// 5. Prompt before pushing
	const push = await prompt(`Push ${tag} to origin? (y/n): `, ["y", "n"]);
	if (push === "y") {
		execSync(`git push origin ${tag}`, { cwd: ROOT, stdio: "inherit" });
		console.log(`Pushed ${tag}`);
	} else {
		console.log(`Skipped push. Run: git push origin ${tag}`);
	}
}

main().catch((err) => {
	console.error(err.message);
	process.exit(1);
});
