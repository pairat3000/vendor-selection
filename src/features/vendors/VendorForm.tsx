import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVendorStore } from '@/stores/vendorStore'
import { useVendorFieldStore } from '@/stores/vendorFieldStore'
import { useAuthStore } from '@/stores/authStore'
import { VENDOR_TYPES, PAYMENT_TERMS, type Vendor } from './types'
import DynamicFieldInput from './DynamicFieldInput'

interface Props {
  vendor?: Vendor
}

interface FormData {
  name: string
  tax_id: string
  type: string
  address: string
  payment_terms: string
  contact_name: string
  contact_email: string
  contact_phone: string
}

const EMPTY: FormData = {
  name: '', tax_id: '', type: 'company', address: '',
  payment_terms: 'Net 30', contact_name: '', contact_email: '', contact_phone: '',
}

export default function VendorForm({ vendor }: Props) {
  const [form, setForm] = useState<FormData>(EMPTY)
  const [dynValues, setDynValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { createVendor, updateVendor } = useVendorStore()
  const { fields, fetchFields, fetchValues, saveValues } = useVendorFieldStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => { void fetchFields() }, [fetchFields])

  useEffect(() => {
    if (vendor) {
      setForm({
        name: vendor.name,
        tax_id: vendor.tax_id ?? '',
        type: vendor.type,
        address: vendor.address ?? '',
        payment_terms: vendor.payment_terms ?? 'Net 30',
        contact_name: vendor.contact_name ?? '',
        contact_email: vendor.contact_email ?? '',
        contact_phone: vendor.contact_phone ?? '',
      })
      // Load existing dynamic field values
      void fetchValues(vendor.id).then((vals) => {
        const map: Record<string, string> = {}
        vals.forEach((v) => { map[v.field_key] = v.value ?? '' })
        setDynValues(map)
      })
    }
  }, [vendor, fetchValues])

  const setField = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const val = e.target.value
      setForm((prev) => ({ ...prev, [field]: val }))
    }

  const handleDynChange = (key: string, value: string) => {
    setDynValues((prev) => ({ ...prev, [key]: value }))
  }

  // Validate required dynamic fields
  const validateDynFields = (): boolean => {
    for (const field of fields) {
      if (field.is_required && field.field_type !== 'boolean') {
        if (!dynValues[field.field_key]) return false
      }
    }
    return true
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validateDynFields()) {
      setError('กรุณากรอกข้อมูลใน custom fields ที่จำเป็นให้ครบ')
      return
    }
    setError(null)
    setSaving(true)

    const baseData = {
      name: form.name,
      tax_id: form.tax_id || null,
      type: form.type,
      address: form.address || null,
      payment_terms: form.payment_terms || null,
      contact_name: form.contact_name || null,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
    }

    if (vendor) {
      const { error: err } = await updateVendor(vendor.id, baseData)
      if (err) { setError(err); setSaving(false); return }
      const { error: dynErr } = await saveValues(vendor.id, dynValues)
      if (dynErr) { setError(dynErr); setSaving(false); return }
      navigate(`/vendors/${vendor.id}`)
    } else {
      const { error: err, id } = await createVendor({
        ...baseData,
        status: 'pending',
        created_by: user?.id ?? null,
        is_active: true,
      })
      if (err) { setError(err); setSaving(false); return }
      if (id && Object.keys(dynValues).length > 0) {
        await saveValues(id, dynValues)
      }
      navigate(`/vendors/${id ?? ''}`)
    }
    setSaving(false)
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ข้อมูลบริษัท */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">ข้อมูลบริษัท</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              ชื่อบริษัท <span className="text-red-500">*</span>
            </label>
            <input required value={form.name} onChange={setField('name')}
              className="input w-full" placeholder="บริษัท xxxxxxxx จำกัด" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">เลขนิติบุคคล</label>
            <input value={form.tax_id} onChange={setField('tax_id')}
              className="input w-full" placeholder="0000000000000" maxLength={13} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">ประเภทผู้ประกอบการ</label>
            <select value={form.type} onChange={setField('type')} className="input w-full">
              {VENDOR_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">ที่อยู่</label>
            <textarea value={form.address} onChange={setField('address')} rows={2}
              className="input w-full resize-none" placeholder="ที่อยู่บริษัท" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">เงื่อนไขการชำระเงิน</label>
            <select value={form.payment_terms} onChange={setField('payment_terms')} className="input w-full">
              {PAYMENT_TERMS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ผู้ติดต่อ */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">ผู้ติดต่อ</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">ชื่อผู้ติดต่อ</label>
            <input value={form.contact_name} onChange={setField('contact_name')}
              className="input w-full" placeholder="ชื่อ-นามสกุล" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">เบอร์โทรศัพท์</label>
            <input value={form.contact_phone} onChange={setField('contact_phone')}
              className="input w-full" placeholder="02-xxx-xxxx" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">อีเมล</label>
            <input type="email" value={form.contact_email} onChange={setField('contact_email')}
              className="input w-full" placeholder="contact@company.co.th" />
          </div>
        </div>
      </div>

      {/* Dynamic Fields */}
      {fields.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            ข้อมูลเพิ่มเติม
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.id} className={field.field_type === 'boolean' ? 'flex items-center' : ''}>
                {field.field_type !== 'boolean' && (
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {field.field_label}
                    {field.is_required && <span className="ml-1 text-red-500">*</span>}
                  </label>
                )}
                <DynamicFieldInput
                  field={field}
                  value={dynValues[field.field_key] ?? ''}
                  onChange={handleDynChange}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button type="button" onClick={() => { navigate('/vendors') }}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
          ยกเลิก
        </button>
        <button type="submit" disabled={saving}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'กำลังบันทึก...' : vendor ? 'บันทึกการแก้ไข' : 'เพิ่ม Vendor'}
        </button>
      </div>
    </form>
  )
}
