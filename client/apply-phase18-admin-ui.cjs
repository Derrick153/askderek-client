const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "src", "app", "(admin)", "admin", "payments", "page.tsx");
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

// 1. Import
if (raw.includes("import RecordCashPaymentModal from \"@/components/RecordCashPaymentModal\";")) {
  console.log("1. Import - already present, skipping.");
} else {
  const importNeedle = [
    "import PaymentHistoryTable from \"@/components/PaymentHistoryTable\";",
    "import PaymentLoader       from \"@/components/PaymentLoader\";",
    "import PaymentStatusBadge  from \"@/components/PaymentStatusBadge\";",
  ];
  const importAt = findSeq(lines, importNeedle);
  if (importAt === -1) throw new Error("Import anchor not found. Aborting - no further changes written this run.");
  lines.splice(importAt + importNeedle.length, 0,
    "import RecordCashPaymentModal from \"@/components/RecordCashPaymentModal\";"
  );
  changed = true;
  console.log("1. Import - added.");
}

// 2. State
if (raw.includes("isCashModalOpen")) {
  console.log("2. State - already present, skipping.");
} else {
  const stateNeedle = [
    "  const { user }                      = useUser();",
    "  const [page,         setPage]       = useState(1);",
    "  const [statusFilter, setStatusFilter] = useState(\"\");",
  ];
  const stateAt = findSeq(lines, stateNeedle);
  if (stateAt === -1) throw new Error("State anchor not found. Aborting - no further changes written this run.");
  lines.splice(stateAt + stateNeedle.length, 0,
    "  const [isCashModalOpen, setIsCashModalOpen] = useState(false);"
  );
  changed = true;
  console.log("2. State - added.");
}

// 3. Header button
if (raw.includes("Record Cash Payment")) {
  console.log("3. Header button - already present, skipping.");
} else {
  const headerNeedle = [
    "        <div>",
    "          <h1 className=\"text-2xl font-bold text-gray-900\">",
    "            Payment Control Panel",
    "          </h1>",
    "          <p className=\"text-sm text-gray-500 mt-0.5\">",
    "            Platform-wide revenue, commissions, and transaction history",
    "          </p>",
    "        </div>",
  ];
  const headerAt = findSeq(lines, headerNeedle);
  if (headerAt === -1) throw new Error("Header anchor not found. Aborting - no further changes written this run.");
  const headerReplacement = [
    "        <div className=\"flex items-center justify-between flex-wrap gap-3\">",
    "          <div>",
    "            <h1 className=\"text-2xl font-bold text-gray-900\">",
    "              Payment Control Panel",
    "            </h1>",
    "            <p className=\"text-sm text-gray-500 mt-0.5\">",
    "              Platform-wide revenue, commissions, and transaction history",
    "            </p>",
    "          </div>",
    "          <button",
    "            onClick={() => setIsCashModalOpen(true)}",
    "            className=\"flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors\"",
    "          >",
    "            <Banknote className=\"w-4 h-4\" />",
    "            Record Cash Payment",
    "          </button>",
    "        </div>",
  ];
  lines.splice(headerAt, headerNeedle.length, ...headerReplacement);
  changed = true;
  console.log("3. Header button - added.");
}

// 4. Modal render
if (raw.includes("<RecordCashPaymentModal")) {
  console.log("4. Modal render - already present, skipping.");
} else {
  const endNeedle = [
    "      </div>",
    "    </div>",
    "  );",
    "}",
  ];
  const endAt = findSeq(lines, endNeedle);
  if (endAt === -1) throw new Error("End-of-file anchor not found. Aborting - no further changes written this run.");
  lines.splice(endAt + 1, 0,
    "      <RecordCashPaymentModal",
    "        isOpen={isCashModalOpen}",
    "        onClose={() => setIsCashModalOpen(false)}",
    "        onConfirm={async (data) => {",
    "          await recordCash({ ...data, adminClerkId: user?.id ?? \"\" }).unwrap();",
    "        }}",
    "      />"
  );
  changed = true;
  console.log("4. Modal render - added.");
}

if (changed) {
  fs.writeFileSync(filePath, lines.join(eol), "utf8");
  console.log("page.tsx saved.");
} else {
  console.log("Nothing to do - already fully wired.");
}
