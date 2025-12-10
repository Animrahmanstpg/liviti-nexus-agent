import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PageTransition from "./PageTransition";
import ProtectedRoute from "./ProtectedRoute";
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
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
        
        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><PageTransition><Dashboard /></PageTransition></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><PageTransition><Dashboard /></PageTransition></ProtectedRoute>} />
        <Route path="/properties" element={<ProtectedRoute><PageTransition><Properties /></PageTransition></ProtectedRoute>} />
        <Route path="/properties/:id" element={<ProtectedRoute><PageTransition><PropertyDetail /></PageTransition></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><PageTransition><Projects /></PageTransition></ProtectedRoute>} />
        <Route path="/projects/:id" element={<ProtectedRoute><PageTransition><ProjectDetail /></PageTransition></ProtectedRoute>} />
        <Route path="/leads" element={<ProtectedRoute><PageTransition><Leads /></PageTransition></ProtectedRoute>} />
        <Route path="/leads/:id" element={<ProtectedRoute><PageTransition><LeadDetail /></PageTransition></ProtectedRoute>} />
        <Route path="/favorites" element={<ProtectedRoute><PageTransition><Favorites /></PageTransition></ProtectedRoute>} />
        <Route path="/compare" element={<ProtectedRoute><PageTransition><Compare /></PageTransition></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><PageTransition><Admin /></PageTransition></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><PageTransition><Analytics /></PageTransition></ProtectedRoute>} />
        <Route path="/bulk-import" element={<ProtectedRoute><PageTransition><BulkImportPage /></PageTransition></ProtectedRoute>} />
        <Route path="/my-submissions" element={<ProtectedRoute><PageTransition><MySubmissions /></PageTransition></ProtectedRoute>} />
        <Route path="/advertise" element={<ProtectedRoute><PageTransition><Advertise /></PageTransition></ProtectedRoute>} />
        
        {/* 404 - Protected */}
        <Route path="*" element={<ProtectedRoute><PageTransition><NotFound /></PageTransition></ProtectedRoute>} />
      </Routes>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;
