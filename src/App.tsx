/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, type FormEvent } from "react";
import { 
  Search, 
  Youtube, 
  Copy, 
  ExternalLink, 
  Download, 
  Check, 
  Loader2, 
  AlertCircle,
  Hash,
  Play,
  ListVideo,
  Clock,
  LayoutGrid,
  List as ListIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface PlaylistItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      medium: { url: string };
      default: { url: string };
    };
    resourceId: {
      videoId: string;
    };
    position: number;
  };
  contentDetails: {
    videoId: string;
    videoPublishedAt: string;
  };
}

interface PlaylistResponse {
  items: PlaylistItem[];
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  error?: {
    message: string;
  };
}

interface VideoCardProps {
  video: PlaylistItem;
  onCopy: () => void;
  isCopied: boolean;
}

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videos, setVideos] = useState<PlaylistItem[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const extractPlaylistId = (input: string) => {
    try {
      const urlObj = new URL(input);
      return urlObj.searchParams.get("list");
    } catch {
      // If not a valid URL, check if it's already an ID
      if (/^[a-zA-Z0-9_-]{34}$/.test(input)) return input;
      return null;
    }
  };

  const fetchPlaylist = async (id: string, token: string | null = null) => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = `/api/playlist/${id}${token ? `?pageToken=${token}` : ""}`;
      const response = await fetch(apiUrl);
      const data: PlaylistResponse = await response.json();

      if (data.error) {
        setError(data.error.message || "Failed to fetch playlist items.");
        return;
      }

      if (token) {
        setVideos(prev => [...prev, ...data.items]);
      } else {
        setVideos(data.items);
      }
      setNextPageToken(data.nextPageToken || null);
      setTotalResults(data.pageInfo.totalResults);
    } catch (err) {
      setError("An unexpected error occurred while fetching data.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const playlistId = extractPlaylistId(url);
    if (!playlistId) {
      setError("Invalid YouTube playlist URL or ID.");
      return;
    }
    fetchPlaylist(playlistId);
  };

  const loadMore = () => {
    const playlistId = extractPlaylistId(url);
    if (playlistId && nextPageToken) {
      fetchPlaylist(playlistId, nextPageToken);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyAllIds = () => {
    const ids = videos.map(v => v.contentDetails.videoId).join("\n");
    copyToClipboard(ids);
  };

  const downloadCsv = () => {
    const headers = ["Position", "Title", "Video ID", "URL", "Published At"];
    const rows = videos.map(v => [
      v.snippet.position + 1,
      `"${v.snippet.title.replace(/"/g, '""')}"`,
      v.contentDetails.videoId,
      `https://www.youtube.com/watch?v=${v.contentDetails.videoId}`,
      v.contentDetails.videoPublishedAt
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "playlist_videos.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Youtube className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-white">TubeID <span className="text-indigo-400">Pro</span></h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold flex items-center gap-1">
                <Hash className="w-2.5 h-2.5" /> ID Data Extractor
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="bg-slate-800 p-1 rounded-lg flex">
              <button 
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-slate-700 shadow-sm text-indigo-400" : "text-slate-500 hover:text-slate-200"}`}
              >
                <ListIcon className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-slate-700 shadow-sm text-indigo-400" : "text-slate-500 hover:text-slate-200"}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Search Bar Section */}
        <section className="mb-12">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 text-white"
            >
              Analyze Any Playlist.
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-slate-400 font-medium"
            >
              Extract video IDs, metadata, and export details in seconds.
            </motion.p>
          </div>

          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste YouTube playlist URL or ID here..."
                className="w-full bg-slate-900 border-2 border-slate-800 pl-12 pr-32 py-4 rounded-2xl shadow-2xl focus:outline-none focus:border-indigo-600/50 focus:ring-4 focus:ring-indigo-600/10 transition-all text-lg text-indigo-50"
              />
              <div className="absolute inset-y-2 right-2 flex items-center">
                <button
                  type="submit"
                  disabled={loading || !url}
                  className="h-full px-6 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Inspect
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* Status Messages */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto mb-8 bg-red-950/30 border border-red-900/50 p-4 rounded-2xl flex items-start gap-3 text-red-400"
            >
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold">Extraction Error</p>
                <p className="text-sm opacity-90">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Section */}
        {videos.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
              <div>
                <h3 className="text-2xl font-bold flex items-center gap-2 text-white">
                  <ListVideo className="text-indigo-500" />
                  Playlist Content
                </h3>
                <p className="text-sm text-slate-500 font-medium">
                  Showing {videos.length} of {totalResults} videos
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={copyAllIds}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-slate-300 flex items-center gap-2 hover:bg-slate-800 hover:text-white transition-all"
                >
                  <Copy className="w-4 h-4" /> Copy All IDs
                </button>
                <button 
                  onClick={downloadCsv}
                  className="px-4 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-600/30 transition-all"
                >
                  <Download className="w-4 h-4" /> Export CSV
                </button>
              </div>
            </div>

            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence>
                  {videos.map((video, idx) => (
                    <VideoCard 
                      key={`${video.id}-${idx}`} 
                      video={video} 
                      onCopy={() => copyToClipboard(video.contentDetails.videoId)}
                      isCopied={copiedId === video.contentDetails.videoId}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bg-slate-900/50 rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/80 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                        <th className="px-6 py-4 w-16 text-center">#</th>
                        <th className="px-6 py-4">Video Info</th>
                        <th className="px-6 py-4">Video ID</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {videos.map((video, idx) => (
                        <tr key={`${video.id}-${idx}`} className="group hover:bg-indigo-500/5 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-slate-600 text-center">
                            {(idx + 1).toString().padStart(2, '0')}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-20 h-11 flex-shrink-0 rounded-lg overflow-hidden bg-slate-800">
                                <img 
                                  src={video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url} 
                                  alt="" 
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=200&auto=format&fit=crop"; }}
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-sm truncate max-w-md text-slate-200" title={video.snippet.title}>
                                  {video.snippet.title}
                                </p>
                                <p className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                                  <Clock className="w-3 h-3" /> {new Date(video.contentDetails.videoPublishedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <code className="px-2 py-1 bg-indigo-500/10 rounded-md text-xs font-mono font-bold text-indigo-400">
                              {video.contentDetails.videoId}
                            </code>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => copyToClipboard(video.contentDetails.videoId)}
                                className="p-2 hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700"
                                title="Copy ID"
                              >
                                {copiedId === video.contentDetails.videoId ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-500" />}
                              </button>
                              <a 
                                href={`https://www.youtube.com/watch?v=${video.contentDetails.videoId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700"
                                title="Open Video"
                              >
                                <ExternalLink className="w-4 h-4 text-slate-500" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {nextPageToken && (
              <div className="flex justify-center pt-8">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-8 py-3 bg-slate-900 border border-slate-800 text-slate-300 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 hover:text-white hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> : "Load More"}
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && videos.length === 0 && !error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-2xl">
              <Search className="w-10 h-10 text-slate-700" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">Ready to inspect?</h3>
            <p className="text-slate-500 max-w-sm mx-auto font-medium">
              Enter a public YouTube playlist URL to start extracting video data and IDs.
            </p>
          </motion.div>
        )}
      </main>

      <footer className="mt-20 border-t border-slate-900 py-12 flex flex-col items-center gap-4">
        <div className="flex items-center gap-6 text-[10px] text-slate-600 uppercase tracking-[0.2em] font-bold">
           <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div> System Ready</span>
           <span>Parsing Engine v2.4.0</span>
        </div>
        <p className="text-slate-700 text-xs font-medium tracking-tight">
          &copy; {new Date().getFullYear()} Playlist Inspector. No user data is stored.
        </p>
      </footer>
    </div>

  );
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onCopy, isCopied }) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col"
    >
      <div className="relative aspect-video overflow-hidden bg-slate-800">
        <img 
          src={video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url} 
          alt={video.snippet.title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
          <button 
            onClick={onCopy}
            className="p-2.5 bg-white rounded-full hover:scale-110 transition-transform shadow-xl"
            title="Copy Video ID"
          >
            {isCopied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5 text-slate-900" />}
          </button>
          <a 
            href={`https://www.youtube.com/watch?v=${video.contentDetails.videoId}`}
            target="_blank"
            rel="noreferrer"
            className="p-2.5 bg-white rounded-full hover:scale-110 transition-transform shadow-xl"
            title="Watch on YouTube"
          >
            <ExternalLink className="w-5 h-5 text-slate-900" />
          </a>
        </div>
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-slate-950/80 backdrop-blur-md rounded-md text-[10px] text-white font-mono border border-slate-800">
          #{video.snippet.position + 1}
        </div>
      </div>
      
      <div className="p-4 flex-grow flex flex-col justify-between">
        <div className="mb-3">
          <h4 className="font-bold text-sm line-clamp-2 leading-tight text-slate-200 group-hover:text-indigo-400 transition-colors" title={video.snippet.title}>
            {video.snippet.title}
          </h4>
        </div>
        
        <div className="flex items-center justify-between mt-auto">
          <code className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">
            {video.contentDetails.videoId}
          </code>
          <p className="text-[10px] text-slate-500 font-medium">
            {new Date(video.contentDetails.videoPublishedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
