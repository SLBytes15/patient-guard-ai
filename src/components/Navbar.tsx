import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "Analyzer", href: "/analyzer" },
  { label: "Rx Scanner", href: "/scan" },
  { label: "Pricing", href: "/pricing" },
  { label: "API Docs", href: "/api-docs" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg">
          🛡️ RxSense
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <Link key={l.href} to={l.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </Link>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Button className="gradient-primary border-0" asChild><Link to="/analyzer">Start Analysis</Link></Button>
        </div>
        <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background p-4 space-y-3">
          {navLinks.map((l) => (
            <Link key={l.href} to={l.href} className="block text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>
              {l.label}
            </Link>
          ))}
          <Button className="gradient-primary border-0 w-full" asChild><Link to="/analyzer">Start Analysis</Link></Button>
        </div>
      )}
    </nav>
  );
}
