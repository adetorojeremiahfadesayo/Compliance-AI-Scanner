import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import NewAnalysis from './pages/NewAnalysis';
import AnalysisView from './pages/AnalysisView';
import ReportView from './pages/ReportView';
import AppShell from './components/AppShell';
import TokenGate from './components/TokenGate';

function App() {
  return (
    <>
      <AppShell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new-analysis" element={<NewAnalysis />} />
          <Route path="/analysis/:id" element={<AnalysisView />} />
          <Route path="/report/:id" element={<ReportView />} />
        </Routes>
      </AppShell>
      <TokenGate />
    </>
  );
}

export default App;
