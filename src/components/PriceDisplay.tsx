import React from "react";

interface PriceDisplayProps {
  listingType:   string;
  pricePerMonth: number;
  askingPrice?:  number | null;
  className?:    string;
  size?:         "sm" | "md" | "lg";
}

const formatGHS = (amount: number): string =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 0 }).format(amount);

const getSuffix = (listingType: string): string => {
  switch (listingType) {
    case "FOR_RENT":   return " / month";
    case "SHORT_STAY": return " / night";
    case "HOSTEL":     return " / semester";
    case "OFFICE":     return " / month";
    default:           return "";
  }
};

const getAmount = (listingType: string, pricePerMonth: number, askingPrice?: number | null): number => {
  if (listingType === "FOR_SALE" || listingType === "LAND") return askingPrice ?? pricePerMonth;
  return pricePerMonth;
};

const SIZE_CLASS: Record<string, string> = { sm: "text-[13px]", md: "text-[16px]", lg: "text-[20px]" };

const PriceDisplay = ({ listingType, pricePerMonth, askingPrice, className = "", size = "md" }: PriceDisplayProps) => {
  const amount = getAmount(listingType, pricePerMonth, askingPrice);
  const suffix = getSuffix(listingType);
  return (
    <p className={`font-extrabold text-orange-600 ${SIZE_CLASS[size]} ${className}`}>
      {formatGHS(amount)}
      {suffix && <span className="text-[0.75em] font-semibold text-orange-400">{suffix}</span>}
    </p>
  );
};

export default PriceDisplay;
