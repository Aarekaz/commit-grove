// Renders while the 3D chunk is loading. Matches the scene's own full-bleed
// footprint so the layout doesn't shift when the real Canvas mounts.
//
// Deliberately lightweight: three pulsing dots on a neutral ground. No
// text, no spinner — the chunk lands fast enough on most connections
// that anything heavier would flash-and-go.
export function Scene3DSkeleton() {
  return (
    <div
      className="flex h-full w-full items-center justify-center bg-[#f6f8fa]"
      role="status"
      aria-label="Loading 3D scene"
    >
      <div className="flex gap-1.5">
        <span className="h-2 w-2 animate-pulse rounded-full bg-gray-400 [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-gray-400 [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-gray-400 [animation-delay:300ms]" />
      </div>
    </div>
  );
}
