import { useEffect, useState } from "react";

const cities = [
  { name: "Bengaluru", cx: 210, cy: 290, color: "#F5F4F1", size: 8, label: "AI/ML Hub 🔥", listings: 842 },
  { name: "Mumbai",    cx: 155, cy: 230, color: "#C9CDD3", size: 7, label: "FinTech 📈",  listings: 612 },
  { name: "Hyderabad", cx: 215, cy: 255, color: "#6FCF97", size: 6, label: "Cloud & SaaS", listings: 487 },
  { name: "Pune",      cx: 165, cy: 238, color: "#E0B85C", size: 6, label: "Web Dev",     listings: 391 },
  { name: "Delhi",     cx: 195, cy: 140, color: "#e53935", size: 7, label: "Govt Tech",   listings: 326 },
  { name: "Chennai",   cx: 215, cy: 305, color: "#B8B8BC", size: 5, label: "Data Eng.",   listings: 189 },
];

export function IndiaHeatmap() {
  const [count, setCount] = useState(2847);
  const [mapVisible, setMapVisible] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setCount((c) => c + 1), 3000);
    // Delay iframe mount so it has non-zero dimensions
    const t = setTimeout(() => setMapVisible(true), 300);
    return () => { clearInterval(id); clearTimeout(t); };
  }, []);

  return (
    <section className="container mx-auto px-4 py-20 border-t border-border/50 dark-section">
      <div className="text-center mb-10">
        <div className="text-xs uppercase tracking-widest text-primary mb-2">Localized intelligence</div>
        <h2 className="text-3xl md:text-5xl font-bold">Your <span className="text-gradient-silver">city</span>, your jobs.</h2>
        <div className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <span className="size-2 rounded-full bg-success animate-pulse" />
          <span><span className="text-success font-semibold">{count.toLocaleString()}</span> opportunities mapped live</span>
        </div>
      </div>

      {/* Leaflet real map */}
      <div className="max-w-5xl mx-auto rounded-2xl overflow-hidden border border-border/60" style={{ height: 520 }}>
        {mapVisible && (
          <iframe
            src="/india-heatmap.html"
            className="w-full h-full border-0"
            title="India IT Hiring Heatmap"
          />
        )}
      </div>

      {/* City list below map */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl mx-auto mt-6">
        {cities.map((c) => (
          <div key={c.name} className="flex items-center justify-between p-3 rounded-lg gradient-card border border-border/60">
            <div className="flex items-center gap-3">
              <span className="size-3 rounded-full" style={{ background: c.color, boxShadow: `0 0 12px ${c.color}` }} />
              <div>
                <div className="text-sm font-semibold">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.label}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-display font-bold text-primary">{c.listings}</div>
              <div className="text-[10px] text-muted-foreground">this week</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
