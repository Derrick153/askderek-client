const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "src", "app", "(dashboard)", "managers", "payments", "page.tsx");
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

// 1. Use the real commission ledger instead of a flat 5% assumption
if (raw.includes("summary?.totalCommission")) {
  console.log("1. Commission calc - already fixed, skipping.");
} else {
  const needle = [
    "    const commission    = totalPaid * 0.05;",
    "    const netEarnings   = totalPaid * 0.95;",
  ];
  const at = findSeq(lines, needle);
  if (at === -1) throw new Error("Commission-calc anchor not found. Aborting - no changes written this run.");
  lines.splice(at, needle.length,
    "    // Use the real commission ledger when available - it correctly",
    "    // shows zero commission on payments (like cash) where none was",
    "    // ever actually charged, instead of assuming a flat 5% on everything.",
    "    const commission  = summary?.totalCommission != null ? Number(summary.totalCommission) : totalPaid * 0.05;",
    "    const netEarnings = summary?.totalNet         != null ? Number(summary.totalNet)        : totalPaid * 0.95;"
  );
  changed = true;
  console.log("1. Commission calc - fixed.");
}

// 2. Add summary to the metrics dependency array
if (raw.includes("}, [payments, summary]);")) {
  console.log("2. Dependency array - already fixed, skipping.");
} else {
  const needle = ["  }, [payments]);"];
  const at = findSeq(lines, needle);
  if (at === -1) throw new Error("Dependency-array anchor not found. Aborting - no further changes written this run.");
  lines[at] = "  }, [payments, summary]);";
  changed = true;
  console.log("2. Dependency array - fixed.");
}

if (changed) {
  fs.writeFileSync(filePath, lines.join(eol), "utf8");
  console.log("managers/payments/page.tsx saved.");
} else {
  console.log("Nothing to do - already fixed.");
}
