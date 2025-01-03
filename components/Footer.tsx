// components/Footer.tsx
import Link from 'next/link';
import { Mail, Github, Linkedin } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About Section */}
          <div className="footer-section md:col-span-2">
            <h3 className="footer-heading">About AvniPDF</h3>
            <p className="text-sm opacity-80 mb-4">
              AvniPDF provides powerful PDF manipulation tools to help you work more efficiently. 
              Convert, edit, and manage your PDF files with ease.
            </p>
          </div>

          {/* Quick Links */}
          <div className="footer-section">
            <h3 className="footer-heading">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about-us" className="footer-link text-sm">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="footer-link text-sm">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="footer-link text-sm">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/contact" className="footer-link text-sm">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="footer-section">
            <h3 className="footer-heading">Connect With Us</h3>
            <div className="space-y-2">
              <a 
                href="mailto:tushar.thanvi2005@gmail.com" 
                className="flex items-center gap-2 footer-link text-sm"
              >
                <Mail size={16} />
                <span>Email Us</span>
              </a>
              <a 
                href="https://github.com/TusharThanvi1990" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2 footer-link text-sm"
              >
                <Github size={16} />
                <span>GitHub</span>
              </a>
              <a 
                href="https://www.linkedin.com/in/tushar-thanvi-5044a128b" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2 footer-link text-sm"
              >
                <Linkedin size={16} />
                <span>LinkedIn</span>
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-[var(--footer-border)] text-center">
          <p className="text-sm opacity-80">
            © {currentYear} AvniPDF. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;