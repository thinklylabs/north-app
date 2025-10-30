import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)



function getSupabaseForUser(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  if (!anonKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const accessToken = authHeader.replace('Bearer ', '')
    const supabase = getSupabaseForUser(accessToken)

    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Determine if requester is an admin
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    const isAdmin = requesterProfile?.role === 'admin'

    const { searchParams } = new URL(req.url)
    const postIdParam = searchParams.get('postId')
    const ideaIdParam = searchParams.get('ideaId')

    const postId = postIdParam ? Number(postIdParam) : undefined
    const ideaId = ideaIdParam ? Number(ideaIdParam) : undefined
    if ((!postId && !ideaId) || (postId && ideaId)) {
      return NextResponse.json({ error: 'Provide either postId or ideaId' }, { status: 400 })
    }

    // Authorization: non-admin users may only read feedback for THEIR OWN post/idea
    // Store ownership info for later use in deciding whether to use admin client
    let isContentOwner = false
    
    if (!isAdmin) {
      if (postId) {
        const { data: postOwner } = await supabase
          .from('posts')
          .select('user_id')
          .eq('id', postId)
          .maybeSingle()
        if (!postOwner || postOwner.user_id !== user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        isContentOwner = true
      }
      if (ideaId) {
        const { data: ideaOwner } = await supabase
          .from('ideas')
          .select('user_id')
          .eq('id', ideaId)
          .maybeSingle()
        if (!ideaOwner || ideaOwner.user_id !== user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        isContentOwner = true
      }
    }

    // Fetch feedback rows for target. Query both legacy (feedback_for, target_id) 
    // and normalized (post_id, idea_id) columns for robustness
    const targetType = postId ? 'post' : 'idea'
    const targetId = (postId || ideaId) as number

    // Use admin client if: user is admin OR user owns the content
    // This allows content owners to bypass RLS and see ALL feedback on their content, including admin feedback
    const useAdminClient = isAdmin || isContentOwner
    const db = useAdminClient ? createAdminClient() : supabase

    const { data: feedbackRows, error: feedbackErr } = await db
      .from('feedbacks')
      .select('id, user_id, feedback, created_at')
      .eq('feedback_for', targetType)
      .eq('target_id', targetId)
      .order('created_at', { ascending: true })

    if (feedbackErr) {
      return NextResponse.json({ error: feedbackErr.message }, { status: 400 })
    }

    const authorIds = Array.from(new Set((feedbackRows || []).map(r => r.user_id)))
    let authorRoles: Record<string, 'admin' | 'user'> = {}
    let authorNames: Record<string, string> = {}
    if (authorIds.length > 0) {
      const { data: profiles } = await db
        .from('profiles')
        .select('id, role, first_name, last_name')
        .in('id', authorIds as string[])
      for (const p of profiles || []) {
        authorRoles[p.id as unknown as string] = (p.role === 'admin') ? 'admin' : 'user'
        // Create display name from first_name and last_name, fallback to email or 'Unknown User'
        const firstName = p.first_name?.trim() || ''
        const lastName = p.last_name?.trim() || ''
        authorNames[p.id as unknown as string] = firstName && lastName
          ? `${firstName} ${lastName}`
          : firstName || lastName || 'Unknown User'
      }
    }

    // Insight resolution for display
    let insightPayload: any = null
    if (postId) {
      const { data: post } = await db
        .from('posts')
        .select('insight_id')
        .eq('id', postId)
        .single()
      const insightId = (post?.insight_id as number | null) ?? null
      if (insightId) {
        const { data: insight } = await db
          .from('insights')
          .select('id, insight')
          .eq('id', insightId)
          .maybeSingle()
        if (insight) insightPayload = insight
      }
    } else if (ideaId) {
      const { data: insight } = await db
        .from('insights')
        .select('id, insight')
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (insight) insightPayload = insight
    }

    const messages = (feedbackRows || []).map(r => ({
      id: r.id,
      authorUserId: r.user_id,
      authorRole: authorRoles[r.user_id] || 'user',
      authorName: authorNames[r.user_id] || 'Unknown User',
      body: r.feedback,
      createdAt: r.created_at,
    }))

    return NextResponse.json({
      targetType,
      targetId,
      insight: insightPayload,
      messages,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const accessToken = authHeader.replace('Bearer ', '')
    const supabase = getSupabaseForUser(accessToken)

    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({})) as {
      feedback_for?: string
      target_id?: number
      targetType?: string
      targetId?: number
      feedback?: string
    }

    // Support both legacy and new field names
    let feedback_for = (body.feedback_for || body.targetType || '').toLowerCase().trim()
    const target_id = Number(body.target_id ?? body.targetId)
    const feedback = (body.feedback || '').trim()

    // Allowed values must match DB check constraint
    const ALLOWED = new Set(['insight', 'hook', 'post', 'idea'])
    if (!ALLOWED.has(feedback_for)) {
      return NextResponse.json({ error: 'Invalid feedback_for' }, { status: 400 })
    }
    if (!Number.isFinite(target_id) || !feedback) {
      return NextResponse.json({ error: 'Missing target_id or feedback' }, { status: 400 })
    }

    // Derive normalized columns
    const targetTypeNormalized = (feedback_for === 'post' || feedback_for === 'idea') ? feedback_for : null
    const postIdNormalized = targetTypeNormalized === 'post' ? target_id : null
    const ideaIdNormalized = targetTypeNormalized === 'idea' ? target_id : null

    // Determine author_role snapshot; enforce ownership only for non-admin users
    let authorRole: 'user' | 'admin' = 'user'
    {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.role === 'admin') authorRole = 'admin'
    }

    // Only enforce ownership for non-admin users - admins can give feedback on any post/idea
    if (authorRole !== 'admin') {
      if (postIdNormalized) {
        const { data: postOwner } = await supabase
          .from('posts')
          .select('user_id')
          .eq('id', postIdNormalized)
          .maybeSingle()
        if (!postOwner || postOwner.user_id !== user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
      if (ideaIdNormalized) {
        const { data: ideaOwner } = await supabase
          .from('ideas')
          .select('user_id')
          .eq('id', ideaIdNormalized)
          .maybeSingle()
        if (!ideaOwner || ideaOwner.user_id !== user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    }

    // Fill insight_id from target if available
    let insightIdNormalized: number | null = null
    if (postIdNormalized) {
      const { data: postRow } = await supabase
        .from('posts')
        .select('insight_id')
        .eq('id', postIdNormalized)
        .single()
      insightIdNormalized = (postRow?.insight_id as number | null) ?? null
    } else if (ideaIdNormalized) {
      const { data: ideaInsight } = await supabase
        .from('insights')
        .select('id')
        .eq('idea_id', ideaIdNormalized)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      insightIdNormalized = (ideaInsight?.id as number | null) ?? null
    }

    const { error: insertErr } = await supabase
      .from('feedbacks')
      .insert({
        user_id: user.id,
        feedback_for,
        target_id,
        feedback,
        // normalized fields
        target_type: targetTypeNormalized,
        post_id: postIdNormalized,
        idea_id: ideaIdNormalized,
        author_role: authorRole,
        insight_id: insightIdNormalized,
      })

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 400 })
    }

    // Send email notification after successful feedback submission
    // This is wrapped in try-catch so email failures don't affect feedback saving
    try {

      console.log("Feedback added. Sending email notification...")
      if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY not configured')
      }

      let feedbackAuthorEmail = user?.email || 'North User'
      // const feedbackAuthorName = user?.user_metadata?.name || user?.email || 'No Name Provided'

      // Determine who should receive the email and get target details
      let recipientEmail = process.env.ADMIN_EMAIL || 'vedant@thinklylabs.com'
      let recipientName = 'North Admin'
      let targetDetails = ''

      if (authorRole === 'admin') {
        // Admin is giving feedback - send to the owner of the post/idea
        feedbackAuthorEmail = process.env.ADMIN_EMAIL || 'vedant@thinklylabs.com'
        if (feedback_for === 'idea' && ideaIdNormalized) {
          // Use admin client to bypass RLS when admin is giving feedback
          const adminClient = createAdminClient()
          const { data: idea } = await adminClient
            .from('ideas')
            .select('idea_topic, user_id')
            .eq('id', ideaIdNormalized)
            .single()

          if (idea) {
            // Get the owner's profile
            const { data: ownerProfile } = await supabase
              .from('profiles')
              .select('email, first_name, last_name')
              .eq('id', idea.user_id)
              .single()

            if (ownerProfile) {
              recipientEmail = ownerProfile.email
              recipientName = ownerProfile.first_name && ownerProfile.last_name
                ? `${ownerProfile.first_name} ${ownerProfile.last_name}`
                : ownerProfile.first_name || ownerProfile.email || 'Unknown User'
            } else {
              // Try with admin client to bypass RLS
              const adminClient = createAdminClient()
              const { data: adminProfile } = await adminClient
                .from('profiles')
                .select('email, first_name, last_name')
                .eq('id', idea.user_id)
                .single()

              if (adminProfile) {
                recipientEmail = adminProfile.email
                recipientName = adminProfile.first_name && adminProfile.last_name
                  ? `${adminProfile.first_name} ${adminProfile.last_name}`
                  : adminProfile.first_name || adminProfile.email || 'Unknown User'
              }
            }
          } else {
            throw new Error(`Idea ID ${ideaIdNormalized} not found - cannot send notification email`)
          }
          targetDetails = idea?.idea_topic ? `Idea: "${idea.idea_topic}"` : `Idea ID: ${ideaIdNormalized}`
        } else if (feedback_for === 'post' && postIdNormalized) {
          // Use admin client to bypass RLS when admin is giving feedback
          const adminClient = createAdminClient()
          const { data: post } = await adminClient
            .from('posts')
            .select('user_id')
            .eq('id', postIdNormalized)
            .single()

          if (post) {
            // Get the owner's profile
            const { data: ownerProfile } = await supabase
              .from('profiles')
              .select('email, first_name, last_name')
              .eq('id', post.user_id)
              .single()

            if (ownerProfile) {
              recipientEmail = ownerProfile.email
              recipientName = ownerProfile.first_name && ownerProfile.last_name
                ? `${ownerProfile.first_name} ${ownerProfile.last_name}`
                : ownerProfile.first_name || ownerProfile.email || 'Unknown User'
            } else {
              // Try with admin client to bypass RLS
              const adminClient = createAdminClient()
              const { data: adminProfile } = await adminClient
                .from('profiles')
                .select('email, first_name, last_name')
                .eq('id', post.user_id)
                .single()

              if (adminProfile) {
                recipientEmail = adminProfile.email
                recipientName = adminProfile.first_name && adminProfile.last_name
                  ? `${adminProfile.first_name} ${adminProfile.last_name}`
                  : adminProfile.first_name || adminProfile.email || 'Unknown User'
              }
            }
          } else {
            throw new Error(`Post ID ${postIdNormalized} not found - cannot send notification email`)
          }
          targetDetails = `Post ID: ${postIdNormalized}`
        } else {
          targetDetails = `${feedback_for} ID: ${target_id}`
        }
      } else {
        // User is giving feedback - send to admin (existing behavior)
        if (feedback_for === 'idea' && ideaIdNormalized) {
          const { data: idea } = await supabase
            .from('ideas')
            .select('idea_topic')
            .eq('id', ideaIdNormalized)
            .single()
          targetDetails = idea?.idea_topic ? `Idea: "${idea.idea_topic}"` : `Idea ID: ${ideaIdNormalized}`
        } else if (feedback_for === 'post' && postIdNormalized) {
          targetDetails = `Post ID: ${postIdNormalized}`
        } else {
          targetDetails = `${feedback_for} ID: ${target_id}`
        }
      }

      const isAdminFeedback = authorRole === 'admin'

      const sendResult = await resend.emails.send({
        from: `North Feedback Update <${process.env.ADMIN_EMAIL}>`,
        to: recipientEmail,
        subject: `${isAdminFeedback ? 'Admin Feedback on Your' : 'New User Feedback on'} ${feedback_for.charAt(0).toUpperCase() + feedback_for.slice(1)}`,
        html: `
          <h2>${isAdminFeedback ? '📝 Admin Feedback Received' : '💬 New User Feedback'}</h2>
          ${isAdminFeedback ? `<p>Hi ${recipientName},</p><p>An admin has provided feedback on your ${feedback_for}:</p>` : ''}
          <p><strong>Feedback by:</strong> North ${authorRole === 'admin' ? 'Admin' : 'User'} ${ authorRole === 'admin' ? '' : feedbackAuthorEmail}</p>
          <p><strong>Here's what they said:</strong></p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid ${isAdminFeedback ? '#0077b5' : '#1DC6A1'};">
            ${feedback.replace(/\n/g, '<br>')}
          </div>
          <p><em>Submitted at: ${new Date().toLocaleString()}</em></p>
          <hr style="margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">
            ${isAdminFeedback
            ? 'This feedback was provided by an admin to help improve your content. You can view and respond to this feedback in your North dashboard.'
            : 'This notification was sent because a user provided feedback on content on North.'
          }
          </p>
          <p style="font-size: 11px; color: #999;">
            Please do not reply to this email as it is not monitored. Use the North platform to respond to feedback.
          </p>
        `,
      })


    } catch (emailError: any) {
      console.error('Email notification failed:', emailError.message)
      // Don't fail the request - feedback was still saved successfully
    }

    return NextResponse.json({ message: 'Feedback submitted' })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}


