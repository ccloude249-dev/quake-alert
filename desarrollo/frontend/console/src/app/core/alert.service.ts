import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Alert, SeismicEventInput } from './models';

/** Cliente del microservicio Alert Engine. */
@Injectable({ providedIn: 'root' })
export class AlertService {
  private http = inject(HttpClient);
  private base = environment.alertEngineUrl;
  private headers = new HttpHeaders({ 'x-tenant-id': environment.tenantId });

  listAlerts(): Observable<{ count: number; alerts: Alert[] }> {
    return this.http.get<{ count: number; alerts: Alert[] }>(
      `${this.base}/alerts`, { headers: this.headers }
    );
  }

  ingestEvent(evt: SeismicEventInput): Observable<unknown> {
    return this.http.post(`${this.base}/events`, evt, { headers: this.headers });
  }
}
