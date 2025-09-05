import { useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'

// Google Analytics GA4 setup
declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
  }
}

export const useGoogleAnalytics = () => {
  const { user } = useUser()

  const initializeGA = () => {
    // Check if user has consented to analytics cookies
    const cookieConsent = localStorage.getItem('cookie-consent')
    const hasAnalyticsConsent = cookieConsent
      ? JSON.parse(cookieConsent).analytics
      : false

    const gaTrackingId = import.meta.env.VITE_GA_TRACKING_ID

    if (hasAnalyticsConsent && gaTrackingId && gaTrackingId !== 'your_google_analytics_id') {
      // Load Google Analytics script if not already loaded
      if (!document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${gaTrackingId}"]`)) {
        const script = document.createElement('script')
        script.async = true
        script.src = `https://www.googletagmanager.com/gtag/js?id=${gaTrackingId}`
        document.head.appendChild(script)
      }

      // Initialize gtag
      window.dataLayer = window.dataLayer || []
      window.gtag = function() {
        window.dataLayer.push(arguments)
      }

      window.gtag('js', new Date())
      window.gtag('config', gaTrackingId, {
        anonymize_ip: true,
        allow_google_signals: false,
        allow_ad_features: false
      })

      // Track user identification if logged in
      if (user?.id) {
        window.gtag('config', gaTrackingId, {
          user_id: user.id,
          custom_map: {
            dimension1: 'user_type'
          }
        })
        window.gtag('event', 'user_identified', {
          user_type: 'authenticated'
        })
      } else {
        window.gtag('event', 'user_identified', {
          user_type: 'anonymous'
        })
      }

      console.log('Google Analytics initialized with consent')
    }
  }

  useEffect(() => {
    initializeGA()

    // Listen for cookie consent changes
    const handleConsentChange = () => {
      initializeGA()
    }

    window.addEventListener('cookie-consent-changed', handleConsentChange)

    return () => {
      window.removeEventListener('cookie-consent-changed', handleConsentChange)
    }
  }, [user])

  return {
    trackEvent: (eventName: string, parameters?: Record<string, any>) => {
      if (window.gtag) {
        window.gtag('event', eventName, parameters)
      }
    },
    trackPageView: (pagePath: string) => {
      if (window.gtag) {
        window.gtag('config', import.meta.env.VITE_GA_TRACKING_ID, {
          page_path: pagePath
        })
      }
    }
  }
}

// Analytics event tracking functions
export const trackPaperView = (paperId: string, paperTitle: string) => {
  if (window.gtag) {
    window.gtag('event', 'paper_view', {
      paper_id: paperId,
      paper_title: paperTitle
    })
  }
}

export const trackSearch = (query: string, resultsCount: number) => {
  if (window.gtag) {
    window.gtag('event', 'search', {
      search_term: query,
      results_count: resultsCount
    })
  }
}

export const trackUserAction = (action: string, category: string, label?: string) => {
  if (window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label
    })
  }
}

export const trackSignUp = (method: 'google' | 'github') => {
  if (window.gtag) {
    window.gtag('event', 'sign_up', {
      method: method
    })
  }
}

export const trackPaperInteraction = (action: 'want_to_read' | 'reading' | 'read', paperId: string) => {
  if (window.gtag) {
    window.gtag('event', 'paper_interaction', {
      action: action,
      paper_id: paperId
    })
  }
}
