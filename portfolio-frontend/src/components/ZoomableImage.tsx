import { ImageZoom } from "@/components/ui/image-zoom"

interface ZoomableImageProps {
	src: string
	alt?: string
	className?: string
	imgClassName?: string
	loading?: "lazy" | "eager"
}

/**
 * Click-to-zoom image for use outside carousels (e.g. header images).
 */
export function ZoomableImage({
	src,
	alt = "",
	className,
	imgClassName,
	loading = "lazy",
}: ZoomableImageProps) {
	return (
		<div className={className}>
			<ImageZoom>
				<img
					src={src}
					alt={alt}
					loading={loading}
					className={imgClassName}
				/>
			</ImageZoom>
		</div>
	)
}
