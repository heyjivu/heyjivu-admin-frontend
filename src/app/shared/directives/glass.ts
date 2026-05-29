import { Directive, ElementRef, Input, OnInit, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appGlass]',
  standalone: true
})
export class GlassDirective implements OnInit {
  @Input() opacity = 0.05;
  @Input() blur = 10;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit() {
    // Use CSS custom properties for theming support
    const host = this.el.nativeElement;
    this.renderer.setStyle(host, '--glass-opacity', this.opacity);
    this.renderer.setStyle(host, '--glass-blur', `${this.blur}px`);
    this.renderer.addClass(host, 'glass-panel');
  }
}
