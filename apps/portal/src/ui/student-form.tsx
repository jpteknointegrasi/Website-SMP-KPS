import React from 'react'
import { STUDENT_FIELDS, GENDER_LABEL, type FieldDef } from '@/modules/students/fields'
import { Field, Select, TextArea } from './kit'

type Values = Record<string, string | number | null | undefined>

export function FieldInput({ f, value, name, required }: { f: FieldDef; value?: string | number | null; name?: string; required?: boolean }) {
  const n = name ?? f.key
  const v = value === null || value === undefined ? '' : String(value)
  if (f.type === 'select')
    return <Select name={n} label={f.label} value={v} required={required ?? f.required} empty="— pilih —" options={(f.options ?? []).map((o) => [o, f.key === 'gender' ? GENDER_LABEL[o]! : o] as [string, string])} />
  if (f.type === 'textarea') return <TextArea name={n} label={f.label} value={v} rows={2} required={required ?? f.required} maxLength={f.max} />
  return (
    <Field
      name={n}
      label={f.label}
      value={v}
      type={f.type === 'date' ? 'date' : f.type === 'int' ? 'number' : f.key === 'email' ? 'email' : 'text'}
      required={required ?? f.required}
      maxLength={f.max}
      inputMode={f.key === 'nisn' || f.key === 'nik' || f.key === 'familyCardNo' ? 'numeric' : undefined}
      hint={f.sensitive ? 'Data terbatas: hanya terlihat petugas berwenang.' : undefined}
    />
  )
}

/** Buku Induk identity fields in two columns. Sensitive identifiers only when `sensitive` is allowed. */
export function StudentFields({ values = {}, sensitive }: { values?: Values; sensitive: boolean }) {
  const list = STUDENT_FIELDS.filter((f) => sensitive || !f.sensitive)
  return (
    <div className="f__row">
      {list.map((f) => (
        <div key={f.key} style={f.type === 'textarea' ? { gridColumn: '1 / -1' } : undefined}>
          <FieldInput f={f} value={values[f.key] as string} />
        </div>
      ))}
    </div>
  )
}
