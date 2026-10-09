import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FormDefinition } from '../shared/dynamic-form/form-definition.model';

/** Cliente del microservicio Forms (catálogos dinámicos). */
@Injectable({ providedIn: 'root' })
export class FormsService {
  private http = inject(HttpClient);
  private base = environment.formsUrl;
  private headers = new HttpHeaders({ 'x-tenant-id': environment.tenantId });

  listDefinitions(): Observable<Array<{ key: string; catalog: string }>> {
    return this.http.get<Array<{ key: string; catalog: string }>>(`${this.base}/forms`, { headers: this.headers });
  }
  getDefinition(key: string): Observable<FormDefinition> {
    return this.http.get<FormDefinition>(`${this.base}/forms/${key}`, { headers: this.headers });
  }
  saveDefinition(key: string, def: FormDefinition): Observable<FormDefinition> {
    return this.http.put<FormDefinition>(`${this.base}/forms/${key}`, def, { headers: this.headers });
  }
  submit(key: string, data: Record<string, unknown>): Observable<unknown> {
    return this.http.post(`${this.base}/forms/${key}/submissions`, { data }, { headers: this.headers });
  }
}
