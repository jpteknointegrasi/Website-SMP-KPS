import React from 'react'
export const FieldError = ({ errors, k }: { errors: Record<string, string>; k: string }) =>
  errors[k] ? (
    <span className="field-error" id={`err-${k}`}>
      {errors[k]}
    </span>
  ) : null
