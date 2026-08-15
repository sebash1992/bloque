import { Injectable, computed, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import type { Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

export interface AuthUser {
  id: string;
  username: string; // display form with leading '@'
  email?: string;
}

export type UsernameResult = 'ok' | 'taken' | 'invalid' | 'error';

const NATIVE_REDIRECT = 'bloque://auth-callback';

/**
 * Auth for the community features, backed by Supabase (Google / Apple OAuth).
 *
 * A username is auto-assigned on first login (never a required form after
 * sign-in — Sign in with Apple already provides name/email). Users can change
 * their @username later from the Comunidad tab.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase = inject(SupabaseService);

  readonly user = signal<AuthUser | null>(null);
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly username = computed(() => this.user()?.username ?? '');

  private get sb() {
    return this.supabase.client;
  }

  constructor() {
    this.init();
  }

  private async init() {
    const { data } = await this.sb.auth.getSession();
    if (data.session) {
      await this.loadProfile(data.session);
    }

    this.sb.auth.onAuthStateChange((_event, session) => {
      if (session) {
        this.loadProfile(session);
      } else {
        this.user.set(null);
      }
    });

    if (Capacitor.isNativePlatform()) {
      App.addListener('appUrlOpen', async ({ url }) => {
        if (!url.includes('auth-callback')) {
          return;
        }
        const code = new URL(url).searchParams.get('code');
        if (code) {
          await this.sb.auth.exchangeCodeForSession(code);
        }
        await Browser.close().catch(() => undefined);
      });
    }
  }

  async signInWithGoogle() {
    const native = Capacitor.isNativePlatform();
    const { data, error } = await this.sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: native ? NATIVE_REDIRECT : window.location.origin,
        skipBrowserRedirect: native,
      },
    });
    if (error) {
      throw error;
    }
    if (native && data?.url) {
      await Browser.open({ url: data.url, presentationStyle: 'popover' });
    }
  }

  /** Native Apple sign-in is available only in the iOS app. */
  get appleAvailable(): boolean {
    return Capacitor.isNativePlatform();
  }

  async signInWithApple() {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('apple-native-only');
    }
    const rawNonce = randomNonce();
    const hashedNonce = await sha256(rawNonce);
    const result = await SignInWithApple.authorize({
      clientId: 'com.sebaherrera.bloque',
      redirectURI: NATIVE_REDIRECT,
      scopes: 'email name',
      nonce: hashedNonce,
    });
    const idToken = result.response.identityToken;
    if (!idToken) {
      throw new Error('apple-no-token');
    }
    const { error } = await this.sb.auth.signInWithIdToken({
      provider: 'apple',
      token: idToken,
      nonce: rawNonce,
    });
    if (error) {
      throw error;
    }
  }

  async signOut() {
    await this.sb.auth.signOut();
    this.user.set(null);
  }

  /** Permanently delete the cloud account and all its data (Guideline 5.1.1). */
  async deleteAccount() {
    const { error } = await this.sb.rpc('delete_user_account');
    if (error) {
      throw error;
    }
    await this.sb.auth.signOut();
    this.user.set(null);
  }

  /** Change the @username (used to be found by others). */
  async changeUsername(newName: string): Promise<UsernameResult> {
    const clean = sanitizeUsername(newName);
    if (clean.length < 3) {
      return 'invalid';
    }
    const session = (await this.sb.auth.getSession()).data.session;
    if (!session) {
      return 'error';
    }
    const { data: taken } = await this.sb
      .from('users')
      .select('id')
      .eq('username', clean)
      .maybeSingle();
    if (taken && taken.id !== session.user.id) {
      return 'taken';
    }
    const { error } = await this.sb
      .from('users')
      .update({ username: clean })
      .eq('id', session.user.id);
    if (error) {
      return 'error';
    }
    this.user.set({
      id: session.user.id,
      username: `@${clean}`,
      email: session.user.email ?? undefined,
    });
    return 'ok';
  }

  private async loadProfile(session: Session) {
    const uid = session.user.id;
    const email = session.user.email ?? undefined;
    const { data: profile } = await this.sb
      .from('users')
      .select('username')
      .eq('id', uid)
      .maybeSingle();

    let username = profile?.username as string | undefined;
    if (!username) {
      const meta = session.user.user_metadata as
        | { full_name?: string; name?: string }
        | undefined;
      username = await this.ensureUsername(
        uid,
        email,
        meta?.full_name ?? meta?.name
      );
    }
    this.user.set({ id: uid, username: `@${username}`, email });
  }

  /** Create a unique username automatically on first login. */
  private async ensureUsername(
    uid: string,
    email?: string,
    name?: string
  ): Promise<string> {
    const base = deriveBase(name, email);
    const candidates = [
      base,
      `${base}${rand(2)}`,
      `${base}${rand(3)}`,
      `atleta${rand(5)}`,
    ];
    for (const candidate of candidates) {
      const { data: taken } = await this.sb
        .from('users')
        .select('id')
        .eq('username', candidate)
        .maybeSingle();
      if (taken) {
        continue;
      }
      const { error } = await this.sb
        .from('users')
        .insert({ id: uid, username: candidate, email });
      if (!error) {
        return candidate;
      }
    }
    const fallback = `atleta${Date.now().toString(36)}`;
    await this.sb.from('users').insert({ id: uid, username: fallback, email });
    return fallback;
  }
}

function deriveBase(name?: string, email?: string): string {
  let base = '';
  if (name) {
    base = name;
  } else if (email) {
    base = email.split('@')[0];
  }
  base = sanitizeUsername(base);
  if (base.length < 3) {
    base = 'atleta';
  }
  return base.slice(0, 16);
}

function sanitizeUsername(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9._]/g, '')
    .replace(/^[._]+|[._]+$/g, '');
}

function rand(n: number): string {
  return Math.random()
    .toString(36)
    .slice(2, 2 + n);
}

/** Random URL-safe nonce for the Apple sign-in flow. */
function randomNonce(length = 32): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) {
    out += chars[b % chars.length];
  }
  return out;
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
