import { Injectable, inject } from '@angular/core';
import { ExerciseCategory } from './models';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

/**
 * Plain, transferable shape of a routine — what travels between users when a
 * routine is shared. Mirrors the local Routine → Days → Blocks → Exercises tree
 * but with no ids, so it can be cloned into any device's local DB.
 */
export interface SharedExercise {
  name: string;
  reps: string;
  category: ExerciseCategory;
  icon: string;
  isTimeBased: boolean;
  targetTimeSeconds: number | null;
}
export interface SharedBlock {
  name: string;
  series: number;
  exercises: SharedExercise[];
}
export interface SharedDay {
  name: string;
  blocks: SharedBlock[];
}
export interface SharedRoutine {
  name: string;
  icon: string;
  frequency: string;
  days: SharedDay[];
}

export interface ReceivedRoutine {
  id: string;
  fromUsername: string;
  fromUserId: string;
  routine: SharedRoutine;
}

export interface Contact {
  username: string;
  icon: string;
  subtitle: string;
  linked: boolean;
}

export type ShareResult = 'ok' | 'not_found' | 'self' | 'error';

/**
 * Community backend: routine sharing over Supabase `routine_shares`.
 * The inbox = PENDING shares addressed to me; contacts = people who've shared
 * with me (there's no separate friends table yet).
 */
@Injectable({ providedIn: 'root' })
export class CommunityService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  private get sb() {
    return this.supabase.client;
  }

  async getInbox(): Promise<ReceivedRoutine[]> {
    const uid = this.auth.user()?.id;
    if (!uid) {
      return [];
    }
    const { data, error } = await this.sb
      .from('routine_shares')
      .select('id, routine_payload, shared_by, sender:shared_by(username)')
      .eq('shared_to', uid)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });
    if (error || !data) {
      return [];
    }
    return data.map((r: any) => ({
      id: String(r.id),
      fromUsername: `@${r.sender?.username ?? 'usuario'}`,
      fromUserId: r.shared_by,
      routine: r.routine_payload as SharedRoutine,
    }));
  }

  async getContacts(): Promise<Contact[]> {
    const uid = this.auth.user()?.id;
    if (!uid) {
      return [];
    }
    const { data, error } = await this.sb
      .from('routine_shares')
      .select('sender:shared_by(username)')
      .eq('shared_to', uid);
    if (error || !data) {
      return [];
    }
    const seen = new Set<string>();
    const out: Contact[] = [];
    for (const r of data as any[]) {
      const u = r.sender?.username;
      if (u && !seen.has(u)) {
        seen.add(u);
        out.push({
          username: `@${u}`,
          icon: '💪',
          subtitle: 'Te compartió rutinas',
          linked: false,
        });
      }
    }
    return out;
  }

  /** Send a routine to @username. */
  async share(payload: SharedRoutine, toUsername: string): Promise<ShareResult> {
    const uid = this.auth.user()?.id;
    if (!uid) {
      return 'error';
    }
    const clean = toUsername.trim().replace(/^@+/, '');
    const { data: recipient } = await this.sb
      .from('users')
      .select('id')
      .eq('username', clean)
      .maybeSingle();
    if (!recipient) {
      return 'not_found';
    }
    if (recipient.id === uid) {
      return 'self';
    }
    const { error } = await this.sb.from('routine_shares').insert({
      routine_payload: payload,
      shared_by: uid,
      shared_to: recipient.id,
      status: 'PENDING',
    });
    return error ? 'error' : 'ok';
  }

  async accept(shareId: string): Promise<void> {
    await this.sb
      .from('routine_shares')
      .update({ status: 'ACCEPTED' })
      .eq('id', Number(shareId));
  }

  async reject(shareId: string): Promise<void> {
    await this.sb
      .from('routine_shares')
      .update({ status: 'REJECTED' })
      .eq('id', Number(shareId));
  }

  /** Report a shared routine as offensive/inappropriate. */
  async report(shareId: string, reportedUserId: string): Promise<void> {
    const uid = this.auth.user()?.id;
    if (!uid) {
      return;
    }
    await this.sb.from('content_reports').insert({
      reporter: uid,
      share_id: Number(shareId),
      reported_user: reportedUserId,
      reason: 'user_report',
    });
    await this.reject(shareId);
  }

  /** Block a user so they can no longer share routines with me. */
  async block(userId: string): Promise<void> {
    const uid = this.auth.user()?.id;
    if (!uid) {
      return;
    }
    await this.sb
      .from('blocked_users')
      .upsert({ blocker: uid, blocked: userId });
  }
}
