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
  const data = await fetchContributions(username, 1);

  if (!data) {
    notFound();
  }

  return <VisualizationShell data={data} />;
}
