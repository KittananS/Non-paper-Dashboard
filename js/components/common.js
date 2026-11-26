(function (root) {
    'use strict';

    const NPD = root.NPD = root.NPD || {};
    const React = root.React;
    if (!React) return;

    const h = React.createElement;
    const { useState, useEffect, useRef, useCallback, Component, memo } = React;
    const { GROUP_ORDER, GROUP_COLORS } = NPD.config;
    const { getImgFilename, exportRowsToCSV } = NPD.utils;
    const Icons = NPD.icons || NPD.createIconFactory(React);
    const {
        AlertTriangle, Info, ChevronDown, Check, Filter, X,
        ShoppingBag, Users, Store, Calendar, RefreshCw, CheckCircle2, XCircle,
        Download, RotateCcw
    } = Icons;

    class ErrorBoundary extends Component {
        constructor(props) {
            super(props);
            this.state = { hasError: false };
        }
        static getDerivedStateFromError() {
            return { hasError: true };
        }
        componentDidCatch(error, errorInfo) {
            console.error('Widget Crash Prevented:', error, errorInfo);
        }
        render() {
            if (this.state.hasError) {
                return h(
                    'div',
                    { className: 'bg-red-50 p-6 rounded-[24px] border border-red-100 flex flex-col items-center justify-center h-full min-h-[200px] text-center' },
                    h(AlertTriangle, { className: 'w-8 h-8 text-red-400 mb-2' }),
                    h('h3', { className: 'text-sm font-bold text-red-800' }, 'Error rendering component'),
                    h('p', { className: 'text-xs text-red-600 mt-1' }, 'Please try refreshing or adjusting filters'),
                    h(
                        'button',
                        {
                            type: 'button',
                            onClick: () => this.setState({ hasError: false }),
                            className: 'mt-3 px-3 py-1.5 bg-white text-red-700 text-xs font-bold rounded-lg border border-red-200 hover:bg-red-100'
                        },
                        'Retry Render'
                    )
                );
            }
            return this.props.children;
        }
    }

    const SafeWidget = memo(function SafeWidget({ children }) {
        return h(ErrorBoundary, null, children);
    });

    // Portal wrapper ensuring modals always mount on document.body (immune to parent CSS transforms/animations)
    const ModalPortal = function ModalPortal({ children }) {
        if (!children) return null;
        const ReactDOMGlobal = root.ReactDOM;
        if (
            ReactDOMGlobal &&
            typeof ReactDOMGlobal.createPortal === 'function' &&
            typeof document !== 'undefined' &&
            document.body
        ) {
            return ReactDOMGlobal.createPortal(children, document.body);
        }
        return children;
    };

    // Reusable 1-Click CSV Export Button (UTF-8 BOM safe for Thai Excel)
    const ExportCSVButton = memo(function ExportCSVButton({ filename, columns, rows, label = 'Export CSV', disabled = false }) {
        const [done, setDone] = useState(false);
        const timerRef = useRef(null);

        useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

        const handleExport = useCallback((e) => {
            e.stopPropagation();
            if (disabled || !rows || rows.length === 0) return;
            const ok = exportRowsToCSV(filename, columns, rows);
            if (ok) {
                setDone(true);
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => setDone(false), 1800);
            }
        }, [disabled, filename, columns, rows]);

        const isDisabled = disabled || !rows || rows.length === 0;

        return h(
            'button',
            {
                type: 'button',
                onClick: handleExport,
                disabled: isDisabled,
                title: isDisabled ? 'No rows to export' : `Download ${label} (.csv)`,
                className: `no-print px-3.5 py-2.5 sm:py-2 min-h-[42px] sm:min-h-[38px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all border shrink-0 ${
                    isDisabled
                        ? 'bg-[#f5f5f7] text-[#d1d1d6] border-black/5 cursor-not-allowed'
                        : (done
                            ? 'bg-[#34c759]/10 text-[#34c759] border-[#34c759]/30 shadow-sm'
                            : 'bg-white text-[#1d1d1f] border-black/10 hover:bg-[#f5f5f7] active:scale-95')
                }`
            },
            done
                ? h(React.Fragment, null, h(Check, { className: 'w-3.5 h-3.5' }), ' Exported')
                : h(React.Fragment, null, h(Download, { className: 'w-3.5 h-3.5 text-[#0071e3]' }), ` ${label}`)
        );
    });

    const InfoPopover = memo(function InfoPopover({ children, align = 'left' }) {
        const [open, setOpen] = useState(false);
        const popRef = useRef(null);

        useEffect(() => {
            if (!open) return undefined;
            const handleOutside = (e) => {
                if (popRef.current && !popRef.current.contains(e.target)) setOpen(false);
            };
            document.addEventListener('mousedown', handleOutside);
            document.addEventListener('touchstart', handleOutside);
            return () => {
                document.removeEventListener('mousedown', handleOutside);
                document.removeEventListener('touchstart', handleOutside);
            };
        }, [open]);

        const alignClass = align === 'right' ? 'right-0' : '-left-16 sm:left-0';
        const visibilityClass = open
            ? 'opacity-100 visible translate-y-0'
            : 'opacity-0 invisible -translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 pointer-events-none';

        return h(
            'div',
            {
                ref: popRef,
                className: 'no-print relative inline-flex items-center group cursor-help',
                onClick: (e) => { e.stopPropagation(); setOpen((prev) => !prev); }
            },
            h(Info, { className: 'w-4 h-4 text-[#86868b] hover:text-[#0071e3] transition-colors flex-shrink-0' }),
            h(
                'div',
                {
                    className: `absolute top-full ${alignClass} mt-2 w-64 sm:w-72 p-4 bg-white/95 backdrop-blur-xl text-[#1d1d1f] text-xs leading-relaxed rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.14)] transition-all z-50 font-normal border border-black/5 ${visibilityClass}`
                },
                children
            )
        );
    });

    const FilterDropdown = memo(function FilterDropdown({ label, value, options, onChange, icon, fullWidth = false }) {
        const [isOpen, setIsOpen] = useState(false);
        const [alignRight, setAlignRight] = useState(false);
        const dropdownRef = useRef(null);

        useEffect(() => {
            if (!isOpen) return undefined;
            const handleClickOutside = (event) => {
                if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, [isOpen]);

        const handleToggle = () => {
            if (!isOpen && dropdownRef.current && typeof window !== 'undefined') {
                const rect = dropdownRef.current.getBoundingClientRect();
                setAlignRight(rect.left + 260 > window.innerWidth);
            }
            setIsOpen((prev) => !prev);
        };

        const safeOptions = options || [];

        return h(
            'div',
            { className: `no-print relative ${fullWidth ? 'w-full' : ''}`, ref: dropdownRef },
            h(
                'button',
                {
                    type: 'button',
                    onClick: handleToggle,
                    className: `flex items-center gap-2 text-sm font-medium text-[#1d1d1f] bg-[#e8e8ed] hover:bg-[#d1d1d6] px-3.5 py-2.5 sm:py-2 min-h-[42px] sm:min-h-[38px] rounded-xl transition-colors justify-between ${fullWidth ? 'w-full' : 'min-w-[140px] sm:min-w-[148px]'}`
                },
                h(
                    'div',
                    { className: 'flex items-center gap-2 min-w-0' },
                    icon ? React.cloneElement(icon, { className: 'w-4 h-4 text-[#86868b] flex-shrink-0' }) : null,
                    h('span', { className: 'text-[#86868b] flex-shrink-0' }, `${label}:`),
                    h('span', { className: 'font-semibold truncate max-w-[120px] sm:max-w-[96px] text-[#1d1d1f]' }, value || 'All')
                ),
                h(ChevronDown, { className: `w-4 h-4 text-[#86868b] flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}` })
            ),
            isOpen && h(
                'div',
                {
                    className: `absolute top-full ${fullWidth ? 'left-0 right-0 w-full' : (alignRight ? 'right-0 w-64' : 'left-0 w-64')} mt-2 bg-white/95 backdrop-blur-xl border border-black/5 rounded-[16px] shadow-[0_12px_36px_rgba(0,0,0,0.15)] z-50 max-h-[340px] overflow-y-auto animate-in fade-in zoom-in-95 duration-100 custom-scrollbar py-2`
                },
                h(
                    'div',
                    { className: 'sticky top-0 bg-white/95 backdrop-blur-xl px-4 py-2 text-[11px] font-semibold text-[#86868b] uppercase tracking-wider z-10 border-b border-black/5' },
                    `Select ${label}`
                ),
                h(
                    'div',
                    { className: 'py-1' },
                    safeOptions.length > 0
                        ? safeOptions.map((opt, index) => {
                            const optVal = typeof opt === 'string' ? opt : opt.val;
                            const optGroup = typeof opt === 'string' ? null : opt.group;
                            const isSelected = optVal === value;
                            const prevOptGroup = index > 0 ? (typeof safeOptions[index - 1] === 'string' ? null : safeOptions[index - 1].group) : null;
                            const showGroupHeader = optGroup && optGroup !== prevOptGroup;

                            return h(
                                React.Fragment,
                                { key: `${optGroup || 'all'}::${optVal}` },
                                showGroupHeader && h(
                                    'div',
                                    { className: `px-4 py-1.5 mt-2 mb-1 mx-2 text-[10px] font-extrabold uppercase tracking-wider rounded-lg ${GROUP_COLORS[optGroup] || 'text-[#86868b] bg-[#f5f5f7]'}` },
                                    optGroup
                                ),
                                h(
                                    'button',
                                    {
                                        type: 'button',
                                        className: `w-full text-left px-5 py-2.5 min-h-[42px] sm:min-h-[38px] text-sm font-medium hover:bg-[#f5f5f7] transition-colors flex justify-between items-center ${isSelected ? 'text-[#0071e3] bg-[#0071e3]/5' : 'text-[#1d1d1f]'}`,
                                        onClick: () => { onChange(optVal); setIsOpen(false); }
                                    },
                                    h('span', { className: `${isSelected ? 'font-bold' : ''} ${optGroup ? 'pl-2' : ''} truncate pr-2` }, optVal),
                                    isSelected && h(Check, { className: 'w-4 h-4 text-[#0071e3] flex-shrink-0' })
                                )
                            );
                        })
                        : h('div', { className: 'px-4 py-3 text-sm text-[#86868b] text-center italic font-medium' }, 'No options available')
                )
            )
        );
    });

    const MultiSelectDropdown = memo(function MultiSelectDropdown({ label, selectedValues, options, onChange, icon, fullWidth = false }) {
        const [isOpen, setIsOpen] = useState(false);
        const [alignRight, setAlignRight] = useState(false);
        const dropdownRef = useRef(null);
        const safeOptions = options || [];
        const safeSelected = selectedValues || [];

        useEffect(() => {
            if (!isOpen) return undefined;
            const handleClickOutside = (event) => {
                if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, [isOpen]);

        const handleToggle = () => {
            if (!isOpen && dropdownRef.current && typeof window !== 'undefined') {
                const rect = dropdownRef.current.getBoundingClientRect();
                setAlignRight(rect.left + 260 > window.innerWidth);
            }
            setIsOpen((prev) => !prev);
        };

        const toggleOption = (optVal) => {
            const next = safeSelected.includes(optVal)
                ? safeSelected.filter((v) => v !== optVal)
                : [...safeSelected, optVal];
            onChange(next);
        };

        const isAllSelected = safeSelected.length === safeOptions.length && safeOptions.length > 0;
        const toggleAll = () => {
            if (isAllSelected) onChange([]);
            else onChange(safeOptions.map((opt) => (typeof opt === 'string' ? opt : opt.val)));
        };

        let displayValue = 'None';
        if (safeSelected.length > 0) {
            if (safeSelected.length === safeOptions.length) displayValue = 'All';
            else if (safeSelected.length <= 2) displayValue = safeSelected.join(', ');
            else displayValue = `${safeSelected.length} Selected`;
        }

        return h(
            'div',
            { className: `no-print relative ${fullWidth ? 'w-full' : ''}`, ref: dropdownRef },
            h(
                'button',
                {
                    type: 'button',
                    onClick: handleToggle,
                    className: `flex items-center gap-2 text-sm font-medium text-[#1d1d1f] bg-[#e8e8ed] hover:bg-[#d1d1d6] px-3.5 py-2.5 sm:py-2 min-h-[42px] sm:min-h-[38px] rounded-xl transition-colors justify-between ${fullWidth ? 'w-full' : 'min-w-[140px] sm:min-w-[148px]'}`
                },
                h(
                    'div',
                    { className: 'flex items-center gap-2 min-w-0' },
                    icon ? React.cloneElement(icon, { className: 'w-4 h-4 text-[#86868b] flex-shrink-0' }) : null,
                    h('span', { className: 'text-[#86868b] flex-shrink-0' }, `${label}:`),
                    h('span', { className: 'font-semibold truncate max-w-[120px] sm:max-w-[96px] text-[#1d1d1f]', title: safeSelected.join(', ') }, displayValue)
                ),
                h(ChevronDown, { className: `w-4 h-4 text-[#86868b] flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}` })
            ),
            isOpen && h(
                'div',
                {
                    className: `absolute top-full ${fullWidth ? 'left-0 right-0 w-full' : (alignRight ? 'right-0 w-64' : 'left-0 w-64')} mt-2 bg-white/95 backdrop-blur-xl border border-black/5 rounded-[16px] shadow-[0_12px_36px_rgba(0,0,0,0.15)] z-50 max-h-[340px] overflow-y-auto animate-in fade-in zoom-in-95 duration-100 custom-scrollbar py-2`
                },
                h(
                    'div',
                    { className: 'sticky top-0 bg-white/95 backdrop-blur-xl px-4 py-2 text-[11px] font-semibold text-[#86868b] uppercase tracking-wider z-10 border-b border-black/5 flex justify-between items-center' },
                    h('span', null, `Select ${label}`),
                    h(
                        'button',
                        { type: 'button', onClick: toggleAll, className: 'text-[#0071e3] hover:underline text-[11px] font-bold py-0.5 px-1' },
                        isAllSelected ? 'Clear All' : 'Select All'
                    )
                ),
                h(
                    'div',
                    { className: 'py-1' },
                    safeOptions.length > 0
                        ? safeOptions.map((opt, index) => {
                            const optVal = typeof opt === 'string' ? opt : opt.val;
                            const optGroup = typeof opt === 'string' ? null : opt.group;
                            const isSelected = safeSelected.includes(optVal);
                            const prevOptGroup = index > 0 ? (typeof safeOptions[index - 1] === 'string' ? null : safeOptions[index - 1].group) : null;
                            const showGroupHeader = optGroup && optGroup !== prevOptGroup;

                            return h(
                                React.Fragment,
                                { key: `${optGroup || 'all'}::${optVal}` },
                                showGroupHeader && h(
                                    'div',
                                    { className: `px-4 py-1.5 mt-2 mb-1 mx-2 text-[10px] font-extrabold uppercase tracking-wider rounded-lg ${GROUP_COLORS[optGroup] || 'text-[#86868b] bg-[#f5f5f7]'}` },
                                    optGroup
                                ),
                                h(
                                    'button',
                                    {
                                        type: 'button',
                                        className: `w-full text-left px-5 py-2.5 min-h-[42px] sm:min-h-[38px] text-sm font-medium hover:bg-[#f5f5f7] transition-colors flex items-center gap-3 ${isSelected ? 'text-[#0071e3] bg-[#0071e3]/5' : 'text-[#1d1d1f]'}`,
                                        onClick: () => toggleOption(optVal)
                                    },
                                    h(
                                        'div',
                                        { className: `w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-[#0071e3] border-[#0071e3]' : 'border-[#d1d1d6] bg-white'}` },
                                        isSelected && h(Check, { className: 'w-3 h-3 text-white', strokeWidth: 3 })
                                    ),
                                    h('span', { className: `${isSelected ? 'font-bold' : ''} ${optGroup ? 'pl-2' : ''} truncate` }, optVal)
                                )
                            );
                        })
                        : h('div', { className: 'px-4 py-3 text-sm text-[#86868b] text-center italic font-medium' }, 'No options available')
                )
            )
        );
    });

    const MobileFilterDrawer = memo(function MobileFilterDrawer({
        isOpen, onClose,
        filterSubProduct, setFilterSubProduct, availableSubProducts,
        filterChannel, setFilterChannel, availableChannels,
        filterSubChannel, setFilterSubChannel, availableSubChannels,
        filterMonth, setFilterMonth, monthsList,
        excludeReturns, setExcludeReturns,
        selectedGroups, toggleGroup, onResetAll
    }) {
        if (!isOpen) return null;

        return h(
            'div',
            {
                className: 'no-print fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200',
                onClick: (e) => { if (e.target === e.currentTarget) onClose(); }
            },
            h(
                'div',
                { className: 'bg-white rounded-t-[28px] shadow-2xl border-t border-black/10 p-5 pb-safe max-h-[85vh] overflow-y-auto custom-scrollbar flex flex-col gap-5 animate-in slide-in-from-bottom duration-200' },
                h('div', { className: 'w-12 h-1.5 bg-[#d1d1d6] rounded-full mx-auto -mt-1 mb-1' }),
                h(
                    'div',
                    { className: 'flex justify-between items-center border-b border-black/5 pb-3' },
                    h(
                        'div',
                        { className: 'flex items-center gap-2' },
                        h(Filter, { className: 'w-4 h-4 text-[#0071e3]' }),
                        h('h3', { className: 'text-base font-extrabold text-[#1d1d1f]' }, 'Global Filters')
                    ),
                    h(
                        'button',
                        { type: 'button', onClick: onClose, className: 'p-2 bg-[#f5f5f7] rounded-full text-[#86868b] hover:text-[#1d1d1f]' },
                        h(X, { className: 'w-4 h-4' })
                    )
                ),
                h(
                    'div',
                    null,
                    h('label', { className: 'text-[11px] font-extrabold text-[#86868b] uppercase tracking-wider block mb-2' }, 'Product Groups'),
                    h(
                        'div',
                        { className: 'flex flex-wrap gap-1.5 bg-[#f5f5f7] p-2 rounded-2xl' },
                        ['ALL', ...GROUP_ORDER].map((group) => h(
                            'button',
                            {
                                key: group,
                                type: 'button',
                                onClick: () => toggleGroup(group),
                                className: `px-3 py-2 text-xs font-bold rounded-xl transition-all ${selectedGroups.includes(group) ? 'bg-[#0071e3] text-white shadow-sm' : 'bg-white text-[#1d1d1f] border border-black/5'}`
                            },
                            group
                        ))
                    )
                ),
                h(
                    'div',
                    { className: 'space-y-3' },
                    h('label', { className: 'text-[11px] font-extrabold text-[#86868b] uppercase tracking-wider block' }, 'Granular Filters'),
                    h(FilterDropdown, { fullWidth: true, label: 'Product', value: filterSubProduct, options: [{ val: 'All', group: null }, ...availableSubProducts], onChange: setFilterSubProduct, icon: h(ShoppingBag) }),
                    h(FilterDropdown, { fullWidth: true, label: 'Channel', value: filterChannel, options: ['All', ...availableChannels], onChange: setFilterChannel, icon: h(Users) }),
                    h(FilterDropdown, { fullWidth: true, label: 'Sub-Channel', value: filterSubChannel, options: ['All', ...(availableSubChannels || [])], onChange: setFilterSubChannel, icon: h(Store) }),
                    h(MultiSelectDropdown, { fullWidth: true, label: 'Month', selectedValues: filterMonth, options: monthsList, onChange: setFilterMonth, icon: h(Calendar) }),
                    h(
                        'button',
                        {
                            type: 'button',
                            onClick: () => setExcludeReturns(!excludeReturns),
                            className: `w-full px-4 py-2.5 min-h-[42px] rounded-xl text-xs font-bold flex items-center justify-between border transition-all ${excludeReturns ? 'bg-[#ff9500]/15 text-[#d49b00] border-[#ff9500]/30' : 'bg-[#e8e8ed] text-[#1d1d1f] border-transparent'}`
                        },
                        h('span', { className: 'flex items-center gap-2' }, h(RotateCcw, { className: 'w-4 h-4' }), 'Exclude Returns (Gross Demand)'),
                        h('span', { className: `px-2 py-0.5 rounded-md text-[10px] uppercase ${excludeReturns ? 'bg-[#ff9500] text-white' : 'bg-white text-[#86868b]'}` }, excludeReturns ? 'ON' : 'OFF')
                    )
                ),
                h(
                    'div',
                    { className: 'flex gap-3 pt-2 border-t border-black/5' },
                    h(
                        'button',
                        { type: 'button', onClick: onResetAll, className: 'flex-1 py-3 rounded-xl text-xs font-bold text-[#ff3b30] bg-[#ff3b30]/10 hover:bg-[#ff3b30]/20 transition-colors' },
                        'Reset All'
                    ),
                    h(
                        'button',
                        { type: 'button', onClick: onClose, className: 'flex-1 py-3 rounded-xl text-xs font-bold text-white bg-[#0071e3] hover:bg-[#0077ED] shadow-md transition-colors' },
                        'Apply & Close'
                    )
                )
            )
        );
    });

    const ExecutiveSkeleton = memo(function ExecutiveSkeleton() {
        return h(
            'div',
            { className: 'space-y-6 animate-in fade-in duration-300' },
            h(
                'div',
                { className: 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 sm:gap-6' },
                [1, 2, 3, 4, 5].map((i) => h(
                    'div',
                    { key: i, className: 'bg-white p-6 rounded-[24px] border border-black/[0.04] h-36 flex flex-col justify-between' },
                    h(
                        'div',
                        { className: 'flex justify-between items-center' },
                        h('div', { className: 'w-24 h-3 rounded-md skeleton-shimmer' }),
                        h('div', { className: 'w-8 h-8 rounded-full skeleton-shimmer' })
                    ),
                    h(
                        'div',
                        null,
                        h('div', { className: 'w-36 h-8 rounded-lg skeleton-shimmer mb-2' }),
                        h('div', { className: 'w-20 h-3 rounded-md skeleton-shimmer' })
                    )
                ))
            ),
            h(
                'div',
                { className: 'grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6' },
                h(
                    'div',
                    { className: 'bg-white p-6 rounded-[24px] border border-black/[0.04] lg:col-span-2 h-80 flex flex-col justify-between' },
                    h('div', { className: 'w-48 h-5 rounded-md skeleton-shimmer mb-4' }),
                    h('div', { className: 'w-full flex-1 rounded-xl skeleton-shimmer' })
                ),
                h(
                    'div',
                    { className: 'bg-white p-6 rounded-[24px] border border-black/[0.04] h-80 flex flex-col justify-between' },
                    h('div', { className: 'w-36 h-5 rounded-md skeleton-shimmer mb-4' }),
                    h('div', { className: 'w-40 h-40 rounded-full mx-auto skeleton-shimmer' }),
                    h(
                        'div',
                        { className: 'space-y-2 mt-4' },
                        h('div', { className: 'w-full h-3 rounded skeleton-shimmer' }),
                        h('div', { className: 'w-4/5 h-3 rounded skeleton-shimmer' })
                    )
                )
            )
        );
    });

    const Sparkline = memo(function Sparkline({ data }) {
        if (!data || data.length === 0) return h('div', { className: 'w-16 h-6' });

        let lastIndex = data.length - 1;
        while (lastIndex >= 0 && data[lastIndex] === 0) lastIndex--;
        if (lastIndex < 1) return h('div', { className: 'w-16 h-6' });

        const activeData = data.slice(0, lastIndex + 1);
        const max = Math.max(...activeData);
        const min = Math.min(...activeData);
        const range = max - min || 1;

        const color = '#86868b';
        const width = 64;
        const height = 24;

        const points = activeData.map((val, i) => {
            const x = (i / (activeData.length - 1)) * width;
            const y = height - ((val - min) / range) * height;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');

        const lastY = height - ((activeData[activeData.length - 1] - min) / range) * height;

        return h(
            'svg',
            { width, height, className: 'overflow-visible', style: { minWidth: width } },
            h('polyline', { points, fill: 'none', stroke: color, strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round' }),
            h('circle', { cx: width, cy: lastY, r: '2.5', fill: color })
        );
    });

    const SyncStatusSlot = memo(function SyncStatusSlot({ label, status }) {
        let statusColor = 'bg-[#e5e5ea]';
        let statusText = 'Pending';
        let icon = null;
        let bgClass = 'bg-white border-black/5';

        if (status === 'loading') {
            statusColor = 'bg-[#0071e3] animate-pulse';
            statusText = 'Syncing...';
            icon = h(RefreshCw, { className: 'w-3.5 h-3.5 text-[#0071e3] animate-spin' });
        } else if (status === 'success') {
            statusColor = 'bg-[#34c759] shadow-[0_0_8px_rgba(52,199,89,0.4)]';
            statusText = 'Synced';
            icon = h(CheckCircle2, { className: 'w-3.5 h-3.5 text-[#34c759]' });
            bgClass = 'bg-[#34c759]/5 border-[#34c759]/20';
        } else if (status === 'error') {
            statusColor = 'bg-[#ff3b30]';
            statusText = 'Failed';
            icon = h(XCircle, { className: 'w-3.5 h-3.5 text-[#ff3b30]' });
            bgClass = 'bg-[#ff3b30]/5 border-[#ff3b30]/20';
        }

        return h(
            'div',
            { className: `flex items-center justify-between p-3.5 rounded-[14px] border transition-all ${bgClass}` },
            h(
                'div',
                { className: 'flex items-center gap-3' },
                h('div', { className: `w-2 h-2 rounded-full ${statusColor}` }),
                h('span', { className: 'text-sm font-medium text-[#1d1d1f]' }, label)
            ),
            h(
                'div',
                { className: 'flex items-center gap-1.5' },
                icon,
                h(
                    'span',
                    { className: `text-xs font-bold ${status === 'success' ? 'text-[#34c759]' : (status === 'error' ? 'text-[#ff3b30]' : 'text-[#86868b]')}` },
                    statusText
                )
            )
        );
    });

    const ImageWithFallback = memo(function ImageWithFallback({ groupName, src, alt, className = '', onClick, title }) {
        const [error, setError] = useState(false);
        const pngSrc = src || getImgFilename(groupName || alt, 'png');
        const webpSrc = pngSrc.endsWith('.png') ? `${pngSrc.slice(0, -4)}.webp` : null;

        if (error) {
            return h(
                'div',
                {
                    className: `flex items-center justify-center text-[#86868b] font-bold text-center select-none tracking-wide ${className.includes('h-32') ? 'text-sm h-28 sm:h-32 w-full mb-3 sm:mb-4' : 'text-[9px] h-10 w-full p-1 bg-[#f5f5f7] rounded-[10px] border border-black/5'} ${onClick ? 'cursor-pointer hover:bg-[#e8e8ed] transition-colors' : ''}`,
                    onClick,
                    title: title || alt
                },
                alt
            );
        }

        const imgEl = h('img', {
            src: pngSrc,
            alt,
            loading: 'lazy',
            decoding: 'async',
            className,
            onClick,
            title,
            onError: () => setError(true),
            style: { WebkitUserDrag: 'none' }
        });

        if (!webpSrc) return imgEl;
        return h(
            'picture',
            { className: 'contents' },
            h('source', { srcSet: webpSrc, type: 'image/webp' }),
            imgEl
        );
    });

    const renderCustomLabel = (props) => {
        const { x, y, width, value } = props || {};
        if (value === 0 || value === undefined || value === null) return null;
        const cx = width && !Number.isNaN(width) ? x + width / 2 : x;
        const cy = !Number.isNaN(y) ? y - 10 : y;
        if (Number.isNaN(cx) || Number.isNaN(cy)) return null;
        const valInM = Number(value) / 1000000;
        const formatted = valInM < 1 ? `${(valInM || 0).toFixed(2)}M` : `${(valInM || 0).toFixed(1)}M`;
        return h('text', { x: cx, y: cy, fill: '#86868b', textAnchor: 'middle', fontSize: 10, fontWeight: 600 }, formatted);
    };

    NPD.components = NPD.components || {};
    Object.assign(NPD.components, {
        ErrorBoundary,
        SafeWidget,
        ModalPortal,
        ExportCSVButton,
        InfoPopover,
        FilterDropdown,
        MultiSelectDropdown,
        MobileFilterDrawer,
        ExecutiveSkeleton,
        Sparkline,
        SyncStatusSlot,
        ImageWithFallback,
        renderCustomLabel
    });
})(typeof globalThis !== 'undefined' ? globalThis : window);
