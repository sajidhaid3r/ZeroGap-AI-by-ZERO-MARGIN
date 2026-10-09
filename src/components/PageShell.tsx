import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { TickerStrip } from "./TickerStrip";

export function PageShell({
  children,
  showFounder = false,
}: {
  children: React.ReactNode;
  showFounder?: boolean;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <TickerStrip />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer showFounder={showFounder} />
    </div>
  );
}
