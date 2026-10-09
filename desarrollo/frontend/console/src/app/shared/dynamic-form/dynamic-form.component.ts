import { Component, Input, OnChanges, inject, output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FieldDef, FormDefinition } from './form-definition.model';

/**
 * Renderiza CUALQUIER definición de formulario (la que produce el Form Builder /
 * entrega el microservicio `forms`) como un Reactive Form funcional.
 * La misma definición se usa en la consola web y en la app Ionic.
 */
@Component({
  selector: 'qa-dynamic-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    @if (definition) {
      <form [formGroup]="form" (ngSubmit)="submit()" style="display:flex;flex-direction:column;gap:18px">
        @for (f of definition.fields; track f.name) {
          <div>
            <label style="display:block;font-size:14px;color:#cdd9e8;margin-bottom:7px;font-weight:500">
              {{ f.label }} @if (f.required) { <span style="color:#fb5670">*</span> }
            </label>

            @switch (f.type) {
              @case ('textarea') {
                <textarea [formControlName]="f.name" [placeholder]="f.placeholder || ''" rows="3"
                  style="width:100%;padding:12px 14px;border-radius:10px;border:1px solid rgba(120,160,200,0.2);background:#0b121c;color:#fff;font-size:15px"></textarea>
              }
              @case ('select') {
                <select [formControlName]="f.name"
                  style="width:100%;padding:12px 14px;border-radius:10px;border:1px solid rgba(120,160,200,0.2);background:#0b121c;color:#fff;font-size:15px">
                  <option value="">—</option>
                  @for (o of f.options || []; track o) { <option [value]="o">{{ o }}</option> }
                </select>
              }
              @case ('checkbox') {
                <label style="display:flex;align-items:center;gap:10px;color:#9fb4ad;font-size:14px">
                  <input type="checkbox" [formControlName]="f.name" style="width:18px;height:18px" />
                  {{ f.placeholder || 'Sí' }}
                </label>
              }
              @default {
                <input [type]="inputType(f)" [formControlName]="f.name" [placeholder]="f.placeholder || ''"
                  style="width:100%;padding:12px 14px;border-radius:10px;border:1px solid rgba(120,160,200,0.2);background:#0b121c;color:#fff;font-size:15px" />
              }
            }
          </div>
        }
        <button type="submit"
          style="border:none;cursor:pointer;padding:13px 26px;border-radius:11px;background:linear-gradient(135deg,#22d3ee,#0e7490);color:#06141a;font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:15px">
          Guardar registro
        </button>
      </form>
    }
  `,
})
export class DynamicFormComponent implements OnChanges {
  @Input({ required: true }) definition!: FormDefinition;
  submitted = output<Record<string, unknown>>();

  private fb = inject(FormBuilder);
  form: FormGroup = this.fb.group({});

  ngOnChanges(): void {
    const group: Record<string, unknown> = {};
    for (const f of this.definition?.fields ?? []) {
      const validators = f.required ? [Validators.required] : [];
      if (f.type === 'email') validators.push(Validators.email);
      group[f.name] = [f.type === 'checkbox' ? false : '', validators];
    }
    this.form = this.fb.group(group);
  }

  inputType(f: FieldDef): string {
    switch (f.type) {
      case 'number': return 'number';
      case 'date': return 'date';
      case 'email': return 'email';
      case 'tel': return 'tel';
      default: return 'text';
    }
  }

  submit(): void {
    if (this.form.valid) this.submitted.emit(this.form.value);
    else this.form.markAllAsTouched();
  }
}
