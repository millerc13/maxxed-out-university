import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Login | Maxxed Out University',
  description: 'Sign in to access your courses',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Simple Header */}
      <header className="bg-white border-t-4 border-maxxed-blue shadow-header py-4 px-5">
        <Link href="/" className="flex items-center gap-2.5 text-xl font-extrabold text-text-dark no-underline w-fit mx-auto">
          <Image
            src="https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69277f2296891550f591fedc.png"
            alt="Maxxed Out"
            width={36}
            height={36}
            className="h-9 w-auto"
          />
          <span>MAXXED OUT UNIVERSITY</span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-5">
        {children}
      </main>

      {/* Simple Footer */}
      <footer className="py-4 text-center text-sm text-text-muted">
        © {new Date().getFullYear()} Maxxed Out University
      </footer>
    </div>
  );
}
