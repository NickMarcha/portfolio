export interface TagDef {
	/** Display label (canonical form) */
	label: string;
	/** Alternate spellings for search (e.g. "csharp" for "C#") */
	aliases: string[];
}

export const TAG_DEFS: TagDef[] = [
	{ label: "C#", aliases: ["csharp"] },
	{ label: ".NET", aliases: ["dotnet"] },
	{ label: "React", aliases: [] },
	{ label: "TypeScript", aliases: ["ts"] },
	{ label: "JavaScript", aliases: ["js"] },
	{ label: "AWS", aliases: [] },
	{ label: "Unity", aliases: [] },
	{ label: "Java", aliases: [] },
	{ label: "Python", aliases: [] },
	{ label: "Haskell", aliases: [] },
	{ label: "Docker", aliases: [] },
	{ label: "Express", aliases: [] },
	{ label: "Node.js", aliases: ["nodejs", "node"] },
	{ label: "D3.js", aliases: ["d3", "d3js"] },
	{ label: "Vite", aliases: [] },
	{ label: "TanStack Router", aliases: ["tanstack-router"] },
	{ label: "TanStack Table", aliases: ["tanstack-table"] },
	{ label: "visualization", aliases: ["viz"] },
	{ label: "census", aliases: [] },
	{ label: "VizRT", aliases: ["vizrt"] },
	{ label: "NDI", aliases: [] },
	{ label: "SRT", aliases: [] },
	{ label: "video", aliases: [] },
	{ label: "streaming", aliases: [] },
	{ label: "Cheerio", aliases: [] },
	{ label: "Axios", aliases: [] },
	{ label: "JWT", aliases: [] },
	{ label: "Google Spreadsheet", aliases: ["google-sheets", "sheets"] },
	{ label: "Google Spreadsheet API", aliases: ["google-sheets-api"] },
	{ label: "Unreal", aliases: ["unreal-engine", "ue"] },
	{ label: "Game Jam", aliases: ["gamejam"] },
	{ label: "Ludum Dare", aliases: ["ludumdare"] },
	{ label: "Itch.io", aliases: ["itch"] },
	{ label: "Electron", aliases: [] },
	{ label: "Steam", aliases: [] },
	{ label: "Auth0", aliases: [] },
	{ label: "GTA V", aliases: ["gta5", "gtav"] },
	{ label: "Autocode", aliases: [] },
	{ label: "WebGL", aliases: ["webgl"] },
	{ label: "UiB", aliases: ["uib", "bergen"] },
	{ label: "HVL", aliases: ["hvl", "western-norway"] },
	{ label: "homeserver", aliases: ["home-server", "self-hosting"] },
	{ label: "Cloudflare Tunnel", aliases: ["cloudflared"] },
	{ label: "IndexedDB", aliases: ["indexed-db"] },
	{ label: "ASP.NET", aliases: ["aspnet"] },
	{ label: "EF Core", aliases: ["entity-framework"] },
	{ label: "AWS CDK", aliases: ["cdk"] },
	{ label: "CloudFront", aliases: [] },
	{ label: "Lambda", aliases: ["aws-lambda"] },
	{ label: "RDS", aliases: ["aws-rds"] },
	{ label: "VR", aliases: ["virtual-reality"] },
];

export type TagId = number;

export function getTagLabel(id: TagId): string {
	return TAG_DEFS[id]?.label ?? "";
}

export function getTagAliases(id: TagId): string[] {
	return TAG_DEFS[id]?.aliases ?? [];
}

export function getSearchTerms(id: TagId): string[] {
	const def = TAG_DEFS[id];
	if (!def) return [];
	return [def.label, ...def.aliases];
}

export function tagMatchesQuery(id: TagId, query: string): boolean {
	const q = query.toLowerCase().trim();
	if (!q) return false;
	const terms = getSearchTerms(id);
	return terms.some((t) => t.toLowerCase() === q || t.toLowerCase().includes(q));
}

/** Map canonical label to TagId (for migration) */
const LABEL_TO_ID = new Map<string, number>();
TAG_DEFS.forEach((def, i) => {
	LABEL_TO_ID.set(def.label, i);
});
export function getTagIdByLabel(label: string): TagId | undefined {
	return LABEL_TO_ID.get(label);
}
