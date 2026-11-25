(function (root) {
    'use strict';

    const NPD = root.NPD = root.NPD || {};
    const React = root.React;
    if (!React) return;

    const h = React.createElement;
    const { useState, useMemo, memo } = React;
    const Recharts = root.Recharts || {};
    const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } = Recharts;

    const { APPLE_PALETTE, MONTHS_LIST } = NPD.config;
    const { computeNPDTrajectory } = NPD.engine;
    const Icons = NPD.icons || NPD.createIconFactory(React);
    const { Lightbulb, Sparkles, Package, TrendingUp, Trophy, Activity } = Icons;
    const { InfoPopover, ExportCSVButton } = NPD.components;

    const formatAbsMonthLabel = (absMonth) => {
        if (!absMonth || absMonth <= 0) return '';
        const yearOffset = Math.floor((absMonth - 1) / 12);
        const monthIdx = ((absMonth - 1) % 12 + 12) % 12;
        const yr = String(2025 + yearOffset).slice(-2);
        return `${MONTHS_LIST[monthIdx]} '${yr}`;
    };

    const NPDVitalityWidget = memo(function NPDVitalityWidget({ npdData, kpi }) {
        const windowBadge = npdData?.latestAbsMonth > 0
            ? `${formatAbsMonthLabel(Math.max(1, npdData.latestAbsMonth - 11))} – ${formatAbsMonthLabel(npdData.latestAbsMonth)}`
            : null;

        return h(
            'div',
            { className: 'bg-white p-5 sm:p-6 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-col justify-between relative overflow-hidden' },
            h(
                'div',
                { className: 'flex items-center justify-between mb-2 gap-2 flex-wrap' },
                h(
                    'div',
                    { className: 'flex items-center gap-2' },
                    h('div', { className: 'bg-purple-100 p-2 rounded-lg' }, h(Lightbulb, { className: 'w-5 h-5 text-purple-600' })),
                    h('h3', { className: 'text-sm font-bold text-slate-700 uppercase tracking-wide' }, 'NPD Vitality Index')
                ),
                windowBadge && h('span', { className: 'text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100' }, windowBadge)
            ),
            h('p', { className: 'text-[11px] text-slate-500 font-medium mb-6' }, 'Sales contribution from products launched', h('br'), 'in the last 12 rolling months.'),
            h(
                'div',
                { className: 'relative z-10 mt-auto' },
                h(
                    'div',
                    { className: 'flex items-baseline gap-2 mb-3' },
                    h('h3', { className: 'text-4xl sm:text-5xl font-extrabold text-slate-800 tracking-tight' }, (npdData.vitalityIndex || 0).toFixed(1), h('span', { className: 'text-2xl sm:text-3xl text-slate-500 font-bold' }, '%'))
                ),
                h(
                    'div',
                    { className: 'w-full bg-slate-100 rounded-full h-2.5 mb-5 overflow-hidden' },
                    h('div', { className: 'h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full', style: { width: `${Math.min(npdData.vitalityIndex || 0, 100)}%` } })
                ),
                h(
                    'div',
                    { className: 'space-y-1.5' },
                    h('div', { className: 'flex justify-between items-center text-sm bg-slate-50 p-2.5 rounded-lg border border-slate-100' }, h('span', { className: 'text-slate-500 font-medium' }, 'NPD Sales 2026'), h('span', { className: 'font-bold text-purple-700' }, `฿${((npdData.totalNPDSales26 || 0) / 1000000).toFixed(2)}M`)),
                    h('div', { className: 'flex justify-between items-center text-sm p-2' }, h('span', { className: 'text-slate-500 font-medium' }, 'Total Portfolio Sales'), h('span', { className: 'font-bold text-slate-800' }, `฿${((kpi.s26 || 0) / 1000000).toFixed(2)}M`))
                )
            )
        );
    });

    const TopNPDWidget = memo(function TopNPDWidget({ npdData }) {
        const list = npdData.topNPDs || [];
        const totalNpd26 = npdData.totalNPDSales26 || 0;

        const csvColumns = useMemo(() => [
            { label: 'Rank', accessor: (_r, idx) => idx + 1 },
            { label: 'Product Name', key: 'name' },
            { label: 'Sales 2026 (THB)', accessor: (r) => Number((r.sales26 || 0).toFixed(2)) },
            { label: 'Share of NPD (%)', accessor: (r) => totalNpd26 > 0 ? Number(((r.sales26 / totalNpd26) * 100).toFixed(2)) : 0 }
        ], [totalNpd26]);

        return h(
            'div',
            { className: 'bg-white p-5 sm:p-6 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] lg:col-span-2 flex flex-col' },
            h(
                'div',
                { className: 'flex flex-wrap justify-between items-center mb-5 sm:mb-6 gap-2' },
                h(
                    'div',
                    { className: 'flex items-center gap-2' },
                    h(Sparkles, { className: 'w-5 h-5 text-indigo-500 shrink-0' }),
                    h('h3', { className: 'text-base font-extrabold text-slate-800' }, 'Top Performing NPDs (2026)')
                ),
                h(
                    'div',
                    { className: 'flex items-center gap-2 shrink-0' },
                    h('span', { className: 'text-xs font-semibold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full shrink-0' }, `${list.length} New Products`),
                    h(ExportCSVButton, { filename: 'NPD_Top_New_Products_2026.csv', columns: csvColumns, rows: list })
                )
            ),
            h(
                'div',
                { className: 'overflow-x-auto overflow-y-auto custom-scrollbar pr-1 h-[220px]' },
                list.length > 0
                    ? h(
                        'table',
                        { className: 'w-full text-sm text-left min-w-[480px]' },
                        h(
                            'thead',
                            { className: 'text-slate-500 border-b border-slate-200 font-semibold sticky top-0 bg-white z-10' },
                            h(
                                'tr',
                                null,
                                h('th', { className: 'py-2 pl-2 w-14' }, 'Rank'),
                                h('th', { className: 'py-2' }, 'Product Name'),
                                h('th', { className: 'py-2 text-right' }, 'Sales 2026'),
                                h('th', { className: 'py-2 pr-2 text-right' }, 'Share of NPD')
                            )
                        ),
                        h(
                            'tbody',
                            null,
                            list.slice(0, 10).map((prod, idx) => {
                                const share = totalNpd26 > 0 ? ((prod.sales26 / totalNpd26) * 100).toFixed(1) : '0.0';
                                return h(
                                    'tr',
                                    { key: prod.name, className: 'border-b border-slate-50 hover:bg-indigo-50/40' },
                                    h('td', { className: 'py-3 pl-2 font-semibold text-slate-400' }, `#${idx + 1}`),
                                    h('td', { className: 'py-3 font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-[240px]', title: prod.name }, prod.name),
                                    h('td', { className: 'py-3 text-right font-bold text-indigo-700' }, `฿${(prod.sales26 || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`),
                                    h('td', { className: 'py-3 pr-2 text-right font-bold text-slate-600' }, `${share}%`)
                                );
                            })
                        )
                    )
                    : h(
                        'div',
                        { className: 'h-full flex flex-col items-center justify-center text-slate-400' },
                        h(Package, { className: 'w-12 h-12 mb-3 opacity-30 text-indigo-500' }),
                        h('p', { className: 'font-semibold text-sm' }, 'No new products found')
                    )
            )
        );
    });

    const NPDTrajectoryWidget = memo(function NPDTrajectoryWidget({ salesData, npdData }) {
        const [viewMode, setViewMode] = useState('monthly');

        const { chartData, lines, insights } = useMemo(
            () => computeNPDTrajectory(salesData, npdData, viewMode),
            [salesData, npdData, viewMode]
        );

        return h(
            'div',
            { className: 'bg-white p-5 sm:p-6 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] lg:col-span-3 flex flex-col' },
            h(
                'div',
                { className: 'flex flex-col md:flex-row justify-between items-start md:items-center mb-5 sm:mb-6 gap-4' },
                h(
                    'div',
                    { className: 'flex items-center gap-2' },
                    h(TrendingUp, { className: 'w-5 h-5 text-[#af52de] shrink-0' }),
                    h('h3', { className: 'text-base font-extrabold text-[#1d1d1f]' }, 'NPD Launch Trajectory (M1-M12)'),
                    h(
                        InfoPopover,
                        null,
                        h('span', { className: 'font-bold text-[#af52de]' }, 'Normalization: '),
                        'กราฟนี้จับสินค้าใหม่ทุกตัวมาเริ่มต้นที่เดือนที่ 1 (M1) พร้อมกัน เพื่อเปรียบเทียบความแรงของการเปิดตัว และอัตราการรักษายอดขายในเดือนถัดๆ ไป'
                    )
                ),
                h(
                    'div',
                    { className: 'no-print flex bg-[#e3e3e8] p-1 rounded-xl shrink-0 w-full sm:w-auto' },
                    h('button', { type: 'button', onClick: () => setViewMode('monthly'), className: `flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded-[8px] transition-all ${viewMode === 'monthly' ? 'bg-white text-[#1d1d1f] shadow-[0_1px_4px_rgba(0,0,0,0.12)]' : 'text-[#86868b] hover:text-[#1d1d1f]'}` }, 'Monthly Sales'),
                    h('button', { type: 'button', onClick: () => setViewMode('cumulative'), className: `flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded-[8px] transition-all ${viewMode === 'cumulative' ? 'bg-white text-[#1d1d1f] shadow-[0_1px_4px_rgba(0,0,0,0.12)]' : 'text-[#86868b] hover:text-[#1d1d1f]'}` }, 'Cumulative')
                )
            ),
            h(
                'div',
                { className: 'flex flex-col xl:flex-row gap-6 h-full' },
                h(
                    'div',
                    { className: 'flex-1 h-[260px] sm:min-h-[280px]' },
                    (chartData || []).length > 0
                        ? h(
                            ResponsiveContainer,
                            { width: '100%', height: '100%' },
                            h(
                                LineChart,
                                { data: chartData, margin: { top: 10, right: 10, left: -20, bottom: 0 } },
                                h(CartesianGrid, { strokeDasharray: '3 3', vertical: false, stroke: '#e5e5ea' }),
                                h(XAxis, { dataKey: 'name', tick: { fontSize: 11, fill: '#86868b', fontWeight: 500 }, axisLine: false, tickLine: false }),
                                h(YAxis, { tick: { fontSize: 11, fill: '#86868b', fontWeight: 500 }, tickFormatter: (v) => `${((v || 0) / 1000000).toFixed(1)}M`, axisLine: false, tickLine: false }),
                                h(Tooltip, {
                                    cursor: { stroke: '#e5e5ea', strokeDasharray: '5 5' },
                                    contentStyle: { borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 14px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: '500', backgroundColor: 'rgba(255,255,255,0.95)' },
                                    formatter: (v) => `฿${((v || 0) / 1000000).toFixed(2)}M`
                                }),
                                h(Legend, { wrapperStyle: { fontSize: '11px', color: '#86868b', paddingTop: '10px', fontWeight: '500' } }),
                                h(ReferenceLine, { x: 'M3', stroke: '#ff3b30', strokeDasharray: '3 3', label: { position: 'top', value: 'M3 Review', fill: '#ff3b30', fontSize: 10, fontWeight: 'bold' } }),
                                h(Line, { type: 'monotone', dataKey: 'Avg Benchmark', stroke: '#86868b', strokeWidth: 2, strokeDasharray: '5 5', dot: false, activeDot: false }),
                                (lines || []).map((lineName, idx) => h(Line, {
                                    key: lineName,
                                    type: 'monotone',
                                    dataKey: lineName,
                                    stroke: APPLE_PALETTE[idx % APPLE_PALETTE.length],
                                    strokeWidth: 3,
                                    dot: { r: 4 },
                                    activeDot: { r: 6, strokeWidth: 0 },
                                    connectNulls: false
                                }))
                            )
                        )
                        : h('div', { className: 'h-full flex flex-col items-center justify-center text-[#86868b] font-medium' }, 'No trajectory data')
                ),
                insights && h(
                    'div',
                    { className: 'flex-shrink-0 w-full xl:w-[280px] bg-[#f5f5f7]/60 rounded-xl p-4 border border-black/5 flex flex-col gap-3.5' },
                    h('h4', { className: 'text-xs font-bold text-[#86868b] uppercase tracking-wider mb-1' }, 'Trajectory Insights'),
                    h(
                        'div',
                        { className: 'bg-white p-3.5 rounded-xl border border-black/5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] relative overflow-hidden group' },
                        h('div', { className: 'absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-[#ff9500]/10 to-transparent rounded-bl-full' }),
                        h('div', { className: 'flex items-center gap-2 mb-2' }, h(Trophy, { className: 'w-4 h-4 text-[#ff9500]' }), h('span', { className: 'text-[10px] font-bold text-[#86868b] uppercase' }, 'Fastest Start (M1)')),
                        insights.fastestStarter.val > 0
                            ? h(React.Fragment, null, h('div', { className: 'text-sm font-bold text-[#1d1d1f] truncate leading-tight', title: insights.fastestStarter.name }, insights.fastestStarter.name), h('div', { className: 'text-base font-bold text-[#ff9500] mt-1' }, `฿${(insights.fastestStarter.val / 1000000).toFixed(2)}M`))
                            : h('div', { className: 'text-sm text-[#86868b]' }, 'N/A')
                    ),
                    h(
                        'div',
                        { className: 'bg-white p-3.5 rounded-xl border border-black/5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] relative overflow-hidden group' },
                        h('div', { className: 'absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-[#34c759]/10 to-transparent rounded-bl-full' }),
                        h('div', { className: 'flex items-center gap-2 mb-2' }, h(TrendingUp, { className: 'w-4 h-4 text-[#34c759]' }), h('span', { className: 'text-[10px] font-bold text-[#86868b] uppercase' }, 'Best Momentum (M3 vs M1)')),
                        insights.topSustainer.val > -Infinity
                            ? h(React.Fragment, null, h('div', { className: 'text-sm font-bold text-[#1d1d1f] truncate leading-tight', title: insights.topSustainer.name }, insights.topSustainer.name), h('div', { className: 'flex items-end gap-2 mt-1' }, h('div', { className: `text-base font-bold ${insights.topSustainer.val >= 0 ? 'text-[#34c759]' : 'text-[#ff3b30]'}` }, `${insights.topSustainer.val >= 0 ? '▲' : '▼'} ${Math.abs(insights.topSustainer.val).toFixed(1)}%`)))
                            : h('div', { className: 'text-xs text-[#86868b] mt-1' }, 'Need at least 3 months of data')
                    ),
                    h(
                        'div',
                        { className: 'bg-white p-3.5 rounded-xl border border-black/5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] relative overflow-hidden group' },
                        h('div', { className: 'absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-[#0071e3]/10 to-transparent rounded-bl-full' }),
                        h('div', { className: 'flex items-center gap-2 mb-2' }, h(Activity, { className: 'w-4 h-4 text-[#0071e3]' }), h('span', { className: 'text-[10px] font-bold text-[#86868b] uppercase' }, 'M6 Retention Rate')),
                        insights.bestRetention.val > -Infinity
                            ? h(React.Fragment, null, h('div', { className: 'text-sm font-bold text-[#1d1d1f] truncate leading-tight', title: insights.bestRetention.name }, insights.bestRetention.name), h('div', { className: 'flex items-end gap-2 mt-1' }, h('div', { className: 'text-base font-bold text-[#0071e3]' }, `${insights.bestRetention.val.toFixed(1)}% `, h('span', { className: 'text-[10px] text-[#86868b] font-medium' }, 'of M1'))))
                            : h('div', { className: 'text-xs text-[#86868b] mt-1' }, 'Need 6 months of data')
                    ),
                    h(
                        'p',
                        { className: 'text-[10px] text-[#86868b] mt-auto font-medium leading-relaxed' },
                        '*',
                        h('span', { className: 'font-bold text-[#1d1d1f]' }, 'Monthly Sales'),
                        ' helps identify run-rate drop-offs after launch. ',
                        h('span', { className: 'font-bold text-[#1d1d1f]' }, 'Cumulative'),
                        ' tracks progress towards Year 1 Business Case.'
                    )
                )
            )
        );
    });

    NPD.components = NPD.components || {};
    Object.assign(NPD.components, {
        NPDVitalityWidget,
        TopNPDWidget,
        NPDTrajectoryWidget
    });
})(typeof globalThis !== 'undefined' ? globalThis : window);
