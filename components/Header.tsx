// src/components/Header.tsx
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

const Header = () => {
  return (
    <header
      className="p-4 flex justify-between items-center shadow-md transition-all"
      style={{
        background: "var(--header-bg)",
        color: "var(--header-text)",
      }}
    >
      <Link href="/"><div className="font-bold text-xl">Avni PDF</div> </Link>
      <nav className="flex gap-4">
        <Link href="/login">Login</Link>
        <Link href="/">Home</Link>
        <Link href="/about-us">About Us</Link>
      </nav>
      <ThemeToggle />
    </header>
  );
};

export default Header;
