// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

interface ClerkWebhookEvent {
  type: string
  data: {
    id: string
    object: string
    created_at: number
    updated_at: number
    email_addresses: Array<{
      id: string
      object: string
      email_address: string
      verification: {
        status: string
      }
    }>
    first_name?: string
    last_name?: string
    username?: string
    image_url?: string
    primary_email_address_id?: string
    external_accounts?: Array<{
      id: string
      object: string
      provider: string
      identification_id: string
      provider_user_id: string
      approved_scopes: string
      email_address: string
      given_name?: string
      family_name?: string
      username?: string
      avatar_url?: string
    }>
  }
}

Deno.serve(async (req) => {
  try {
    console.log('=== WEBHOOK REQUEST RECEIVED ===')
    console.log('Method:', req.method)
    console.log('URL:', req.url)
    console.log('Headers:', Object.fromEntries(req.headers.entries()))

    // Log environment variables (without exposing secrets)
    console.log('SUPABASE_URL present:', !!Deno.env.get('SUPABASE_URL'))
    console.log('SUPABASE_SERVICE_ROLE_KEY present:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))

    // Get raw body
    const body = await req.text()
    console.log('Raw body length:', body.length)
    console.log('Raw body preview:', body.substring(0, 500))

    // Try to parse as JSON
    let payload;
    try {
      payload = JSON.parse(body)
      console.log('=== PARSED PAYLOAD ===')
      console.log('Type:', payload.type)
      console.log('Data ID:', payload.data?.id)
      console.log('Full payload keys:', Object.keys(payload))
      console.log('Data keys:', payload.data ? Object.keys(payload.data) : 'No data')
    } catch (parseError) {
      console.log('Failed to parse JSON:', parseError.message)
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Handle different event types
    switch (payload.type) {
      case 'user.created':
        await handleUserCreated(payload.data)
        break
      case 'user.updated':
        await handleUserUpdated(payload.data)
        break
      case 'user.deleted':
        await handleUserDeleted(payload.data)
        break
      default:
        console.log('Unhandled event type:', payload.type)
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('=== WEBHOOK ERROR ===', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

async function handleUserCreated(userData: any) {
  console.log('=== HANDLING USER CREATED ===')
  console.log('User data keys:', Object.keys(userData))
  console.log('User data:', JSON.stringify(userData, null, 2))

  const userId = userData.id
  if (!userId) {
    throw new Error('No user ID in payload')
  }

  // Extract name from various possible sources
  let name: string | null = null

  // First, try external accounts (GitHub, Google, etc.) - these have more authentic data
  if (userData.external_accounts && Array.isArray(userData.external_accounts) && userData.external_accounts.length > 0) {
    console.log(`Found ${userData.external_accounts.length} external accounts`)

    // Log all external accounts for debugging
    userData.external_accounts.forEach((account, index) => {
      console.log(`External account ${index}: ${account.provider} - username: ${account.username}, name: ${account.given_name} ${account.family_name}`)
    })

    // Try to find the best account for name (prefer accounts with full names)
    let bestAccount = userData.external_accounts[0] // Default to first

    for (const account of userData.external_accounts) {
      if (account.given_name && account.family_name) {
        bestAccount = account // Prefer accounts with full names
        break
      }
    }

    if (bestAccount.given_name && bestAccount.family_name) {
      name = `${bestAccount.given_name} ${bestAccount.family_name}`
    } else if (bestAccount.given_name) {
      name = bestAccount.given_name
    } else if (bestAccount.family_name) {
      name = bestAccount.family_name
    } else if (bestAccount.username) {
      name = bestAccount.username
    }
  }

  // Fallback to direct name fields if no external account data
  if (!name) {
    if (userData.first_name && userData.last_name) {
      name = `${userData.first_name} ${userData.last_name}`
    } else if (userData.first_name) {
      name = userData.first_name
    } else if (userData.last_name) {
      name = userData.last_name
    } else if (userData.username) {
      name = userData.username
    }
  }

  // Try email as fallback
  if (!name && userData.email_addresses && Array.isArray(userData.email_addresses)) {
    const email = userData.email_addresses[0]?.email_address
    if (email) {
      name = email.split('@')[0]
    }
  }

  // Final fallback
  if (!name) {
    name = `User ${userId.slice(0, 8)}`
  }

  // Extract handle
  let handle: string | null = null

  // First, try external accounts for handle - prefer GitHub over Google
  if (userData.external_accounts && Array.isArray(userData.external_accounts) && userData.external_accounts.length > 0) {
    // Prefer GitHub for handles (better usernames than Google)
    const githubAccount = userData.external_accounts.find(account => account.provider === 'oauth_github')
    const googleAccount = userData.external_accounts.find(account => account.provider === 'oauth_google')

    // Use GitHub username if available, otherwise Google, otherwise first account
    const preferredAccount = githubAccount || googleAccount || userData.external_accounts[0]
    handle = preferredAccount?.username || null

    console.log(`Using ${preferredAccount?.provider} for handle: ${handle}`)
  }

  // Fallback to direct username
  if (!handle) {
    handle = userData.username || null
  }

  // Email fallback for handle
  if (!handle && userData.email_addresses && Array.isArray(userData.email_addresses)) {
    const email = userData.email_addresses[0]?.email_address
    if (email) {
      handle = email.split('@')[0]
    }
  }

  // Final fallback for handle
  if (!handle) {
    handle = `user_${userId.slice(0, 8)}`
  }

  console.log('Final extracted name:', name)
  console.log('Final extracted handle:', handle)

  // Extract image - prioritize external account avatar over Clerk's processed image
  let imageUrl: string | null = null
  if (userData.external_accounts && Array.isArray(userData.external_accounts) && userData.external_accounts.length > 0) {
    // Prefer GitHub avatar, then Google, then any account
    const githubAccount = userData.external_accounts.find(account => account.provider === 'oauth_github')
    const googleAccount = userData.external_accounts.find(account => account.provider === 'oauth_google')
    const preferredAccount = githubAccount || googleAccount || userData.external_accounts[0]

    imageUrl = preferredAccount?.avatar_url || preferredAccount?.image_url || null
    console.log(`Using ${preferredAccount?.provider} for image: ${imageUrl ? 'Found' : 'Not found'}`)
  }
  if (!imageUrl) {
    imageUrl = userData.image_url || null
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({
      clerk_id: userId,
      name: name,
      image: imageUrl,
      handle: handle
    }, {
      onConflict: 'clerk_id'
    })

  if (error) {
    console.error('Error creating profile:', error)
    throw error
  }

  console.log('Profile created successfully for user:', userId)
  
  // Track sign-up event
  trackSignUp(userData)
}

async function trackSignUp(userData: any) {
  // Determine sign-up method from external accounts
  let method: 'google' | 'github' | 'email' = 'email'
  
  if (userData.external_accounts && Array.isArray(userData.external_accounts) && userData.external_accounts.length > 0) {
    const googleAccount = userData.external_accounts.find(account => account.provider === 'oauth_google')
    const githubAccount = userData.external_accounts.find(account => account.provider === 'oauth_github')
    
    if (googleAccount) {
      method = 'google'
    } else if (githubAccount) {
      method = 'github'
    }
  }
  
  console.log(`Tracking sign-up event: method=${method}, userId=${userData.id}`)
  
  // Note: In a production environment, you would send this to your analytics service
  // For now, we'll just log it. You can integrate with Google Analytics, Mixpanel, etc.
}

async function handleUserUpdated(userData: ClerkWebhookEvent['data']) {
  console.log('=== HANDLING USER UPDATED ===')
  console.log('User data keys:', Object.keys(userData))
  console.log('User data:', JSON.stringify(userData, null, 2))

  // Extract name from various possible sources
  let name: string | null = null

  // First, try external accounts (GitHub, Google, etc.) - these have more authentic data
  if (userData.external_accounts && Array.isArray(userData.external_accounts) && userData.external_accounts.length > 0) {
    console.log(`Found ${userData.external_accounts.length} external accounts`)

    // Log all external accounts for debugging
    userData.external_accounts.forEach((account, index) => {
      console.log(`External account ${index}: ${account.provider} - username: ${account.username}, name: ${account.given_name} ${account.family_name}`)
    })

    // Try to find the best account for name (prefer accounts with full names)
    let bestAccount = userData.external_accounts[0] // Default to first

    for (const account of userData.external_accounts) {
      if (account.given_name && account.family_name) {
        bestAccount = account // Prefer accounts with full names
        break
      }
    }

    if (bestAccount.given_name && bestAccount.family_name) {
      name = `${bestAccount.given_name} ${bestAccount.family_name}`
    } else if (bestAccount.given_name) {
      name = bestAccount.given_name
    } else if (bestAccount.family_name) {
      name = bestAccount.family_name
    } else if (bestAccount.username) {
      name = bestAccount.username
    }
  }

  // Fallback to direct name fields if no external account data
  if (!name) {
    if (userData.first_name && userData.last_name) {
      name = `${userData.first_name} ${userData.last_name}`
    } else if (userData.first_name) {
      name = userData.first_name
    } else if (userData.last_name) {
      name = userData.last_name
    } else if (userData.username) {
      name = userData.username
    }
  }

  // Try email as fallback
  if (!name && userData.email_addresses && Array.isArray(userData.email_addresses)) {
    const email = userData.email_addresses[0]?.email_address
    if (email) {
      name = email.split('@')[0]
    }
  }

  // Final fallback
  if (!name) {
    name = `User ${userData.id.slice(0, 8)}`
  }

  // Extract handle
  let handle: string | null = null

  // First, try external accounts for handle - prefer GitHub over Google
  if (userData.external_accounts && Array.isArray(userData.external_accounts) && userData.external_accounts.length > 0) {
    // Prefer GitHub for handles (better usernames than Google)
    const githubAccount = userData.external_accounts.find(account => account.provider === 'oauth_github')
    const googleAccount = userData.external_accounts.find(account => account.provider === 'oauth_google')

    // Use GitHub username if available, otherwise Google, otherwise first account
    const preferredAccount = githubAccount || googleAccount || userData.external_accounts[0]
    handle = preferredAccount?.username || null

    console.log(`Using ${preferredAccount?.provider} for handle: ${handle}`)
  }

  // Fallback to direct username
  if (!handle) {
    handle = userData.username || null
  }

  // Email fallback for handle
  if (!handle && userData.email_addresses && Array.isArray(userData.email_addresses)) {
    const email = userData.email_addresses[0]?.email_address
    if (email) {
      handle = email.split('@')[0]
    }
  }

  // Final fallback for handle
  if (!handle) {
    handle = `user_${userData.id.slice(0, 8)}`
  }

  console.log('Final extracted name:', name)
  console.log('Final extracted handle:', handle)

  // Extract image - prioritize external account avatar over Clerk's processed image
  let imageUrl: string | null = null
  if (userData.external_accounts && Array.isArray(userData.external_accounts) && userData.external_accounts.length > 0) {
    // Prefer GitHub avatar, then Google, then any account
    const githubAccount = userData.external_accounts.find(account => account.provider === 'oauth_github')
    const googleAccount = userData.external_accounts.find(account => account.provider === 'oauth_google')
    const preferredAccount = githubAccount || googleAccount || userData.external_accounts[0]

    imageUrl = preferredAccount?.avatar_url || null
    console.log(`Using ${preferredAccount?.provider} for image: ${imageUrl ? 'Found' : 'Not found'}`)
  }
  if (!imageUrl) {
    imageUrl = userData.image_url || null
  }

  // Check if handle already exists and belongs to another user
  if (handle) {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('clerk_id')
      .eq('handle', handle)
      .single()

    if (existingProfile && existingProfile.clerk_id !== userData.id) {
      // Handle is taken by another user, append user ID to make it unique
      handle = `${handle}_${userData.id.slice(-4)}`
      console.log('Handle was taken, using unique handle:', handle)
    }
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({
      clerk_id: userData.id,
      name: name,
      image: imageUrl,
      handle: handle
    }, {
      onConflict: 'clerk_id'
    })

  if (error) {
    console.error('Error updating profile:', error)
    throw error
  }

  console.log('Profile updated successfully')
}

async function handleUserDeleted(userData: ClerkWebhookEvent['data']) {
  console.log('Deleting user profile for:', userData.id)

  // Note: You might want to soft delete instead of hard delete
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('clerk_id', userData.id)

  if (error) {
    console.error('Error deleting profile:', error)
    throw error
  }

  console.log('Profile deleted successfully')
}
