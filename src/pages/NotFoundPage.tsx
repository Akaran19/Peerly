import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';

export default function NotFoundPage() {
  return (
    <div className="page-wrapper">
      <Header />
      <main className="page-container">
        <section className="grid min-h-[55vh] items-center gap-10 md:grid-cols-[auto_minmax(0,1fr)] md:gap-16">
          <p
            className="font-editorial text-[9rem] font-normal italic leading-none tracking-[-0.05em] text-primary md:text-[13rem]"
            aria-hidden
          >
            404
          </p>
          <div className="max-w-md space-y-5 md:border-l md:pl-10">
            <p className="label-mono">Not on the shelf</p>
            <h1 className="text-4xl leading-tight">We couldn&rsquo;t find that page.</h1>
            <p className="text-muted-foreground">
              The paper or page you&rsquo;re looking for doesn&rsquo;t exist, or it may have moved. Try looking it up by DOI from the home page.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild>
                <Link to="/">Back to the index</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/signin">Sign in</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
