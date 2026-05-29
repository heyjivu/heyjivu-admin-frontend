import { Injectable, inject, Type } from '@angular/core';
import { DialogService as PrimeDialogService, DynamicDialogRef } from 'primeng/dynamicdialog';

export interface DialogOptions {
  header?: string;
  width?: string;
  data?: any;
  closable?: boolean;
  closeOnEscape?: boolean;
  dismissableMask?: boolean;
}

const DEFAULT_OPTIONS: any = {
  modal: true,
  draggable: false,
  resizable: false,
  closable: true,
  closeOnEscape: true,
  dismissableMask: true,
  styleClass: 'consistent-dialog',
  showHeader: true,
  breakpoints: { '768px': '100vw', '576px': '100vw' }
};

@Injectable({ providedIn: 'root' })
export class DialogService {
  private primeDialog = inject(PrimeDialogService);

  open<T>(component: Type<T>, options?: DialogOptions) {
    return this.primeDialog.open(component, {
      ...DEFAULT_OPTIONS,
      header: options?.header,
      width: options?.width ?? '500px',
      data: options?.data,
      closable: options?.closable ?? DEFAULT_OPTIONS.closable,
      closeOnEscape: options?.closeOnEscape ?? DEFAULT_OPTIONS.closeOnEscape,
      dismissableMask: options?.dismissableMask ?? DEFAULT_OPTIONS.dismissableMask,
    }) as DynamicDialogRef<T>;
  }
}
