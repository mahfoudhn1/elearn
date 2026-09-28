"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import "video.js/dist/video-js.css";
import videojs, { VideoJsPlayerOptions } from "video.js";
import axiosClientInstance from "../../../lib/axiosInstance";

interface Video {
  id: string;
  title: string;
  signed_url: string;
  created_at: string;
}

export default function GroupVideo({ groupId }: { groupId: string }) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const videoNode = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<videojs.Player>();

  useEffect(() => {
    async function fetchVideos() {
      try {
        const res = await axiosClientInstance.get(`/groups/videos/by-group/${groupId}/`);
        setVideos(res.data);
      } catch (err) {
        console.error("Error fetching videos:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchVideos();
  }, [groupId]);

  useEffect(() => {
    if (!loading && videos.length > 0 && videoNode.current) {
      const video = videos[0];
      const options: VideoJsPlayerOptions = {
        controls: true,
        autoplay: false,
        responsive: true,
        fluid: true,         // makes the player scale with container
        playbackRates: [0.5, 1, 1.5, 2],
        sources: [
          {
            src: video.signed_url,
            type: "video/mp4",
          }
        ]
      };

      // initialize
      playerRef.current = videojs(videoNode.current, options, () => {
        // console.log("player is ready");
      });

      return () => {
        if (playerRef.current) {
          playerRef.current.dispose();
        }
      };
    }
  }, [loading, videos]);

  if (loading) {
    return <p className="text-sm text-gray-500">Loading video...</p>;
  }

  if (!videos || videos.length === 0) {
    return (
      <div
        className="w-full bg-gray-100 rounded-xl flex items-center justify-center"
        style={{ aspectRatio: "16/9" }}
      >
        <p className="text-sm text-center text-gray-500">No video available.</p>
      </div>
    );
  }

  const video = videos[0]; // the one we will show

  return (
    <div className="w-full rounded-xl overflow-hidden shadow-md bg-black">
      <div data-vjs-player className="">
        <video ref={videoNode} className="video-js vjs-theme-gray w-full h-auto" />
      </div>
      <div className="p-2 bg-gray-900 text-white text-sm">{video.title}</div>
    </div>
  );
}
