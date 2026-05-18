import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { ShieldQuestion, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: Trace missed path:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(83,74,183,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(83,74,183,0.03)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
      
      <div className="text-center relative z-10 max-w-md mx-auto">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-brand-500/10 border border-brand-500/20 mb-8 animate-pulse">
           <ShieldQuestion size={40} className="text-brand-500" />
        </div>
        <h1 className="text-6xl font-mono-code font-bold text-text-primary mb-2">404</h1>
        <p className="text-lg text-text-secondary mb-8 font-medium">Path not mapped in intelligence registry.</p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild>
            <Link to="/" className="flex items-center gap-2">
              <Home size={16} />
              Back to Dashboard
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>

        <div className="mt-12 text-[10px] font-mono-code text-text-tertiary uppercase tracking-widest opacity-50">
           System: 0x404_NULL_REFERENCE // InsureIQ_V2
        </div>
      </div>
    </div>
  );
};

export default NotFound;
