"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search, ChevronDown } from "lucide-react";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface LocationSuggestion {
  name: string;
  region: string;
  coordinates: [number, number]; // [lng, lat]
}

/* ─────────────────────────────────────────────
   DATA
   Coordinates match your existing search
   pattern: /search?location=X&coordinates=lng,lat
───────────────────────────────────────────── */
const GHANA_LOCATIONS: LocationSuggestion[] = [

  // ── GREATER ACCRA ──────────────────────────────────────────────
  { name: "Accra",                region: "Greater Accra", coordinates: [-0.1870,  5.6037] },
  { name: "East Legon",           region: "Greater Accra", coordinates: [-0.1563,  5.6369] },
  { name: "Spintex",              region: "Greater Accra", coordinates: [-0.1170,  5.6494] },
  { name: "Adenta",               region: "Greater Accra", coordinates: [-0.1631,  5.7011] },
  { name: "Tema",                 region: "Greater Accra", coordinates: [ 0.0166,  5.6698] },
  { name: "Airport Residential",  region: "Greater Accra", coordinates: [-0.1756,  5.6049] },
  { name: "Cantonments",          region: "Greater Accra", coordinates: [-0.1740,  5.5819] },
  { name: "Osu",                  region: "Greater Accra", coordinates: [-0.1769,  5.5532] },
  { name: "Labone",               region: "Greater Accra", coordinates: [-0.1666,  5.5658] },
  { name: "Teshie",               region: "Greater Accra", coordinates: [-0.1004,  5.5800] },
  { name: "Dansoman",             region: "Greater Accra", coordinates: [-0.2637,  5.5419] },
  { name: "Madina",               region: "Greater Accra", coordinates: [-0.1736,  5.6800] },
  { name: "Achimota",             region: "Greater Accra", coordinates: [-0.2297,  5.6174] },
  { name: "Ashaiman",             region: "Greater Accra", coordinates: [ 0.0336,  5.6994] },
  { name: "Nungua",               region: "Greater Accra", coordinates: [-0.0744,  5.5714] },
  { name: "Labadi",               region: "Greater Accra", coordinates: [-0.1462,  5.5542] },
  { name: "Dome",                 region: "Greater Accra", coordinates: [-0.2333,  5.6700] },
  { name: "Weija",                region: "Greater Accra", coordinates: [-0.3622,  5.5644] },
  { name: "Ablekuma",             region: "Greater Accra", coordinates: [-0.2500,  5.5833] },
  { name: "Prampram",             region: "Greater Accra", coordinates: [ 0.1119,  5.7158] },

  // ── ASHANTI ────────────────────────────────────────────────────
  { name: "Kumasi",               region: "Ashanti",       coordinates: [-1.6236,  6.6885] },
  { name: "Asokwa",               region: "Ashanti",       coordinates: [-1.6144,  6.6697] },
  { name: "Bantama",              region: "Ashanti",       coordinates: [-1.6400,  6.7050] },
  { name: "Oforikrom",            region: "Ashanti",       coordinates: [-1.5833,  6.6667] },
  { name: "Suame",                region: "Ashanti",       coordinates: [-1.6500,  6.7200] },
  { name: "Manhyia",              region: "Ashanti",       coordinates: [-1.6100,  6.7100] },
  { name: "Ejisu",                region: "Ashanti",       coordinates: [-1.4833,  6.7167] },
  { name: "Obuasi",               region: "Ashanti",       coordinates: [-1.6667,  6.2000] },
  { name: "Konongo",              region: "Ashanti",       coordinates: [-1.2167,  6.6167] },
  { name: "Mampong",              region: "Ashanti",       coordinates: [-1.4000,  7.0667] },
  { name: "Bekwai",               region: "Ashanti",       coordinates: [-1.5833,  6.4500] },
  { name: "Juaben",               region: "Ashanti",       coordinates: [-1.4500,  6.7833] },
  { name: "Agona Ashanti",        region: "Ashanti",       coordinates: [-1.7333,  6.6000] },
  { name: "Tepa",                 region: "Ashanti",       coordinates: [-2.1000,  7.0500] },
  { name: "Kuntanase",            region: "Ashanti",       coordinates: [-1.5500,  6.5333] },
  { name: "Asante Mampong",       region: "Ashanti",       coordinates: [-1.3956,  7.0667] },

  // ── WESTERN ────────────────────────────────────────────────────
  { name: "Takoradi",             region: "Western",       coordinates: [-1.7547,  4.8845] },
  { name: "Sekondi",              region: "Western",       coordinates: [-1.7047,  4.9432] },
  { name: "Tarkwa",               region: "Western",       coordinates: [-1.9933,  5.3000] },
  { name: "Axim",                 region: "Western",       coordinates: [-2.2333,  4.8667] },
  { name: "Prestea",              region: "Western",       coordinates: [-2.1500,  5.4333] },
  { name: "Bogoso",               region: "Western",       coordinates: [-2.0667,  5.5500] },
  { name: "Agona Nkwanta",        region: "Western",       coordinates: [-2.1000,  5.5000] },
  { name: "Aboso",                region: "Western",       coordinates: [-1.9500,  5.3667] },
  { name: "Secondi-Takoradi",     region: "Western",       coordinates: [-1.7500,  4.9167] },
  { name: "Esiama",               region: "Western",       coordinates: [-2.2833,  4.9333] },
  { name: "Half Assini",          region: "Western",       coordinates: [-2.8833,  5.0500] },
  { name: "Enchi",                region: "Western",       coordinates: [-2.8167,  5.8333] },
  { name: "Sefwi Wiawso",         region: "Western",       coordinates: [-2.4833,  6.2000] },
  { name: "Bibiani",              region: "Western",       coordinates: [-2.3167,  6.4667] },
  { name: "Wassa Akropong",       region: "Western",       coordinates: [-1.9667,  5.5000] },

  // ── WESTERN NORTH ──────────────────────────────────────────────
  { name: "Sefwi Wiawso",         region: "Western North", coordinates: [-2.4833,  6.2000] },
  { name: "Bibiani",              region: "Western North", coordinates: [-2.3167,  6.4667] },
  { name: "Juaboso",              region: "Western North", coordinates: [-2.7667,  6.4833] },
  { name: "Sefwi Bekwai",         region: "Western North", coordinates: [-2.3667,  6.4667] },
  { name: "Awaso",                region: "Western North", coordinates: [-2.5833,  6.4167] },
  { name: "Asankragua",           region: "Western North", coordinates: [-2.6667,  6.1167] },
  { name: "Benchema",             region: "Western North", coordinates: [-2.7500,  6.3167] },
  { name: "Bodi",                 region: "Western North", coordinates: [-2.8000,  6.5500] },
  { name: "Debiso",               region: "Western North", coordinates: [-2.7667,  6.3000] },
  { name: "Eshiem",               region: "Western North", coordinates: [-2.3000,  6.3333] },
  { name: "Akontombra",           region: "Western North", coordinates: [-2.9500,  6.4667] },
  { name: "Dadieso",              region: "Western North", coordinates: [-3.0833,  6.4333] },
  { name: "Manso Amenfi",         region: "Western North", coordinates: [-2.1667,  6.2833] },
  { name: "Nkrankwanta",          region: "Western North", coordinates: [-2.8500,  6.6167] },
  { name: "Suaman",               region: "Western North", coordinates: [-2.9500,  5.9833] },

  // ── CENTRAL ────────────────────────────────────────────────────
  { name: "Cape Coast",           region: "Central",       coordinates: [-1.2459,  5.1053] },
  { name: "Kasoa",                region: "Central",       coordinates: [-0.4167,  5.5333] },
  { name: "Winneba",              region: "Central",       coordinates: [-0.6167,  5.3500] },
  { name: "Saltpond",             region: "Central",       coordinates: [-1.0667,  5.2000] },
  { name: "Anomabo",              region: "Central",       coordinates: [-1.1167,  5.1667] },
  { name: "Mankessim",            region: "Central",       coordinates: [-1.0167,  5.2667] },
  { name: "Assin Fosu",           region: "Central",       coordinates: [-1.3000,  5.7167] },
  { name: "Dunkwa-on-Offin",      region: "Central",       coordinates: [-1.7667,  5.9667] },
  { name: "Agona Swedru",         region: "Central",       coordinates: [-0.6833,  5.5333] },
  { name: "Elmina",               region: "Central",       coordinates: [-1.3500,  5.0833] },
  { name: "Komenda",              region: "Central",       coordinates: [-1.4667,  5.0667] },
  { name: "Mumford",              region: "Central",       coordinates: [-0.7500,  5.2667] },
  { name: "Twifo Praso",          region: "Central",       coordinates: [-1.5667,  5.6167] },
  { name: "Eguafo",               region: "Central",       coordinates: [-1.3000,  5.0833] },
  { name: "Apam",                 region: "Central",       coordinates: [-0.7333,  5.2833] },

  // ── EASTERN ────────────────────────────────────────────────────
  { name: "Koforidua",            region: "Eastern",       coordinates: [-0.2618,  6.0940] },
  { name: "Nkawkaw",              region: "Eastern",       coordinates: [-0.7667,  6.5500] },
  { name: "Suhum",                region: "Eastern",       coordinates: [-0.4500,  6.0333] },
  { name: "Asamankese",           region: "Eastern",       coordinates: [-0.6500,  5.8667] },
  { name: "Akosombo",             region: "Eastern",       coordinates: [ 0.0500,  6.2833] },
  { name: "Kade",                 region: "Eastern",       coordinates: [-0.8333,  6.0833] },
  { name: "Mpraeso",              region: "Eastern",       coordinates: [-0.7333,  6.5833] },
  { name: "Abetifi",              region: "Eastern",       coordinates: [-0.7500,  6.6667] },
  { name: "Nkurakan",             region: "Eastern",       coordinates: [-0.2000,  6.1833] },
  { name: "Osino",                region: "Eastern",       coordinates: [-0.3500,  6.2500] },
  { name: "Oda",                  region: "Eastern",       coordinates: [-0.9833,  5.9167] },
  { name: "Kwahu Tafo",           region: "Eastern",       coordinates: [-0.7000,  6.5833] },
  { name: "Kukurantumi",          region: "Eastern",       coordinates: [-0.3667,  6.2833] },
  { name: "Bunso",                region: "Eastern",       coordinates: [-0.4500,  6.3167] },
  { name: "Begoro",               region: "Eastern",       coordinates: [-0.3833,  6.3833] },

  // ── VOLTA ──────────────────────────────────────────────────────
  { name: "Ho",                   region: "Volta",         coordinates: [ 0.4718,  6.6011] },
  { name: "Hohoe",                region: "Volta",         coordinates: [ 0.4667,  7.1500] },
  { name: "Keta",                 region: "Volta",         coordinates: [ 1.0000,  5.9167] },
  { name: "Kpando",               region: "Volta",         coordinates: [ 0.3000,  6.9833] },
  { name: "Aflao",                region: "Volta",         coordinates: [ 1.1833,  6.1000] },
  { name: "Sogakope",             region: "Volta",         coordinates: [ 0.6333,  5.8833] },
  { name: "Denu",                 region: "Volta",         coordinates: [ 1.1167,  6.0667] },
  { name: "Anloga",               region: "Volta",         coordinates: [ 0.9000,  5.7833] },
  { name: "Amedzofe",             region: "Volta",         coordinates: [ 0.4167,  6.8667] },
  { name: "Jasikan",              region: "Volta",         coordinates: [ 0.4667,  7.4167] },
  { name: "Kadjebi",              region: "Volta",         coordinates: [ 0.5333,  7.5333] },
  { name: "Dzodze",               region: "Volta",         coordinates: [ 0.8833,  6.1000] },
  { name: "Abor",                 region: "Volta",         coordinates: [ 0.5000,  6.8333] },
  { name: "Akatsi",               region: "Volta",         coordinates: [ 0.8167,  6.1167] },
  { name: "Adidome",              region: "Volta",         coordinates: [ 0.5500,  6.1000] },

  // ── OTI ────────────────────────────────────────────────────────
  { name: "Dambai",               region: "Oti",           coordinates: [ 0.1667,  8.0667] },
  { name: "Kadjebi",              region: "Oti",           coordinates: [ 0.5333,  7.5333] },
  { name: "Nkwanta",              region: "Oti",           coordinates: [ 0.5000,  8.4333] },
  { name: "Worawora",             region: "Oti",           coordinates: [ 0.4167,  7.7667] },
  { name: "Jasikan",              region: "Oti",           coordinates: [ 0.4667,  7.4167] },
  { name: "Buya",                 region: "Oti",           coordinates: [ 0.3500,  8.0833] },
  { name: "Kpassa",               region: "Oti",           coordinates: [ 0.5000,  8.3333] },
  { name: "Brewaniase",           region: "Oti",           coordinates: [ 0.3167,  8.2000] },
  { name: "Chinderi",             region: "Oti",           coordinates: [ 0.3500,  7.9833] },
  { name: "Biakoye",              region: "Oti",           coordinates: [ 0.4500,  7.6000] },
  { name: "Guan",                 region: "Oti",           coordinates: [ 0.4000,  7.8333] },
  { name: "Likpe Mate",           region: "Oti",           coordinates: [ 0.5667,  7.1833] },
  { name: "Krachi",               region: "Oti",           coordinates: [ 0.0833,  7.8000] },
  { name: "Asato",                region: "Oti",           coordinates: [ 0.2667,  8.0167] },
  { name: "Kete Krachi",          region: "Oti",           coordinates: [ 0.0500,  7.8000] },

  // ── BONO ───────────────────────────────────────────────────────
  { name: "Sunyani",              region: "Bono",          coordinates: [-2.3266,  7.3408] },
  { name: "Berekum",              region: "Bono",          coordinates: [-2.5833,  7.4500] },
  { name: "Dormaa Ahenkro",       region: "Bono",          coordinates: [-2.8500,  7.3000] },
  { name: "Techiman",             region: "Bono",          coordinates: [-1.9333,  7.5833] },
  { name: "Wenchi",               region: "Bono",          coordinates: [-2.1000,  7.7500] },
  { name: "Nkoranza",             region: "Bono",          coordinates: [-1.7167,  7.5500] },
  { name: "Kintampo",             region: "Bono",          coordinates: [-1.7333,  8.0500] },
  { name: "Atebubu",              region: "Bono",          coordinates: [-0.9833,  7.7500] },
  { name: "Jaman South",          region: "Bono",          coordinates: [-2.7333,  7.5167] },
  { name: "Tain",                 region: "Bono",          coordinates: [-2.5500,  7.7500] },
  { name: "Sampa",                region: "Bono",          coordinates: [-2.6833,  7.9667] },
  { name: "Nafkpayili",           region: "Bono",          coordinates: [-2.2500,  7.5500] },
  { name: "Drobo",                region: "Bono",          coordinates: [-2.6833,  7.3500] },
  { name: "Banda Ahenkro",        region: "Bono",          coordinates: [-2.3667,  7.8667] },
  { name: "Nsawkaw",              region: "Bono",          coordinates: [-2.4000,  7.7833] },

  // ── BONO EAST ──────────────────────────────────────────────────
  { name: "Techiman",             region: "Bono East",     coordinates: [-1.9333,  7.5833] },
  { name: "Kintampo",             region: "Bono East",     coordinates: [-1.7333,  8.0500] },
  { name: "Atebubu",              region: "Bono East",     coordinates: [-0.9833,  7.7500] },
  { name: "Nkoranza",             region: "Bono East",     coordinates: [-1.7167,  7.5500] },
  { name: "Yeji",                 region: "Bono East",     coordinates: [-0.6333,  8.2000] },
  { name: "Prang",                region: "Bono East",     coordinates: [-1.3500,  8.1000] },
  { name: "Buipe",                region: "Bono East",     coordinates: [-1.5833,  8.4167] },
  { name: "Jema",                 region: "Bono East",     coordinates: [-1.5833,  7.7667] },
  { name: "Sekyere Afram Plains", region: "Bono East",     coordinates: [-1.0500,  7.4167] },
  { name: "Techiman North",       region: "Bono East",     coordinates: [-1.9167,  7.7000] },
  { name: "Amantin",              region: "Bono East",     coordinates: [-1.5000,  7.7500] },
  { name: "Sene West",            region: "Bono East",     coordinates: [-0.6000,  7.8333] },
  { name: "Abease",               region: "Bono East",     coordinates: [-1.3000,  7.6333] },
  { name: "Krabonso",             region: "Bono East",     coordinates: [-1.0833,  8.0333] },
  { name: "Asutifi",              region: "Bono East",     coordinates: [-2.2833,  6.9333] },

  // ── AHAFO ──────────────────────────────────────────────────────
  { name: "Goaso",                region: "Ahafo",         coordinates: [-2.5167,  6.8000] },
  { name: "Kukuom",               region: "Ahafo",         coordinates: [-2.5667,  7.0167] },
  { name: "Hwidiem",              region: "Ahafo",         coordinates: [-2.5000,  7.0000] },
  { name: "Kenyasi",              region: "Ahafo",         coordinates: [-2.3333,  6.9833] },
  { name: "Acherensua",           region: "Ahafo",         coordinates: [-2.3833,  7.1500] },
  { name: "Duayaw Nkwanta",       region: "Ahafo",         coordinates: [-2.1000,  7.1000] },
  { name: "Bechem",               region: "Ahafo",         coordinates: [-2.1167,  7.2333] },
  { name: "Mim",                  region: "Ahafo",         coordinates: [-2.4333,  7.1500] },
  { name: "Tepa",                 region: "Ahafo",         coordinates: [-2.1000,  7.0500] },
  { name: "Sankore",              region: "Ahafo",         coordinates: [-2.4667,  7.2333] },
  { name: "Gambia",               region: "Ahafo",         coordinates: [-2.5833,  6.9000] },
  { name: "Asunafo North",        region: "Ahafo",         coordinates: [-2.6000,  6.8500] },
  { name: "Asunafo South",        region: "Ahafo",         coordinates: [-2.4833,  6.7333] },
  { name: "Asutifi North",        region: "Ahafo",         coordinates: [-2.3500,  7.0500] },
  { name: "Asutifi South",        region: "Ahafo",         coordinates: [-2.2167,  6.9000] },

  // ── NORTHERN ───────────────────────────────────────────────────
  { name: "Tamale",               region: "Northern",      coordinates: [-0.8393,  9.4008] },
  { name: "Yendi",                region: "Northern",      coordinates: [-0.0083,  9.4333] },
  { name: "Sagnarigu",            region: "Northern",      coordinates: [-0.8667,  9.4333] },
  { name: "Savelugu",             region: "Northern",      coordinates: [-0.8333,  9.6167] },
  { name: "Damongo",              region: "Northern",      coordinates: [-1.8167,  9.0833] },
  { name: "Tolon",                region: "Northern",      coordinates: [-1.0833,  9.4333] },
  { name: "Kumbungu",             region: "Northern",      coordinates: [-0.9500,  9.5167] },
  { name: "Gushegu",              region: "Northern",      coordinates: [-0.1667,  9.8833] },
  { name: "Karaga",               region: "Northern",      coordinates: [-0.5000,  9.8167] },
  { name: "Tatale",               region: "Northern",      coordinates: [ 0.0167, 10.0500] },
  { name: "Sang",                 region: "Northern",      coordinates: [-0.3833, 10.0500] },
  { name: "Zabzugu",              region: "Northern",      coordinates: [ 0.3500,  9.8833] },
  { name: "Bimbilla",             region: "Northern",      coordinates: [ 0.0833,  9.1167] },
  { name: "Nakpayili",            region: "Northern",      coordinates: [-0.8000,  9.7500] },
  { name: "Lungni",               region: "Northern",      coordinates: [-1.1833,  9.5167] },

  // ── NORTH EAST ─────────────────────────────────────────────────
  { name: "Nalerigu",             region: "North East",    coordinates: [-0.3667, 10.5167] },
  { name: "Gambaga",              region: "North East",    coordinates: [-0.4333, 10.5333] },
  { name: "Walewale",             region: "North East",    coordinates: [-0.7833, 10.3500] },
  { name: "Chereponi",            region: "North East",    coordinates: [ 0.2333, 10.1500] },
  { name: "Bunkpurugu",           region: "North East",    coordinates: [ 0.1000, 10.5333] },
  { name: "Yunyoo",               region: "North East",    coordinates: [ 0.2500, 10.6167] },
  { name: "Pusiga",               region: "North East",    coordinates: [-0.0333, 10.9167] },
  { name: "Garu",                 region: "North East",    coordinates: [-0.1500, 10.8000] },
  { name: "Tempane",              region: "North East",    coordinates: [-0.0167, 10.7500] },
  { name: "Nakpayili",            region: "North East",    coordinates: [-0.8000,  9.7500] },
  { name: "Wungu",                region: "North East",    coordinates: [-0.4333, 10.3000] },
  { name: "Kubori",               region: "North East",    coordinates: [-0.5167, 10.4167] },
  { name: "Langbensi",            region: "North East",    coordinates: [-0.4667, 10.4833] },
  { name: "Kpasenkpe",            region: "North East",    coordinates: [-0.7333, 10.4500] },
  { name: "Najong",               region: "North East",    coordinates: [-0.3500, 10.6833] },

  // ── SAVANNAH ───────────────────────────────────────────────────
  { name: "Damongo",              region: "Savannah",      coordinates: [-1.8167,  9.0833] },
  { name: "Sawla",                region: "Savannah",      coordinates: [-2.4167,  9.3000] },
  { name: "Bole",                 region: "Savannah",      coordinates: [-2.4833,  9.0333] },
  { name: "Tuna",                 region: "Savannah",      coordinates: [-2.0333,  9.4833] },
  { name: "Larabanga",            region: "Savannah",      coordinates: [-1.8500,  9.2333] },
  { name: "Buipe",                region: "Savannah",      coordinates: [-1.5833,  8.4167] },
  { name: "Yapei",                region: "Savannah",      coordinates: [-1.5833,  9.1667] },
  { name: "Bamboi",               region: "Savannah",      coordinates: [-2.0500,  8.1500] },
  { name: "Tinga",                region: "Savannah",      coordinates: [-1.6167,  9.1667] },
  { name: "Tolon",                region: "Savannah",      coordinates: [-1.0833,  9.4333] },
  { name: "Daboya",               region: "Savannah",      coordinates: [-1.3667,  9.5000] },
  { name: "Kulkperi",             region: "Savannah",      coordinates: [-2.1667,  9.3833] },
  { name: "Busunu",               region: "Savannah",      coordinates: [-1.6667,  9.2333] },
  { name: "Murugu",               region: "Savannah",      coordinates: [-1.7833,  9.4833] },
  { name: "Kulmasa",              region: "Savannah",      coordinates: [-2.3500,  9.1500] },

  // ── UPPER EAST ─────────────────────────────────────────────────
  { name: "Bolgatanga",           region: "Upper East",    coordinates: [-0.8500, 10.7833] },
  { name: "Navrongo",             region: "Upper East",    coordinates: [-1.0833, 10.8833] },
  { name: "Bawku",                region: "Upper East",    coordinates: [-0.2333, 11.0600] },
  { name: "Zebilla",              region: "Upper East",    coordinates: [-0.5167, 10.8833] },
  { name: "Paga",                 region: "Upper East",    coordinates: [-1.1167, 10.9833] },
  { name: "Bongo",                region: "Upper East",    coordinates: [-0.8167, 10.9000] },
  { name: "Sandema",              region: "Upper East",    coordinates: [-1.1500, 10.7333] },
  { name: "Tongo",                region: "Upper East",    coordinates: [-0.8000, 10.8167] },
  { name: "Zuarungu",             region: "Upper East",    coordinates: [-0.8000, 10.8333] },
  { name: "Chuchuliga",           region: "Upper East",    coordinates: [-0.1500, 10.9167] },
  { name: "Garu",                 region: "Upper East",    coordinates: [-0.1500, 10.8000] },
  { name: "Tempane",              region: "Upper East",    coordinates: [-0.0167, 10.7500] },
  { name: "Binduri",              region: "Upper East",    coordinates: [-0.3667, 10.9833] },
  { name: "Missiga",              region: "Upper East",    coordinates: [-0.4167, 11.0167] },
  { name: "Wiaga",                region: "Upper East",    coordinates: [-1.1833, 10.6333] },

  // ── UPPER WEST ─────────────────────────────────────────────────
  { name: "Wa",                   region: "Upper West",    coordinates: [-2.5000, 10.0667] },
  { name: "Lawra",                region: "Upper West",    coordinates: [-2.9000, 10.6333] },
  { name: "Tumu",                 region: "Upper West",    coordinates: [-1.9833, 10.9000] },
  { name: "Nandom",               region: "Upper West",    coordinates: [-2.9000, 10.8667] },
  { name: "Jirapa",               region: "Upper West",    coordinates: [-2.7667, 10.5333] },
  { name: "Gwolu",                region: "Upper West",    coordinates: [-2.5167, 10.4833] },
  { name: "Han",                  region: "Upper West",    coordinates: [-2.5833, 10.3167] },
  { name: "Wechiau",              region: "Upper West",    coordinates: [-2.7333, 10.0833] },
  { name: "Funsi",                region: "Upper West",    coordinates: [-2.2833, 10.5500] },
  { name: "Kaleo",                region: "Upper West",    coordinates: [-2.4167, 10.3167] },
  { name: "Daffiama",             region: "Upper West",    coordinates: [-2.6667, 10.3167] },
  { name: "Issa",                 region: "Upper West",    coordinates: [-2.3000, 10.3667] },
  { name: "Bulenga",              region: "Upper West",    coordinates: [-2.4333, 10.1833] },
  { name: "Nadowli",              region: "Upper West",    coordinates: [-2.7667, 10.4000] },
  { name: "Lambussie",            region: "Upper West",    coordinates: [-2.9500, 10.7167] },

];

