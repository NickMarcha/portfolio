import type { ImageMetadata } from "astro";
import type { CarouselItem, IProjectData } from "./projectData";

import iconMe from "../assets/images/icon-me.png";
import inkypen from "../assets/images/inkypen.jpg";
import Kriskogram from "../assets/images/Kriskogram.png";
import xvYLPXT from "../assets/images/xvYLPXT.png";
import UgyJk8U from "../assets/images/UgyJk8U.png";
import Wxuam7W from "../assets/images/Wxuam7W.png";
import ninegFfLAO from "../assets/images/9gFfLAO.png";
import dovreKamikaze from "../assets/images/dovre-kamikaze.png";

const projectCardAssets: Record<string, ImageMetadata> = {
	bio: iconMe,
	inkypen,
	kriskogram: Kriskogram,
	"bachelors-project": xvYLPXT,
	games: UgyJk8U,
	badlands: Wxuam7W,
	"school-assignments": ninegFfLAO,
};

const pathToResolvedSrc: Record<string, string> = {
	"/icon-me.png": iconMe.src,
	"/inkypen.jpg": inkypen.src,
	"/Kriskogram.png": Kriskogram.src,
	"/images/xvYLPXT.png": xvYLPXT.src,
	"/images/UgyJk8U.png": UgyJk8U.src,
	"/images/Wxuam7W.png": Wxuam7W.src,
	"/images/9gFfLAO.png": ninegFfLAO.src,
	"/images/dovre-kamikaze.png": dovreKamikaze.src,
};

export function getProjectCardImage(project: IProjectData): string {
	return projectCardAssets[project.slug]?.src ?? project.short.image;
}

export function resolveCarouselItemSrc(src: string): string {
	return pathToResolvedSrc[src] ?? src;
}

export function resolveCarouselItems(items: CarouselItem[]): CarouselItem[] {
	return items.map((item) => {
		if (item.type === "image" && item.src.startsWith("/")) {
			return { ...item, src: resolveCarouselItemSrc(item.src) };
		}
		return item;
	});
}
