import { Route, Routes } from "react-router-dom";
import { Nav } from "./components/Nav";
import { Footer } from "./components/Footer";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
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
          <Route path="/login" element={<Login />} />
          <Route path="/services" element={<Services />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/portfolio" element={<ProtectedRoute role="investor"><Portfolio /></ProtectedRoute>} />
          <Route path="/property/:id" element={<ProtectedRoute role="any"><PropertyDetail /></ProtectedRoute>} />
          <Route path="/resident" element={<ProtectedRoute role="resident"><Resident /></ProtectedRoute>} />
          <Route path="/vendor" element={<ProtectedRoute role="vendor"><Vendor /></ProtectedRoute>} />
          <Route path="/ops" element={<ProtectedRoute role="ops"><Ops /></ProtectedRoute>} />
          <Route path="/builder" element={<ProtectedRoute role="builder"><Builder /></ProtectedRoute>} />
          <Route path="/marketplace" element={<ProtectedRoute role="resident"><Marketplace /></ProtectedRoute>} />
          <Route path="/insights" element={<ProtectedRoute role="any"><Insights /></ProtectedRoute>} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
