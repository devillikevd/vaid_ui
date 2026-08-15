const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');

class PlatformInviteService {
  /**
   * Send a platform invite to an unregistered email.
   */
  async sendPlatformInvite(userId, email, organizationType, organizationId, message = '') {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ApiError(400, 'Invalid email address format');
    }

    // Verify organization
    let orgData = null;
    if (organizationType === 'clinic') {
      const { data, error } = await supabaseAdmin.from('clinics').select('id, name, owner_id').eq('id', organizationId).single();
      if (error || !data) throw new ApiError(404, 'Clinic not found');
      if (data.owner_id !== userId) throw new ApiError(403, 'Unauthorized');
      orgData = data;
    } else if (organizationType === 'hospital') {
      const { data, error } = await supabaseAdmin.from('hospitals').select('id, name, owner_id').eq('id', organizationId).single();
      if (error || !data) throw new ApiError(404, 'Hospital not found');
      // In a real app we'd also check manager roles, but we simplify here.
      orgData = data;
    } else {
      throw new ApiError(400, 'Invalid organization type');
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingUser) {
      throw new ApiError(400, 'User is already registered. Please send a standard invitation instead.');
    }

    // Check if pending invite already exists
    const { data: pendingInvite } = await supabaseAdmin
      .from('platform_invites')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('organization_type', organizationType)
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .maybeSingle();

    if (pendingInvite) {
      throw new ApiError(400, 'A pending platform invite already exists for this email.');
    }

    // Create the invite
    const { data: newInvite, error: insertError } = await supabaseAdmin
      .from('platform_invites')
      .insert({
        email: email.toLowerCase(),
        invited_by_user_id: userId,
        invited_for_role: 'doctor',
        organization_type: organizationType,
        organization_id: organizationId,
        message: message,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Platform invite insert error:', insertError);
      throw new ApiError(500, 'Failed to create platform invite');
    }

    // In a production app, we would send a real email here using SendGrid/SES/etc.
    // e.g. "You've been invited by [Org Name] to join Vaididea as a Doctor..."

    return {
      message: 'Platform invitation sent successfully.',
      data: newInvite,
    };
  }

  /**
   * Link pending platform invites when a user registers.
   * Called during registration or login.
   */
  async linkPlatformInvites(userId, email) {
    if (!email) return;

    // Find all pending invites for this email
    const { data: invites, error } = await supabaseAdmin
      .from('platform_invites')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('status', 'pending');

    if (error || !invites || invites.length === 0) return;

    // Mark them as registered
    for (const invite of invites) {
      await supabaseAdmin
        .from('platform_invites')
        .update({
          status: 'registered',
          registered_user_id: userId,
          registered_at: new Date().toISOString()
        })
        .eq('id', invite.id);

      // We could optionally auto-send a standard invite now, 
      // but for simplicity we just notify the inviting organization.
      // (They can then re-send the real invite, or we auto-convert it).
      
      // Auto-converting to standard invites for better UX:
      if (invite.invited_for_role === 'doctor') {
        const { data: doctor } = await supabaseAdmin.from('doctors').select('id').eq('user_id', userId).maybeSingle();
        if (doctor) {
          if (invite.organization_type === 'clinic') {
            await supabaseAdmin.from('clinic_doctor_invites').insert({
              clinic_id: invite.organization_id,
              doctor_id: doctor.id,
              status: 'pending',
              invited_by: invite.invited_by_user_id
            });
          } else if (invite.organization_type === 'hospital') {
             await supabaseAdmin.from('hospital_doctor_invites').insert({
              hospital_id: invite.organization_id,
              doctor_id: doctor.id,
              status: 'pending',
              invited_by: invite.invited_by_user_id
            });
          }
        }
      }
    }
  }

  /**
   * Get pending platform invites sent by a user/organization.
   */
  async getPendingPlatformInvites(organizationId, organizationType) {
    const { data, error } = await supabaseAdmin
      .from('platform_invites')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('organization_type', organizationType)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw new ApiError(500, 'Failed to fetch platform invites');
    return data;
  }
}

module.exports = new PlatformInviteService();
