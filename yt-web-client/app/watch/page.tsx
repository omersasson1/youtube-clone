"use client";

import { useSearchParams } from "next/navigation";

export default function Watch() {
  const videoPrefix = "https://storage.googleapis.com/omer-yt-processed-videos/";
  const searchParams = useSearchParams();
  const videoSrc = searchParams.get("v");

  return (
    <div>
      <h1>Watch Page</h1>
      <video controls src={videoPrefix + videoSrc}></video>
    </div>
  );
}
