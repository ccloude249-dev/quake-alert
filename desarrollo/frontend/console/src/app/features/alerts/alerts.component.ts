import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertService } from '../../core/alert.service';
import { Alert } from '../../core/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'qa-alerts',
  standalone: true,
  imports: [FormsModule],
  template: `
    <!-- Simulador: ingresa un evento al Alert Engine -->
    <section style="background:var(--qa-surface);border:1px solid var(--qa-border);border-radius:16px;padding:20px 22px;margin-bottom:20px">
      <div class="qa-mono" style="font-size:12px;color:var(--qa-muted);margin-bottom:14px">SIMULAR EVENTO SÍSMICO</div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end">
        <label style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--qa-muted)">Magnitud
          <input type="number" step="0.1" [(ngModel)]="magnitude" style="width:90px;padding:9px;border-radius:8px;border:1px solid var(--qa-border);background:#0b121c;color:#fff" /></label>
        <label style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--qa-muted)">Prof. km
          <input type="number" [(ngModel)]="depthKm" style="width:90px;padding:9px;border-radius:8px;border:1px solid var(--qa-border);background:#0b121c;color:#fff" /></label>
        <label style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--qa-muted)">Lat
          <input type="number" step="0.001" [(ngModel)]="lat" style="width:110px;padding:9px;border-radius:8px;border:1px solid var(--qa-border);background:#0b121c;color:#fff" /></label>
        <label style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--qa-muted)">Lng
          <input type="number" step="0.001" [(ngModel)]="lng" style="width:110px;padding:9px;border-radius:8px;border:1px solid var(--qa-border);background:#0b121c;color:#fff" /></label>
        <button (click)="simulate()" class="qa-display" style="border:none;cursor:pointer;padding:11px 22px;border-radius:10px;background:linear-gradient(135deg,#fb5670,#c4243d);color:#fff;font-weight:600;font-size:14px">Disparar evento</button>
        <button (click)="refresh()" class="qa-display" style="border:1px solid var(--qa-border);cursor:pointer;padding:11px 18px;border-radius:10px;background:transparent;color:var(--qa-muted);font-weight:600;font-size:14px">Refrescar</button>
      </div>
    </section>

    <div class="qa-mono" style="font-size:12px;color:var(--qa-muted);margin-bottom:12px">
      ALERTAS RECIENTES @if (loading()) { · cargando… } @else { · {{ alerts().length }} }
    </div>

    @if (alerts().length === 0) {
      <div style="border:1px dashed var(--qa-border);border-radius:14px;padding:30px;text-align:center;color:var(--qa-muted)">
        Sin alertas todavía. Dispara un evento o verifica que el Alert Engine esté arriba en
        <code>{{ engineUrl }}</code>.
      </div>
    } @else {
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">
        @for (a of alerts(); track a._id) {
          <div [style.border]="'1px solid ' + riskColor(a.risk)" style="border-radius:14px;background:var(--qa-surface);padding:18px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span class="qa-display" style="font-weight:600;font-size:17px;color:#fff">{{ a.targetName }}</span>
              <span class="qa-mono" [style.color]="riskColor(a.risk)" style="font-size:11px">{{ a.risk }}</span>
            </div>
            <div style="display:flex;gap:18px;margin-top:14px">
              <div><div style="font-size:11px;color:var(--qa-muted)">LLEGADA</div><div class="qa-display" style="font-weight:600;font-size:22px;color:var(--qa-cyan)">{{ a.arrivalSeconds }}s</div></div>
              <div><div style="font-size:11px;color:var(--qa-muted)">INTENSIDAD</div><div class="qa-display" style="font-weight:600;font-size:22px;color:#fff">{{ a.intensity }}</div></div>
              <div><div style="font-size:11px;color:var(--qa-muted)">DIST.</div><div class="qa-display" style="font-weight:600;font-size:22px;color:#fff">{{ a.distanceKm }}km</div></div>
            </div>
            <div style="margin-top:12px;font-size:12px;color:var(--qa-muted)">Canales: {{ a.channels.join(' · ') }}</div>
          </div>
        }
      </div>
    }
  `,
})
export class AlertsComponent implements OnInit {
  private svc = inject(AlertService);

  alerts = signal<Alert[]>([]);
  loading = signal(false);

  magnitude = 6.8;
  depthKm = 24;
  lat = 14.305;
  lng = -90.785;
  engineUrl = environment.alertEngineUrl;

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.svc.listAlerts().subscribe({
      next: (r) => { this.alerts.set(r.alerts ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  simulate(): void {
    this.svc
      .ingestEvent({ magnitude: +this.magnitude, depthKm: +this.depthKm, epicenter: { lat: +this.lat, lng: +this.lng } })
      .subscribe({ next: () => setTimeout(() => this.refresh(), 350) });
  }

  riskColor(r: string): string {
    return r === 'rojo' ? 'var(--qa-red)' : r === 'amarillo' ? 'var(--qa-amber)' : 'var(--qa-green)';
  }
}
