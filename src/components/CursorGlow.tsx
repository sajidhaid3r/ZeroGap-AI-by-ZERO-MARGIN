import { useEffect } from "react";

export function CursorGlow() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const main = document.createElement("div");
    main.id = "cursor-glow";
    main.className = "cursor-glow-main";
    const spot = document.createElement("div");
    spot.className = "cursor-glow-spot";
    document.body.appendChild(main);
    document.body.appendChild(spot);

    let visible = false;
    let onCard = false;

    const onMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const dark = target?.closest(".dark-section");
      if (dark) {
        if (!visible) { main.style.opacity = "1"; visible = true; }
        const card = target?.closest(".glow-card, .glass-card, button, a");
        const size = card ? 300 : 400;
        const op = card ? 0.15 : 0.08;
        main.style.width = main.style.height = `${size}px`;
        main.style.left = `${e.clientX - size / 2}px`;
        main.style.top = `${e.clientY - size / 2}px`;
        main.style.setProperty("--glow-opacity", String(op));

        if (card && card.classList.contains("glow-card")) {
          if (!onCard) { spot.style.opacity = "1"; onCard = true; }
          spot.style.left = `${e.clientX - 75}px`;
          spot.style.top = `${e.clientY - 75}px`;
        } else if (onCard) {
          spot.style.opacity = "0"; onCard = false;
        }
      } else if (visible) {
        main.style.opacity = "0";
        spot.style.opacity = "0";
        visible = false; onCard = false;
      }
    };

    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      main.remove(); spot.remove();
    };
  }, []);
  return null;
}
