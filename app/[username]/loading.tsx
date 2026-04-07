export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-800 border-t-green-500" />
        <p className="text-sm text-gray-400">Growing your forest...</p>
      </div>
    </div>
  );
}
