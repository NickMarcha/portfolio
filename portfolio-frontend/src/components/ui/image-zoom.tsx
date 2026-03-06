import * as React from "react"
import Zoom from "react-medium-image-zoom"
import "react-medium-image-zoom/dist/styles.css"

import { cn } from "@/lib/utils"

const ZOOM_MARGIN = 24

interface ImageZoomProps {
	children: React.ReactNode
	className?: string
}

/**
 * Custom zoom content: low-res images scale up to fill viewport with padding.
 * Uses ZoomContent per docs - https://www.npmjs.com/package/react-medium-image-zoom
 */
function ZoomContentFill({
	img,
	buttonUnzoom,
}: {
	img: React.ReactElement | null
	buttonUnzoom: React.ReactElement<HTMLButtonElement>
}) {
	const containerStyle: React.CSSProperties = {
		position: "absolute",
		inset: ZOOM_MARGIN,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
	}

	const imgStyle: React.CSSProperties = {
		position: "relative",
		top: "auto",
		left: "auto",
		width: "100%",
		height: "100%",
		objectFit: "contain",
		objectPosition: "center",
		transform: "none",
	}

	return (
		<>
			<div style={containerStyle}>
				{img &&
					React.cloneElement(img, {
						...img.props,
						style: { ...img.props.style, ...imgStyle },
					})}
			</div>
			{buttonUnzoom}
		</>
	)
}

/**
 * Click-to-zoom wrapper for images. Uses react-medium-image-zoom
 * (same library as shadcn image-zoom; shadcn registry requires auth).
 * Low-res images scale up to fill viewport via ZoomContent. zoomMargin for padding.
 * Respects prefers-reduced-motion. Only use for still images.
 */
function ImageZoom({ children, className }: ImageZoomProps) {
	return (
		<Zoom
			wrapElement="div"
			classDialog={cn("rounded-lg", className)}
			zoomMargin={ZOOM_MARGIN}
			ZoomContent={ZoomContentFill}
		>
			{children}
		</Zoom>
	)
}

export { ImageZoom }
