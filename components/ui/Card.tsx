export function Card({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      {title ? (
        <h2 className="mb-3 font-display text-lg font-semibold text-text-primary">
          {title}
        </h2>
      ) : (
        <></>
      )}
      {children}
    </div>
  );
}
