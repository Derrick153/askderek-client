import { Metadata } from "next";
import { MapPin, ChevronRight, Building2, WifiOff } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

// ── TYPES ─────────────────────────────────────────────────

interface City {
  id: string;
  name: string;
  slug: string;
  areaCount: number;
  propertyCount: number;
}

interface RegionData {
  region: string;
  regionSlug: string;
  capital: string;
  cities: City[];
}

type RegionResult =
  | { ok: true; data: RegionData }
  | { ok: false; error: string };

// ── DATA FETCHER ──────────────────────────────────────────

function getApiBaseUrl(): string {
  const url = process.env.API_BASE_URL;
  if (!url) throw new Error("API_BASE_URL is not set.");
  return url;
}

async function getRegionCities(regionSlug: string): Promise<RegionResult> {
  try {
    const res = await fetch(
      `${getApiBaseUrl()}/locations/regions/${regionSlug}/cities`,
      { next: { revalidate: 300 } }
    );

    if (res.status === 404) return { ok: false, error: "Region not found" };
    if (!res.ok) return { ok: false, error: `Server error: ${res.status}` };

    const json: unknown = await res.json();
    if (!json || typeof json !== "object") {
      return { ok: false, error: "Unexpected response from server" };
    }

    return { ok: true, data: json as RegionData };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return { ok: false, error: message };
  }
}

// ── METADATA ──────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ regionSlug: string }>;
}): Promise<Metadata> {
  const { regionSlug } = await params;
  const result = await getRegionCities(regionSlug);
  if (!result.ok) return { title: "Region Not Found — AskDerek" };

  const { region, cities } = result.data;
  const topCities = cities.slice(0, 3).map((c) => c.name).join(", ");

  return {
    title: `Rental Properties in ${region} — AskDerek Ghana`,
    description: `Find verified rental properties in ${region}. Browse cities including ${topCities} and more on AskDerek — Ghana's trusted rental platform.`,
    keywords: `${region} rentals, ${topCities} properties, Ghana housing, AskDerek`,
  };
}

// ── PAGE ──────────────────────────────────────────────────

export default async function RegionCitiesPage({
  params,
}: {
  params: Promise<{ regionSlug: string }>;
}) {
  const { regionSlug } = await params;
  const result = await getRegionCities(regionSlug);

  if (!result.ok && result.error === "Region not found") notFound();

  if (!result.ok) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center max-w-sm w-full">
          <WifiOff className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 font-semibold mb-1">Could not load cities</p>
          <p className="text-zinc-500 text-sm">{result.error}</p>
        </div>
      </div>
    );
  }

  const { region, cities } = result.data;

  const totalProperties = cities.reduce((sum, c) => sum + c.propertyCount, 0);
  const activeCities = cities.filter((c) => c.propertyCount > 0);
  const inactiveCities = cities.filter((c) => c.propertyCount === 0);

  return (
    <div className="min-h-screen bg-zinc-950">

      {/* ── HERO ─────────────────────────────────────── */}
      <div className="border-b border-zinc-800/60 bg-zinc-900/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">

          {/* Breadcrumb */}
          <nav aria-label="breadcrumb" className="flex items-center gap-2 text-sm mb-6 flex-wrap">
            <Link href="/" className="text-zinc-500 hover:text-orange-400 transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-700 flex-shrink-0" />
            <Link href="/regions" className="text-zinc-500 hover:text-orange-400 transition-colors">
              Regions
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-700 flex-shrink-0" />
            <span className="text-zinc-300">{region}</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
                {region}
              </h1>
              <p className="text-zinc-400 text-base">
                Choose a city to browse rental properties
              </p>
            </div>

            <div className="flex items-center gap-6 shrink-0">
              <div className="text-right">
                <p className="text-2xl font-black text-white">{cities.length}</p>
                <p className="text-zinc-500 text-xs">Cities</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-orange-400">{totalProperties}</p>
                <p className="text-zinc-500 text-xs">Properties</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CITIES GRID ──────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* Empty state */}
        {cities.length === 0 && (
          <div className="text-center py-20">
            <Building2 className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 font-semibold">No cities found</p>
            <p className="text-zinc-600 text-sm mt-1">
              This region has no cities configured yet
            </p>
          </div>
        )}

        {/* Active cities */}
        {activeCities.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xs font-bold text-zinc-500 tracking-widest uppercase mb-4">
              Available Now
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {activeCities.map((city) => (
                <CityCard
                  key={city.id}
                  city={city}
                  regionSlug={regionSlug}
                  active
                />
              ))}
            </div>
          </div>
        )}

        {/* Inactive cities */}
        {inactiveCities.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-zinc-500 tracking-widest uppercase mb-4">
              Coming Soon
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {inactiveCities.map((city) => (
                <CityCard
                  key={city.id}
                  city={city}
                  regionSlug={regionSlug}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── CITY CARD ─────────────────────────────────────────────

function CityCard({
  city,
  regionSlug,
  active = false,
}: {
  city: City;
  regionSlug: string;
  active?: boolean;
}) {
  return (
    <Link
      href={`/regions/${regionSlug}/${city.slug}`}
      aria-label={`Browse properties in ${city.name}`}
      className={`group flex flex-col justify-between rounded-2xl p-5 border transition-all duration-200 min-h-[140px]
        ${active
          ? "bg-zinc-900 border-orange-500/30 hover:border-orange-500/60 hover:bg-zinc-800/80"
          : "bg-zinc-900/60 border-zinc-800/60 hover:border-zinc-700 hover:bg-zinc-900"
        }`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
          ${active ? "bg-orange-500/15" : "bg-zinc-800"}`}>
          <MapPin className={`w-4 h-4 ${active ? "text-orange-500" : "text-zinc-500"}`} />
        </div>
        <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
      </div>

      <div>
        <h3 className="text-white font-black text-sm leading-tight mb-0.5">
          {city.name}
        </h3>
        <p className="text-zinc-600 text-xs mb-3">
          {city.areaCount} {city.areaCount === 1 ? "area" : "areas"}
        </p>

        <div className="flex items-center justify-between">
          <span className="text-zinc-600 text-xs">Browse areas</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full
            ${city.propertyCount > 0
              ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
              : "bg-zinc-800 text-zinc-600 border border-zinc-700/50"
            }`}>
            {city.propertyCount === 0
              ? "Coming soon"
              : `${city.propertyCount} ${city.propertyCount === 1 ? "listing" : "listings"}`
            }
          </span>
        </div>
      </div>
    </Link>
  );
}