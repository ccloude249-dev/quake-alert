export interface FieldDef {
  type: 'text' | 'textarea' | 'number' | 'email' | 'tel' | 'date' | 'select' | 'checkbox' | 'location';
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

export interface FormDefinition {
  key?: string;
  catalog: string;
  fields: FieldDef[];
}
