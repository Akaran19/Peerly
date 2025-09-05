import { useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Download, Trash2, AlertTriangle } from 'lucide-react'
import Header from '@/components/Header'
import { Link } from 'react-router-dom'

export default function DataManagementPage() {
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

  const handleDataExport = async () => {
    if (!user?.id) {
      setError('You must be logged in to export your data. Please sign in to continue.')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gdpr-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          action: 'export',
          userIdentifier: user.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to export data')
      }

      const data = await response.json()

      // Create and download the JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `peerly-data-export-${user.id}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setMessage('Your data has been exported successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data')
    } finally {
      setLoading(false)
    }
  }

  const handleDataDeletion = async () => {
    if (!user?.id) {
      setError('You must be logged in to delete your data. Please sign in to continue.')
      return
    }

    if (deleteConfirmation !== 'DELETE_MY_DATA') {
      setError('Please type "DELETE_MY_DATA" to confirm deletion')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gdpr-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          action: 'delete',
          userIdentifier: user.id,
          confirmation: 'DELETE_MY_DATA'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete data')
      }

      const data = await response.json()
      setMessage(data.message || 'Your data has been deleted successfully')

      // Redirect to home page after successful deletion
      setTimeout(() => {
        window.location.href = '/'
      }, 3000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-wrapper">
      <Header />
      <main className="page-container max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Data Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage your personal data and privacy settings
          </p>
          {!user && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-sm">
                <strong>Note:</strong> You must be logged in to export or delete your data.
                Please <Link to="/signin" className="underline hover:no-underline">sign in</Link> to continue.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Data Export Section */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Download className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold">Export Your Data</h2>
            </div>

            <p className="text-muted-foreground mb-4">
              Download a copy of all your personal data stored on Peerly, including your profile
              information, paper ratings, reviews, and reading lists.
            </p>

            <Button
              onClick={handleDataExport}
              disabled={loading || !user}
              className="mb-4"
            >
              {loading ? 'Exporting...' : !user ? 'Sign In Required' : 'Export My Data'}
            </Button>

            {!user && (
              <p className="text-sm text-muted-foreground mb-4">
                You must be logged in to export your data.
              </p>
            )}

            <p className="text-sm text-muted-foreground">
              This may take a few moments depending on the amount of data you have.
            </p>
          </Card>

          {/* Data Deletion Section */}
          <Card className="p-6 border-red-200">
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
              <h2 className="text-xl font-semibold text-red-900">Delete Your Account</h2>
            </div>

            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Warning:</strong> This action cannot be undone. All your data will be
                permanently deleted, including your profile, ratings, reviews, and reading lists.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label htmlFor="confirmation">
                  Type <code className="bg-red-100 px-1 rounded">DELETE_MY_DATA</code> to confirm:
                </Label>
                <Input
                  id="confirmation"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="DELETE_MY_DATA"
                  className="mt-2"
                />
              </div>

              <Button
                onClick={handleDataDeletion}
                disabled={loading || !user || deleteConfirmation !== 'DELETE_MY_DATA'}
                variant="destructive"
              >
                {loading ? 'Deleting...' : !user ? 'Sign In Required' : 'Delete My Account'}
              </Button>

              {!user && (
                <p className="text-sm text-muted-foreground mt-2">
                  You must be logged in to delete your account.
                </p>
              )}
            </div>
          </Card>

          {/* Messages */}
          {message && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                {message}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Contact Information */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Need Help?</h2>
            <p className="text-muted-foreground mb-4">
              If you have any questions about your data or need assistance with these features,
              please contact us:
            </p>
            <p>
              <a
                href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL}`}
                className="text-blue-600 hover:underline"
              >
                {import.meta.env.VITE_SUPPORT_EMAIL}
              </a>
            </p>
          </Card>
        </div>
      </main>
    </div>
  )
}
