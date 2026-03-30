import { UsernameForm } from "@/components/UsernameForm";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gray-950 px-6">
      {/* Subtle grid background */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

      {/* Radial glow behind content */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-500/5 blur-[120px]" />

      <div className="relative z-10 flex max-w-xl flex-col items-center gap-10 text-center">
        {/* Badge */}
        <div className="rounded-full border border-green-500/20 bg-green-500/5 px-4 py-1.5 text-xs font-medium tracking-wide text-green-400">
          Your commits, visualized
        </div>

        {/* Heading */}
        <div className="flex flex-col gap-4">
          <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
            Watch your code grow
            <br />
            <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
              into a living world
            </span>
          </h1>
          <p className="mx-auto max-w-md text-base text-gray-400">
            Transform years of GitHub contributions into forests, cities, and
            terrain — unique to your coding journey.
          </p>
        </div>

        {/* Form — hints rendered inside the client component */}
        <UsernameForm hints={["torvalds", "gaearon", "sindresorhus"]} />
      </div>
    </main>
  );
}
