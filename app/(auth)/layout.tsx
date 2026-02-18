export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo / App Name */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Ekklesia
          </h1>
          <p className="text-sm text-zinc-500 mt-1">إكليسيا</p>
        </div>
        {children}
      </div>
    </div>
  )
}
