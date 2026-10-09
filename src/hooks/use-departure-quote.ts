import { useEffect, useRef, useState } from "react";
import { DEPARTURE_QUOTES, DepartureQuote, getNextDepartureQuote } from "@/lib/rotatingQuotes";

export function useDepartureQuote(): DepartureQuote {
  const didPickQuote = useRef(false);
  const [quote, setQuote] = useState<DepartureQuote>(DEPARTURE_QUOTES[0]);

  useEffect(() => {
    if (didPickQuote.current) return;
    didPickQuote.current = true;
    setQuote(getNextDepartureQuote());
  }, []);

  return quote;
}
