// app/company/layout.tsx
export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="p-6 max-w-4xl mx-auto">{children}</div>;
}
