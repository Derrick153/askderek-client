import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface FiltersState {
  location: string;
  beds: string | null;
  baths: string | null;
  propertyType: string | null;
  amenities: string[];
  availableFrom: string;
  priceRange: [number, number] | [null, null];
  squareFeet: [number, number] | [null, null];
  coordinates: [number, number];
  area: string | null;
  region: string | null;
  regionSlug: string | null;
  city: string | null;
  citySlug: string | null;
  areaSlug: string | null;
  managerClerkId?: string;
}

interface InitialStateTypes {
  filters: FiltersState;
  isFiltersFullOpen: boolean;
  viewMode: "grid" | "list";
}

export const initialState: InitialStateTypes = {
  filters: {
    location: "Ghana",
    beds: "any",
    baths: "any",
    propertyType: "any",
    amenities: [],
    availableFrom: "any",
    priceRange: [null, null],
    squareFeet: [null, null],
    coordinates: [-1.0232, 7.9465],
    area: null,
    region: null,
    regionSlug: null,
    city: null,
    citySlug: null,
    areaSlug: null,
  },
  isFiltersFullOpen: false,
  viewMode: "grid",
};

export const globalSlice = createSlice({
  name: "global",
  initialState,
  reducers: {
    setFilters: (
      state,
      action: PayloadAction<Partial<FiltersState>>
    ) => {
      state.filters = {
        ...state.filters,
        ...action.payload,
      };
    },
    toggleFiltersFullOpen: (state) => {
      state.isFiltersFullOpen = !state.isFiltersFullOpen;
    },
    setViewMode: (
      state,
      action: PayloadAction<"grid" | "list">
    ) => {
      state.viewMode = action.payload;
    },
  },
});

export const {
  setFilters,
  toggleFiltersFullOpen,
  setViewMode,
} = globalSlice.actions;

export default globalSlice.reducer;
