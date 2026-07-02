import TopBar from './components/layout/TopBar';
import LeftPanel from './components/layout/LeftPanel';
import VizSwitcher from './components/viz/VizSwitcher';
import BottomTabs from './components/layout/BottomTabs';
import PropertiesPanel from './components/panels/PropertiesPanel';

export default function App() {
  return (
    <div className="flex flex-col h-screen">
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <LeftPanel />

        {/* Center: visualization + bottom tabs */}
        <main className="flex-1 min-w-0 flex flex-col p-3 gap-3">
          <div className="flex-1 min-h-0 panel overflow-hidden">
            <VizSwitcher />
          </div>
          <div className="h-[38%] min-h-[220px]">
            <BottomTabs />
          </div>
        </main>

        <div className="w-72 shrink-0 border-l border-surface-border bg-surface-0 p-3">
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
}
