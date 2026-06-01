import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRequestStore } from '@/stores/requestStore'
import { useAuthStore } from '@/stores/authStore'
import RequestStep1 from './RequestStep1'
import RequestStep2 from './RequestStep2'

export interface Step1Data {
  title: string
  budget: string
  type: string
  deadline: string
  description: string
}

const STEPS = ['ข้อมูล Request', 'เพิ่ม Vendor']

export default function RequestNewPage() {
  const [step, setStep] = useState(0)
  const [step1, setStep1] = useState<Step1Data>({
    title: '', budget: '', type: 'software', deadline: '', description: '',
  })
  const [requestId, setRequestId] = useState<string | null>(null)
  const { createRequest } = useRequestStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const handleStep1Next = async (data: Step1Data) => {
    setStep1(data)
    const { error, id } = await createRequest({
      title: data.title,
      budget: parseFloat(data.budget) || 0,
      type: data.type,
      deadline: data.deadline || null,
      description: data.description || null,
      status: 'draft',
      owner_id: user?.id ?? '',
      is_active: true,
    })
    if (error) throw new Error(error)
    if (!id) throw new Error('ไม่ได้รับ ID จากระบบ กรุณาลองใหม่')
    setRequestId(id)
    setStep(1)
  }

  const handleDone = () => {
    if (requestId) navigate(`/requests/${requestId}`)
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">สร้าง Selection Request</h1>

        {/* Step indicator */}
        <div className="mt-6 flex items-center gap-0">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                i < step ? 'bg-blue-600 text-white'
                  : i === step ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`ml-2 text-sm font-medium ${i === step ? 'text-gray-900' : 'text-gray-400'}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`mx-4 h-px w-16 ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-2xl">
        {step === 0 && (
          <RequestStep1 initialData={step1} onNext={handleStep1Next} />
        )}
        {step === 1 && requestId && (
          <RequestStep2 requestId={requestId} onDone={handleDone} />
        )}
      </div>
    </div>
  )
}
