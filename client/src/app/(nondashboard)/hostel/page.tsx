"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDiscoverHostelsQuery, useGetAllSchoolsQuery, useGetCampusesBySchoolQuery, useGetHostelsNearCampusQuery } from "@/state/api";
import Image from "next/image";
import { Search, MapPin, Home, ArrowUpRight, SlidersHorizontal, Building2, X, Navigation } from "lucide-react";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-stone-200 ${className}`} />
);

const formatGHS = (n?: number) =>
  n != null ? `GH${String.fromCharCode(8373)} ${n.toLocaleString("en-GH", { minimumFractionDigits: 0 })}` : null;

export default function HostelPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [gender, setGender] = useState("");
  const [sort, setSort] = useState("");
  const [page, setPage] = useState(1);

  const [mode, setMode] = useState<"all" | "university">("all");
  const [schoolQuery, setSchoolQuery] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [selectedCampus, setSelectedCampus] = useState<any>(null);

  const { data: schoolsData } = useGetAllSchoolsQuery(undefined, { skip: mode !== "university" });
  const schools: any[] = (schoolsData as any) ?? [];
  const filteredSchools = schools.filter((s: any) =>
    !schoolQuery ||
    s.name?.toLowerCase().includes(schoolQuery.toLowerCase()) ||
    (s.aliases || []).some((a: string) => a.toLowerCase().includes(schoolQuery.toLowerCase()))
  );

  const { data: campusesData } = useGetCampusesBySchoolQuery(selectedSchool?.id, { skip: !selectedSchool });
  const campuses: any[] = campusesData?.data ?? [];

  useEffect(() => {
    if (selectedSchool && campuses.length === 1 && !selectedCampus) {
      setSelectedCampus(campuses[0]);
    }
  }, [selectedSchool, campuses, selectedCampus]);

  const { data: nearbyData, isLoading: loadingNearby } = useGetHostelsNearCampusQuery(
    selectedCampus?.id,
    { skip: !selectedCampus }
  );

  const { data: discoverData, isLoading: loadingDiscover } = useDiscoverHostelsQuery(
    {
      search: search || undefined,
      priceMin: priceMin || undefined,
      priceMax: priceMax || undefined,
      gender: gender || undefined,
      sort: sort || undefined,
      page,
      limit: 12,
    },
    { skip: mode === "university" }
  );

  const showingNearby = mode === "university" && !!selectedCampus;
  const isLoading = showingNearby ? loadingNearby : loadingDiscover;
  const hostels: any[] = showingNearby ? (nearbyData?.data ?? []) : (discoverData?.data?.hostels ?? []);
  const pagination = showingNearby
    ? { page: 1, totalPages: 1, total: hostels.length }
    : (discoverData?.data?.pagination ?? { page: 1, totalPages: 1, total: 0 });
  const hasActiveFilters = Boolean(search || priceMin || priceMax || gender);
  const heroPhotos: string[] = Array.from(new Set(hostels.map((h: any) => h.photoUrls?.[0]).filter(Boolean))).slice(0, 5) as string[];
  const accent = mode === "university" ? "amber" : "orange";

  const resetFilters = () => {
    setPriceMin("");
    setPriceMax("");
    setGender("");
    setSort("");
    setPage(1);
  };

  const backToBrowse = () => {
    setMode("all");
    setSelectedSchool(null);
    setSelectedCampus(null);
    setSchoolQuery("");
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <style>{`
        @keyframes heroFade { 0%, 18% { opacity: 1; } 22%, 100% { opacity: 0; } }
      `}</style>
      <div className="relative overflow-hidden border-b border-stone-200 bg-[#1B2A4A]">
        <div className="absolute inset-0">
          {heroPhotos.length > 0 ? (
            heroPhotos.map((url, i) => (
              <div
                key={url}
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${url})`,
                  animation: `heroFade ${heroPhotos.length * 5}s infinite`,
                  animationDelay: `${i * 5}s`,
                  opacity: i === 0 ? 1 : 0,
                }}
              />
            ))
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-[#1B2A4A]/90 via-[#1B2A4A]/85 to-[#1B2A4A]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 pt-14 pb-8">
          <div className="flex items-start justify-between gap-8 flex-wrap">
            <div className="max-w-xl">
              <h1 className="text-[2.75rem] leading-[1.05] font-bold text-white tracking-tight mb-3">
                Find your room{mode === "university" ? ", close to class" : " for the semester"}
              </h1>
              <p className="text-white/70 text-[15px] leading-relaxed">
                {mode === "university"
                  ? "Pick your school and see exactly how far each hostel really is."
                  : "Real listings, real prices, booked by the semester."}
              </p>
            </div>
            <div className="flex gap-1 bg-white/10 backdrop-blur-sm rounded-full p-1 shrink-0">
              <button
                onClick={backToBrowse}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-colors ${mode === "all" ? "bg-white text-[#1B2A4A]" : "text-white/80 hover:text-white"}`}
              >
                Browse all
              </button>
              <button
                onClick={() => setMode("university")}
                className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold transition-colors ${mode === "university" ? "bg-[#A6791F] text-white" : "text-white/80 hover:text-white"}`}
              >
                <Building2 className="w-3.5 h-3.5" /> Near my university
              </button>
            </div>
          </div>

          {mode === "all" && (
            <div className="relative max-w-md mt-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search hostel name or area"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-11 pr-4 py-3 text-sm bg-white border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E85D2C] transition-shadow"
              />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {mode === "university" && !selectedSchool && (
          <div className="max-w-xl">
            <h2 className="text-sm font-semibold text-stone-900 mb-3">Where are you studying?</h2>
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search university or institution"
                value={schoolQuery}
                onChange={(e) => setSchoolQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:border-[#A6791F]"
              />
            </div>
            {filteredSchools.length === 0 ? (
              <p className="text-sm text-stone-400 py-8">No matching institutions yet.</p>
            ) : (
              <div className="divide-y divide-stone-200 border border-stone-200 rounded-xl overflow-hidden bg-white">
                {filteredSchools.map((s: any) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSchool(s)}
                    className="w-full text-left px-4 py-3.5 hover:bg-stone-50 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{s.name}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{s.location}</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-stone-300 group-hover:text-[#A6791F] transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {mode === "university" && selectedSchool && !selectedCampus && (
          <div className="max-w-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-stone-900">Which campus - {selectedSchool.name}</h2>
              <button onClick={() => setSelectedSchool(null)} className="text-stone-400 hover:text-stone-600"><X className="w-4 h-4" /></button>
            </div>
            {campuses.length === 0 ? (
              <p className="text-sm text-stone-400 py-8">No campus location on file for this institution yet.</p>
            ) : (
              <div className="divide-y divide-stone-200 border border-stone-200 rounded-xl overflow-hidden bg-white">
                {campuses.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCampus(c)}
                    className="w-full text-left px-4 py-3.5 hover:bg-stone-50 transition-colors"
                  >
                    <p className="text-sm font-semibold text-stone-900">{c.name}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{c.city}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {showingNearby && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-stone-600">
              Near <span className="font-semibold text-stone-900">{selectedCampus.name}</span>, {selectedSchool.name}
            </p>
            <button onClick={backToBrowse} className="text-xs font-semibold text-[#A6791F] hover:underline">Change university</button>
          </div>
        )}

        {(mode === "all" || showingNearby) && (
          <>
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3 pt-1">
              <p className="text-sm text-stone-500">
                <span className="font-bold text-stone-900">{pagination.total}</span> {pagination.total === 1 ? "hostel" : "hostels"}
              </p>
              {mode === "all" && (
                <div className="flex items-center gap-2">
                  <select
                    value={sort}
                    onChange={(e) => { setSort(e.target.value); setPage(1); }}
                    className="text-sm border border-stone-200 rounded-lg px-3 py-2 bg-white text-stone-700"
                  >
                    <option value="">Newest</option>
                    <option value="price_asc">Price: low to high</option>
                    <option value="price_desc">Price: high to low</option>
                  </select>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-1.5 text-sm border border-stone-200 rounded-lg px-3 py-2 bg-white text-stone-700 hover:border-stone-300"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
                  </button>
                </div>
              )}
            </div>

            {mode === "all" && showFilters && (
              <div className="bg-white border border-stone-200 rounded-xl p-5 mb-5 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-medium text-stone-500 mb-1.5 block">Min price</label>
                  <input
                    type="number"
                    value={priceMin}
                    onChange={(e) => { setPriceMin(e.target.value); setPage(1); }}
                    className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2"
                    placeholder="GHS 0"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-500 mb-1.5 block">Max price</label>
                  <input
                    type="number"
                    value={priceMax}
                    onChange={(e) => { setPriceMax(e.target.value); setPage(1); }}
                    className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2"
                    placeholder="Any"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-500 mb-1.5 block">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => { setGender(e.target.value); setPage(1); }}
                    className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2"
                  >
                    <option value="">Any</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={resetFilters} className="text-sm text-[#E85D2C] font-semibold hover:underline">
                    Reset filters
                  </button>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
              </div>
            ) : hostels.length === 0 ? (
              <div className="border border-stone-200 rounded-xl p-16 text-center bg-white">
                <h3 className="text-base font-semibold text-stone-900 mb-1.5">No hostels found</h3>
                <p className="text-sm text-stone-500">
                  {showingNearby
                    ? "We don't have hostels listed near this institution yet."
                    : hasActiveFilters ? "Try a different search or filters." : "No hostel listings yet."}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {hostels.map((p: any) => {
                    const price = formatGHS(p.currentHostelPrice);
                    return (
                      <div
                        key={p.id}
                        onClick={() => router.push(p.distanceKm != null ? `/hostel/${p.id}?distanceKm=${p.distanceKm}&campusName=${encodeURIComponent(selectedCampus?.name ?? "")}` : `/hostel/${p.id}`)}
                        className="bg-white border border-stone-200 rounded-xl overflow-hidden hover:border-stone-300 hover:shadow-sm transition-all cursor-pointer group"
                      >
                        <div className="relative h-44 bg-stone-100">
                          {p.photoUrls?.[0] ? (
                            <Image src={p.photoUrls[0]} alt={p.name} fill className="object-cover" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center"><Home className="w-8 h-8 text-stone-300" /></div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-stone-900 truncate mb-1">{p.name}</h3>
                          <div className="flex items-center gap-1 text-xs text-stone-400 mb-3">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{p.city}, {p.region}</span>
                          </div>
                          {p.distanceKm != null && (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-[#A6791F] mb-3">
                              <Navigation className="w-3 h-3" />
                              {Number(p.distanceKm).toFixed(1)} km from campus
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                            <p className={`text-base font-bold ${price ? "text-stone-900" : "text-stone-400 font-medium text-sm"}`}>
                              {price ? `${price} / semester` : "Price not set"}
                            </p>
                            <ArrowUpRight className="w-4 h-4 text-stone-300 group-hover:text-[#E85D2C] transition-colors" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {mode === "all" && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-8">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                      className="px-4 py-2 text-sm border border-stone-200 rounded-lg bg-white disabled:opacity-40 hover:border-stone-300"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-stone-500">Page {pagination.page} of {pagination.totalPages}</span>
                    <button
                      disabled={page >= pagination.totalPages}
                      onClick={() => setPage(page + 1)}
                      className="px-4 py-2 text-sm border border-stone-200 rounded-lg bg-white disabled:opacity-40 hover:border-stone-300"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}