import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@/components/ui/carousel"
import { ImageZoom } from "@/components/ui/image-zoom"
import type { CarouselItem as CarouselItemType } from "@/data/projectData"

interface ProjectImageCarouselProps {
	items: (CarouselItemType & { caption?: string })[]
	projectSlug?: string
}

function CarouselMedia({ item }: { item: CarouselItemType }) {
	if (item.type === "image") {
		return (
			<div className="overflow-hidden rounded-lg">
				<ImageZoom>
					<img
						src={item.src}
						alt=""
						loading="lazy"
						className="w-full h-auto object-contain"
					/>
				</ImageZoom>
			</div>
		)
	}
	if (item.type === "video") {
		return (
			<div className="overflow-hidden rounded-lg aspect-video w-full">
				<video
					src={item.src}
					controls
					playsInline
					autoPlay
					loop
					muted
					className="w-full h-full object-contain"
				/>
			</div>
		)
	}
	// YouTube embed
	return (
		<div className="overflow-hidden rounded-lg aspect-video w-full">
			<iframe
				src={`https://www.youtube.com/embed/${item.videoId}`}
				title="YouTube video"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				allowFullScreen
				className="w-full h-full"
			/>
		</div>
	)
}

export function ProjectImageCarousel({ items, projectSlug }: ProjectImageCarouselProps) {
	const showControls = items.length > 1

	return (
		<Carousel
			opts={{ loop: showControls, align: "start" }}
			className="w-full px-14 max-md:px-0 flex max-md:flex-col max-md:gap-2"
		>
			<CarouselContent className="-ml-0">
				{items.map((item, index) => (
					<CarouselItem key={item.type === "youtube" ? item.videoId : `${item.src}-${index}`} className="pl-0 basis-full">
						<div className="space-y-2">
							<CarouselMedia item={item} />
							{item.caption && (
								<p
									className="text-sm text-muted-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:opacity-80"
									dangerouslySetInnerHTML={{ __html: item.caption }}
									data-carousel-caption={projectSlug ? '' : undefined}
									data-project-slug={projectSlug}
									data-caption-index={projectSlug ? String(index) : undefined}
								/>
							)}
						</div>
					</CarouselItem>
				))}
			</CarouselContent>
			{showControls && (
				<div className="flex justify-center gap-2 max-md:flex md:contents">
					<CarouselPrevious className="left-0 -translate-y-1/2 max-md:static max-md:translate-y-0 max-md:left-auto max-md:right-auto max-md:top-auto" />
					<CarouselNext className="right-0 -translate-y-1/2 max-md:static max-md:translate-y-0 max-md:left-auto max-md:right-auto max-md:top-auto" />
				</div>
			)}
		</Carousel>
	)
}
