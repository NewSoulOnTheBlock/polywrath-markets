export function Card({ children, className = '', ...props }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, change, positive }: { label: string; value: string; change?: string; positive?: boolean }) {
  return (
    <Card>
      <p className="text-sm text-[var(--muted)] mb-1">{label}</p>
      <p className="text-2xl font-bold font-mono">{value}</p>
      {change && (
        <p className={`text-sm mt-1 ${positive ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
          {positive ? '+' : ''}{change}
        </p>
      )}
    </Card>
  );
}