const PROPERTY_TYPES = [
  { label: "All Types",  value: "" },
  { label: "For Rent",   value: "rent" },
  { label: "For Sale",   value: "sale" },
  { label: "Short Stay", value: "shortStay" },
  { label: "Land",       value: "land" },
] as const;

const BUDGET_OPTIONS = [
  { label: "Any Budget",             min: "",      max: ""      },
  { label: "Under GHS 2,000/mo",     min: "",      max: "2000"  },
  { label: "GHS 2,000 – 5,000/mo",   min: "2000",  max: "5000"  },
  { label: "GHS 5,000 – 10,000/mo",  min: "5000",  max: "10000" },
  { label: "GHS 10,000 – 20,000/mo", min: "10000", max: "20000" },
  { label: "GHS 20,000+/mo",         min: "20000", max: ""      },
] as const;

const AVATAR_SEEDS = ["AK", "MO", "EF"];
const AVATAR_COLORS = ["#C2410C", "#0284C7", "#16A34A"];

/* ─────────────────────────────────────────────
   AVATAR STACK
───────────────────────────────────────────── */
function AvatarStack() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex -space-x-2">
        {AVATAR_SEEDS.map((s, i) => (
          <span
            key={s}
            className="inline-flex w-7 h-7 rounded-full ring-2 ring-white items-center justify-center text-[10px] font-bold text-white select-none"
            style={{ backgroundColor: AVATAR_COLORS[i], zIndex: 3 - i }}
          >
            {s}
          </span>
        ))}
      </div>
      <p className="text-[13px] text-gray-500">
        Join{" "}
        <span className="font-semibold text-gray-800">200+</span>{" "}
        people finding homes on AskDerek
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   LOCATION AUTOCOMPLETE
───────────────────────────────────────────── */
function LocationInput({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (loc: LocationSuggestion) => void;
}) {
  const [open, setOpen]       = useState(false);
  const [active, setActive]   = useState(-1);
  const containerRef          = useRef<HTMLDivElement>(null);
  const inputRef              = useRef<HTMLInputElement>(null);

  const suggestions =
    value.trim().length === 0
      ? GHANA_LOCATIONS.slice(0, 6)
      : GHANA_LOCATIONS.filter((l) =>
          l.name.toLowerCase().includes(value.toLowerCase()) ||
          l.region.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 6);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, suggestions.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === "Enter" && active >= 0) {
      e.stopPropagation();
      const loc = suggestions[active];
      onChange(loc.name);
      onSelect(loc);
      setOpen(false);
      setActive(-1);
    }
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative h-full flex items-center gap-2.5 px-4">
      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-gray-400 leading-none mb-0.5 uppercase tracking-wide">
          Location
        </p>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Accra, Kumasi…"
          className="w-full bg-transparent text-[13px] font-medium text-gray-800 placeholder:text-gray-400 outline-none truncate"
          aria-label="Location"
          autoComplete="off"
        />
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute top-[calc(100%+6px)] left-0 w-72 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-[200]">
          {suggestions.map((loc, i) => (
            <button
              key={loc.name}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(loc.name);
                onSelect(loc);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
                i === active ? "bg-orange-50" : "hover:bg-gray-50"
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-[13px] font-semibold text-gray-800 leading-tight">{loc.name}</p>
                <p className="text-[11px] text-gray-400 leading-tight">{loc.region}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   CUSTOM SELECT
───────────────────────────────────────────── */
function SelectField<T extends { label: string }>({
  label,
  icon,
  options,
  selectedIndex,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  options: readonly T[];
  selectedIndex: number;
  onChange: (i: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative h-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-full w-full flex items-center gap-2.5 px-4 transition-colors hover:bg-gray-50/60"
      >
        <span className="text-gray-400 flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[10px] font-semibold text-gray-400 leading-none mb-0.5 uppercase tracking-wide">
            {label}
          </p>
          <p className={`text-[13px] font-medium truncate ${selectedIndex === 0 ? "text-gray-400" : "text-gray-800"}`}>
            {options[selectedIndex].label}
          </p>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-[calc(100%+6px)] left-0 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-[200]">
          {options.map((opt, i) => (
            <button
              key={opt.label}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange(i); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-[13px] font-medium transition-colors ${
                i === selectedIndex
                  ? "text-orange-600 bg-orange-50"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   BUDGET ICON
───────────────────────────────────────────── */
function BudgetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M8 4.5V5.5M8 10.5V11.5M5.5 7.5C5.5 6.4 6.6 5.5 8 5.5C9.4 5.5 10.5 6.4 10.5 7.5C10.5 8.6 9.4 9.5 8 9.5C6.6 9.5 5.5 10.4 5.5 11.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   HOME ICON
───────────────────────────────────────────── */
function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M2 7L8 2L14 7V14H10V10H6V14H2V7Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   HERO SECTION — main export
───────────────────────────────────────────── */
export default function HeroSection() {
  const router = useRouter();

  const [locationText,     setLocationText]     = useState("");
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>(null);
  const [budgetIndex,      setBudgetIndex]      = useState(0);
  const [typeIndex,        setTypeIndex]        = useState(0);

  const handleSearch = useCallback(() => {
    const params = new URLSearchParams();

    if (selectedLocation) {
      params.set("location", selectedLocation.name);
      params.set(
        "coordinates",
        `${selectedLocation.coordinates[0]},${selectedLocation.coordinates[1]}`
      );
    } else if (locationText.trim()) {
      params.set("location", locationText.trim());
    }

    const budget = BUDGET_OPTIONS[budgetIndex];
    if (budget.min) params.set("priceMin", budget.min);
    if (budget.max) params.set("priceMax", budget.max);

    const pType = PROPERTY_TYPES[typeIndex];
    if (pType.value) params.set("type", pType.value);

    router.push(`/search?${params.toString()}`);
  }, [router, selectedLocation, locationText, budgetIndex, typeIndex]);

  return (
    <section
      className="relative w-full flex flex-col items-center justify-center px-4 text-center overflow-visible"
      style={{ paddingTop: "120px", paddingBottom: "80px" }}
    >
      {/* Warm gradient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: "linear-gradient(160deg, #fff9f6 0%, #ffffff 55%)",
        }}
      />
      {/* Dot grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage: "radial-gradient(circle, #C2410C 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          opacity: 0.04,
        }}
      />

      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-50 border border-orange-100 mb-5 select-none">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
        <span className="text-[12px] font-semibold text-orange-700 tracking-wide">
          Ghana&apos;s Trusted Real Estate Platform
        </span>
      </div>

      {/* Headline */}
      <h1 className="text-[36px] sm:text-[46px] md:text-[54px] font-extrabold text-gray-900 leading-[1.1] tracking-tight max-w-[680px] mb-4">
        Discover Homes in Ghana
        <br />
        <span className="text-orange-600">That Fit Your Budget</span>
      </h1>

      {/* Subheadline */}
      <p className="text-[15px] sm:text-[16px] text-gray-500 font-medium mb-9 max-w-sm">
        Verified listings&nbsp;&middot;&nbsp;Direct owners&nbsp;&middot;&nbsp;No stress
      </p>

      {/* ── SEARCH BAR ── */}
      <div
        className="
          w-full max-w-[760px]
          bg-white rounded-2xl
          border border-gray-200
          shadow-[0_4px_40px_rgba(0,0,0,0.08)]
          overflow-visible
        "
        role="search"
        aria-label="Property search"
      >
        {/* Desktop: single row */}
        <div className="hidden sm:flex items-stretch divide-x divide-gray-100 min-h-[64px]">

          {/* Location */}
          <div className="flex-[1.5] min-w-0">
            <LocationInput
              value={locationText}
              onChange={(v) => { setLocationText(v); setSelectedLocation(null); }}
              onSelect={(loc) => { setSelectedLocation(loc); setLocationText(loc.name); }}
            />
          </div>

          {/* Budget */}
          <div className="flex-1 min-w-0">
            <SelectField
              label="Budget"
              icon={<BudgetIcon />}
              options={BUDGET_OPTIONS}
              selectedIndex={budgetIndex}
              onChange={setBudgetIndex}
            />
          </div>

          {/* Property Type */}
          <div className="flex-1 min-w-0">
            <SelectField
              label="Property Type"
              icon={<HomeIcon />}
              options={PROPERTY_TYPES}
              selectedIndex={typeIndex}
              onChange={setTypeIndex}
            />
          </div>

          {/* CTA */}
          <div className="flex items-center px-2 py-2">
            <button
              type="button"
              onClick={handleSearch}
              className="
                flex items-center gap-2
                h-full px-5
                bg-orange-600 hover:bg-orange-700 active:bg-orange-800
                text-white text-[13px] font-bold
                rounded-xl
                shadow-sm shadow-orange-200
                transition-all duration-150
                hover:shadow-md hover:shadow-orange-200/70
                hover:-translate-y-px active:translate-y-0
                whitespace-nowrap
              "
            >
              <Search className="w-4 h-4 stroke-[2.5]" />
              Search Properties
            </button>
          </div>
        </div>

        {/* Mobile: stacked */}
        <div className="flex flex-col sm:hidden divide-y divide-gray-100">
          <div className="py-2 px-4 flex items-center gap-2.5">
            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder="Where in Ghana?"
              className="flex-1 text-[14px] text-gray-800 placeholder:text-gray-400 outline-none py-2"
            />
          </div>
          <div className="py-2 px-4">
            <select
              value={budgetIndex}
              onChange={(e) => setBudgetIndex(Number(e.target.value))}
              className="w-full text-[14px] text-gray-700 bg-transparent outline-none py-2"
            >
              {BUDGET_OPTIONS.map((b, i) => (
                <option key={b.label} value={i}>{b.label}</option>
              ))}
            </select>
          </div>
          <div className="py-2 px-4">
            <select
              value={typeIndex}
              onChange={(e) => setTypeIndex(Number(e.target.value))}
              className="w-full text-[14px] text-gray-700 bg-transparent outline-none py-2"
            >
              {PROPERTY_TYPES.map((t, i) => (
                <option key={t.label} value={i}>{t.label}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className="
              flex items-center justify-center gap-2 m-2
              h-12 bg-orange-600 hover:bg-orange-700
              text-white text-[14px] font-bold
              rounded-xl transition-colors
            "
          >
            <Search className="w-4 h-4" />
            Search Properties
          </button>
        </div>
      </div>

      {/* Social proof */}
      <div className="mt-7">
        <AvatarStack />
      </div>
    </section>
  );
}