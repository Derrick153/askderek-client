import { Metadata } from "next";
import { MapPin, ChevronRight, Building2, WifiOff } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Browse Properties by Region — AskDerek Ghana",
  description:
    "Find rental properties across all 16 regions of Ghana. From Greater Accra to Western Region, find verified homes on AskDerek.",
  keywords:
    "Ghana rental properties, Accra rentals, Kumasi rentals, Tarkwa rentals, Takoradi rentals, Ghana housing",
};

interface Region {
  id: string;
  name: string;
  slug: string;
  capital: string;
  cityCount: number;
  propertyCount: number;
}

// BUG 3 FIX: Use private server-only env var — NEXT_PUBLIC_ leaks
// the API origin into every visitor's browser source code.
// BUG 4 FIX: Fail loudly at config time, not silently at runtime.
function getApiBaseUrl(): string {
  const url = process.env.API_BASE_URL;
  if (!url) {
    throw new Error(
      "API_BASE_URL is not set. Add it to your .env.local or deployment environment."
    );
  }
  return url;
}

// BUG 2 FIX: Distinguish a fetch failure from a genuinely empty list.
// Previously both returned [] and showed "Could not load regions" — wrong
// message for an empty database, and no indication of a real server error.
type RegionsResult =
  | { ok: true; data: Region[] }
  | { ok: false; error: string };

async function getRegions(): Promise<RegionsResult> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/locations/regions`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return { ok: false, error: `Server error: ${res.status} ${res.statusText}` };
    }

    const json: unknown = await res.json();

    if (!Array.isArray(json)) {
      return { ok: false, error: "Unexpected response format from server." };
    }

    return { ok: true, data: json as Region[] };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return { ok: false, error: message };
  }
}

export default async function RegionsPage() {
  const result = await getRegions();

  // Render error state for real fetch failures
  if (!result.ok) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center max-w-sm w-full">
          <WifiOff className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 font-semibold mb-1">Could not load regions</p>
          <p className="text-zinc-500 text-sm">{result.error}</p>
        </div>
      </div>
    );
  }

  const regions = result.data;

  const totalProperties = regions.reduce((sum, r) => sum + r.propertyCount, 0);
  const activeRegions = regions.filter((r) => r.propertyCount > 0);

  // BUG 1 FIX: "Coming Soon" section now shows only inactive regions.
  // Previously the second section mapped over all `regions`, causing every
  // active region to appear twice on the page.
  const inactiveRegions = regions.filter((r) => r.propertyCount === 0);

  return (
    <div className="min-h-screen bg-zinc-950">

      {/* ── HERO ─────────────────────────────────────────── */}
      <div className="border-b border-zinc-800/60 bg-zinc-900/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">

          {/* Breadcrumb */}
          <nav aria-label="breadcrumb" className="flex items-center gap-2 text-sm mb-6">
            <Link href="/" className="text-zinc-500 hover:text-orange-400 transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-700" />
            <span className="text-zinc-300">Regions</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
                Find a home anywhere in{" "}
                <span className="text-orange-500">Ghana 🇬🇭</span>
              </h1>
              <p className="text-zinc-400 text-base">
                Browse verified rental properties across all 16 regions
              </p>
            </div>

            <div className="flex items-center gap-6 shrink-0">
              <div className="text-right">
                <p className="text-2xl font-black text-white">{regions.length}</p>
                <p className="text-zinc-500 text-xs">Regions</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-orange-400">{totalProperties}</p>
                <p className="text-zinc-500 text-xs">Properties</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── REGIONS GRID ─────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* True empty state — only reached when fetch succeeded but data is [] */}
        {regions.length === 0 && (
          <div className="text-center py-20">
            <Building2 className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 font-semibold">No regions added yet</p>
            <p className="text-zinc-600 text-sm mt-1">
              Listings will appear here once regions are configured
            </p>
          </div>
        )}

        {/* Available Now — regions with live listings */}
        {activeRegions.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xs font-bold text-zinc-500 tracking-widest uppercase mb-4">
              Available Now
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {activeRegions.map((region) => (
                <RegionCard key={region.id} region={region} active />
              ))}
            </div>
          </div>
        )}

        {/* Coming Soon — only inactive regions, no duplicates */}
        {inactiveRegions.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-zinc-500 tracking-widest uppercase mb-4">
              Coming Soon
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {inactiveRegions.map((region) => (
                <RegionCard key={region.id} region={region} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── REGION CARD ───────────────────────────────────────────
function RegionCard({
  region,
  active = false,
}: {
  region: Region;
  active?: boolean;
}) {
  return (
    <Link
      href={`/regions/${region.slug}`}
      aria-label={`Browse properties in ${region.name}`}
      className={`group flex flex-col justify-between rounded-2xl p-5 border transition-all duration-200 min-h-[140px]
        ${
          active
            ? "bg-zinc-900 border-orange-500/30 hover:border-orange-500/60 hover:bg-zinc-800/80"
            : "bg-zinc-900/60 border-zinc-800/60 hover:border-zinc-700 hover:bg-zinc-900"
        }`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
            ${active ? "bg-orange-500/15" : "bg-zinc-800"}`}
        >
          <MapPin
            className={`w-4 h-4 ${active ? "text-orange-500" : "text-zinc-500"}`}
          />
        </div>
        <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
      </div>

      <div>
        <h3 className="text-white font-black text-sm leading-tight mb-0.5">
          {region.name}
        </h3>
        <p className="text-zinc-600 text-xs mb-3">Capital: {region.capital}</p>

        <div className="flex items-center justify-between">
          <span className="text-zinc-600 text-xs">
            {region.cityCount} {region.cityCount === 1 ? "city" : "cities"}
          </span>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full
              ${
                region.propertyCount > 0
                  ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                  : "bg-zinc-800 text-zinc-600 border border-zinc-700/50"
              }`}
          >
            {region.propertyCount === 0
              ? "Coming soon"
              : `${region.propertyCount} ${
                  region.propertyCount === 1 ? "listing" : "listings"
                }`}
          </span>
        </div>
      </div>
    </Link>
  );
}