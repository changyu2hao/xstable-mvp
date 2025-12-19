// app/payroll-items/page.tsx
import PayrollItemsClient from './PayrollItemsClient';

export default function PayrollItemsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Payroll items</h1>
      {/* 不再从这里传 props，全部交给客户端组件自己从 URL 读 */}
      <PayrollItemsClient />
    </div>
  );
}
