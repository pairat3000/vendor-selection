interface Props {
  status: 'pending' | 'approved' | 'rejected'
}

const CONFIG = {
  pending:  { label: 'รอตรวจสอบ', className: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'อนุมัติแล้ว', className: 'bg-green-100 text-green-800' },
  rejected: { label: 'ปฏิเสธ',     className: 'bg-red-100 text-red-800' },
}

export default function StatusBadge({ status }: Props) {
  const { label, className } = CONFIG[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
