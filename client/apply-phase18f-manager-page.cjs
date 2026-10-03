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

// 1. Import hook
if (raw.includes("useGetManagerReceiptsQuery")) {
  console.log("1. Import - already present, skipping.");
} else {
  const needle = [
    "import {",
    "  useGetLandlordEarningsQuery,",
    "} from \"@/state/api\";",
  ];
  const at = findSeq(lines, needle);
  if (at === -1) throw new Error("Import anchor not found. Aborting - no changes written this run.");
  lines.splice(at + 2, 0, "  useGetManagerReceiptsQuery,");
  changed = true;
  console.log("1. Import - added.");
}

// 2. Mapper function
if (raw.includes("mapReceiptsToPayments")) {
  console.log("2. Mapper function - already present, skipping.");
} else {
  const needle = [
    "function extractSummary(raw: unknown): EarningsSummary | null {",
    "  if (!raw) return null;",
    "  const r = raw as Record<string, unknown>;",
    "  if (r.summary && typeof r.summary === \"object\") return r.summary as EarningsSummary;",
    "  if (r.totalEarned !== undefined) return r as EarningsSummary;",
    "  return null;",
    "}",
  ];
  const at = findSeq(lines, needle);
  if (at === -1) throw new Error("extractSummary anchor not found. Aborting - no further changes written this run.");
  lines.splice(at + needle.length, 0,
    "",
    "/**",
    " * Map enriched Receipt objects (Phase F) into the Payment shape",
    " * PaymentHistoryTable already knows how to render.",
    " */",
    "function mapReceiptsToPayments(receipts: any[]): EarningsPayment[] {",
    "  return receipts.map((r, i) => ({",
    "    id:                i,",
    "    amountDue:         r.amountPaid ?? 0,",
    "    amountPaid:        r.amountPaid ?? 0,",
    "    dueDate:           r.payment?.dueDate ?? r.paymentDate,",
    "    paymentDate:       r.paymentDate,",
    "    paymentStatus:     \"Paid\",",
    "    paystackReference: r.reference,",
    "    lease: {",
    "      property: {",
    "        name:     r.property?.name ?? \"\\u2014\",",
    "        location: { city: r.property?.city ?? \"\" },",
    "      },",
    "    },",
    "  }));",
    "}"
  );
  changed = true;
  console.log("2. Mapper function - added.");
}

// 3. Hook call + memo
if (raw.includes("receiptsRaw")) {
  console.log("3. Hook call - already present, skipping.");
} else {
  const needle = [
    "  } = useGetLandlordEarningsQuery(user?.id ?? \"\", {",
    "    skip: !user?.id,",
    "  });",
  ];
  const at = findSeq(lines, needle);
  if (at === -1) throw new Error("Hook-call anchor not found. Aborting - no further changes written this run.");
  lines.splice(at + needle.length, 0,
    "",
    "  const {",
    "    data:      receiptsRaw,",
    "    isLoading: receiptsLoading,",
    "  } = useGetManagerReceiptsQuery(user?.id ?? \"\", {",
    "    skip: !user?.id,",
    "  });",
    "",
    "  const receiptPayments = useMemo(",
    "    () => mapReceiptsToPayments(Array.isArray(receiptsRaw) ? receiptsRaw : []),",
    "    [receiptsRaw]",
    "  );"
  );
  changed = true;
  console.log("3. Hook call - added.");
}

// 4. Receipts table section
if (raw.includes("{/* Receipts section - Phase F */}")) {
  console.log("4. Receipts section - already present, skipping.");
} else {
  const endNeedle = [
    "      </div>",
    "    </div>",
    "  );",
    "}",
  ];
  const endAt = findSeq(lines, endNeedle);
  if (endAt === -1) throw new Error("End-of-file anchor not found. Aborting - no further changes written this run.");
  lines.splice(endAt, 0,
    "        {/* Receipts section - Phase F */}",
    "        <div>",
    "          <div className=\"flex items-center justify-between mb-4\">",
    "            <h2 className=\"text-base font-bold text-gray-900\">",
    "              Receipts",
    "              {receiptPayments.length > 0 && (",
    "                <span className=\"ml-2 text-sm font-normal text-gray-400\">",
    "                  ({receiptPayments.length} total)",
    "                </span>",
    "              )}",
    "            </h2>",
    "          </div>",
    "",
    "          {receiptsLoading ? (",
    "            <Skeleton className=\"h-32\" />",
    "          ) : receiptPayments.length === 0 ? (",
    "            <EmptyPayments />",
    "          ) : (",
    "            <PaymentHistoryTable",
    "              payments={receiptPayments as any}",
    "              onViewReceipt={handleViewReceipt}",
    "            />",
    "          )}",
    "        </div>",
    ""
  );
  changed = true;
  console.log("4. Receipts section - added.");
}

if (changed) {
  fs.writeFileSync(filePath, lines.join(eol), "utf8");
  console.log("managers/payments/page.tsx saved.");
} else {
  console.log("Nothing to do - already wired.");
}
