import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@/components/ui/carousel"

interface ProjectImageCarouselProps {
	images: string[]
}

export function ProjectImageCarousel({ images }: ProjectImageCarouselProps) {
	const showControls = images.length > 1

	return (
		<Carousel
			opts={{ loop: showControls, align: "start" }}
			className="w-full"
		>
			<CarouselContent className="-ml-0">
				{images.map((src) => (
					<CarouselItem key={src} className="pl-0 basis-full">
						<div className="overflow-hidden rounded-lg">
							<img
								src={src}
								alt=""
								loading="lazy"
								className="w-full h-auto object-contain"
							/>
						</div>
					</CarouselItem>
				))}
			</CarouselContent>
			{showControls && (
				<>
					<CarouselPrevious className="left-2 -translate-y-1/2" />
					<CarouselNext className="right-2 -translate-y-1/2" />
				</>
			)}
		</Carousel>
	)
}
