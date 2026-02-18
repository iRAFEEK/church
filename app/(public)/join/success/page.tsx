export default function JoinSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm text-center">
        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-zinc-900 mb-3">أهلاً بك في عائلتنا!</h1>
        <p className="text-zinc-500 leading-relaxed mb-6">
          تم تسجيل زيارتك بنجاح. سيتواصل معك أحد أعضاء فريقنا خلال 48 ساعة لمساعدتك في الاندماج مع الكنيسة.
        </p>

        <div className="bg-zinc-50 rounded-xl p-4 text-right space-y-2 mb-6">
          <p className="text-sm font-medium text-zinc-700">في انتظارك:</p>
          <p className="text-sm text-zinc-500">✓ مكالمة ترحيب من أحد قادتنا</p>
          <p className="text-sm text-zinc-500">✓ دعوة للانضمام إلى مجموعة صغيرة</p>
          <p className="text-sm text-zinc-500">✓ التعرف على عائلة الكنيسة</p>
        </div>

        <p className="text-xs text-zinc-400">
          إذا كانت لديك أي أسئلة، لا تتردد في التواصل معنا مباشرة.
        </p>
      </div>
    </div>
  )
}
