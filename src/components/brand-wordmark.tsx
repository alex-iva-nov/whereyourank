type BrandWordmarkProps = {
  subtitle?: string;
};

export function BrandWordmark({ subtitle }: BrandWordmarkProps) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: "0.02em", color: "#1f2937" }}>WhereYouRank</p>
      {subtitle ? <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 13 }}>{subtitle}</p> : null}
    </div>
  );
}