export type CarouselItem =
	| { type: "image"; src: string }
	| { type: "youtube"; videoId: string }
	| { type: "video"; src: string };

export interface IProjectData {
	slug: string;
	short: { image: string };
	long: { descriptionComponent: string; carouselItems: CarouselItem[] };
	searchKeywords: string[];
}

export const projectData: IProjectData[] = [
	{
		slug: "bio",
		short: { image: "/icon-me.png" },
		long: { descriptionComponent: "Bio", carouselItems: [] },
		searchKeywords: ["React", ".NET", "C#", "AWS", "Unity", "Java", "Python", "Haskell", "UiB", "HVL", "Docker", "homeserver", "Cloudflare Tunnel"],
	},
	{
		slug: "inkypen",
		short: { image: "/inkypen.jpg" },
		long: {
			descriptionComponent: "InkyPen",
			carouselItems: [
				{ type: "video", src: "/video/inkypen-video-1.mp4" },
				{ type: "video", src: "/video/inkypen-video-2.mp4" },
				{ type: "image", src: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/681220/4115ec2ddf096633f73d020985a2bd3ecaad7c23/ss_4115ec2ddf096633f73d020985a2bd3ecaad7c23.600x338.jpg?t=1740484986" },
				{ type: "image", src: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/681220/1000bcd6cb8b70f2ba57e32ac9cc96213b1d9215/ss_1000bcd6cb8b70f2ba57e32ac9cc96213b1d9215.600x338.jpg?t=1740484986" },
				{ type: "image", src: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/681220/a2622806bcf8a7a0958e3e7abd949edb79968f4f/ss_a2622806bcf8a7a0958e3e7abd949edb79968f4f.600x338.jpg?t=1740484986" },
				{ type: "image", src: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/681220/00fa5e93039377669cb22c7b4b22bf59f06b2273/ss_00fa5e93039377669cb22c7b4b22bf59f06b2273.600x338.jpg?t=1740484986" },
			],
		},
		searchKeywords: [".NET", "C#", "React", "TypeScript", "AWS", "Unity", "Electron", "Steam", "Auth0"],
	},
	{
		slug: "kriskogram",
		short: { image: "/Kriskogram.png" },
		long: { descriptionComponent: "Kriskogram", carouselItems: [] },
		searchKeywords: ["React", "D3.js", "Vite", "TanStack Router", "visualization", "census"],
	},
	{
		slug: "bachelors-project",
		short: { image: "/images/xvYLPXT.png" },
		long: {
			descriptionComponent: "BachelorsProject",
			carouselItems: [
				{ type: "youtube", videoId: "kBrzMsZ9Ka8" },
				{ type: "image", src: "/images/xvYLPXT.png" },
			],
		},
		searchKeywords: ["VizRT", "NDI", "SRT", "video", "streaming"],
	},
	{
		slug: "raffle-dashboard",
		short: { image: "https://github.com/NickMarcha/RaffleDashboard/blob/main/documentation/images/RafflePageA.PNG?raw=true" },
		long: {
			descriptionComponent: "RaffleDashboard",
			carouselItems: [
				{ type: "image", src: "https://github.com/NickMarcha/RaffleDashboard/blob/main/documentation/images/RafflePageA.PNG?raw=true" },
				{ type: "image", src: "https://github.com/NickMarcha/RaffleDashboard/blob/main/documentation/images/HomePage.PNG?raw=true" },
				{ type: "image", src: "https://github.com/NickMarcha/RaffleDashboard/blob/main/documentation/images/HistoryPage.PNG?raw=true" },
				{ type: "image", src: "https://github.com/NickMarcha/RaffleDashboard/blob/main/documentation/images/Stats.PNG?raw=true" },
				{ type: "image", src: "https://github.com/NickMarcha/RaffleDashboard/blob/main/documentation/images/RafflePageB.PNG?raw=true" },
			],
		},
		searchKeywords: ["Express", "Node.js", "Cheerio", "Axios", "JWT", "Google Spreadsheet"],
	},
	{
		slug: "games",
		short: { image: "/images/UgyJk8U.png" },
		long: { descriptionComponent: "GameJams", carouselItems: [] },
		searchKeywords: ["Unity", "Unreal", "Game Jam", "Ludum Dare", "Itch.io"],
	},
	{
		slug: "badlands",
		short: { image: "/images/Wxuam7W.png" },
		long: {
			descriptionComponent: "BadlandsRP",
			carouselItems: [
				{ type: "image", src: "https://github.com/NickMarcha/BL-SmallProjects/raw/main/Media/blmap.gif" },
				{ type: "image", src: "https://github.com/NickMarcha/BL-SmallProjects/raw/main/Media/blledger.gif" },
				{ type: "image", src: "https://github.com/NickMarcha/BL-SmallProjects/raw/main/Media/blauction.png" },
			],
		},
		searchKeywords: ["Google Spreadsheet API", "GTA V", "Autocode"],
	},
	{
		slug: "school-assignments",
		short: { image: "/images/9gFfLAO.png" },
		long: { descriptionComponent: "SchoolAssignments", carouselItems: [] },
		searchKeywords: ["Java", "TypeScript", "JavaScript", "WebGL", "Haskell"],
	},
];
