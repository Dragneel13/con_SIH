import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Header } from './components/Header';
import { Breadcrumb } from './components/Breadcrumb';
import { Footer } from './components/Footer';
import { MnAssist } from './components/MnAssist';
import { CommandCenter } from './pages/CommandCenter';
import { ExplorationMap } from './pages/ExplorationMap';
import { DrillPlanning } from './pages/DrillPlanning';
import { TargetAnalysis } from './pages/TargetAnalysis';
import { MineTwin } from './pages/MineTwin';
import { Production } from './pages/Production';
import { Equipment } from './pages/Equipment';
import { DecisionCenter } from './pages/DecisionCenter';
import { FieldSurvey } from './pages/FieldSurvey';
import { DataModels } from './pages/DataModels';
import { Contact } from './pages/Contact';
import { Login } from './pages/Login';
import { Weather } from './pages/Weather';
import { Security } from './pages/Security';
import { WhatIfSimulator } from './pages/WhatIfSimulator';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen w-full bg-[#F8FAFC] text-slate-900 flex flex-col font-sans relative">
          {/* Full-Width Government Sticky Top Header & Navigation */}
          <Header />

          {/* Dynamic Breadcrumbs */}
          <Breadcrumb />

          {/* Main Content Body */}
          <main className="flex-1 w-full">
            <Routes>
              {/* Public Unauthenticated Entry Landing Page */}
              <Route path="/" element={<CommandCenter />} />
              <Route path="/login" element={<Login />} />
              <Route path="/contact" element={<Contact />} />

              {/* Exploration GIS (Public Read-Only Preview or Authenticated Role Access) */}
              <Route
                path="/exploration"
                element={
                  <ProtectedRoute path="/exploration">
                    <ExplorationMap />
                  </ProtectedRoute>
                }
              />

              {/* Role-Protected Modules */}
              <Route
                path="/drill-planning"
                element={
                  <ProtectedRoute path="/drill-planning">
                    <DrillPlanning />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/exploration/:targetId"
                element={
                  <ProtectedRoute path="/exploration">
                    <TargetAnalysis />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mine-twin"
                element={
                  <ProtectedRoute path="/mine-twin">
                    <MineTwin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/production"
                element={
                  <ProtectedRoute path="/production">
                    <Production />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/equipment"
                element={
                  <ProtectedRoute path="/equipment">
                    <Equipment />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/decisions"
                element={
                  <ProtectedRoute path="/decisions">
                    <DecisionCenter />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/what-if"
                element={
                  <ProtectedRoute path="/what-if">
                    <WhatIfSimulator />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/weather"
                element={
                  <ProtectedRoute path="/weather">
                    <Weather />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/security"
                element={
                  <ProtectedRoute path="/security">
                    <Security />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/field-survey"
                element={
                  <ProtectedRoute path="/field-survey">
                    <FieldSurvey />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/data-models"
                element={
                  <ProtectedRoute path="/data-models">
                    <DataModels />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>

          {/* Floating MnAssist AI Chatbot Widget */}
          <MnAssist />

          {/* Large Government PSU Footer */}
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};
