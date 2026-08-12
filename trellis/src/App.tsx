import { Route, Routes } from "react-router-dom";
import { Nav } from "./components/Nav";
import { Footer } from "./components/Footer";
import { Landing } from "./pages/Landing";
import { Portfolio } from "./pages/Portfolio";
import { PropertyDetail } from "./pages/PropertyDetail";
import { Resident } from "./pages/Resident";
import { Vendor } from "./pages/Vendor";
import { Ops } from "./pages/Ops";
import { Insights } from "./pages/Insights";
import { Builder } from "./pages/Builder";
import { Services } from "./pages/Services";
import { Listings } from "./pages/Listings";
import { Marketplace } from "./pages/Marketplace";

function App() {
  return (
    <div className="min-h-svh flex flex-col bg-ink-50">
      <Nav />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/property/:id" element={<PropertyDetail />} />
          <Route path="/resident" element={<Resident />} />
          <Route path="/vendor" element={<Vendor />} />
          <Route path="/ops" element={<Ops />} />
          <Route path="/builder" element={<Builder />} />
          <Route path="/services" element={<Services />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/insights" element={<Insights />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
