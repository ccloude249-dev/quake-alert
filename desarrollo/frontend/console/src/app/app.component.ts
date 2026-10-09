import { Component } from '@angular/core';
import { AlertsComponent } from './features/alerts/alerts.component';

@Component({
  selector: 'qa-root',
  standalone: true,
  imports: [AlertsComponent],
  template: `
    <header style="display:flex;align-items:center;gap:14px;padding:18px 30px;border-bottom:1px solid var(--qa-border);background:#080d16">
      <div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#22d3ee,#0e7490);display:flex;align-items:center;justify-content:center;color:#06141a;font-size:17px">◉</div>
      <div>
        <div class="qa-display" style="font-weight:600;font-size:18px;color:#fff">QUAKE ALERT · Consola</div>
        <div class="qa-mono" style="font-size:11px;color:var(--qa-muted);margin-top:1px">ALERT ENGINE · TIEMPO REAL</div>
      </div>
    </header>
    <main style="padding:24px 30px">
      <qa-alerts></qa-alerts>
    </main>
  `,
})
export class AppComponent {}
