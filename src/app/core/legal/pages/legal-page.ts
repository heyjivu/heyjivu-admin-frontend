import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

type LegalPageKind = 'privacy' | 'terms' | 'oauth';

interface ScopeRow {
  scope: string;
  feature: string;
  why: string;
  data: string;
}

@Component({
  selector: 'app-legal-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './legal-page.html',
  styleUrl: './legal-page.scss',
})
export class LegalPageComponent {
  private readonly route = inject(ActivatedRoute);

  readonly page = (this.route.snapshot.data['page'] as LegalPageKind | undefined) ?? 'privacy';
  readonly updatedOn = 'May 30, 2026';

  private readonly titles: Record<LegalPageKind, string> = {
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    oauth: 'Google OAuth Disclosure',
  };

  private readonly intros: Record<LegalPageKind, string> = {
    privacy: 'How HeyJivu collects, uses, and protects account, content, and connected service data.',
    terms: 'The basic rules for using HeyJivu, managing your account, and connecting third-party services.',
    oauth: 'A concise explanation of the Google permissions HeyJivu requests and why each permission is needed.',
  };

  readonly scopeRows: ScopeRow[] = [
    {
      scope: 'openid, email, profile',
      feature: 'Google Sign-In',
      why: 'Create or sign in to a HeyJivu account without a separate password.',
      data: 'Basic Google account identity from the ID token, including email, name, and profile image when provided.',
    },
    {
      scope: 'https://www.googleapis.com/auth/drive.file',
      feature: 'Optional Google Drive storage',
      why: 'Let users store, organize, and process HeyJivu-created files in their own Google Drive.',
      data: 'Only files and folders created by HeyJivu or explicitly selected for use with HeyJivu.',
    },
    {
      scope: 'YouTube publishing scopes, only when enabled',
      feature: 'Optional YouTube publishing',
      why: 'Publish videos the user creates in HeyJivu to the connected YouTube channel after explicit authorization.',
      data: 'Only the connected channel and the videos or metadata the user chooses to publish.',
    },
  ];

  get pageTitle(): string {
    return this.titles[this.page];
  }

  get pageIntro(): string {
    return this.intros[this.page];
  }

  trackByScope(_: number, row: ScopeRow): string {
    return row.scope;
  }
}
