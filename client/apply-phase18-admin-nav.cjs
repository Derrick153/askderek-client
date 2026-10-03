const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "src", "app", "(admin)", "admin", "layout.tsx");
const raw = fs.readFileSync(filePath, "utf8");
const eol = raw.includes("\r\n") ? "\r\n" : "\n";
let lines = raw.split(/\r\n|\n/);
let changed = false;

const findSeq = (arr, needle) => {
  for (let i = 0; i <= arr.length - needle.length; i++) {
    let match = true;
    for (let j = 0; j < needle.length; j++) {
      if (arr[i + j] !== needle[j]) { match = false; break; }
    }
    if (match) return i;
  }
  return -1;
};

// 1. Import Banknote icon
if (raw.includes("Banknote")) {
  console.log("1. Banknote import - already present, skipping.");
} else {
  const importNeedle = [
    "  Ban,",
    "  ClipboardList,",
    "} from \"lucide-react\";",
  ];
  const importAt = findSeq(lines, importNeedle);
  if (importAt === -1) throw new Error("Icon import anchor not found. Aborting - no changes written this run.");
  lines.splice(importAt, 0, "  Banknote,");
  changed = true;
  console.log("1. Banknote import - added.");
}

// 2. Payments nav link
if (raw.includes("/admin/payments")) {
  console.log("2. Payments nav link - already present, skipping.");
} else {
  const linkNeedle = [
    "  { href: \"/admin/users\", label: \"Users\", icon: Users },",
  ];
  const linkAt = findSeq(lines, linkNeedle);
  if (linkAt === -1) throw new Error("Nav link anchor not found. Aborting - no further changes written this run.");
  lines.splice(linkAt + linkNeedle.length, 0,
    "  { href: \"/admin/payments\", label: \"Payments\", icon: Banknote },"
  );
  changed = true;
  console.log("2. Payments nav link - added.");
}

if (changed) {
  fs.writeFileSync(filePath, lines.join(eol), "utf8");
  console.log("admin layout.tsx saved.");
} else {
  console.log("Nothing to do - already wired.");
}
