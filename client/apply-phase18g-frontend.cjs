const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "src", "app", "payment", "receipt", "[reference]", "page.tsx");
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

// 1. Import getClerkToken
if (raw.includes("getClerkToken")) {
  console.log("1. Import - already present, skipping.");
} else {
  const needle = [
    "import ReceiptCard   from \"@/components/ReceiptCard\";",
    "import PaymentLoader from \"@/components/PaymentLoader\";",
  ];
  const at = findSeq(lines, needle);
  if (at === -1) throw new Error("Import anchor not found. Aborting - no changes written this run.");
  lines.splice(at + needle.length, 0,
    "import { getClerkToken } from \"@/lib/clerkTokenProvider\";"
  );
  changed = true;
  console.log("1. Import - added.");
}

// 2. handleDownloadPdf function
if (raw.includes("handleDownloadPdf")) {
  console.log("2. Download handler - already present, skipping.");
} else {
  const needle = ["  const handlePrint = () => window.print();"];
  const at = findSeq(lines, needle);
  if (at === -1) throw new Error("handlePrint anchor not found. Aborting - no further changes written this run.");
  lines.splice(at + needle.length, 0,
    "",
    "  const handleDownloadPdf = async () => {",
    "    const token = await getClerkToken();",
    "    const res = await fetch(",
    "      `${process.env.NEXT_PUBLIC_API_BASE_URL}/payments/receipt/${reference}/pdf`,",
    "      { headers: token ? { Authorization: `Bearer ${token}` } : {} }",
    "    );",
    "    if (!res.ok) return;",
    "    const blob = await res.blob();",
    "    const url  = window.URL.createObjectURL(blob);",
    "    const a    = document.createElement(\"a\");",
    "    a.href     = url;",
    "    a.download = `${reference}.pdf`;",
    "    document.body.appendChild(a);",
    "    a.click();",
    "    a.remove();",
    "    window.URL.revokeObjectURL(url);",
    "  };"
  );
  changed = true;
  console.log("2. Download handler - added.");
}

// 3. Button
if (raw.includes("handleDownloadPdf()")) {
  console.log("3. Download button - already present, skipping.");
} else {
  const needle = [
    "        <div className=\"grid grid-cols-2 gap-3 print:hidden\">",
    "          <button",
    "            onClick={handleWhatsApp}",
    "            className=\"flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-colors\"",
    "          >",
    "            <MessageCircle className=\"w-4 h-4\" />",
    "            WhatsApp",
    "          </button>",
    "          <button",
    "            onClick={handlePrint}",
    "            className=\"flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-colors\"",
    "          >",
    "            <Printer className=\"w-4 h-4\" />",
    "            Print / Save",
    "          </button>",
    "        </div>",
  ];
  const at = findSeq(lines, needle);
  if (at === -1) throw new Error("Button-block anchor not found. Aborting - no further changes written this run.");
  const replacement = [
    "        <div className=\"grid grid-cols-3 gap-3 print:hidden\">",
    "          <button",
    "            onClick={handleWhatsApp}",
    "            className=\"flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-colors\"",
    "          >",
    "            <MessageCircle className=\"w-4 h-4\" />",
    "            WhatsApp",
    "          </button>",
    "          <button",
    "            onClick={handleDownloadPdf}",
    "            className=\"flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl transition-colors\"",
    "          >",
    "            <Download className=\"w-4 h-4\" />",
    "            Download",
    "          </button>",
    "          <button",
    "            onClick={handlePrint}",
    "            className=\"flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-colors\"",
    "          >",
    "            <Printer className=\"w-4 h-4\" />",
    "            Print / Save",
    "          </button>",
    "        </div>",
  ];
  lines.splice(at, needle.length, ...replacement);
  changed = true;
  console.log("3. Download button - added.");
}

if (changed) {
  fs.writeFileSync(filePath, lines.join(eol), "utf8");
  console.log("receipt page.tsx saved.");
} else {
  console.log("Nothing to do - already wired.");
}
