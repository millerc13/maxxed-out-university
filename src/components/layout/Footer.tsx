'use client';

import Link from 'next/link';
import { Facebook, Instagram, Youtube } from 'lucide-react';

// TikTok icon component
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
    </svg>
  );
}

const socialLinks = [
  { href: 'https://www.facebook.com/todd.pultz', icon: Facebook, label: 'Facebook' },
  { href: 'https://www.instagram.com/toddpultzofficial/', icon: Instagram, label: 'Instagram' },
  { href: 'https://www.youtube.com/@toddpultzofficial', icon: Youtube, label: 'YouTube' },
];

const quickLinks = [
  { href: '/', label: 'Training Center' },
  { href: '/courses', label: 'All Courses' },
  { href: '/webinars', label: 'Webinars' },
  { href: '/login', label: 'Member Login' },
];

const legalLinks = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/refund', label: 'Refund Policy' },
  { href: '/contact', label: 'Contact Us' },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-maxxed-dark text-text-muted pt-16 pb-8 px-5 md:px-12">
      <div className="max-w-[1200px] mx-auto">
        {/* Footer Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          {/* About Section */}
          <div className="text-center md:text-left">
            <h3 className="text-white text-2xl font-extrabold mb-4">
              MAXXED OUT
            </h3>
            <p className="leading-relaxed mb-5">
              Empowering real estate investors with the knowledge and strategies
              needed to build wealth through property investments. Join thousands
              of successful students.
            </p>
            {/* Social Links */}
            <div className="flex gap-4 justify-center md:justify-start">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-[#1a1a1a] rounded-full flex items-center justify-center text-text-muted transition-all duration-300 hover:bg-maxxed-blue hover:text-white hover:-translate-y-0.5"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
              <a
                href="https://www.tiktok.com/@toddpultzofficial"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[#1a1a1a] rounded-full flex items-center justify-center text-text-muted transition-all duration-300 hover:bg-maxxed-blue hover:text-white hover:-translate-y-0.5"
                aria-label="TikTok"
              >
                <TikTokIcon className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="text-center md:text-left">
            <h4 className="text-white text-base font-bold uppercase tracking-wider mb-5">
              Quick Links
            </h4>
            <ul className="list-none p-0 m-0">
              {quickLinks.map((link) => (
                <li key={link.label} className="mb-3">
                  <Link
                    href={link.href}
                    className="text-text-muted no-underline transition-colors duration-300 hover:text-maxxed-blue"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div className="text-center md:text-left">
            <h4 className="text-white text-base font-bold uppercase tracking-wider mb-5">
              Legal
            </h4>
            <ul className="list-none p-0 m-0">
              {legalLinks.map((link) => (
                <li key={link.label} className="mb-3">
                  <Link
                    href={link.href}
                    className="text-text-muted no-underline transition-colors duration-300 hover:text-maxxed-blue"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="border-t border-[#222] pt-8 text-center text-sm">
          <p>
            © {currentYear} Maxxed Out University. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
