import Header from "@/components/Header";
import TradingSidebar from "@/components/TradingSidebar";

interface LayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

const Layout = ({ children, showSidebar = true }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex flex-1">
        {showSidebar && <TradingSidebar />}
        <main className={`flex-1 overflow-auto scrollbar-thin scrollbar-track-background scrollbar-thumb-primary/30 hover:scrollbar-thumb-primary/50 ${showSidebar ? 'ml-80' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;