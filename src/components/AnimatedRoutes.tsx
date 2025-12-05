import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PageTransition from "./PageTransition";
import Dashboard from "@/pages/Dashboard";
import Properties from "@/pages/Properties";
import Projects from "@/pages/Projects";
import PropertyDetail from "@/pages/PropertyDetail";
import ProjectDetail from "@/pages/ProjectDetail";
import Leads from "@/pages/Leads";
import LeadDetail from "@/pages/LeadDetail";
import Favorites from "@/pages/Favorites";
import Compare from "@/pages/Compare";
import Auth from "@/pages/Auth";
import Admin from "@/pages/Admin";
import Analytics from "@/pages/Analytics";
import BulkImportPage from "@/pages/BulkImportPage";
import MySubmissions from "@/pages/MySubmissions";
import Advertise from "@/pages/Advertise";
import NotFound from "@/pages/NotFound";

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
        <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
        <Route path="/properties" element={<PageTransition><Properties /></PageTransition>} />
        <Route path="/properties/:id" element={<PageTransition><PropertyDetail /></PageTransition>} />
        <Route path="/projects" element={<PageTransition><Projects /></PageTransition>} />
        <Route path="/projects/:id" element={<PageTransition><ProjectDetail /></PageTransition>} />
        <Route path="/leads" element={<PageTransition><Leads /></PageTransition>} />
        <Route path="/leads/:id" element={<PageTransition><LeadDetail /></PageTransition>} />
        <Route path="/favorites" element={<PageTransition><Favorites /></PageTransition>} />
        <Route path="/compare" element={<PageTransition><Compare /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/admin" element={<PageTransition><Admin /></PageTransition>} />
        <Route path="/analytics" element={<PageTransition><Analytics /></PageTransition>} />
        <Route path="/bulk-import" element={<PageTransition><BulkImportPage /></PageTransition>} />
        <Route path="/my-submissions" element={<PageTransition><MySubmissions /></PageTransition>} />
        <Route path="/advertise" element={<PageTransition><Advertise /></PageTransition>} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;
