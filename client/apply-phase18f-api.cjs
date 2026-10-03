const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "src", "state", "api.ts");
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

// 1. Endpoint definition
if (raw.includes("getManagerReceipts:")) {
  console.log("1. Endpoint - already present, skipping.");
} else {
  const needle = [
    "    getTenantReceipts: build.query<PaymentReceipt[], string>({",
    "      query: (tenantClerkId) => `payments/receipts/${tenantClerkId}`,",
    "      providesTags: [\"Receipts\"],",
    "    }),",
  ];
  const at = findSeq(lines, needle);
  if (at === -1) throw new Error("Endpoint anchor not found. Aborting - no changes written this run.");
  lines.splice(at + needle.length, 0,
    "",
    "    getManagerReceipts: build.query<PaymentReceipt[], string>({",
    "      query: (managerClerkId) => `payments/manager-receipts/${managerClerkId}`,",
    "      providesTags: [\"Receipts\"],",
    "    }),"
  );
  changed = true;
  console.log("1. Endpoint - added.");
}

// 2. Export hook
if (raw.includes("useGetManagerReceiptsQuery")) {
  console.log("2. Export - already present, skipping.");
} else {
  const needle = [
    "  useGetTenantReceiptsQuery,",
  ];
  const at = findSeq(lines, needle);
  if (at === -1) throw new Error("Export anchor not found. Aborting - no further changes written this run.");
  lines.splice(at + needle.length, 0,
    "  useGetManagerReceiptsQuery,"
  );
  changed = true;
  console.log("2. Export - added.");
}

if (changed) {
  fs.writeFileSync(filePath, lines.join(eol), "utf8");
  console.log("api.ts saved.");
} else {
  console.log("Nothing to do - already wired.");
}
