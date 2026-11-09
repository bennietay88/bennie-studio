import React from "react";
import { useParams } from "react-router-dom";
import { hasExpandedDemo } from "../lib/studioInteractiveDemos";
import StudioExpandedLivePreview from "./StudioExpandedLivePreview";
import StudioShowcaseLivePreview from "./StudioShowcaseLivePreview";

/** Preserve the six original demos and provide dedicated experiences for twelve new concepts. */
export default function StudioShowcasePreviewRouter() {
  const { slug } = useParams();
  return hasExpandedDemo(slug) ? <StudioExpandedLivePreview /> : <StudioShowcaseLivePreview />;
}
