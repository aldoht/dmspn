export function Card({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-surface p-4">
      {title && (
        <h2 className="mb-3 font-display text-lg font-semibold text-text-primary">
          {title}
        </h2>
      )}

      <div className="flex flex-1 items-center justify-center">{children}</div>
    </div>
  );
}
