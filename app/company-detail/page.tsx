// app/company-detail/page.tsx
import CompanyDetailClient from './CompanyDetailClient';
import { Suspense } from 'react';

export default function CompanyDetailPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <CompanyDetailClient />
    </Suspense>
  );
}
