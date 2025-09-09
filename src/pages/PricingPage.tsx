import { Link } from 'react-router-dom';
import { Check, Star, Users, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="py-20 px-4 md:px-8 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
          Fair for students. Simple for labs.
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Choose the plan that fits your research needs. Upgrade or downgrade anytime.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Free Plan */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="text-2xl">Free</CardTitle>
              <CardDescription>Forever free for individual researchers</CardDescription>
              <div className="text-3xl font-bold">€0</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>DOI/PMID/keyword search</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Shelves for organization</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Ratings and reviews</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>1 export per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Library cap: 300 items</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link to="/">Start free</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Pro Plan */}
          <Card className="relative border-primary">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge variant="secondary" className="bg-primary text-primary-foreground">
                <Star className="w-3 h-3 mr-1" />
                Most Popular
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="text-2xl">Pro</CardTitle>
              <CardDescription>Advanced features for power users</CardDescription>
              <div className="text-3xl font-bold">€6.99<span className="text-lg font-normal">/mo</span></div>
              <div className="text-sm text-muted-foreground">or €49/year (save 25%)</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Unlimited items and exports</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Tags and collections</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Saved searches & alerts</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Citation exports (BibTeX/CSL)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Priority support</span>
                </li>
              </ul>
              <div className="pt-4">
                <Badge variant="outline">Student? 40% off</Badge>
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full" variant="default">
                <a href="#">Upgrade to Pro</a>
              </Button>
            </CardFooter>
          </Card>

          {/* Lab Plan */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="text-2xl">Lab</CardTitle>
              <CardDescription>Collaboration tools for research teams</CardDescription>
              <div className="text-3xl font-bold">€29<span className="text-lg font-normal">/mo</span></div>
              <div className="text-sm text-muted-foreground">10 seats minimum</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Shared libraries</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Private group reviews</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Weekly team digest</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Simple Slack/Teams webhook</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Everything in Pro</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full" variant="outline">
                <a href="mailto:contact@peerly.io">
                  <Mail className="w-4 h-4 mr-2" />
                  Talk to us
                </a>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* FAQs Section */}
      <section className="py-16 px-4 md:px-8 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Can I change plans anytime?</h3>
            <p className="text-muted-foreground">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Is there a free trial for Pro?</h3>
            <p className="text-muted-foreground">We offer a 14-day free trial for the Pro plan. No credit card required to start.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">What payment methods do you accept?</h3>
            <p className="text-muted-foreground">We accept all major credit cards and PayPal for monthly and yearly subscriptions.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Can students get a discount?</h3>
            <p className="text-muted-foreground">Yes! Students get 40% off the Pro plan with a valid student email address.</p>
          </div>
        </div>
      </section>

      {/* Data Promise */}
      <section className="py-16 px-4 md:px-8 bg-muted/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Our Data Promise</h2>
          <p className="text-lg text-muted-foreground">
            No data sale. Easy export. Cancel anytime.
          </p>
        </div>
      </section>
    </div>
  );
}
