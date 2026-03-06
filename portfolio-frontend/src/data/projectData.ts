export type CarouselItem =
	| { type: "image"; src: string; caption?: string }
	| { type: "youtube"; videoId: string; caption?: string }
	| { type: "video"; src: string; caption?: string };

export interface IProjectData {
	slug: string;
	short: {
		title: string;
		description: string;
		image: string;
	};
	long: {
		title: string;
		descriptionComponent: string;
		carouselItems: CarouselItem[];
	};
}

export const projectData: IProjectData[] = [
	{
		slug: "bio",
		short: {
			title: "Bio",
			description: "Who am I?",
			image: "/icon-me.png",
		},
		long: {
			title: "Nick",
			descriptionComponent: "Bio",
			carouselItems: [],
		},
	},
	{
		slug: "inkypen",
		short: {
			title: "InkyPen",
			description: "Full Stack Engineer at InkyPen AS (Sep 2023 – Aug 2025)",
			image: "/inkypen.jpg",
		},
		long: {
			title: "InkyPen AS",
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
	},
	{
		slug: "kriskogram",
		short: {
			title: "Exploring Interactive Kriskograms",
			description: "Interactive migration visualization with Ego Focus and Temporal Overlay. React, D3.js, U.S. Census data.",
			image: "/Kriskogram.png",
		},
		long: {
			title: "Exploring Interactive Kriskograms",
			descriptionComponent: "Kriskogram",
			carouselItems: [],
		},
	},
	{
		slug: "bachelors-project",
		short: {
			title: "Bachelor's Project",
			description: "Ingest video service to work with VizRT application line-up",
			image: "/images/xvYLPXT.png",
		},
		long: {
			title: "Live Video Bachelor's Project",
			descriptionComponent: "BachelorsProject",
			carouselItems: [
				{
					type: "youtube",
					videoId: "kBrzMsZ9Ka8",
					caption: 'Demo video demonstrating streaming from a 5G device across the city to the Transmit server using SRT (<a href="https://en.wikipedia.org/wiki/Secure_Reliable_Transport" target="_blank" rel="noopener noreferrer">Secure Reliable Transport</a>), which is then forwarded on our transmit server locally through NDI (<a href="https://en.wikipedia.org/wiki/Network_Device_Interface" target="_blank" rel="noopener noreferrer">Network Device Interface</a>). The connection is set up through a simple QR code scan which opens the Larix App with appropriate settings for instant setup.',
				},
				{ type: "image", src: "/images/xvYLPXT.png" },
			],
		},
	},
	{
		slug: "raffle-dashboard",
		short: {
			title: "Raffle Dashboard",
			description: "A Web App for charity raffles",
			image: "https://github.com/NickMarcha/RaffleDashboard/blob/main/documentation/images/RafflePageA.PNG?raw=true",
		},
		long: {
			title: "Charity Raffle Dashboard",
			descriptionComponent: "RaffleDashboard",
			carouselItems: [
				{ type: "image", src: "https://github.com/NickMarcha/RaffleDashboard/blob/main/documentation/images/RafflePageA.PNG?raw=true" },
				{ type: "image", src: "https://github.com/NickMarcha/RaffleDashboard/blob/main/documentation/images/HomePage.PNG?raw=true" },
				{ type: "image", src: "https://github.com/NickMarcha/RaffleDashboard/blob/main/documentation/images/HistoryPage.PNG?raw=true" },
				{ type: "image", src: "https://github.com/NickMarcha/RaffleDashboard/blob/main/documentation/images/Stats.PNG?raw=true" },
				{ type: "image", src: "https://github.com/NickMarcha/RaffleDashboard/blob/main/documentation/images/RafflePageB.PNG?raw=true" },
			],
		},
	},
	{
		slug: "games",
		short: {
			title: "Games",
			description: "Global Game Jams, Ludum Dare and other games I have made",
			image: "/images/UgyJk8U.png",
		},
		long: {
			title: "Games, dares, jams",
			descriptionComponent: "GameJams",
			carouselItems: [],
		},
	},
	{
		slug: "badlands",
		short: {
			title: "BL-SmallProjects",
			description: "Some small projects I did for a GTA V game server called Badlands",
			image: "/images/Wxuam7W.png",
		},
		long: {
			title: "Badlands Projects",
			descriptionComponent: "BadlandsRP",
			carouselItems: [
				{ type: "image", src: "https://github.com/NickMarcha/BL-SmallProjects/raw/main/Media/blmap.gif" },
				{ type: "image", src: "https://github.com/NickMarcha/BL-SmallProjects/raw/main/Media/blledger.gif" },
				{ type: "image", src: "https://github.com/NickMarcha/BL-SmallProjects/raw/main/Media/blauction.png" },
			],
		},
	},
	{
		slug: "school-assignments",
		short: {
			title: "School Assignments",
			description: "Random assortment of school assignments",
			image: "/images/9gFfLAO.png",
		},
		long: {
			title: "School Assignments",
			descriptionComponent: "SchoolAssignments",
			carouselItems: [],
		},
	},
];
