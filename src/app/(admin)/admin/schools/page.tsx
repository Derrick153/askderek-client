"use client";

import { useState }  from "react";
import { useUser }   from "@clerk/nextjs";
import {
  useGetAllSchoolsQuery,
  useAddSchoolMutation,
  useAddSemesterMutation,
  useUpdateSemesterEndDateMutation,
  useNotifyStudentsMutation,
  useGetAdminQuery,
} from "@/state/api";
import SchoolSemesterCard from "@/components/SchoolSemesterCard";
import {
  GraduationCap, Plus, RefreshCw, Search, X, Loader2,
} from "lucide-react";
import type { School, SchoolSemester } from "@/state/api";

// ─────────────────────────────────────────────────────────────────────────────
//  /admin/schools/page.tsx
//  Derek manages all school semester calendars.
// ─────────────────────────────────────────────────────────────────────────────

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

export default function AdminSchoolsPage() {
  const { user } = useUser();
  const { data: adminRaw } = useGetAdminQuery(user?.id ?? "", { skip: !user?.id });
  const adminDbId: number  = (adminRaw as any)?.id ?? 1;

  const { data: schoolsRaw, isLoading, refetch } = useGetAllSchoolsQuery();
  const [addSchool]             = useAddSchoolMutation();
  const [addSemester]           = useAddSemesterMutation();
  const [updateSemesterEndDate] = useUpdateSemesterEndDateMutation();
  const [notifyStudents]        = useNotifyStudentsMutation();

  const schools: School[] = Array.isArray(schoolsRaw) ? schoolsRaw : (schoolsRaw as any)?.data ?? [];

  const [search,      setSearch]      = useState("");
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSchoolLoc,  setNewSchoolLoc]  = useState("");
  const [addingSchool,  setAddingSchool]  = useState(false);

  const [showAddSem,    setShowAddSem]    = useState<number | null>(null);
  const [newSemName,    setNewSemName]    = useState("");
  const [newSemStart,   setNewSemStart]   = useState("");
  const [addingSem,     setAddingSem]     = useState(false);

  const filtered = schools.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddSchool = async () => {
    if (!newSchoolName.trim() || !newSchoolLoc.trim()) return;
    setAddingSchool(true);
    try {
      await addSchool({ name: newSchoolName.trim(), location: newSchoolLoc.trim(), adminDbId });
      setNewSchoolName("");
      setNewSchoolLoc("");
      setShowAddSchool(false);
      refetch();
    } finally {
      setAddingSchool(false);
    }
  };

  const handleAddSemester = async (schoolId: number) => {
    if (!newSemName.trim() || !newSemStart) return;
    setAddingSem(true);
    try {
      await addSemester({ schoolId, semesterName: newSemName.trim(), startDate: newSemStart, adminDbId });
      setNewSemName("");
      setNewSemStart("");
      setShowAddSem(null);
      refetch();
    } finally {
      setAddingSem(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schools & Semesters</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage university calendar integration</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => setShowAddSchool(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-xl hover:bg-orange-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add School
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <GraduationCap className="w-8 h-8 text-orange-500 mb-3" />
            <p className="text-2xl font-bold text-gray-900">{schools.length}</p>
            <p className="text-sm text-gray-500">Registered Schools</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <GraduationCap className="w-8 h-8 text-blue-500 mb-3" />
            <p className="text-2xl font-bold text-gray-900">
              {schools.reduce((sum, s) => sum + (s.semesters?.length ?? 0), 0)}
            </p>
            <p className="text-sm text-gray-500">Total Semesters</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search schools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          />
        </div>

        {/* Add School Form */}
        {showAddSchool && (
          <div className="bg-white rounded-2xl border border-orange-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Add New School</h3>
              <button onClick={() => setShowAddSchool(false)}>
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <input
              type="text"
              placeholder="School name (e.g. KNUST)"
              value={newSchoolName}
              onChange={(e) => setNewSchoolName(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
            <input
              type="text"
              placeholder="Location (e.g. Kumasi, Ashanti)"
              value={newSchoolLoc}
              onChange={(e) => setNewSchoolLoc(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
            <button
              onClick={handleAddSchool}
              disabled={addingSchool || !newSchoolName.trim() || !newSchoolLoc.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-40"
            >
              {addingSchool ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add School
            </button>
          </div>
        )}

        {/* Schools list */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <GraduationCap className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-base font-bold text-gray-900 mb-1">No schools registered</p>
            <p className="text-sm text-gray-500">Add KNUST, UMAT, UG, UCC to get started.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {filtered.map((school) => (
              <div key={school.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* School header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{school.name}</h3>
                      <p className="text-xs text-gray-400">{school.location}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddSem(showAddSem === school.id ? null : school.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Semester
                  </button>
                </div>

                {/* Add Semester Form */}
                {showAddSem === school.id && (
                  <div className="px-5 py-4 bg-orange-50 border-b border-orange-100 flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[140px]">
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Semester Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Semester 1 2026"
                        value={newSemName}
                        onChange={(e) => setNewSemName(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>
                    <div className="flex-1 min-w-[140px]">
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Start Date</label>
                      <input
                        type="date"
                        value={newSemStart}
                        onChange={(e) => setNewSemStart(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>
                    <button
                      onClick={() => handleAddSemester(school.id)}
                      disabled={addingSem || !newSemName.trim() || !newSemStart}
                      className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white text-xs font-semibold rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-40"
                    >
                      {addingSem ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add"}
                    </button>
                  </div>
                )}

                {/* Semesters */}
                {(school.semesters?.length ?? 0) === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <p className="text-sm text-gray-400">No semesters added yet</p>
                  </div>
                ) : (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {school.semesters!.map((sem: SchoolSemester) => (
                      <SchoolSemesterCard
                        key={sem.id}
                        semester={sem}
                        schoolId={school.id}
                        schoolName={school.name}
                        onUpdateEndDate={async (semId, endDate) => {
                          await updateSemesterEndDate({ schoolId: school.id, semesterId: semId, endDate, adminDbId });
                          refetch();
                        }}
                        onNotifyStudents={async (semId) => {
                          await notifyStudents({ schoolId: school.id, semesterId: semId, adminDbId });
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}