import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';

export default function useTeams(user) {
  const [teams, setTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [myRole, setMyRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user's teams
  const fetchTeams = useCallback(async () => {
    if (!user || !supabase) { setTeams([]); setLoading(false); return; }

    try {
      // Fetch memberships first, then teams separately (avoids PostgREST FK ambiguity)
      const { data: memberships, error: memErr } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', user.id);

      if (memErr) throw memErr;
      if (!memberships || memberships.length === 0) { setTeams([]); return; }

      const teamIds = memberships.map(m => m.team_id);
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, created_at')
        .in('id', teamIds);

      if (error) throw error;

      const teamList = (data || []).map(team => {
        const membership = memberships.find(m => m.team_id === team.id);
        return {
          id: team.id,
          name: team.name,
          createdAt: team.created_at,
          myRole: membership?.role || 'member',
        };
      });

      setTeams(teamList);
    } catch (err) {
      console.warn('Error fetching teams:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  // Fetch members of a specific team
  const fetchMembers = useCallback(async (teamId) => {
    if (!teamId || !supabase) { setTeamMembers([]); return; }

    try {
      // Fetch members, then profiles separately (avoids PostgREST FK ambiguity)
      const { data: memData, error: memErr } = await supabase
        .from('team_members')
        .select('user_id, role')
        .eq('team_id', teamId);

      if (memErr) throw memErr;

      const userIds = (memData || []).map(m => m.user_id);
      const { data: profileData } = userIds.length > 0
        ? await supabase.from('profiles').select('id, email, display_name').in('id', userIds)
        : { data: [] };

      const members = (memData || []).map(m => {
        const profile = (profileData || []).find(p => p.id === m.user_id);
        return {
          userId: m.user_id,
          role: m.role,
          email: profile?.email,
          displayName: profile?.display_name,
        };
      });

      setTeamMembers(members);

      // Set my role for this team
      const me = members.find(m => m.userId === user?.id);
      setMyRole(me?.role || null);
    } catch (err) {
      console.warn('Error fetching team members:', err);
    }
  }, [user]);

  // Invite a member by email (admin only)
  const inviteMember = useCallback(async (teamId, email) => {
    if (!supabase) throw new Error('Supabase no configurado');

    const { error } = await supabase
      .from('team_invites')
      .insert({
        team_id: teamId,
        email: email.toLowerCase().trim(),
        invited_by: user?.id,
      });

    if (error) {
      if (error.message?.includes('duplicate')) throw new Error('Ya fue invitado');
      throw error;
    }
  }, [user]);

  // Update team name (admin only)
  const updateTeamName = useCallback(async (teamId, name) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('teams')
      .update({ name })
      .eq('id', teamId);
    if (error) throw error;
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, name } : t));
  }, []);

  return {
    teams,
    teamMembers,
    myRole,
    loading,
    fetchTeams,
    fetchMembers,
    inviteMember,
    updateTeamName,
    isAdmin: myRole === 'admin',
  };
}
