export default function CardCorners({ color = "border-slate-400" }) {
  const base = `absolute w-2.5 h-2.5 pointer-events-none ${color}`;
  return (
    <>
      <span className={`${base} -top-px -left-px border-t border-l`} />
      <span className={`${base} -top-px -right-px border-t border-r`} />
      <span className={`${base} -bottom-px -left-px border-b border-l`} />
      <span className={`${base} -bottom-px -right-px border-b border-r`} />
    </>
  );
}
