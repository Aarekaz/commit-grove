import { UsernameForm } from "@/components/UsernameForm";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="flex max-w-lg flex-col items-center gap-6 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">User not found</h1>
          <p className="text-gray-500">
            That GitHub username doesn&apos;t exist or has no public contributions.
          </p>
        </div>
        <UsernameForm />
      </div>
    </main>
  );
}
