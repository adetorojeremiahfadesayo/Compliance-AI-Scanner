import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import NewAnalysis from './pages/NewAnalysis';
import AnalysisView from './pages/AnalysisView';
import ReportView from './pages/ReportView';

function App() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main style={{ 
        flex: 1, 
        marginLeft: '260px', 
        padding: '40px',
        overflowY: 'auto',
        height: '100vh'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/new-analysis" element={<NewAnalysis />} />
            <Route path="/analysis/:id" element={<AnalysisView />} />
            <Route path="/report/:id" element={<ReportView />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
