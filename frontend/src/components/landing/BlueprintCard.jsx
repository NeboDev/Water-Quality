const CORNER_POS = {
  tl: "top-0 left-0 border-t border-l",
  tr: "top-0 right-0 border-t border-r",
  bl: "bottom-0 left-0 border-b border-l",
  br: "bottom-0 right-0 border-b border-r",
};

function Corner({ pos }) {
  return <i className={`absolute w-2 h-2 border-black/40 pointer-events-none ${CORNER_POS[pos]}`} />;
}

// Réplica de la clase `.blueprint` del mockup (indefinida en este proyecto): borde fino tipo
// "dibujo técnico" con marcas en las 4 esquinas.
export default function BlueprintCard({ className = "", children, as: Tag = "div" }) {
  return (
    <Tag className={`relative border border-black/15 ${className}`}>
      <Corner pos="tl" /><Corner pos="tr" /><Corner pos="bl" /><Corner pos="br" />
      {children}
    </Tag>
  );
}
