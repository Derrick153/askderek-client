import { Metadata } from "next";
import { MapPin, ChevronRight, Building2, WifiOff } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Browse Properties by Region — AskDerek Ghana",
  description:
    "Find rental properties across all 16 regions of Ghana. From Greater Accra to Western Region, find verified homes on AskDerek.",
};

interface Region {
  id: string;
  name: string;
  slug: string;
  capital: string;
  cityCount: number;
  propertyCount: number;
}

/* ─────────────────────────────────────────────
   REGION IMAGE MAP
   Add more images as you get them
───────────────────────────────────────────── */
const REGION_IMAGES: Record<string, string> = {
  "central":       "/cape coast.jpg",
  "western":       "/Tarkwa.jpeg",
  "greater-accra": "/accra.jpeg",
  "ashanti":       "/kumasi.jpg",
};

function getApiBaseUrl(): string {
  const url = process.env.API_BASE_URL;
  if (!url) throw new Error("API_BASE_URL is not set.");
  return url;
}

type RegionsResult =
  | { ok: true; data: Region[] }
  | { ok: false; error: string };

async function getRegions(): Promise<RegionsResult> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/locations/regions`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return { ok: false, error: `Server error: ${res.status}` };
    const json: unknown = await res.json();
    if (!Array.isArray(json)) return { ok: false, error: "Unexpected response." };
    return { ok: true, data: json as Region[] };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

export default async function RegionsPage() {
  const result = await getRegions();

  if (!result.ok) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-sm w-full">
          <WifiOff className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 font-semibold mb-1">Could not load regions</p>
          <p className="text-gray-500 text-sm">{result.error}</p>
        </div>
      </div>
    );
  }

  const regions         = result.data;
  const totalProperties = regions.reduce((sum, r) => sum + r.propertyCount, 0);
  const activeRegions   = regions.filter((r) => r.propertyCount > 0);
  const inactiveRegions = regions.filter((r) => r.propertyCount === 0);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── HERO ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <nav className="flex items-center gap-2 text-sm mb-6">
            <Link href="/" className="text-gray-400 hover:text-orange-600 transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <span className="text-gray-700 font-medium">Regions</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-[12px] font-bold text-orange-600 uppercase tracking-widest mb-2">
                All Regions
              </p>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
                Find a Home Anywhere in{" "}
                <span className="text-orange-600">Ghana 🇬🇭</span>
              </h1>
              <p className="text-gray-500 text-base">
                Browse verified properties across all 16 regions
              </p>
            </div>

            <div className="flex items-center gap-6 shrink-0">
              <div className="text-right">
                <p className="text-2xl font-extrabold text-gray-900">{regions.length}</p>
                <p className="text-gray-400 text-xs">Regions</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold text-orange-600">{totalProperties}</p>
                <p className="text-gray-400 text-xs">Properties</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── REGIONS GRID ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {regions.length === 0 && (
          <div className="text-center py-20">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold">No regions added yet</p>
          </div>
        )}

        {activeRegions.length > 0 && (
          <div className="mb-10">
            <h2 className="text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-5">
              Available Now
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {activeRegions.map((region) => (
                <RegionCard key={region.id} region={region} active />
              ))}
            </div>
          </div>
        )}

        {inactiveRegions.length > 0 && (
          <div>
            <h2 className="text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-5">
              Coming Soon
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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

/* ─────────────────────────────────────────────
   REGION CARD
───────────────────────────────────────────── */
function RegionCard({
  region,
  active = false,
}: {
  region: Region;
  active?: boolean;
}) {
  const image = REGION_IMAGES[region.slug];

  return (
    <Link
      href={`/regions/${region.slug}`}
      aria-label={`Browse properties in ${region.name}`}
      className="group relative flex flex-col justify-end rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 min-h-[180px]"
    >
      {/* ── Background ── */}
      {image ? (
        <>
          <Image
            src={image}
            alt={region.name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        </>
      ) : (
        /* No image — clean light card */
        <div className={`absolute inset-0 ${active ? "bg-white" : "bg-gray-50"}`} />
      )}

      {/* ── Content ── */}
      <div className="relative p-4">
        {image ? (
          /* On image cards — white text */
          <>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-white font-extrabold text-[15px] leading-tight drop-shadow">
                {region.name}
              </h3>
              <ChevronRight className="w-4 h-4 text-white/70 group-hover:translate-x-1 transition-transform flex-shrink-0" />
            </div>
            <p className="text-white/60 text-[11px] mb-2">Capital: {region.capital}</p>
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-[11px]">
                {region.cityCount} {region.cityCount === 1 ? "city" : "cities"}
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                region.propertyCount > 0
                  ? "bg-orange-500 text-white"
                  : "bg-white/20 text-white/70"
              }`}>
                {region.propertyCount > 0
                  ? `${region.propertyCount} listing${region.propertyCount !== 1 ? "s" : ""}`
                  : "Coming soon"}
              </span>
            </div>
          </>
        ) : (
          /* On plain cards — dark text */
          <>
            <div className="flex items-start justify-between mb-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? "bg-orange-50" : "bg-gray-100"}`}>
                <MapPin className={`w-4 h-4 ${active ? "text-orange-500" : "text-gray-400"}`} />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
            </div>
            <h3 className="text-gray-900 font-extrabold text-[14px] leading-tight mb-0.5">
              {region.name}
            </h3>
            <p className="text-gray-400 text-[11px] mb-3">Capital: {region.capital}</p>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-[11px]">
                {region.cityCount} {region.cityCount === 1 ? "city" : "cities"}
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                region.propertyCount > 0
                  ? "bg-orange-50 text-orange-600 border border-orange-200"
                  : "bg-gray-100 text-gray-400 border border-gray-200"
              }`}>
                {region.propertyCount > 0
                  ? `${region.propertyCount} listing${region.propertyCount !== 1 ? "s" : ""}`
                  : "Coming soon"}
              </span>
            </div>
          </>
        )}
      </div>
    </Link>
  );
}