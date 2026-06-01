import VendorForm from './VendorForm'

export default function VendorNewPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">เพิ่ม Vendor ใหม่</h1>
        <p className="mt-1 text-sm text-gray-500">กรอกข้อมูลให้ครบแล้วกด "เพิ่ม Vendor"</p>
      </div>
      <div className="max-w-2xl">
        <VendorForm />
      </div>
    </div>
  )
}
