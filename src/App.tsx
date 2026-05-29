import { BrowserRouter, Route, Routes } from 'react-router-dom'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900">Vendor Selection</h1>
                <p className="mt-2 text-gray-500">DoHome IT — ระบบคัดเลือก Vendor</p>
              </div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
