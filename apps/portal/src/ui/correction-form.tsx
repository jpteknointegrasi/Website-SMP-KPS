import React from 'react'
import { STUDENT_FIELDS } from '@/modules/students/fields'
import { ActionForm, FileField, Submit, TextArea } from './kit'
import { FieldInput } from './student-form'

/** Correction request: per field "ubah" checkbox, current value, new value; reason and evidence (REG-03). */
export function CorrectionForm({ studentId, values, back, sensitive }: { studentId: string; values: Record<string, string | number | null>; back: string; sensitive: boolean }) {
  return (
    <ActionForm action="koreksi.ajukan" back={back} files hidden={{ id: studentId }}>
      <div className="tablewrap">
        <table className="t">
          <thead>
            <tr>
              <th>Ubah</th>
              <th>Data</th>
              <th>Saat ini</th>
              <th>Usulan baru</th>
            </tr>
          </thead>
          <tbody>
            {STUDENT_FIELDS.filter((f) => sensitive || !f.sensitive).map((f) => (
              <tr key={f.key}>
                <td>
                  <input type="checkbox" name={`ubah_${f.key}`} aria-label={`Ubah ${f.label}`} />
                </td>
                <td>{f.label}</td>
                <td className="muted">{f.sensitive ? (values[f.key] ? '•••• tersimpan' : '—') : (values[f.key] ?? '—')}</td>
                <td style={{ minWidth: 220 }}>
                  <FieldInput f={f} name={`baru_${f.key}`} value={f.sensitive ? '' : values[f.key]} required={false} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TextArea name="alasan" label="Alasan / penjelasan" required rows={3} placeholder="Contoh: perubahan nama sesuai akta kelahiran terbaru." />
      <FileField name="bukti" label="Dokumen pendukung (opsional)" accept=".pdf,.jpg,.jpeg,.png" hint="PDF/JPG/PNG maksimal 5 MB." />
      <div className="f__actions">
        <Submit>Kirim usulan koreksi</Submit>
      </div>
    </ActionForm>
  )
}
