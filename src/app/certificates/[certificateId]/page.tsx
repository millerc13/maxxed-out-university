import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Download, Linkedin } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { CopyLinkButton } from './CopyLinkButton';

interface PageProps {
  params: Promise<{ certificateId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { certificateId } = await params;
  const cert = await prisma.certificate.findUnique({
    where: { certificateId },
    include: { user: { select: { name: true } }, course: { select: { title: true } } },
  });
  if (!cert) return { title: 'Certificate — Maxxed Out University' };
  const name = cert.user.name || 'A graduate';
  return {
    title: `${name}'s Certificate — ${cert.course.title}`,
    description: `${name} has earned a Certificate of Completion for ${cert.course.title} from Maxxed Out University.`,
  };
}

export default async function CertificatePage({ params }: PageProps) {
  const { certificateId } = await params;

  const certificate = await prisma.certificate.findUnique({
    where: { certificateId },
    include: {
      user: { select: { name: true, email: true } },
      course: { select: { title: true } },
    },
  });

  if (!certificate) notFound();

  const studentName = certificate.user.name || certificate.user.email.split('@')[0];
  const issued = new Date(certificate.issuedAt);
  const dateStr = issued.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const pdfHref = `/api/certificates/${certificate.certificateId}/pdf`;
  const viewUrl = `/certificates/${certificate.certificateId}`;

  // LinkedIn "Add to profile" deep link
  const linkedinParams = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: `Certificate of Completion — ${certificate.course.title}`,
    organizationName: 'Maxxed Out University',
    issueYear: String(issued.getFullYear()),
    issueMonth: String(issued.getMonth() + 1),
    certId: certificate.certificateId,
    certUrl: `https://university.maxxedout.com${viewUrl}`,
  });
  const linkedinHref = `https://www.linkedin.com/profile/add?${linkedinParams.toString()}`;

  return (
    <>
      {/* Load Cormorant on demand — only this page needs it */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
        rel="stylesheet"
      />

      <main className="min-h-screen bg-gradient-to-br from-[#f5f3eb] via-white to-[#f5f3eb] py-8 px-4 print:bg-white print:py-0 print:px-0">
        <div className="max-w-5xl mx-auto">
          {/* Action bar — hidden in print */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
            <Link
              href="/"
              className="text-xs font-black tracking-widest uppercase text-[#D4AF37] hover:text-[#B8941F]"
            >
              Maxxed Out University
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={pdfHref}
                className="inline-flex items-center gap-2 h-10 px-4 bg-[#0c1829] text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-[#1a2942] transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download PDF</span>
                <span className="sm:hidden">PDF</span>
              </a>
              <a
                href={linkedinHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-10 px-4 bg-[#0A66C2] text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-[#084d93] transition-colors cursor-pointer"
              >
                <Linkedin className="w-4 h-4" />
                <span className="hidden sm:inline">Add to LinkedIn</span>
                <span className="sm:hidden">LinkedIn</span>
              </a>
              <CopyLinkButton />
            </div>
          </div>

          {/* Certificate */}
          <div
            className="relative bg-white mx-auto rounded-sm print:rounded-none"
            style={{
              boxShadow: '0 30px 80px -20px rgba(12,24,41,0.25), 0 10px 30px -10px rgba(212,175,55,0.2)',
              aspectRatio: '11 / 8.5',
              fontFamily: 'Montserrat, system-ui, sans-serif',
            }}
          >
            {/* Double border */}
            <div className="absolute inset-3 sm:inset-5 border-2 border-[#D4AF37]" />
            <div className="absolute inset-5 sm:inset-8 border border-[#D4AF37]/60" />

            {/* Corner flourishes */}
            {[
              'top-3 left-3 sm:top-5 sm:left-5 border-t-4 border-l-4',
              'top-3 right-3 sm:top-5 sm:right-5 border-t-4 border-r-4',
              'bottom-3 left-3 sm:bottom-5 sm:left-5 border-b-4 border-l-4',
              'bottom-3 right-3 sm:bottom-5 sm:right-5 border-b-4 border-r-4',
            ].map((cls, i) => (
              <div key={i} className={`absolute w-8 h-8 sm:w-12 sm:h-12 border-[#D4AF37] ${cls}`} />
            ))}

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 sm:px-16 py-10">
              <p className="flex items-center gap-3 text-[9px] sm:text-[11px] font-black tracking-[0.35em] text-[#0000CC] uppercase mb-3 sm:mb-4">
                <span className="w-6 sm:w-8 h-px bg-[#0000CC]" aria-hidden />
                Maxxed Out University
                <span className="w-6 sm:w-8 h-px bg-[#0000CC]" aria-hidden />
              </p>

              <h1
                className="text-[#0c1829] font-bold mb-1 leading-none"
                style={{
                  fontFamily: 'Cormorant, Georgia, serif',
                  fontSize: 'clamp(28px, 5.5vw, 56px)',
                }}
              >
                Certificate of Completion
              </h1>
              <p className="text-[10px] sm:text-xs font-medium tracking-[0.25em] text-gray-500 uppercase mb-5 sm:mb-8">
                — An Award of Achievement —
              </p>

              <div className="w-16 sm:w-20 h-0.5 bg-[#D4AF37] mb-5 sm:mb-8" />

              <p className="text-[10px] sm:text-xs font-medium tracking-[0.25em] text-gray-500 uppercase mb-2 sm:mb-3">
                This certifies that
              </p>
              <p
                className="text-[#0c1829] font-bold leading-none mb-5 sm:mb-8 break-words max-w-full"
                style={{
                  fontFamily: 'Cormorant, Georgia, serif',
                  fontSize: 'clamp(32px, 6vw, 64px)',
                }}
              >
                {studentName}
              </p>

              <p className="text-xs sm:text-sm text-gray-600 max-w-xl leading-relaxed mb-1 sm:mb-2">
                has successfully completed the final exam and all required coursework for
              </p>
              <p
                className="font-bold mb-6 sm:mb-10 break-words max-w-full"
                style={{
                  color: '#0000CC',
                  fontFamily: 'Cormorant, Georgia, serif',
                  fontSize: 'clamp(20px, 3.8vw, 34px)',
                }}
              >
                {certificate.course.title}
              </p>

              {/* Signatures */}
              <div className="w-full max-w-xl grid grid-cols-2 gap-6 sm:gap-12 mt-4 sm:mt-6">
                {[
                  { label: 'Date Awarded', value: dateStr },
                  { label: 'Instructor', value: 'Todd Pultz' },
                ].map((col) => (
                  <div key={col.label} className="flex flex-col items-center">
                    <div className="w-full h-px bg-[#0c1829] mb-2" />
                    <p className="text-[8px] sm:text-[10px] font-bold tracking-[0.25em] text-gray-500 uppercase">
                      {col.label}
                    </p>
                    <p
                      className="text-[#0c1829] mt-1 font-bold"
                      style={{ fontFamily: 'Cormorant, Georgia, serif', fontSize: 'clamp(14px, 2.2vw, 20px)' }}
                    >
                      {col.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* ID strip */}
              <div className="absolute bottom-3 sm:bottom-5 left-6 sm:left-10 right-6 sm:right-10 flex flex-wrap items-center justify-between gap-2 text-[8px] sm:text-[10px] font-medium tracking-wider text-gray-500 uppercase">
                <span>Certificate ID: <span className="font-mono text-[#0c1829]">{certificate.certificateId}</span></span>
                <span>maxxedout.com/certificates/{certificate.certificateId}</span>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-500 mt-6 print:hidden">
            Anyone with this link can view this certificate. Share with confidence.
          </p>
        </div>
      </main>
    </>
  );
}

