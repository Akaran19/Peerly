import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';

interface Plan {
  name: string;
  audience: string;
  price: string;
  // What the plan will cost once pricing launches; everything is free until then
  laterPrice?: string;
  features: string[];
  note?: string;
  cta: string;
  featured?: boolean;
}

const PLANS: Plan[] = [
  {
    name: 'Free',
    audience: 'For individual researchers',
    price: '€0',
    features: ['DOI, PubMed ID and keyword search', 'Shelves to organise papers', 'Ratings and reviews', '1 export per month', 'Library of up to 300 papers'],
    cta: 'Start free',
  },
  {
    name: 'Pro',
    audience: 'For heavy readers',
    price: '€0',
    laterPrice: '€6.99/mo or €49/yr',
    features: ['Unlimited papers and exports', 'Tags and collections', 'Saved searches and alerts', 'Citation exports (BibTeX, CSL)', 'Priority support'],
    note: 'Students get 40% off',
    cta: 'Use Pro features',
    featured: true,
  },
  {
    name: 'Lab',
    audience: 'For research groups',
    price: '€0',
    laterPrice: '€29/mo, 10 seats minimum',
    features: ['Everything in Pro', 'Shared libraries', 'Private group reviews', 'Weekly team digest', 'Slack or Teams webhook'],
    cta: 'Use Lab features',
  },
];

const FAQ = [
  {
    q: 'Is everything really free right now?',
    a: 'Yes. Every Pro and Lab feature is free while we work out pricing, with no limits.',
  },
  {
    q: 'When will pricing be introduced?',
    a: "We're still working on it. We'll announce a date and give plenty of notice before anything changes.",
  },
  {
    q: 'Will my data be affected when pricing launches?',
    a: 'No. Your library stays safe and accessible, and early users will get migration paths and grandfathering options.',
  },
  {
    q: 'Can I change plans anytime?',
    a: 'Yes. You can upgrade or downgrade at any time, and changes take effect immediately.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'All major credit cards and PayPal, for monthly and yearly subscriptions.',
  },
];

export default function PricingPage() {
  return (
    <div className="page-wrapper">
      <Header />

      <main className="page-container">
        <section className="grid gap-8 border-b border-foreground/80 pb-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
          <div className="space-y-5">
            <p className="label-mono">Pricing</p>
            <h1 className="max-w-[16ch] text-5xl font-normal leading-[0.98] tracking-[-0.03em] md:text-7xl">
              Fair for students. <em className="italic text-primary">Simple</em> for labs.
            </h1>
          </div>
          <div className="rounded-md border border-foreground bg-card p-5 shadow-[4px_4px_0_0_hsl(var(--foreground))]">
            <p className="label-mono text-foreground">Notice</p>
            <p className="mt-2 font-editorial text-xl leading-snug">Everything is free while we work out pricing.</p>
            <p className="mt-2 text-sm text-muted-foreground">No credit card needed. We'll give plenty of notice before that changes.</p>
          </div>
        </section>

        {/* Rate card */}
        <section className="grid border-b md:grid-cols-3 md:divide-x" aria-label="Plans">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`flex flex-col gap-6 border-b px-0 py-8 md:border-b-0 md:px-7 md:first:pl-0 md:last:pr-0 ${plan.featured ? 'md:bg-card/60' : ''}`}
            >
              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-3xl">{plan.name}</h2>
                  {plan.featured && <span className="label-mono text-primary">Most popular</span>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{plan.audience}</p>
              </div>

              <div>
                <p className="font-editorial text-5xl leading-none tabular-nums">{plan.price}</p>
                <p className="mt-2 h-4 font-ident text-[11px] text-muted-foreground">
                  {plan.laterPrice && (
                    <>
                      later <span className="line-through decoration-foreground/40">{plan.laterPrice}</span>
                    </>
                  )}
                </p>
              </div>

              <ul className="flex-1 space-y-2.5 text-[15px]">
                {plan.features.map(f => (
                  <li key={f} className="flex gap-3">
                    <span className="mt-[0.55em] h-px w-3 shrink-0 bg-foreground/50" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>

              {plan.note && <p className="font-editorial text-sm italic text-muted-foreground">{plan.note}</p>}

              <Button asChild variant={plan.featured ? 'default' : 'outline'} className="w-full">
                <Link to="/">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </section>

        <section className="grid gap-10 py-16 lg:grid-cols-[16rem_minmax(0,1fr)]" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-3xl">Questions</h2>
          <dl className="divide-y border-y">
            {FAQ.map(item => (
              <div key={item.q} className="grid gap-2 py-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:gap-8">
                <dt className="font-editorial text-lg leading-snug">{item.q}</dt>
                <dd className="text-muted-foreground">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="border-t border-foreground/80 pt-6 text-center font-editorial text-2xl italic">
          No data sale. Easy export. Cancel anytime.
        </p>
      </main>
    </div>
  );
}
