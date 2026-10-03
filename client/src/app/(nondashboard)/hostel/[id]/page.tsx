import type { Metadata } from "next";
import HostelDetailPage from "./HostelDetailClient";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://askderek.com";

async function fetchHostelForMetadata(id: string) {
  try {
    const res = await fetch(`${API_BASE}/properties/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const property = await fetchHostelForMetadata(id);

  if (!property) {
    return {
      title: "Hostel | AskDerek",
      description: "Find student hostels in Ghana on AskDerek.",
    };
  }

  const city = property.location?.city;
  const region = property.location?.region;
  const locationLabel = [city, region].filter(Boolean).join(", ");
  const title = `${property.name}${locationLabel ? ` — ${locationLabel}` : ""} | AskDerek`;
  const description = property.description
    ? property.description.slice(0, 155)
    : `${property.name} — student hostel accommodation${locationLabel ? ` in ${locationLabel}` : ""} on AskDerek.`;
  const image = property.photoUrls?.[0];
  const canonical = `${SITE_URL}/hostel/${id}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await params;
  return <HostelDetailPage />;
}
