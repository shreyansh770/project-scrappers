export default function StatsBar({ stats }) {
  const items = [
    { label: 'Total Scrapers', value: stats.totalScrapers, color: 'text-purple-400' },
    { label: 'Active', value: stats.activeScrapers, color: 'text-green-400' },
    { label: 'Failed (24h)', value: stats.failedLast24h, color: stats.failedLast24h > 0 ? 'text-red-400' : 'text-green-400' },
    { label: 'Records (Recent)', value: stats.totalRecordsRecent.toLocaleString(), color: 'text-blue-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-surface-3 border-b border-surface-3">
      {items.map((s) => (
        <div key={s.label} className="bg-surface-1 px-5 py-4">
          <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">
            {s.label}
          </div>
          <div className={`text-2xl font-extrabold font-mono ${s.color}`}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}
