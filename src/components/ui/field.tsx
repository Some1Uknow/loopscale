export function Field({
  label,
  hint,
  required,
  children
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="mono-label text-mutedForeground">
          {label}
          {required ? <span className="ml-1 text-danger">*</span> : null}
        </span>
      </div>
      {children}
      {hint ? <p className="text-xs leading-5 text-mutedForeground">{hint}</p> : null}
    </label>
  );
}
