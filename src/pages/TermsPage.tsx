import { Link } from 'react-router-dom';
import Header from '@/components/Header';

export default function TermsPage() {
  return (
    <div className="page-wrapper">
      <Header />
      <main className="page-container max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            ← Back to home
          </Link>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

          <p className="text-muted-foreground mb-6">
            <strong>Last updated:</strong> September 2, 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Acceptance of Terms</h2>
            <p className="mb-4">
              By accessing and using Peerly, you accept and agree to be bound by the terms
              and provision of this agreement.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Use License</h2>
            <p className="mb-4">
              Permission is granted to temporarily access the materials (information or software)
              on Peerly's website for personal, non-commercial transitory viewing only.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">User Content</h2>
            <p className="mb-4">
              You retain ownership of your reviews and ratings. By submitting content to Peerly,
              you grant us a non-exclusive, royalty-free license to use, display, and distribute
              your content in connection with our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Prohibited Uses</h2>
            <p className="mb-4">
              You may not use our services:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
              <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
              <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
              <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
              <li>To submit false or misleading information</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Disclaimer</h2>
            <p className="mb-4">
              The materials on Peerly's website are provided on an 'as is' basis. Peerly makes no
              warranties, expressed or implied, and hereby disclaims and negates all other warranties
              including without limitation, implied warranties or conditions of merchantability,
              fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Limitations</h2>
            <p className="mb-4">
              In no event shall Peerly or its suppliers be liable for any damages (including, without
              limitation, damages for loss of data or profit, or due to business interruption) arising
              out of the use or inability to use the materials on Peerly's website.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
            <p className="mb-4">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <p>
              <a href="mailto:akaran1909@gmail.com" className="text-primary hover:underline">
                akaran1909@gmail.com
              </a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
