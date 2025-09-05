import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { X } from 'lucide-react'

export function CookieConsent() {
  const [showConsent, setShowConsent] = useState(false)
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,
    marketing: false
  })

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent')
    if (!consent) {
      setShowConsent(true)
    } else {
      const savedPreferences = JSON.parse(consent)
      setPreferences(savedPreferences)
    }
  }, [])

  const acceptAll = () => {
    const allPreferences = {
      necessary: true,
      analytics: true,
      marketing: true
    }
    setPreferences(allPreferences)
    localStorage.setItem('cookie-consent', JSON.stringify(allPreferences))
    setShowConsent(false)
    // Trigger GA initialization
    window.dispatchEvent(new CustomEvent('cookie-consent-changed', { detail: allPreferences }))
  }

  const acceptNecessary = () => {
    const necessaryOnly = {
      necessary: true,
      analytics: false,
      marketing: false
    }
    setPreferences(necessaryOnly)
    localStorage.setItem('cookie-consent', JSON.stringify(necessaryOnly))
    setShowConsent(false)
    // Trigger GA initialization (though analytics will be false)
    window.dispatchEvent(new CustomEvent('cookie-consent-changed', { detail: necessaryOnly }))
  }

  const savePreferences = () => {
    localStorage.setItem('cookie-consent', JSON.stringify(preferences))
    setShowConsent(false)
    // Trigger GA initialization
    window.dispatchEvent(new CustomEvent('cookie-consent-changed', { detail: preferences }))
  }

  if (!showConsent) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <Card className="max-w-4xl mx-auto p-6 shadow-lg">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold">Cookie Preferences</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConsent(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We use cookies to enhance your experience, analyze site usage, and assist in our marketing efforts.
            You can manage your preferences below.
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Necessary Cookies</h4>
                <p className="text-sm text-muted-foreground">
                  Required for the website to function properly
                </p>
              </div>
              <span className="text-sm font-medium text-green-600">Always Active</span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Analytics Cookies</h4>
                <p className="text-sm text-muted-foreground">
                  Help us understand how you use our website
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences(prev => ({ ...prev, analytics: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Marketing Cookies</h4>
                <p className="text-sm text-muted-foreground">
                  Used to deliver personalized advertisements
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.marketing}
                  onChange={(e) => setPreferences(prev => ({ ...prev, marketing: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button onClick={acceptAll} className="flex-1">
              Accept All
            </Button>
            <Button onClick={savePreferences} variant="outline" className="flex-1">
              Save Preferences
            </Button>
            <Button onClick={acceptNecessary} variant="ghost" className="flex-1">
              Necessary Only
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            By continuing to use our site, you agree to our{' '}
            <a href="/privacy" className="underline hover:no-underline">Privacy Policy</a>{' '}
            and{' '}
            <a href="/terms" className="underline hover:no-underline">Terms of Service</a>
          </p>
        </div>
      </Card>
    </div>
  )
}
