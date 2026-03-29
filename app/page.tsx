import { UsernameForm } from "@/components/UsernameForm";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="flex max-w-lg flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            What if every commit planted a seed?
          </h1>
          <p className="text-lg text-gray-500">
            Watch your code grow into a living forest.
          </p>
        </div>
        <UsernameForm />
      </div>
    </main>
  );
}
