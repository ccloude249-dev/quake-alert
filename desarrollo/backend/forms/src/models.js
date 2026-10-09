import mongoose from 'mongoose';

/** Un campo de la definición (coincide con el JSON del Form Builder). */
const FieldSchema = new mongoose.Schema(
  {
    type: { type: String, required: true }, // text, textarea, number, email, tel, date, select, checkbox, location
    label: { type: String, required: true },
    name: { type: String, required: true },
    required: { type: Boolean, default: false },
    placeholder: { type: String },
    options: { type: [String], default: undefined },
  },
  { _id: false }
);

/** Definición de un catálogo (lo que produce el Constructor de Formularios). */
const FormDefinitionSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    key: { type: String, required: true },     // slug del catálogo, ej. 'sensores'
    catalog: { type: String, required: true }, // nombre visible
    fields: { type: [FieldSchema], default: [] },
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);
FormDefinitionSchema.index({ tenantId: 1, key: 1 }, { unique: true });

/** Registro capturado con un formulario dinámico. Datos flexibles (Mixed). */
const FormSubmissionSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    formKey: { type: String, required: true, index: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const FormDefinition = mongoose.model('FormDefinition', FormDefinitionSchema);
export const FormSubmission = mongoose.model('FormSubmission', FormSubmissionSchema);
