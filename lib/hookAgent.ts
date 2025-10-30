import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { claudeMessage } from '@/lib/claude'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)


type HookResponse = {
  hook: string
  style: string
  notes: string
}

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env')
  return createSupabaseAdminClient(url, key)
}

function cleanJsonResponse(response: string): string {
  // Remove markdown code blocks
  let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  
  // Remove any text before the first { and after the last }
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1)
  }
  
  // Conservative cleaning - only fix obvious issues
  cleaned = cleaned
    .replace(/\n\s*\n/g, '\n') // Remove multiple newlines but preserve single ones
    .replace(/\s+$/, '') // Remove trailing whitespace
    .trim()
  
  return cleaned
}

function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}

function buildHookPrompt(
  idea_topic: string,
  idea_summary: string,
  idea_eq?: string | null,
  idea_takeaway?: string | null,
  writingStyle?: string | null,
  insightText?: string | null
) {
  return [
    '# :brain: Hook Strategist (Conversion Focus, Builder Tone)',
    '',
    '## :dart: Objective',
    'Given a **`post_idea`**, generate **exactly 1 high-performing opening hook** that aligns with proven founder content patterns and drives **scroll-stopping engagement**.',
    '',
    '---',
    '',
    '## :bust_in_silhouette: User Writing Style',
    String(writingStyle || '').trim()
      ? String(writingStyle || '').slice(0, 1200)
      : 'No saved writing style. Default to credible, human builder tone.',
    '',
    '## :bulb: RAG Insight to Consider',
    String(insightText || '').trim()
      ? String(insightText || '').slice(0, 1000)
      : 'No insight found. If empty, rely on the post idea details.',
    '',
    '---',
    '',
    '## :gear: Requirements',
    '',
    '### :mag: Logic',
    '1. **Read the post_idea** and identify the **1 sharpest, most distinct angle**.',
    '2. **Map the hook** to a performance pattern:',
    '   - **Stat / Result** → numeric proof, milestone, or before → after contrast.',
    '   - **Imperative / Command** → direct, no-nonsense call to think or act.',
    '   - **Question / Curiosity** → open loop that teases tension or learning.',
    '   - **Contrarian / Myth / Listicle / Timeline** → choose whichever fits best for this input.',
    '3. For **timeline hooks**, highlight evolution or growth.',
    '   For **listicles**, emphasize simplicity of structure (e.g. "3 things that…").',
    '   For **contrarian hooks**, spotlight friction against a common belief.',
    '4. Use `forward_guidance` and `critique_note` (if provided) to **refine phrasing, tone, and edge**.',
    '5. Mirror **the user’s writing style** above when phrasing the hook (fallback: human builder tone).',
    '6. Ensure the hook ties to a **dominant topic pillar** (*creative, metrics, AI, scaling/ops*).',
    '',
    '---',
    '',
    '### :bricks: Hard Rules',
    '- Exactly **1 hook total**.',
    '- Hook ≤ **15 words** (1 sentence only).',
    '- Must feel **human, builder, punchy** — no buzzwords, jargon, or fluff.',
    '- Hook must **clearly tie back** to the `source_idea`.',
    '- **No emojis or hashtags.**',
    '',
    '---',
    '',
    '## :receipt: Output Format',
    '',
    '```json',
    '{',
    '  "hook": "string (max 15 words, builder-tone, scroll-stopping opener)",',
    '  "style": "string (stat/result | imperative | question | contrarian/myth | listicle | timeline)",',
    '  "notes": "string (1–2 lines explaining why this hook was chosen and what emotion or contrast it triggers)"',
    '}',
    '```',
    '',
    'Post idea details:',
    `Topic: "${idea_topic}"`,
    `Summary: "${idea_summary}"`,
    `Emotional angle: "${idea_eq || ''}"`,
    `Takeaway: "${idea_takeaway || ''}"`,
    '',
    'Return ONLY the JSON object.'
  ].join('\n')
}

