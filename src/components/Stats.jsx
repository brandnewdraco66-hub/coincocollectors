// Stats.jsx
const formatNumber = (num) => {
  if (num === undefined || num === null) return "0";
  const abs = Math.abs(num);
  if (abs >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (abs >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (abs >= 100_000) return (num / 1_000).toFixed(0) + "k";
  if (abs >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return num.toLocaleString();
};

export default function Stats({ cnp, incomePerSecond = 0 }) {
  return (
    <div className="stats-bar glass fade-in">
      <div className="stat">
        <span>CNP</span>
        <strong>{formatNumber(cnp)}</strong>
      </div>
      <div className="stat">
        <span>Income per second</span>
        <strong>{formatNumber(incomePerSecond)}</strong>
      </div>
    </div>
  );
}