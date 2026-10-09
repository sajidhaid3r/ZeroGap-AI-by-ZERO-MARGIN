const ANIMALS = [
  "Tiger", "Eagle", "Falcon", "Wolf", "Panther", "Cobra", "Lion", "Hawk",
  "Leopard", "Phoenix", "Dragon", "Bison", "Lynx", "Otter", "Rhino", "Jaguar",
  "Stag", "Owl", "Raven", "Cheetah", "Fox", "Bear", "Mantis", "Shark",
];

export function anonymousName(userId: string, college?: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  const animal = ANIMALS[h % ANIMALS.length];
  const short = (college ?? "").split(/\s|,|\(/)[0]?.slice(0, 8) || "Anon";
  return `${animal} from ${short}`;
}
