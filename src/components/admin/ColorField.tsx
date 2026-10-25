'use client'

import type { TextFieldClientComponent } from 'payload'

import { FieldDescription, FieldError, FieldLabel, useField } from '@payloadcms/ui'
import React from 'react'

export const ColorField: TextFieldClientComponent = ({ field, path }) => {
  const { value, setValue, showError, errorMessage } = useField<string>({ path })
  const inputId = `field-${path.replace(/\./g, '__')}`

  return (
    <div className="field-type text" style={{ marginBottom: 'var(--base)' }}>
      <FieldLabel htmlFor={inputId} label={field.label} path={path} required={field.required} />
      <FieldError message={errorMessage} path={path} showError={showError} />
      <input
        id={inputId}
        onChange={(event) => setValue(event.target.value)}
        style={{ width: 64, height: 40, padding: 2, cursor: 'pointer' }}
        type="color"
        value={value || '#000000'}
      />
      {field.admin?.description ? (
        <FieldDescription description={field.admin.description} path={path} />
      ) : null}
    </div>
  )
}
