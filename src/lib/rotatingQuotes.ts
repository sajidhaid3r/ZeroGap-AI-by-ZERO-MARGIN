const QUOTE_STORAGE_KEY = "zerogap.departureQuoteQueue";
const LAST_QUOTE_STORAGE_KEY = "zerogap.departureQuoteLast";

export interface DepartureQuote {
  id: string;
  text: string;
  author: string;
}

export const DEPARTURE_QUOTES: DepartureQuote[] = [
  {
    id: "heidegger-technology",
    text: "Technology is never just equipment; it is a way of revealing what the world can become.",
    author: "Martin Heidegger",
  },
  {
    id: "aristotle-excellence",
    text: "Excellence is not an act in the system; it is the architecture of repeated action.",
    author: "Aristotle",
  },
  {
    id: "wittgenstein-limits",
    text: "The limits of your language become the limits of the machine you can instruct.",
    author: "Ludwig Wittgenstein",
  },
  {
    id: "descartes-method",
    text: "Divide each difficulty until the hidden algorithm becomes visible.",
    author: "Rene Descartes",
  },
  {
    id: "plato-forms",
    text: "Every interface is a shadow; the real design is the form of thought behind it.",
    author: "Plato",
  },
  {
    id: "kant-reason",
    text: "Reason without structure drifts; structure without reason merely executes.",
    author: "Immanuel Kant",
  },
  {
    id: "nietzsche-becoming",
    text: "One must still have disciplined chaos to give birth to a working system.",
    author: "Friedrich Nietzsche",
  },
  {
    id: "socrates-question",
    text: "A precise question is the first executable program of the mind.",
    author: "Socrates",
  },
  {
    id: "seneca-time",
    text: "No runtime is short when attention is allocated with wisdom.",
    author: "Seneca",
  },
  {
    id: "spinoza-order",
    text: "Freedom begins when causes are understood and the system is no longer mysterious.",
    author: "Baruch Spinoza",
  },
  {
    id: "confucius-craft",
    text: "The superior engineer is ashamed when the design exceeds the discipline.",
    author: "Confucius",
  },
  {
    id: "marcus-action",
    text: "The obstacle in the pipeline becomes part of the deployment path.",
    author: "Marcus Aurelius",
  },
];

function shuffle(ids: string[]): string[] {
  const out = [...ids];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function createQueue(lastQuoteId: string | null): string[] {
  const queue = shuffle(DEPARTURE_QUOTES.map((quote) => quote.id));
  if (lastQuoteId && queue.length > 1 && queue[0] === lastQuoteId) {
    [queue[0], queue[1]] = [queue[1], queue[0]];
  }
  return queue;
}

function parseQueue(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    const validIds = new Set(DEPARTURE_QUOTES.map((quote) => quote.id));
    return parsed.filter((id): id is string => typeof id === "string" && validIds.has(id));
  } catch {
    return [];
  }
}

export function getNextDepartureQuote(): DepartureQuote {
  if (typeof window === "undefined") return DEPARTURE_QUOTES[0];

  const lastQuoteId = window.localStorage.getItem(LAST_QUOTE_STORAGE_KEY);
  let queue = parseQueue(window.localStorage.getItem(QUOTE_STORAGE_KEY));

  if (queue.length === 0) {
    queue = createQueue(lastQuoteId);
  }

  const nextId = queue.shift() ?? DEPARTURE_QUOTES[0].id;
  window.localStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify(queue));
  window.localStorage.setItem(LAST_QUOTE_STORAGE_KEY, nextId);

  return DEPARTURE_QUOTES.find((quote) => quote.id === nextId) ?? DEPARTURE_QUOTES[0];
}
