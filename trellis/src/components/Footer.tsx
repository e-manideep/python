import { Link } from "react-router-dom";
import { TrellisMark } from "./Nav";

export function Footer() {
  return (
    <footer className="border-t border-ink-100 bg-ink-950 text-ink-300">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr] gap-10">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-3 w-fit">
              <TrellisMark />
              <span className="font-display text-lg text-white tracking-tight">Trellis</span>
            </Link>
            <p className="text-sm text-ink-400 max-w-xs leading-relaxed">
              The post-handover operating partner for residential real estate — leasing, maintenance, make-ready,
              compliance and community, on one transparent performance score.
            </p>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-3">Platform</div>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/portfolio" className="hover:text-white transition-colors">Portfolio Dashboard</Link></li>
              <li><Link to="/insights" className="hover:text-white transition-colors">Trellis Intelligence</Link></li>
              <li><Link to="/services" className="hover:text-white transition-colors">Property Services</Link></li>
              <li><Link to="/marketplace" className="hover:text-white transition-colors">Vendor Marketplace</Link></li>
              <li><Link to="/listings" className="hover:text-white transition-colors">Browse Listings</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-3">Portals</div>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/resident" className="hover:text-white transition-colors">Resident — My Home</Link></li>
              <li><Link to="/vendor" className="hover:text-white transition-colors">Vendor — My Jobs</Link></li>
              <li><Link to="/ops" className="hover:text-white transition-colors">Field Ops Console</Link></li>
              <li><Link to="/builder" className="hover:text-white transition-colors">Developer Portal</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-3">About this demo</div>
            <p className="text-sm text-ink-400 leading-relaxed">
              A fully working prototype, not a mockup — a seeded synthetic dataset (24 properties, ~2,248 units across
              Hyderabad &amp; Secunderabad) drives every number, chart and AI recommendation on every screen, computed
              live in your browser. No backend, no real resident or owner data.
            </p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-500">
          <span>© 2026 Trellis. Product demonstration built for illustrative purposes.</span>
          <span>Hyderabad &amp; Secunderabad, Telangana, India</span>
        </div>
      </div>
    </footer>
  );
}
