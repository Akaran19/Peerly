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

      {/* Development Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-4 md:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-sm">!</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold">🎉 Free for Now!</h2>
          </div>
          <p className="text-lg md:text-xl">
            All features are currently <strong>FREE</strong> while we work on our pricing model.
            Enjoy unlimited access to everything!
          </p>
          <p className="text-sm md:text-base mt-2 opacity-90">
            Pricing and subscriptions coming soon. No credit card required.
          </p>
        </div>
      </div>

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
              <div className="text-3xl font-bold text-green-600">FREE</div>
              <div className="text-sm text-muted-foreground line-through">€6.99/mo or €49/year</div>
              <div className="text-sm text-green-600 font-medium">Currently free for all users</div>
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
                <Link to="/">🚀 Start Using Pro Features</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Lab Plan */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="text-2xl">Lab</CardTitle>
              <CardDescription>Collaboration tools for research teams</CardDescription>
              <div className="text-3xl font-bold text-green-600">FREE</div>
              <div className="text-sm text-muted-foreground line-through">€29/mo (10 seats minimum)</div>
              <div className="text-sm text-green-600 font-medium">Currently free for all users</div>
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
                <Link to="/">🚀 Start Using Lab Features</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* FAQs Section */}
      <section className="py-16 px-4 md:px-8 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
        <div className="space-y-6">
          <div className="bg-green-50 dark:bg-green-950/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="text-lg font-semibold mb-2 text-green-800 dark:text-green-200">🎉 Is everything really free right now?</h3>
            <p className="text-green-700 dark:text-green-300">Yes! All features are completely free while we work on our pricing model. Enjoy unlimited access to Pro and Lab features without any restrictions.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">When will pricing be introduced?</h3>
            <p className="text-muted-foreground">We're currently developing our pricing model. We'll announce the timeline and provide plenty of notice before any changes take effect.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Will my data be affected when pricing launches?</h3>
            <p className="text-muted-foreground">No, your data will remain safe and accessible. We'll provide clear migration paths and grandfathering options for early users.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Can I change plans anytime?</h3>
            <p className="text-muted-foreground">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">What payment methods do you accept?</h3>
            <p className="text-muted-foreground">We accept all major credit cards and PayPal for monthly and yearly subscriptions.</p>
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
