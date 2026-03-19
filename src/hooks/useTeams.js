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
      const { data, error } = await supabase
        .from('team_members')
        .select('team_id, role, teams(id, name, created_at)')
        .eq('user_id', user.id);

      if (error) throw error;

      const teamList = (data || []).map(tm => ({
        id: tm.teams.id,
        name: tm.teams.name,
        createdAt: tm.teams.created_at,
        myRole: tm.role,
      }));

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
      const { data, error } = await supabase
        .from('team_members')
        .select('user_id, role, profiles(email, display_name)')
        .eq('team_id', teamId);

      if (error) throw error;

      const members = (data || []).map(m => ({
        userId: m.user_id,
        role: m.role,
        email: m.profiles?.email,
        displayName: m.profiles?.display_name,
      }));

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
