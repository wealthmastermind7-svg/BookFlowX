export interface Currency {
  code: string;
  name: string;
  symbol: string;
  symbolPosition: "before" | "after";
  decimalSeparator: string;
  thousandSeparator: string;
  decimalPlaces: number;
}

export const CURRENCIES: Currency[] = [
  { code: "USD", name: "US Dollar", symbol: "$", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "EUR", name: "Euro", symbol: "\u20AC", symbolPosition: "before", decimalSeparator: ",", thousandSeparator: ".", decimalPlaces: 2 },
  { code: "GBP", name: "British Pound", symbol: "\u00A3", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: "'", decimalPlaces: 2 },
  { code: "JPY", name: "Japanese Yen", symbol: "\u00A5", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 0 },
  { code: "CNY", name: "Chinese Yuan", symbol: "\u00A5", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "INR", name: "Indian Rupee", symbol: "\u20B9", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "KRW", name: "South Korean Won", symbol: "\u20A9", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 0 },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", symbolPosition: "after", decimalSeparator: ",", thousandSeparator: " ", decimalPlaces: 2 },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", symbolPosition: "after", decimalSeparator: ",", thousandSeparator: " ", decimalPlaces: 2 },
  { code: "DKK", name: "Danish Krone", symbol: "kr", symbolPosition: "after", decimalSeparator: ",", thousandSeparator: ".", decimalPlaces: 2 },
  { code: "MXN", name: "Mexican Peso", symbol: "MX$", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", symbolPosition: "before", decimalSeparator: ",", thousandSeparator: ".", decimalPlaces: 2 },
  { code: "ARS", name: "Argentine Peso", symbol: "AR$", symbolPosition: "before", decimalSeparator: ",", thousandSeparator: ".", decimalPlaces: 2 },
  { code: "CLP", name: "Chilean Peso", symbol: "CLP$", symbolPosition: "before", decimalSeparator: ",", thousandSeparator: ".", decimalPlaces: 0 },
  { code: "COP", name: "Colombian Peso", symbol: "COP$", symbolPosition: "before", decimalSeparator: ",", thousandSeparator: ".", decimalPlaces: 0 },
  { code: "PEN", name: "Peruvian Sol", symbol: "S/", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "ZAR", name: "South African Rand", symbol: "R", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "NGN", name: "Nigerian Naira", symbol: "\u20A6", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "GH\u20B5", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "EGP", name: "Egyptian Pound", symbol: "E\u00A3", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "MAD", name: "Moroccan Dirham", symbol: "MAD", symbolPosition: "after", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "AED", name: "UAE Dirham", symbol: "AED", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "SAR", name: "Saudi Riyal", symbol: "SAR", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "QAR", name: "Qatari Riyal", symbol: "QAR", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "KD", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 3 },
  { code: "BHD", name: "Bahraini Dinar", symbol: "BD", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 3 },
  { code: "OMR", name: "Omani Rial", symbol: "OMR", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 3 },
  { code: "ILS", name: "Israeli Shekel", symbol: "\u20AA", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "TRY", name: "Turkish Lira", symbol: "\u20BA", symbolPosition: "before", decimalSeparator: ",", thousandSeparator: ".", decimalPlaces: 2 },
  { code: "PLN", name: "Polish Zloty", symbol: "z\u0142", symbolPosition: "after", decimalSeparator: ",", thousandSeparator: " ", decimalPlaces: 2 },
  { code: "CZK", name: "Czech Koruna", symbol: "K\u010D", symbolPosition: "after", decimalSeparator: ",", thousandSeparator: " ", decimalPlaces: 2 },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft", symbolPosition: "after", decimalSeparator: ",", thousandSeparator: " ", decimalPlaces: 0 },
  { code: "RON", name: "Romanian Leu", symbol: "lei", symbolPosition: "after", decimalSeparator: ",", thousandSeparator: ".", decimalPlaces: 2 },
  { code: "BGN", name: "Bulgarian Lev", symbol: "\u043B\u0432", symbolPosition: "after", decimalSeparator: ",", thousandSeparator: " ", decimalPlaces: 2 },
  { code: "RUB", name: "Russian Ruble", symbol: "\u20BD", symbolPosition: "after", decimalSeparator: ",", thousandSeparator: " ", decimalPlaces: 2 },
  { code: "UAH", name: "Ukrainian Hryvnia", symbol: "\u20B4", symbolPosition: "after", decimalSeparator: ",", thousandSeparator: " ", decimalPlaces: 2 },
  { code: "THB", name: "Thai Baht", symbol: "\u0E3F", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", symbolPosition: "before", decimalSeparator: ",", thousandSeparator: ".", decimalPlaces: 0 },
  { code: "PHP", name: "Philippine Peso", symbol: "\u20B1", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "VND", name: "Vietnamese Dong", symbol: "\u20AB", symbolPosition: "after", decimalSeparator: ",", thousandSeparator: ".", decimalPlaces: 0 },
  { code: "PKR", name: "Pakistani Rupee", symbol: "Rs", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "\u09F3", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "LKR", name: "Sri Lankan Rupee", symbol: "Rs", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "NPR", name: "Nepalese Rupee", symbol: "Rs", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "MMK", name: "Myanmar Kyat", symbol: "K", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 0 },
  { code: "TWD", name: "Taiwan Dollar", symbol: "NT$", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "XOF", name: "West African CFA", symbol: "CFA", symbolPosition: "after", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 0 },
  { code: "XAF", name: "Central African CFA", symbol: "FCFA", symbolPosition: "after", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 0 },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 0 },
  { code: "UGX", name: "Ugandan Shilling", symbol: "USh", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 0 },
  { code: "RWF", name: "Rwandan Franc", symbol: "FRw", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 0 },
  { code: "ETB", name: "Ethiopian Birr", symbol: "Br", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "XCD", name: "East Caribbean Dollar", symbol: "EC$", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "JMD", name: "Jamaican Dollar", symbol: "J$", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "TTD", name: "Trinidad Dollar", symbol: "TT$", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "BBD", name: "Barbadian Dollar", symbol: "Bds$", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "BSD", name: "Bahamian Dollar", symbol: "B$", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "KYD", name: "Cayman Islands Dollar", symbol: "CI$", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "FJD", name: "Fijian Dollar", symbol: "FJ$", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "PGK", name: "Papua New Guinean Kina", symbol: "K", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "WST", name: "Samoan Tala", symbol: "WS$", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "TOP", name: "Tongan Pa'anga", symbol: "T$", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
  { code: "VUV", name: "Vanuatu Vatu", symbol: "VT", symbolPosition: "after", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 0 },
  { code: "SBD", name: "Solomon Islands Dollar", symbol: "SI$", symbolPosition: "before", decimalSeparator: ".", thousandSeparator: ",", decimalPlaces: 2 },
];

export function getCurrency(code: string): Currency {
  return CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
}

// NOTE: Current implementation assumes prices are stored with 2 decimal places (cents).
// For currencies with different decimal precision (JPY=0, KWD=3), prices may display incorrectly.
// Future improvement: Store prices in currency-specific minor units and use decimalPlaces for conversion.

export function getCurrencySymbol(code: string): string {
  return getCurrency(code).symbol;
}

export function formatPrice(
  amount: number,
  currencyCode: string = "USD",
  options?: { showDecimals?: boolean; compact?: boolean }
): string {
  const currency = getCurrency(currencyCode);
  const { showDecimals = true, compact = false } = options || {};
  
  const useDecimals = showDecimals && currency.decimalPlaces > 0;
  const divisor = Math.pow(10, currency.decimalPlaces);
  const value = amount / divisor;
  
  let formattedValue: string;
  if (compact && value >= 1000) {
    if (value >= 1000000) {
      formattedValue = `${(value / 1000000).toFixed(1)}M`;
    } else {
      formattedValue = `${(value / 1000).toFixed(1)}K`;
    }
  } else {
    const parts = value.toFixed(useDecimals ? currency.decimalPlaces : 0).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousandSeparator);
    formattedValue = useDecimals && parts[1] 
      ? parts.join(currency.decimalSeparator) 
      : parts[0];
  }
  
  if (currency.symbolPosition === "before") {
    return `${currency.symbol}${formattedValue}`;
  } else {
    return `${formattedValue} ${currency.symbol}`;
  }
}

export function formatPriceSimple(amount: number, currencyCode: string = "USD"): string {
  const currency = getCurrency(currencyCode);
  
  if (currency.symbolPosition === "before") {
    return `${currency.symbol}${Math.round(amount)}`;
  } else {
    return `${Math.round(amount)} ${currency.symbol}`;
  }
}

export const CURRENCY_OPTIONS = CURRENCIES.map(c => ({
  id: c.code,
  label: c.name,
  symbol: c.symbol,
}));
