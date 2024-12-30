import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import { Home, Info } from "lucide-react";

const Header = () => {
  return (
    <header
      className="px-6 py-4 flex justify-between items-center shadow-lg backdrop-blur-sm sticky top-0 z-50"
      style={{
        background: "var(--header-bg)",
        color: "var(--header-text)",
        borderBottom: "1px solid var(--header-border)",
      }}
    >
      <Link href="/">
        <div className="flex items-center space-x-2">
          <div className="font-bold text-2xl tracking-tight bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            Avni PDF
          </div>
          <div 
            className="text-xs px-2 py-1 rounded-full hidden sm:block"
            style={{
              background: "var(--footer-link)",
              color: "var(--hero-text)"
            }}
          >
            Beta
          </div>
        </div>
      </Link>

      <nav className="flex items-center gap-6">
        <Link 
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
        >
          <Home size={18} />
          <span className="hidden sm:inline">Home</span>
        </Link>

        <Link 
          href="/about-us"
          className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
        >
          <Info size={18} />
          <span className="hidden sm:inline">About Us</span>
        </Link>

        <div className="h-6 w-px bg-gray-300 dark:bg-gray-700" />
        
        <ThemeToggle />
      </nav>
    </header>
  );
};

export default Header;