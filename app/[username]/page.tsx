import { fetchContributions } from "@/lib/github";
import { notFound } from "next/navigation";
import { VisualizationShell } from "@/components/VisualizationShell";

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { username } = await params;
  return {
    title: `${username}'s forest — CommitGrove`,
    description: `Watch ${username}'s GitHub contributions grow into a living forest.`,
  };
}

export default async function UserPage({ params }: Props) {
  const { username } = await params;
  const result = await fetchContributions(username, 5);

  if (!result.ok) {
    if (result.reason === "not_found") notFound();
    // Everything else (rate_limited, unauthorized, network, server, misconfigured)
    // is caught by app/[username]/error.tsx. The reason travels in the error message.
    throw new Error(result.reason);
  }

  return <VisualizationShell data={result.data} />;
}
