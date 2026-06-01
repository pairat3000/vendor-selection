import type { Database } from '@/types/database'

type VendorField = Database['public']['Tables']['vendor_fields']['Row']

interface Props {
  field: VendorField
  value: string
  onChange: (key: string, value: string) => void
}

export default function DynamicFieldInput({ field, value, onChange }: Props) {
  const baseClass = 'input w-full'

  const handleChange = (val: string) => { onChange(field.field_key, val) }

  if (field.field_type === 'boolean') {
    return (
      <div className="flex items-center gap-2">
        <input
          id={field.field_key}
          type="checkbox"
          checked={value === 'true'}
          onChange={(e) => { handleChange(e.target.checked ? 'true' : 'false') }}
          className="h-4 w-4 rounded border-gray-300 text-blue-600"
        />
        <label htmlFor={field.field_key} className="text-sm text-gray-700">
          {field.field_label}
        </label>
      </div>
    )
  }

  if (field.field_type === 'date') {
    return (
      <input
        type="date"
        value={value}
        onChange={(e) => { handleChange(e.target.value) }}
        required={field.is_required}
        className={baseClass}
      />
    )
  }

  if (field.field_type === 'number') {
    return (
      <input
        type="number"
        value={value}
        onChange={(e) => { handleChange(e.target.value) }}
        required={field.is_required}
        className={baseClass}
      />
    )
  }

  // text (default)
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => { handleChange(e.target.value) }}
      required={field.is_required}
      className={baseClass}
    />
  )
}
