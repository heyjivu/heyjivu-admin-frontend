import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect } from '@angular/core';
import { AuthStore } from '../../core/auth/state/auth.store';

@Directive({
  selector: '[appIsGranted]',
  standalone: true
})
export class IsGrantedDirective {
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private authStore = inject(AuthStore);

  private _right: string | undefined = undefined;
  private _hasView = false;

  @Input() set appIsGranted(right: string | undefined | null) {
    this._right = right ?? undefined;
    this.updateView();
  }

  constructor() {
    // Re-evaluate when user/rights change
    effect(() => {
      this.authStore.user();
      this.updateView();
    });
  }

  private updateView() {
    // If no right is specified, it's public/granted by default
    const hasRight = !this._right || this.authStore.hasRight()(this._right);
    
    if (hasRight && !this._hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this._hasView = true;
    } else if (!hasRight && this._hasView) {
      this.viewContainer.clear();
      this._hasView = false;
    }
  }
}

