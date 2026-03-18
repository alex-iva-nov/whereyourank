type BrandWordmarkProps = {
  subtitle?: string;
};

export function BrandWordmark({ subtitle }: BrandWordmarkProps) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: "0.24em", color: "#f5f5f5", textTransform: "uppercase" }}>WhereYouRank</p>
      {subtitle ? <p style={{ margin: "6px 0 0", color: "#7c7c7c", fontSize: 13 }}>{subtitle}</p> : null}
    </div>
  );
}