export async function generateHookForIdea(ideaId: number, isFromCron?: boolean): Promise<{ hook: string; postId: number }> {
  const db = getAdmin()

  const { data: idea, error: ideaErr } = await db
    .from('ideas')
    .select('id, user_id, idea_topic, idea_summary, idea_eq, idea_takeaway')
    .eq('id', ideaId)
    .maybeSingle()
  if (ideaErr) throw ideaErr
  if (!idea) throw new Error('Idea not found')

  // Fetch user writing style and the most recent insight for this idea (if any)
  const [styleResult, insightResult] = await Promise.all([
    db
      .from('linkedin_users')
      .select('writing_style')
      .eq('user_id', idea.user_id as any)
      .maybeSingle(),
    db
      .from('insights')
      .select('insight, created_at')
      .eq('idea_id', idea.id as any)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  ])

  const writingStyle = String(styleResult.data?.writing_style || '')
  const insightRaw = insightResult.data?.insight as any
  const insightText = typeof insightRaw === 'object' && insightRaw !== null
    ? String(insightRaw.insight || '')
    : String(insightRaw || '')

  const prompt = buildHookPrompt(
    String(idea.idea_topic || ''), 
    String(idea.idea_summary || ''), 
    idea.idea_eq, 
    idea.idea_takeaway,
    writingStyle,
    insightText
  )
  
  const response = await claudeMessage(prompt)
  
  try {
    const cleanResponse = cleanJsonResponse(response)
    console.log('Raw Claude response:', response)
    console.log('Cleaned response:', cleanResponse)
    
    if (!isValidJSON(cleanResponse)) {
      throw new Error('Invalid JSON after cleaning')
    }
    
    const parsed: HookResponse = JSON.parse(cleanResponse)
    const hook = parsed.hook || 'No hook generated'
    
    const { data: postRow, error: postErr } = await db
      .from('posts')
      .insert({
        user_id: idea.user_id,
        idea_id: idea.id,
        post_content: '',
        post_hook: hook,
        status: 'draft'
      })
      .select('id')
      .single()
    if (postErr) throw postErr

    // Send email notification about new post creation
    try {
      if (process.env.RESEND_API_KEY) {
        // Get user profile for email context
        const { data: userProfile } = await db
          .from('profiles')
          .select('email, first_name, last_name, company_name')
          .eq('id', idea.user_id)
          .single()

        const userName = userProfile?.first_name && userProfile?.last_name 
          ? `${userProfile.first_name} ${userProfile.last_name}`
          : userProfile?.first_name || userProfile?.email || 'Unknown User'
        const userEmail = userProfile?.email || 'Unknown Email'
        const companyName = userProfile?.company_name || 'No Company'

        const cronIndicator = isFromCron ? '🤖 (Automated via Cron)' : ''
        const emailSubject = `🤖 New Post Created by AI Agent - ${userName}`
        
        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1DC6A1; margin-bottom: 20px;">🤖 New Post Hook Created ${cronIndicator}</h2>
            
            <div style="background-color: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0 0 8px 0;"><strong>User:</strong> ${userName}</p>
              <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${userEmail}</p>
              <p style="margin: 0 0 8px 0;"><strong>Company:</strong> ${companyName}</p>
              <p style="margin: 0 0 8px 0;"><strong>Idea Topic:</strong> ${idea.idea_topic}</p>
            </div>

            <p style="margin-bottom: 8px;"><strong>Generated Hook:</strong></p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #1DC6A1; font-style: italic;">
              ${hook.replace(/\n/g, '<br>')}
            </div>

            <div style="background-color: #e8f4fd; padding: 12px; border-radius: 6px; margin: 16px 0;">
              <p style="margin: 0; color: #0066cc; font-size: 14px;">
                <strong>Status:</strong> Draft (AI will now generate full post content)
              </p>
              ${isFromCron ? `<p style="margin: 4px 0 0 0; color: #0066cc; font-size: 14px;"><strong>Trigger:</strong> Automated cron job</p>` : ''}
            </div>

            <p style="margin: 16px 0; color: #666; font-size: 13px;"><em>Created: ${new Date().toLocaleString()}</em></p>
            <p style="margin: 16px 0; color: #666; font-size: 13px;"><strong>Post ID:</strong> ${postRow.id} | <strong>Idea ID:</strong> ${idea.id}</p>
            
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #666; margin: 0;">
              This post hook was automatically created by North's AI Hook Agent${isFromCron ? ' via scheduled cron job' : ''}. Full post content will be generated next.
            </p>
            <p style="font-size: 11px; color: #999; margin: 8px 0 0 0;">
              Please do not reply to this email. Use the North platform to manage your content.
            </p>
          </div>
        `

        const adminEmail = process.env.ADMIN_EMAIL || 'ansh.shetty.22@gmail.com'
        
        // Always send to admin
        await resend.emails.send({
          from: 'North AI Agent <onboarding@resend.dev>',
          to: adminEmail,
          subject: emailSubject,
          html: emailHtml,
        })

        // If from cron job, also send to the user
        if (isFromCron && userEmail && userEmail !== 'Unknown Email') {
          await resend.emails.send({
            from: 'North AI Agent <onboarding@resend.dev>',
            to: userEmail,
            subject: `🤖 New Post Hook Created - ${idea.idea_topic}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1DC6A1; margin-bottom: 20px;">🤖 New Post Hook Created!</h2>
                
                <p style="margin-bottom: 16px;">Hi ${userName},</p>
                <p style="margin-bottom: 20px;">Great news! Our AI has automatically created a new post hook for your idea: <strong>"${idea.idea_topic}"</strong></p>
                
                <p style="margin-bottom: 8px;"><strong>Generated Hook:</strong></p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #1DC6A1; font-style: italic;">
                  ${hook.replace(/\n/g, '<br>')}
                </div>
                
                <div style="background-color: #f0f9ff; padding: 16px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0 0 12px 0; color: #1e40af; font-weight: 600;">What's Next?</p>
                  <ul style="margin: 0; padding-left: 20px; color: #374151;">
                    <li style="margin-bottom: 6px;">The AI will automatically generate full post content shortly</li>
                    <li style="margin-bottom: 6px;">You'll receive another notification when the full post is ready</li>
                    <li style="margin-bottom: 0;">Log into your North dashboard to review and publish</li>
                  </ul>
                </div>
                
                <p style="margin: 16px 0; color: #666; font-size: 13px;"><em>Created: ${new Date().toLocaleString()}</em></p>
                <p style="margin: 16px 0; color: #666; font-size: 13px;"><strong>Post ID:</strong> ${postRow.id}</p>
                
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 12px; color: #666; margin: 0;">
                  This post hook was automatically generated by North's AI system during a scheduled content creation process. 
                  You can manage your content preferences in your dashboard settings.
                </p>
              </div>
            `,
          })
        }
      }
    } catch (emailError) {
      console.error('Failed to send post creation notification:', emailError)
      // Don't fail the post creation if email fails
    }

    return { hook: hook, postId: postRow.id }
  } catch (error) {
    console.error('Failed to parse hook response:', error)
    console.error('Raw response:', response)
    
    // Enhanced fallback with retry
    const retryPrompt = `Return ONLY valid JSON in this exact format:
{
  "hook": "simple hook text",
  "style": "stat/result",
  "notes": "brief explanation"
}

Do not include any markdown, explanations, or additional text.`
    
    try {
      const retryResponse = await claudeMessage(retryPrompt)
      const retryCleaned = cleanJsonResponse(retryResponse)
      
      if (isValidJSON(retryCleaned)) {
        const retryParsed: HookResponse = JSON.parse(retryCleaned)
        const hook = retryParsed.hook || 'No hook generated'
        
        const { data: postRow, error: postErr } = await db
          .from('posts')
          .insert({
            user_id: idea.user_id,
            idea_id: idea.id,
            post_content: '',
            post_hook: hook,
            status: 'draft'
          })
          .select('id')
          .single()
        if (postErr) throw postErr

        return { hook: hook, postId: postRow.id }
      }
    } catch (retryError) {
      console.error('Retry also failed:', retryError)
    }
    
    // Final fallback to simple hook
    const fallbackHook = (await claudeMessage(`Write a LinkedIn hook for: ${idea.idea_topic}`)).slice(0, 300)
    
    const { data: postRow, error: postErr } = await db
      .from('posts')
      .insert({
        user_id: idea.user_id,
        idea_id: idea.id,
        post_content: '',
        post_hook: fallbackHook,
        status: 'draft'
      })
      .select('id')
      .single()
    if (postErr) throw postErr

    return { hook: fallbackHook, postId: postRow.id }
  }
}


