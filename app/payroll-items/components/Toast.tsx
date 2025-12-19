'use client';

export default function Toast({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-slate-100 text-sm shadow-lg">
        <span>✅</span>
        <span>{message}</span>
      </div>
    </div>
  );
}
