(function (root) {
    'use strict';

    const NPD = root.NPD = root.NPD || {};

    function renderBootstrapError(missingLibs) {
        const rootEl = typeof document !== 'undefined' ? document.getElementById('root') : null;
        if (!rootEl) return;
        rootEl.innerHTML = `
            <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#1d1d1f;">
                <div style="max-width:440px;width:100%;background:#fff;border-radius:24px;padding:32px;box-shadow:0 12px 36px rgba(0,0,0,0.08);border:1px solid rgba(0,0,0,0.06);text-align:center;">
                    <div style="width:48px;height:48px;border-radius:14px;background:rgba(255,59,48,0.1);color:#ff3b30;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:24px;font-weight:700;">!</div>
                    <h1 style="font-size:18px;font-weight:800;margin:0 0 8px;">Unable to Load Required Libraries</h1>
                    <p style="font-size:13px;color:#86868b;line-height:1.6;margin:0 0 20px;">
                        Some external scripts (${missingLibs.join(', ')}) could not be loaded. Please check your network connection and reload the page.
                    </p>
                    <button type="button" onclick="window.location.reload()" style="width:100%;padding:12px 20px;border:none;border-radius:12px;background:#0071e3;color:#fff;font-size:14px;font-weight:700;cursor:pointer;">
                        Reload Dashboard
                    </button>
                </div>
            </div>
        `;
    }

    const missing = [];
    if (!root.React) missing.push('React');
    if (!root.ReactDOM) missing.push('ReactDOM');
    if (!root.Recharts) missing.push('Recharts');
    if (!root.Papa) missing.push('PapaParse');

    if (missing.length > 0) {
        if (typeof document !== 'undefined') renderBootstrapError(missing);
        return;
    }

    const React = root.React;
    const ReactDOM = root.ReactDOM;
    const h = React.createElement;
    const {
        useState, useMemo, useEffect, useCallback, useRef, useTransition, useDeferredValue
    } = React;

    const {
        UPDATE_LOGS, GROUP_ORDER, MONTHS_LIST, DATA_SOURCES, FETCH_CONCURRENCY
    } = NPD.config;
    const {
        sanitizeSalesRow, sanitizeBudgetRow, computeNiceYAxisTicks, copyTextToClipboard,
        parseUrlViewState, syncUrlViewState, loadCachedDataset, saveCachedDataset, formatSyncTimestamp,
        verifyVolumePin, fetchCSV, clearRequestCache, processRowsInChunks, runWithConcurrency
    } = NPD.utils;
    const {
        extractFilterOptions, computeCoreEngine, computeKPIs, computeTrendChartData,
        computeTopPerformers, computeTopCustomers, computeNPDMetrics
    } = NPD.engine;
    const Icons = NPD.icons || NPD.createIconFactory(React);
    const {
        LayoutDashboard, Package, MapPin, Sparkles, Box, Activity, X, RefreshCw,
        History, ChevronRight, Menu, SlidersHorizontal, Filter, ShoppingBag,
        Users, Store, Calendar, AlertTriangle, RotateCcw, Share2, Printer, Check, Clock
    } = Icons;

    const {
        SafeWidget, FilterDropdown, MultiSelectDropdown, MobileFilterDrawer,
        ExecutiveSkeleton, SyncStatusSlot,
        PortfolioSummaryWidget, KPIYTDWidget, KPITargetWidget, KPIForecastWidget, KPIPlanWidget,
        TrendChartWidget, ChannelMixWidget, CategoryTrendWidget, SubProductAnalysisWidget,
        NewAcquisitionWidget, ExecutiveSummaryWidget,
        PortfolioMixWidget, ProductProfitabilityWidget, TopPerformersWidget, SkuHealthWidget,
        TopCustomersWidget, ChurnDropoffWidget, ProductPresenceWidget, WhiteSpaceWidget,
        NPDVitalityWidget, TopNPDWidget, NPDTrajectoryWidget,
        VolumeDashboardView
    } = NPD.components;

    const buildInitialFilesStatus = (status = 'pending') => {
        const obj = {};
        for (let i = 0; i < GROUP_ORDER.length; i++) {
            obj[GROUP_ORDER[i]] = { s25: status, s26: status, bCh: status, bPr: status };
        }
        return obj;
    };

    function Dashboard() {
        const initialViewRef = useRef(null);
        if (!initialViewRef.current) {
            initialViewRef.current = parseUrlViewState();
        }
        const initialView = initialViewRef.current;

        const [activeTab, setActiveTab] = useState(() => initialView.activeTab);
        const [isSidebarOpen, setIsSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : true));
        const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
        const [isPending, startTransition] = useTransition();

        const syncLockRef = useRef(false);
        const syncModalTimerRef = useRef(null);
        const copyLinkTimerRef = useRef(null);
        const isMountedRef = useRef(true);

        useEffect(() => {
            isMountedRef.current = true;
            let resizeTimer;
            const handleResize = () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    if (window.innerWidth < 1024) setIsSidebarOpen(false);
                }, 150);
            };
            window.addEventListener('resize', handleResize);
            return () => {
                isMountedRef.current = false;
                clearTimeout(resizeTimer);
                if (syncModalTimerRef.current) clearTimeout(syncModalTimerRef.current);
                if (copyLinkTimerRef.current) clearTimeout(copyLinkTimerRef.current);
                window.removeEventListener('resize', handleResize);
            };
        }, []);

        const tabs = useMemo(() => [
            { id: 'Overview', label: 'Executive Overview', icon: h(LayoutDashboard, { className: 'w-4 h-4' }) },
            { id: 'Core', label: 'Core Portfolio & Health', icon: h(Package, { className: 'w-4 h-4' }) },
            { id: 'Distribution', label: 'Distribution & Expansion', icon: h(MapPin, { className: 'w-4 h-4' }) },
            { id: 'Innovation', label: 'Innovation & NPD', icon: h(Sparkles, { className: 'w-4 h-4' }) },
            { id: 'Volume', label: 'Volume & Pricing (WIP)', icon: h(Box, { className: 'w-4 h-4' }) }
        ], []);

        const [isVolumeUnlocked, setIsVolumeUnlocked] = useState(false);
        const [showPasswordModal, setShowPasswordModal] = useState(false);
        const [passwordInput, setPasswordInput] = useState('');
        const [passwordError, setPasswordError] = useState(false);
        const [showUpdateLog, setShowUpdateLog] = useState(false);

        const handleTabClick = useCallback((tabId) => {
            if (tabId === 'Volume' && !isVolumeUnlocked) {
                setShowPasswordModal(true);
                setPasswordInput('');
                setPasswordError(false);
            } else {
                startTransition(() => setActiveTab(tabId));
            }
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                setIsSidebarOpen(false);
            }
        }, [isVolumeUnlocked]);

        const handlePasswordSubmit = useCallback(async (e) => {
            e.preventDefault();
            const isValid = await verifyVolumePin(passwordInput);
            if (!isMountedRef.current) return;
            if (isValid) {
                setIsVolumeUnlocked(true);
                setShowPasswordModal(false);
                startTransition(() => setActiveTab('Volume'));
            } else {
                setPasswordError(true);
                setPasswordInput('');
            }
        }, [passwordInput]);

        const [salesData, setSalesData] = useState([]);
        const [budgetChannel, setBudgetChannel] = useState([]);
        const [budgetProduct, setBudgetProduct] = useState([]);

        const [selectedGroups, setSelectedGroups] = useState(() => initialView.selectedGroups);
        const [showUpload, setShowUpload] = useState(false);
        const [isSyncing, setIsSyncing] = useState(false);
        const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
        const [lastSyncedAt, setLastSyncedAt] = useState(null);
        const [syncErrorGroups, setSyncErrorGroups] = useState([]);
        const [dismissedSyncWarning, setDismissedSyncWarning] = useState(false);
        const [show2025Trend, setShow2025Trend] = useState(true);
        const [showForecast, setShowForecast] = useState(false);
        const [copiedLink, setCopiedLink] = useState(false);

        const [topPerfSearch, setTopPerfSearch] = useState('');
        const [whiteSpaceSearch, setWhiteSpaceSearch] = useState('');
        const [customerSearch, setCustomerSearch] = useState('');

        const debouncedTopPerfSearch = useDeferredValue(topPerfSearch);
        const debouncedWhiteSpaceSearch = useDeferredValue(whiteSpaceSearch);
        const debouncedCustomerSearch = useDeferredValue(customerSearch);

        const [topPerfSortMode, setTopPerfSortMode] = useState('sales');
        const [topCustomerSortMode, setTopCustomerSortMode] = useState('sales');

        const [filterSubProduct, setFilterSubProduct] = useState(() => initialView.filterSubProduct);
        const [filterChannel, setFilterChannel] = useState(() => initialView.filterChannel);
        const [filterSubChannel, setFilterSubChannel] = useState(() => initialView.filterSubChannel);
        const [filterMonth, setFilterMonth] = useState(() => initialView.filterMonth);
        const [excludeReturns, setExcludeReturns] = useState(() => initialView.excludeReturns);

        // Key-based drill-down state (prevents stale snapshot bug when filters change)
        const [topPerfDrillSku, setTopPerfDrillSku] = useState(null);
        const [topCustomerDrillKey, setTopCustomerDrillKey] = useState(null);

        const [filesStatus, setFilesStatus] = useState(() => buildInitialFilesStatus('pending'));
        const [uploadTab, setUploadTab] = useState('DACARE');
        const [isDataReady, setIsDataReady] = useState(false);

        // Keep URL query parameters synchronized with active filters & tab (Shareable View Links)
        useEffect(() => {
            syncUrlViewState({
                activeTab,
                selectedGroups,
                filterSubProduct,
                filterChannel,
                filterSubChannel,
                filterMonth,
                excludeReturns
            });
        }, [activeTab, selectedGroups, filterSubProduct, filterChannel, filterSubChannel, filterMonth, excludeReturns]);

        const syncAllData = useCallback(async (options = {}) => {
            const isSilent = Boolean(options && options.silent === true);
            if (syncLockRef.current) return;
            syncLockRef.current = true;
            if (syncModalTimerRef.current) {
                clearTimeout(syncModalTimerRef.current);
                syncModalTimerRef.current = null;
            }

            if (isSilent) {
                setIsBackgroundRefreshing(true);
            } else {
                setIsSyncing(true);
                setShowUpload(true);
                setFilesStatus(buildInitialFilesStatus('loading'));
            }
            setSyncErrorGroups([]);
            setDismissedSyncWarning(false);

            clearRequestCache();

            const finalSales = [];
            const finalBudgetChannel = [];
            const finalBudgetProduct = [];
            const failedSet = new Set();

            const urlTasks = { s25: {}, s26: {}, bCh: {}, bPr: {} };
            Object.entries(DATA_SOURCES).forEach(([groupName, sources]) => {
                ['s25', 's26', 'bCh', 'bPr'].forEach((type) => {
                    const url = sources[type];
                    if (url) {
                        if (!urlTasks[type][url]) urlTasks[type][url] = [];
                        urlTasks[type][url].push(groupName);
                    }
                });
            });

            const makeTask = (url, targetGroups, type) => async () => {
                const targetGroupSet = new Set(targetGroups);
                try {
                    const rawData = await fetchCSV(url);
                    if (!rawData || !Array.isArray(rawData)) {
                        throw new Error('Empty or invalid CSV dataset');
                    }

                    await processRowsInChunks(rawData, (row) => {
                        if (type === 's25' || type === 's26') {
                            const sanitizedRow = sanitizeSalesRow(row, type, targetGroupSet);
                            if (sanitizedRow) finalSales.push(sanitizedRow);
                        } else if (type === 'bCh') {
                            const sanitizedRow = sanitizeBudgetRow(row, type, targetGroupSet);
                            if (sanitizedRow) finalBudgetChannel.push(sanitizedRow);
                        } else if (type === 'bPr') {
                            const sanitizedRow = sanitizeBudgetRow(row, type, targetGroupSet);
                            if (sanitizedRow) finalBudgetProduct.push(sanitizedRow);
                        }
                    });

                    if (isMountedRef.current) {
                        setFilesStatus((prev) => {
                            const next = { ...prev };
                            targetGroups.forEach((g) => { next[g] = { ...next[g], [type]: 'success' }; });
                            return next;
                        });
                    }
                } catch (error) {
                    console.error(`Sync Error [${type}] (${targetGroups.join(', ')}):`, error);
                    targetGroups.forEach((g) => failedSet.add(g));
                    if (isMountedRef.current) {
                        setFilesStatus((prev) => {
                            const next = { ...prev };
                            targetGroups.forEach((g) => { next[g] = { ...next[g], [type]: 'error' }; });
                            return next;
                        });
                    }
                }
            };

            const taskFns = [];
            Object.entries(urlTasks).forEach(([type, urls]) => {
                Object.entries(urls).forEach(([url, groups]) => {
                    taskFns.push(makeTask(url, groups, type));
                });
            });

            try {
                await runWithConcurrency(taskFns, FETCH_CONCURRENCY);
            } finally {
                // Free raw CSV object arrays immediately after sanitization to cut RAM usage in half
                clearRequestCache();
                syncLockRef.current = false;
            }

            if (!isMountedRef.current) return;

            const failedGroups = GROUP_ORDER.filter((g) => failedSet.has(g));
            setSyncErrorGroups(failedGroups);

            const nowTs = Date.now();
            // Defensive Stale-While-Revalidate: never wipe out a healthy cached snapshot if a silent background refresh fails
            const shouldApplyFreshData = !isSilent || (failedGroups.length === 0 && finalSales.length > 0);

            if (shouldApplyFreshData) {
                startTransition(() => {
                    setSalesData(finalSales);
                    setBudgetChannel(finalBudgetChannel);
                    setBudgetProduct(finalBudgetProduct);
                    setIsDataReady(true);
                });
                if (finalSales.length > 0) {
                    setLastSyncedAt(nowTs);
                }
            }

            if (failedGroups.length === 0 && finalSales.length > 0) {
                saveCachedDataset({
                    salesData: finalSales,
                    budgetChannel: finalBudgetChannel,
                    budgetProduct: finalBudgetProduct,
                    syncedAt: nowTs
                });
            }

            setIsSyncing(false);
            setIsBackgroundRefreshing(false);

            if (!isSilent) {
                if (failedGroups.length > 0) {
                    setUploadTab(failedGroups[0]);
                } else {
                    syncModalTimerRef.current = setTimeout(() => {
                        if (isMountedRef.current) setShowUpload(false);
                    }, 900);
                }
            }
        }, []);

        // Stale-While-Revalidate Startup: hydrate instantly from IndexedDB if available, then refresh silently
        useEffect(() => {
            let cancelled = false;
            (async () => {
                const cached = await loadCachedDataset();
                if (cancelled || !isMountedRef.current) return;
                if (cached && Array.isArray(cached.salesData) && cached.salesData.length > 0) {
                    startTransition(() => {
                        setSalesData(cached.salesData);
                        setBudgetChannel(cached.budgetChannel || []);
                        setBudgetProduct(cached.budgetProduct || []);
                        setLastSyncedAt(cached.syncedAt || null);
                        setFilesStatus(buildInitialFilesStatus('success'));
                        setIsDataReady(true);
                    });
                    syncAllData({ silent: true });
                } else {
                    syncAllData({ silent: false });
                }
            })();
            return () => { cancelled = true; };
        }, [syncAllData]);

        const toggleGroup = useCallback((group) => {
            startTransition(() => {
                setSelectedGroups((prev) => {
                    if (group === 'ALL') return ['ALL'];
                    let newGroups = prev.filter((g) => g !== 'ALL');
                    if (newGroups.includes(group)) {
                        newGroups = newGroups.filter((g) => g !== group);
                        if (newGroups.length === 0) return ['ALL'];
                    } else {
                        newGroups.push(group);
                    }
                    newGroups.sort((a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b));
                    return newGroups;
                });
                setFilterSubProduct('All');
            });
        }, []);

        const handleFilterChange = useCallback((setter) => (val) => {
            startTransition(() => setter(val));
        }, []);

        const handleResetAllFilters = useCallback(() => {
            startTransition(() => {
                setSelectedGroups(['ALL']);
                setFilterSubProduct('All');
                setFilterChannel('All');
                setFilterSubChannel('All');
                setFilterMonth(MONTHS_LIST);
                setExcludeReturns(false);
            });
        }, []);

        const handleShareView = useCallback(async () => {
            if (typeof window === 'undefined') return;
            syncUrlViewState({
                activeTab,
                selectedGroups,
                filterSubProduct,
                filterChannel,
                filterSubChannel,
                filterMonth,
                excludeReturns
            });
            const ok = await copyTextToClipboard(window.location.href);
            if (ok && isMountedRef.current) {
                setCopiedLink(true);
                if (copyLinkTimerRef.current) clearTimeout(copyLinkTimerRef.current);
                copyLinkTimerRef.current = setTimeout(() => {
                    if (isMountedRef.current) setCopiedLink(false);
                }, 2000);
            }
        }, [activeTab, selectedGroups, filterSubProduct, filterChannel, filterSubChannel, filterMonth, excludeReturns]);

        const handlePrintReport = useCallback(() => {
            if (typeof window === 'undefined') return;
            window.dispatchEvent(new Event('npd:expand-for-print'));
            setTimeout(() => {
                window.print();
            }, 120);
        }, []);

        const { availableSubProducts, availableChannels, availableSubChannels } = useMemo(
            () => extractFilterOptions(salesData, selectedGroups, filterChannel),
            [salesData, selectedGroups, filterChannel]
        );

        // Auto-reset Sub-Channel if parent Channel or Product Group changes and invalidates the selection
        useEffect(() => {
            if (salesData.length > 0 && filterSubChannel !== 'All' && !availableSubChannels.includes(filterSubChannel)) {
                setFilterSubChannel('All');
            }
        }, [salesData.length, availableSubChannels, filterSubChannel]);

        const isAllMonthsSelected = useMemo(() => filterMonth.length === MONTHS_LIST.length, [filterMonth]);

        const activeFilterCount = useMemo(() => {
            let count = 0;
            if (!selectedGroups.includes('ALL')) count++;
            if (filterSubProduct !== 'All') count++;
            if (filterChannel !== 'All') count++;
            if (filterSubChannel !== 'All') count++;
            if (!isAllMonthsSelected) count++;
            if (excludeReturns) count++;
            return count;
        }, [selectedGroups, filterSubProduct, filterChannel, filterSubChannel, isAllMonthsSelected, excludeReturns]);

        const coreEngine = useMemo(
            () => computeCoreEngine(salesData, {
                selectedGroups,
                filterSubProduct,
                filterChannel,
                filterSubChannel,
                filterMonth,
                excludeReturns
            }),
            [salesData, selectedGroups, filterSubProduct, filterChannel, filterSubChannel, filterMonth, excludeReturns]
        );

        const filteredData = coreEngine.filteredData;
        const channelMix = coreEngine.channelMix;

        const kpi = useMemo(
            () => computeKPIs(coreEngine, budgetChannel, budgetProduct, {
                selectedGroups,
                filterSubProduct,
                filterChannel,
                filterSubChannel,
                filterMonth
            }),
            [coreEngine, budgetChannel, budgetProduct, selectedGroups, filterSubProduct, filterChannel, filterSubChannel, filterMonth]
        );

        const trendChartData = useMemo(
            () => computeTrendChartData(filteredData, coreEngine),
            [filteredData, coreEngine]
        );

        const yAxisTicks = useMemo(() => {
            const maxVal = (trendChartData || []).reduce((max, d) => Math.max(max, d.sales25 || 0, d.sales26 || 0, d.proj26 || 0), 0);
            return computeNiceYAxisTicks(maxVal, 5000000);
        }, [trendChartData]);

        // Lazy Tab Evaluation: Core tab
        const rawTopPerformers = useMemo(() => {
            if (activeTab !== 'Core') return [];
            return computeTopPerformers(filteredData, coreEngine.valid2026Months);
        }, [activeTab, filteredData, coreEngine.valid2026Months]);

        const topPerformers = useMemo(() => {
            if (activeTab !== 'Core') return [];
            let list = [...(rawTopPerformers || [])];
            if (debouncedTopPerfSearch && debouncedTopPerfSearch.length >= 2) {
                const q = debouncedTopPerfSearch.toLowerCase();
                list = list.filter((item) => item.sku.toLowerCase().includes(q) || item.name.toLowerCase().includes(q));
            }
            if (topPerfSortMode === 'yoy') {
                return list.sort((a, b) => {
                    const yoyA = a.sales25 > 0 ? (a.value - a.sales25) / a.sales25 : -Infinity;
                    const yoyB = b.sales25 > 0 ? (b.value - b.sales25) / b.sales25 : -Infinity;
                    return yoyB - yoyA;
                }).slice(0, 10);
            }
            return list.sort((a, b) => b.value - a.value).slice(0, 10);
        }, [activeTab, rawTopPerformers, debouncedTopPerfSearch, topPerfSortMode]);

        const topPerfDrillDown = useMemo(
            () => (topPerfDrillSku ? rawTopPerformers.find((x) => x.sku === topPerfDrillSku) || null : null),
            [rawTopPerformers, topPerfDrillSku]
        );

        // Lazy Tab Evaluation: Distribution tab
        const { rawTopCustomers, uniqueCustomersCount } = useMemo(() => {
            if (activeTab !== 'Distribution') return { rawTopCustomers: [], uniqueCustomersCount: 0 };
            return computeTopCustomers(filteredData, coreEngine.valid2026Months);
        }, [activeTab, filteredData, coreEngine.valid2026Months]);

        const topCustomers = useMemo(() => {
            if (activeTab !== 'Distribution') return [];
            let list = [...(rawTopCustomers || [])];
            if (debouncedCustomerSearch && debouncedCustomerSearch.length >= 2) {
                const q = debouncedCustomerSearch.toLowerCase();
                list = list.filter((item) => item.name.toLowerCase().includes(q) || item.channel.toLowerCase().includes(q));
            }
            if (topCustomerSortMode === 'yoy') {
                return list.sort((a, b) => {
                    const yoyA = a.totalSales25 > 0 ? (a.totalSales26 - a.totalSales25) / a.totalSales25 : -Infinity;
                    const yoyB = b.totalSales25 > 0 ? (b.totalSales26 - b.totalSales25) / b.totalSales25 : -Infinity;
                    return yoyB - yoyA;
                }).slice(0, 50);
            }
            return list.sort((a, b) => b.totalSales26 - a.totalSales26).slice(0, 50);
        }, [activeTab, rawTopCustomers, debouncedCustomerSearch, topCustomerSortMode]);

        const topCustomerDrillDown = useMemo(
            () => (topCustomerDrillKey ? rawTopCustomers.find((x) => x.key === topCustomerDrillKey) || null : null),
            [rawTopCustomers, topCustomerDrillKey]
        );

        // Lazy Tab Evaluation: Innovation tab
        const npdData = useMemo(() => {
            if (activeTab !== 'Innovation') return { totalNPDSales26: 0, topNPDs: [], vitalityIndex: 0, latestAbsMonth: 0 };
            return computeNPDMetrics(salesData, filteredData, kpi, selectedGroups);
        }, [activeTab, salesData, filteredData, kpi, selectedGroups]);

        const activeTabMeta = tabs.find((t) => t.id === activeTab);
        const formattedLastSync = useMemo(() => formatSyncTimestamp(lastSyncedAt), [lastSyncedAt]);

        return h(
            'div',
            { className: 'app-shell flex h-screen bg-[#f5f5f7] w-full font-sans overflow-hidden text-[#1d1d1f]' },
            isSidebarOpen && h('div', {
                className: 'no-print fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200',
                onClick: () => setIsSidebarOpen(false)
            }),
            // Adaptive Left Sidebar
            h(
                'aside',
                { className: `no-print fixed lg:relative inset-y-0 left-0 w-[280px] bg-white/95 backdrop-blur-xl border-r border-black/5 flex flex-col justify-between shrink-0 z-50 lg:z-40 shadow-[4px_0_24px_rgba(0,0,0,0.06)] lg:shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0 lg:ml-0' : '-translate-x-full lg:-ml-[280px]'}` },
                h(
                    'div',
                    { className: 'flex flex-col h-full' },
                    h(
                        'div',
                        { className: 'p-5 sm:p-6 border-b border-black/5 flex items-center justify-between' },
                        h(
                            'div',
                            { className: 'flex items-center gap-3' },
                            h('div', { className: 'bg-[#0071e3] p-2.5 rounded-xl shadow-[0_2px_8px_rgba(0,113,227,0.3)]' }, h(Activity, { className: 'w-6 h-6 text-white' })),
                            h(
                                'div',
                                null,
                                h('h1', { className: 'text-sm font-extrabold text-[#1d1d1f] leading-tight tracking-tight' }, 'NPD Performance'),
                                h('p', { className: 'text-[11px] text-[#0071e3] font-bold tracking-wider uppercase mt-0.5' }, 'Dashboard 2026')
                            )
                        ),
                        h(
                            'button',
                            { type: 'button', onClick: () => setIsSidebarOpen(false), className: 'lg:hidden p-2 rounded-full bg-[#f5f5f7] text-[#86868b] hover:text-[#1d1d1f]' },
                            h(X, { className: 'w-4 h-4' })
                        )
                    ),
                    h(
                        'nav',
                        { className: 'flex-1 overflow-y-auto py-5 sm:py-6 px-4 space-y-2 custom-scrollbar' },
                        h('div', { className: 'text-[10px] font-extrabold text-[#86868b] uppercase tracking-wider mb-3 px-2' }, 'Main Menu'),
                        tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return h(
                                'button',
                                {
                                    key: tab.id,
                                    type: 'button',
                                    onClick: () => handleTabClick(tab.id),
                                    className: `w-full flex items-center gap-3.5 px-4 py-3.5 min-h-[46px] text-sm font-semibold rounded-[14px] transition-all duration-200 group relative overflow-hidden ${isActive ? 'text-[#0071e3] bg-[#0071e3]/10 shadow-sm' : 'text-[#86868b] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]'}`
                                },
                                isActive && h('div', { className: 'absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-[#0071e3] rounded-r-full' }),
                                React.cloneElement(tab.icon, { className: `w-5 h-5 transition-transform shrink-0 ${isActive ? 'scale-110' : 'group-hover:scale-110'}` }),
                                h('span', { className: 'truncate' }, tab.label)
                            );
                        })
                    ),
                    h(
                        'div',
                        { className: 'p-5 border-t border-black/5 bg-[#f5f5f7]/50 flex flex-col gap-2.5 pb-safe' },
                        h(
                            'button',
                            {
                                type: 'button',
                                onClick: () => syncAllData({ silent: false }),
                                disabled: isSyncing || isBackgroundRefreshing,
                                className: `w-full flex justify-center items-center gap-2 text-white px-5 py-3.5 min-h-[46px] rounded-[14px] text-sm font-bold transition-all shadow-md group ${(isSyncing || isBackgroundRefreshing) ? 'bg-[#0071e3]/70 cursor-not-allowed' : 'bg-[#1d1d1f] hover:bg-black active:scale-95'}`
                            },
                            h(RefreshCw, { className: `w-4 h-4 ${(isSyncing || isBackgroundRefreshing) ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}` }),
                            isSyncing ? 'Syncing Data...' : (isBackgroundRefreshing ? 'Refreshing Live...' : 'Sync Data')
                        ),
                        (formattedLastSync || isBackgroundRefreshing) && h(
                            'div',
                            { className: 'flex items-center justify-center gap-1.5 text-[11px] text-[#86868b] font-medium px-2.5 py-1.5 rounded-[10px] bg-white/80 border border-black/5' },
                            isBackgroundRefreshing
                                ? h(React.Fragment, null, h(RefreshCw, { className: 'w-3 h-3 text-[#0071e3] animate-spin shrink-0' }), h('span', { className: 'text-[#0071e3] font-semibold truncate' }, 'Updating in background...'))
                                : h(React.Fragment, null, h(Clock, { className: 'w-3 h-3 text-[#34c759] shrink-0' }), h('span', { className: 'truncate' }, `Synced: ${formattedLastSync}`))
                        ),
                        h(
                            'button',
                            {
                                type: 'button',
                                onClick: () => setShowUpdateLog(true),
                                className: 'w-full flex items-center justify-between px-3.5 py-2.5 rounded-[12px] bg-white hover:bg-[#e8e8ed]/70 border border-black/5 text-xs font-semibold text-[#1d1d1f] transition-all shadow-sm group'
                            },
                            h('span', { className: 'flex items-center gap-2' }, h(History, { className: 'w-3.5 h-3.5 text-[#0071e3] group-hover:rotate-[-20deg] transition-transform' }), h('span', null, 'Update Log')),
                            h('span', { className: 'flex items-center gap-1.5' }, h('span', { className: 'text-[10px] font-extrabold text-[#0071e3] bg-[#0071e3]/10 px-2 py-0.5 rounded-full' }, UPDATE_LOGS[0].version), h(ChevronRight, { className: 'w-3.5 h-3.5 text-[#86868b]' }))
                        ),
                        h('div', { className: 'text-center text-[10px] text-[#86868b] font-medium pt-0.5' }, `Developed by NPD Team • Updated ${UPDATE_LOGS[0].date}`)
                    )
                )
            ),
            // Main Content Area
            h(
                'div',
                { className: 'app-main-wrapper flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f5f5f7] relative' },
                h(
                    'header',
                    { className: 'no-print bg-white/85 backdrop-blur-xl border-b border-black/5 sticky top-0 z-30 shadow-[0_4px_24px_rgba(0,0,0,0.02)] shrink-0 transition-opacity duration-300' },
                    h(
                        'div',
                        { className: 'px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-3 sm:gap-4' },
                        h(
                            'div',
                            { className: 'flex items-center justify-between gap-2' },
                            h(
                                'div',
                                { className: 'flex items-center gap-2.5 sm:gap-3.5 min-w-0' },
                                h(
                                    'button',
                                    {
                                        type: 'button',
                                        onClick: () => setIsSidebarOpen(!isSidebarOpen),
                                        className: 'p-2.5 min-w-[42px] min-h-[42px] flex items-center justify-center hover:bg-[#e8e8ed] rounded-xl transition-colors text-[#86868b] hover:text-[#1d1d1f] shrink-0',
                                        title: 'Toggle Sidebar'
                                    },
                                    h(Menu, { className: 'w-5 h-5' })
                                ),
                                h(
                                    'h2',
                                    { className: 'text-base sm:text-xl lg:text-[22px] font-extrabold text-[#1d1d1f] tracking-tight flex items-center gap-2.5 truncate' },
                                    h(
                                        'div',
                                        { className: 'bg-[#f5f5f7] p-2 rounded-xl text-[#1d1d1f] hidden sm:flex shrink-0' },
                                        activeTabMeta?.icon ? React.cloneElement(activeTabMeta.icon, { className: 'w-5 h-5 lg:w-6 lg:h-6' }) : null
                                    ),
                                    h('span', { className: 'truncate' }, activeTabMeta?.label)
                                )
                            ),
                            h(
                                'div',
                                { className: 'flex items-center gap-1.5 md:hidden shrink-0' },
                                h(
                                    'button',
                                    {
                                        type: 'button',
                                        onClick: handleShareView,
                                        title: 'Copy Shareable View Link',
                                        className: `p-2.5 min-h-[42px] rounded-xl text-xs font-bold flex items-center justify-center transition-colors ${copiedLink ? 'bg-[#34c759]/15 text-[#34c759]' : 'bg-[#e8e8ed] text-[#1d1d1f]'}`
                                    },
                                    copiedLink ? h(Check, { className: 'w-4 h-4' }) : h(Share2, { className: 'w-4 h-4' })
                                ),
                                activeFilterCount > 0 && h(
                                    'button',
                                    { type: 'button', onClick: handleResetAllFilters, className: 'p-2.5 min-h-[42px] rounded-xl bg-[#ff3b30]/10 text-[#ff3b30] text-xs font-bold flex items-center justify-center', title: 'Reset Filters' },
                                    h(X, { className: 'w-4 h-4' })
                                ),
                                h(
                                    'button',
                                    {
                                        type: 'button',
                                        onClick: () => setIsMobileFilterOpen(true),
                                        className: `px-3.5 py-2 min-h-[42px] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${activeFilterCount > 0 ? 'bg-[#0071e3] text-white' : 'bg-[#e8e8ed] text-[#1d1d1f]'}`
                                    },
                                    h(SlidersHorizontal, { className: 'w-4 h-4' }),
                                    h('span', null, 'Filters'),
                                    activeFilterCount > 0 && h('span', { className: 'bg-white text-[#0071e3] text-[10px] font-extrabold px-1.5 py-0.5 rounded-full' }, activeFilterCount)
                                )
                            )
                        ),
                        h(
                            'div',
                            { className: 'flex overflow-x-auto md:flex-wrap no-scrollbar bg-[#e3e3e8] rounded-[14px] p-1 sm:p-1.5 gap-1 sm:gap-1.5 shadow-inner' },
                            ['ALL', ...GROUP_ORDER].map((group) => h(
                                'button',
                                {
                                    key: group,
                                    type: 'button',
                                    onClick: () => toggleGroup(group),
                                    className: `px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold rounded-[10px] transition-all shrink-0 ${selectedGroups.includes(group) ? 'bg-white text-[#1d1d1f] shadow-[0_2px_8px_rgba(0,0,0,0.12)]' : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/5'}`
                                },
                                group
                            ))
                        )
                    ),
                    h(
                        'div',
                        { className: `hidden md:flex bg-[#f5f5f7]/60 border-t border-black/5 py-3 px-6 lg:px-8 flex-wrap gap-2.5 lg:gap-3 items-center transition-opacity duration-300 ${isPending ? 'opacity-50' : 'opacity-100'}` },
                        h('span', { className: 'text-xs font-extrabold text-[#86868b] flex items-center gap-1.5 tracking-wider mr-0.5' }, h(Filter, { className: 'w-4 h-4' }), ' FILTERS:'),
                        h(FilterDropdown, { label: 'Product', value: filterSubProduct, options: [{ val: 'All', group: null }, ...availableSubProducts], onChange: handleFilterChange(setFilterSubProduct), icon: h(ShoppingBag) }),
                        h(FilterDropdown, { label: 'Channel', value: filterChannel, options: ['All', ...availableChannels], onChange: handleFilterChange(setFilterChannel), icon: h(Users) }),
                        h(FilterDropdown, { label: 'Sub-Ch', value: filterSubChannel, options: ['All', ...availableSubChannels], onChange: handleFilterChange(setFilterSubChannel), icon: h(Store) }),
                        h(MultiSelectDropdown, { label: 'Month', selectedValues: filterMonth, options: MONTHS_LIST, onChange: handleFilterChange(setFilterMonth), icon: h(Calendar) }),
                        h(
                            'button',
                            {
                                type: 'button',
                                onClick: () => startTransition(() => setExcludeReturns((prev) => !prev)),
                                title: excludeReturns
                                    ? `Gross Sales Mode: Excluding ฿${((coreEngine.excludedReturns26 || 0) / 1000000).toFixed(2)}M of 2026 returns`
                                    : 'Toggle ON to exclude negative return rows (Gross Demand view)',
                                className: `flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 min-h-[38px] rounded-xl border transition-all ${
                                    excludeReturns
                                        ? 'bg-[#ff9500]/15 text-[#d49b00] border-[#ff9500]/30 shadow-sm'
                                        : 'bg-[#e8e8ed] hover:bg-[#d1d1d6] text-[#86868b] hover:text-[#1d1d1f] border-transparent'
                                }`
                            },
                            h(RotateCcw, { className: 'w-3.5 h-3.5' }),
                            excludeReturns ? 'Gross Sales (No Returns)' : 'Exclude Returns'
                        ),
                        activeFilterCount > 0 && h(
                            'button',
                            { type: 'button', onClick: handleResetAllFilters, className: 'text-xs text-[#ff3b30] hover:text-white font-bold flex items-center gap-1 px-3 py-2 min-h-[38px] rounded-xl bg-[#ff3b30]/10 hover:bg-[#ff3b30] transition-colors shadow-sm' },
                            h(X, { className: 'w-3.5 h-3.5' }),
                            ' Clear'
                        ),
                        h(
                            'div',
                            { className: 'ml-auto flex items-center gap-2' },
                            h(
                                'button',
                                {
                                    type: 'button',
                                    onClick: handleShareView,
                                    title: 'Copy shareable link with current tab & filters',
                                    className: `flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 min-h-[38px] rounded-xl border transition-all ${
                                        copiedLink
                                            ? 'bg-[#34c759]/15 text-[#34c759] border-[#34c759]/30 shadow-sm'
                                            : 'bg-white hover:bg-[#e8e8ed] text-[#1d1d1f] border-black/10 shadow-sm active:scale-95'
                                    }`
                                },
                                copiedLink
                                    ? h(React.Fragment, null, h(Check, { className: 'w-3.5 h-3.5' }), ' Copied Link')
                                    : h(React.Fragment, null, h(Share2, { className: 'w-3.5 h-3.5 text-[#0071e3]' }), ' Share View')
                            ),
                            h(
                                'button',
                                {
                                    type: 'button',
                                    onClick: handlePrintReport,
                                    title: 'Print or Save Executive A4 Landscape PDF',
                                    className: 'flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 min-h-[38px] rounded-xl bg-white hover:bg-[#e8e8ed] text-[#1d1d1f] border border-black/10 shadow-sm transition-all active:scale-95'
                                },
                                h(Printer, { className: 'w-3.5 h-3.5 text-[#1d1d1f]' }),
                                ' Print / PDF'
                            )
                        )
                    )
                ),
                h(MobileFilterDrawer, {
                    isOpen: isMobileFilterOpen,
                    onClose: () => setIsMobileFilterOpen(false),
                    filterSubProduct,
                    setFilterSubProduct: handleFilterChange(setFilterSubProduct),
                    availableSubProducts,
                    filterChannel,
                    setFilterChannel: handleFilterChange(setFilterChannel),
                    availableChannels,
                    filterSubChannel,
                    setFilterSubChannel: handleFilterChange(setFilterSubChannel),
                    availableSubChannels,
                    filterMonth,
                    setFilterMonth: handleFilterChange(setFilterMonth),
                    monthsList: MONTHS_LIST,
                    excludeReturns,
                    setExcludeReturns: handleFilterChange(setExcludeReturns),
                    selectedGroups,
                    toggleGroup,
                    onResetAll: handleResetAllFilters
                }),
                h(
                    'main',
                    { className: 'app-main-scroll flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8' },
                    h(
                        'div',
                        { className: `transition-opacity duration-300 w-full max-w-[1600px] mx-auto ${isPending ? 'opacity-40' : 'opacity-100'}` },
                        // Print-Only Executive Report Masthead
                        h(
                            'div',
                            { className: 'print-only mb-6 pb-4 border-b-2 border-[#1d1d1f]' },
                            h(
                                'div',
                                { className: 'flex justify-between items-start gap-4' },
                                h(
                                    'div',
                                    null,
                                    h('div', { className: 'text-[10px] font-extrabold text-[#0071e3] uppercase tracking-wider' }, 'Non-paper Performance Dashboard 2026 • Executive Report'),
                                    h('h1', { className: 'text-xl font-extrabold text-[#1d1d1f] mt-0.5' }, activeTabMeta?.label || activeTab),
                                    h(
                                        'p',
                                        { className: 'text-xs text-[#86868b] font-medium mt-1' },
                                        `Groups: ${selectedGroups.includes('ALL') ? 'ALL Portfolios' : selectedGroups.join(', ')}  |  Product: ${filterSubProduct}  |  Channel: ${filterChannel}  |  Sub-Channel: ${filterSubChannel}  |  Months: ${isAllMonthsSelected ? 'Jan–Dec (Full)' : (filterMonth.join(', ') || 'None')}  |  Basis: ${excludeReturns ? 'Gross Sales (Returns Excluded)' : 'Net Sales'}`
                                    )
                                ),
                                h(
                                    'div',
                                    { className: 'text-right text-[11px] text-[#86868b] font-medium shrink-0' },
                                    formattedLastSync && h('div', null, `Data Synced: ${formattedLastSync}`),
                                    h('div', null, `Build: ${UPDATE_LOGS[0].version}`)
                                )
                            )
                        ),
                        // Persistent partial-sync error warning banner (Defensive Programming)
                        syncErrorGroups.length > 0 && !dismissedSyncWarning && h(
                            'div',
                            { className: 'no-print mb-5 p-4 rounded-[18px] bg-[#ff3b30]/10 border border-[#ff3b30]/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200' },
                            h(
                                'div',
                                { className: 'flex items-start gap-2.5 text-xs sm:text-sm text-[#1d1d1f]' },
                                h(AlertTriangle, { className: 'w-5 h-5 text-[#ff3b30] shrink-0 mt-0.5' }),
                                h(
                                    'div',
                                    null,
                                    h('span', { className: 'font-bold text-[#ff3b30]' }, 'Partial Data Sync Warning: '),
                                    `ไม่สามารถดึงข้อมูลบางชีตของกลุ่ม `,
                                    h('strong', null, syncErrorGroups.join(', ')),
                                    ' ได้ กรุณากดลองใหม่อีกครั้ง'
                                )
                            ),
                            h(
                                'div',
                                { className: 'flex items-center gap-2 self-end sm:self-center shrink-0' },
                                h(
                                    'button',
                                    { type: 'button', onClick: () => syncAllData({ silent: false }), disabled: isSyncing, className: 'px-3.5 py-1.5 rounded-xl bg-[#ff3b30] hover:bg-[#d63026] text-white text-xs font-bold shadow-sm transition-colors' },
                                    'Retry Sync'
                                ),
                                h(
                                    'button',
                                    { type: 'button', onClick: () => setDismissedSyncWarning(true), className: 'p-1.5 rounded-lg text-[#86868b] hover:text-[#1d1d1f]' },
                                    h(X, { className: 'w-4 h-4' })
                                )
                            )
                        ),
                        // Active Gross Sales (Exclude Returns) Notice Banner
                        excludeReturns && isDataReady && h(
                            'div',
                            { className: 'mb-5 px-4 py-2.5 rounded-[14px] bg-[#ff9500]/10 border border-[#ff9500]/25 flex items-center justify-between gap-3 text-xs font-medium text-[#1d1d1f]' },
                            h(
                                'div',
                                { className: 'flex items-center gap-2' },
                                h(RotateCcw, { className: 'w-4 h-4 text-[#d49b00] shrink-0' }),
                                h(
                                    'span',
                                    null,
                                    h('strong', { className: 'text-[#d49b00]' }, 'Gross Sales Mode Active: '),
                                    `ตัดรายการรับคืนสินค้าติดลบออกชั่วคราว (มูลค่าคืนสินค้าปี 2026 ที่ถูกกรองออก: `,
                                    h('strong', null, `฿${((coreEngine.excludedReturns26 || 0) / 1000000).toFixed(2)}M`),
                                    ') เพื่อวิเคราะห์ Gross Demand แท้จริง'
                                )
                            ),
                            h(
                                'button',
                                { type: 'button', onClick: () => startTransition(() => setExcludeReturns(false)), className: 'no-print text-[11px] font-bold text-[#d49b00] hover:underline shrink-0' },
                                'Switch to Net Sales'
                            )
                        ),
                        !isDataReady
                            ? h(ExecutiveSkeleton)
                            : h(
                                React.Fragment,
                                null,
                                activeTab === 'Overview' && h(
                                    'div',
                                    { className: 'space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both' },
                                    h(
                                        'div',
                                        { className: 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 sm:gap-6' },
                                        h(SafeWidget, null, h(PortfolioSummaryWidget, { selectedGroups, toggleGroup })),
                                        h(SafeWidget, null, h(KPIYTDWidget, { kpi })),
                                        h(SafeWidget, null, h(KPITargetWidget, { kpi })),
                                        h(SafeWidget, null, h(KPIForecastWidget, { kpi, showForecast, setShowForecast })),
                                        h(SafeWidget, null, h(KPIPlanWidget, { kpi }))
                                    ),
                                    h(
                                        'div',
                                        { className: 'grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6' },
                                        h(SafeWidget, null, h(TrendChartWidget, { trendChartData, show2025Trend, setShow2025Trend, yAxisTicks })),
                                        h(SafeWidget, null, h(ChannelMixWidget, { channelMix, kpi }))
                                    ),
                                    h('div', { className: 'grid grid-cols-1 gap-5 sm:gap-6' }, h(SafeWidget, null, h(CategoryTrendWidget, { filteredData, monthsList: MONTHS_LIST }))),
                                    h(SafeWidget, null, h(SubProductAnalysisWidget, { filteredData, valid2026Months: coreEngine.valid2026Months, monthsList: MONTHS_LIST })),
                                    h(SafeWidget, null, h(NewAcquisitionWidget, { filteredData })),
                                    h(SafeWidget, null, h(ExecutiveSummaryWidget, { kpi, filteredData, channelMix, valid2026Months: coreEngine.valid2026Months }))
                                ),
                                activeTab === 'Core' && h(
                                    'div',
                                    { className: 'space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both' },
                                    h('div', { className: 'grid grid-cols-1 gap-5 sm:gap-6' }, h(SafeWidget, null, h(PortfolioMixWidget, { filteredData, monthsList: MONTHS_LIST }))),
                                    h(SafeWidget, null, h(ProductProfitabilityWidget, { filteredData })),
                                    h(SafeWidget, null, h(TopPerformersWidget, { topPerformers, topPerfDrillDown, setTopPerfDrillSku, topPerfSearch, setTopPerfSearch, topPerfSortMode, setTopPerfSortMode, kpi })),
                                    h(SafeWidget, null, h(SkuHealthWidget, { filteredData: coreEngine.filteredDataWithReturns }))
                                ),
                                activeTab === 'Innovation' && h(
                                    'div',
                                    { className: 'space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both' },
                                    h(
                                        'div',
                                        { className: 'grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6' },
                                        h(SafeWidget, null, h(NPDVitalityWidget, { npdData, kpi })),
                                        h(SafeWidget, null, h(TopNPDWidget, { npdData })),
                                        h(SafeWidget, null, h(NPDTrajectoryWidget, { salesData, npdData }))
                                    )
                                ),
                                activeTab === 'Distribution' && h(
                                    'div',
                                    { className: 'space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both' },
                                    h(SafeWidget, null, h(TopCustomersWidget, { topCustomers, uniqueCustomersCount, customerSearch, setCustomerSearch, topCustomerSortMode, setTopCustomerSortMode, kpi, topCustomerDrillDown, setTopCustomerDrillKey })),
                                    h(SafeWidget, null, h(ChurnDropoffWidget, { filteredData, valid2026Months: coreEngine.valid2026Months })),
                                    h(SafeWidget, null, h(ProductPresenceWidget, { filteredData })),
                                    h(SafeWidget, null, h(WhiteSpaceWidget, { filteredData, searchStr: whiteSpaceSearch, setSearchStr: setWhiteSpaceSearch, debouncedSearch: debouncedWhiteSpaceSearch }))
                                ),
                                activeTab === 'Volume' && h(SafeWidget, null, h(VolumeDashboardView, { filteredData, monthsList: MONTHS_LIST }))
                            ),
                        h('footer', { className: 'w-full text-center mt-12 pb-6 text-[#86868b] font-medium text-xs sm:text-sm' }, 'NPD Performance Insights © 2026')
                    )
                )
            ),
            // Sync Modal
            showUpload && h(
                'div',
                { className: 'no-print fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200' },
                h(
                    'div',
                    { className: 'bg-white/95 backdrop-blur-xl rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20' },
                    h(
                        'div',
                        { className: 'flex justify-between items-center p-5 border-b border-black/5 relative' },
                        h('h2', { className: 'text-lg font-semibold text-[#1d1d1f] w-full text-center tracking-tight' }, 'Data Sync Status'),
                        h('button', { type: 'button', onClick: () => setShowUpload(false), className: 'text-[#86868b] hover:text-[#1d1d1f] absolute right-5 bg-[#e8e8ed] hover:bg-[#d1d1d6] p-2 rounded-full transition-colors' }, h(X, { className: 'w-4 h-4' }))
                    ),
                    h(
                        'div',
                        { className: 'flex border-b border-black/5 overflow-x-auto no-scrollbar px-2 pt-2' },
                        GROUP_ORDER.map((tab) => {
                            const hasTabError = Object.values(filesStatus[tab] || {}).includes('error');
                            return h(
                                'button',
                                {
                                    key: tab,
                                    type: 'button',
                                    onClick: () => setUploadTab(tab),
                                    className: `flex-1 py-2 px-4 text-xs font-semibold transition-all mb-2 rounded-full whitespace-nowrap flex items-center justify-center gap-1 ${uploadTab === tab ? 'text-[#1d1d1f] bg-[#e8e8ed]' : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]'}`
                                },
                                tab,
                                hasTabError && h('span', { className: 'w-1.5 h-1.5 rounded-full bg-[#ff3b30]' })
                            );
                        })
                    ),
                    h(
                        'div',
                        { className: 'p-5 sm:p-6 space-y-3 bg-[#f5f5f7]/50' },
                        h(SyncStatusSlot, { label: 'Sales 2025', status: filesStatus[uploadTab]?.s25 || 'pending' }),
                        h(SyncStatusSlot, { label: 'Sales 2026', status: filesStatus[uploadTab]?.s26 || 'pending' }),
                        h(SyncStatusSlot, { label: 'Budget Channel', status: filesStatus[uploadTab]?.bCh || 'pending' }),
                        h(SyncStatusSlot, { label: 'Budget Product', status: filesStatus[uploadTab]?.bPr || 'pending' })
                    ),
                    h(
                        'div',
                        { className: 'p-5 bg-white border-t border-black/5 flex flex-col gap-4' },
                        h(
                            'div',
                            { className: 'text-[11px] text-[#86868b] flex justify-center items-center gap-1.5 font-medium uppercase tracking-wider' },
                            h('div', { className: `w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-[#ff9500] animate-pulse' : (syncErrorGroups.length > 0 ? 'bg-[#ff3b30]' : 'bg-[#34c759]')}` }),
                            syncErrorGroups.length > 0 ? `Sync Incomplete (${syncErrorGroups.length} group failed)` : 'Live from Google Sheets'
                        ),
                        h(
                            'div',
                            { className: 'flex gap-3' },
                            syncErrorGroups.length > 0 && !isSyncing && h(
                                'button',
                                { type: 'button', onClick: () => syncAllData({ silent: false }), className: 'flex-1 bg-[#1d1d1f] hover:bg-black text-white px-5 py-3 rounded-[14px] text-sm font-semibold shadow-md active:scale-95 transition-transform' },
                                'Retry Failed'
                            ),
                            h(
                                'button',
                                { type: 'button', onClick: () => setShowUpload(false), className: 'flex-1 bg-[#0071e3] hover:bg-[#0077ED] text-white px-6 py-3 rounded-[14px] text-base font-semibold shadow-md active:scale-95 transition-transform' },
                                'Close'
                            )
                        )
                    )
                )
            ),
            // Password Modal
            showPasswordModal && h(
                'div',
                { className: 'no-print fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200' },
                h(
                    'div',
                    { className: 'bg-white/95 backdrop-blur-xl rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden border border-white/20' },
                    h(
                        'div',
                        { className: 'flex justify-between items-center p-5 border-b border-black/5 relative' },
                        h('h2', { className: 'text-lg font-semibold text-[#1d1d1f] w-full text-center tracking-tight flex items-center justify-center gap-2' }, h(Box, { className: 'w-5 h-5 text-[#0071e3]' }), ' Restricted Area'),
                        h('button', { type: 'button', onClick: () => setShowPasswordModal(false), className: 'text-[#86868b] hover:text-[#1d1d1f] absolute right-5 bg-[#e8e8ed] hover:bg-[#d1d1d6] p-2 rounded-full transition-colors' }, h(X, { className: 'w-4 h-4' }))
                    ),
                    h(
                        'div',
                        { className: 'p-6' },
                        h('p', { className: 'text-sm text-[#86868b] text-center mb-5 font-medium' }, 'Please enter the 4-digit PIN to access Volume & Pricing dynamics.'),
                        h(
                            'form',
                            { onSubmit: handlePasswordSubmit },
                            h('input', {
                                type: 'password',
                                inputMode: 'numeric',
                                autoFocus: true,
                                maxLength: 4,
                                value: passwordInput,
                                onChange: (e) => { setPasswordInput(e.target.value); setPasswordError(false); },
                                className: `w-full text-center text-2xl tracking-[0.5em] font-bold py-3 rounded-[14px] bg-[#f5f5f7] border focus:outline-none focus:ring-4 transition-all ${passwordError ? 'border-[#ff3b30] focus:ring-[#ff3b30]/10 text-[#ff3b30]' : 'border-black/5 focus:border-[#0071e3]/30 focus:ring-[#0071e3]/10 text-[#1d1d1f]'}`,
                                placeholder: '••••'
                            }),
                            passwordError && h('p', { className: 'text-xs text-[#ff3b30] text-center mt-2 font-bold animate-in slide-in-from-top-1' }, 'Incorrect PIN. Please try again.'),
                            h('button', { type: 'submit', className: 'mt-5 bg-[#0071e3] hover:bg-[#0077ED] text-white px-6 py-3 rounded-[14px] text-sm font-bold w-full shadow-md active:scale-95 transition-transform' }, 'Unlock Menu')
                        )
                    )
                )
            ),
            // Update Log Modal
            showUpdateLog && h(
                'div',
                {
                    className: 'no-print fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200',
                    onClick: (e) => { if (e.target === e.currentTarget) setShowUpdateLog(false); }
                },
                h(
                    'div',
                    { className: 'bg-white/95 backdrop-blur-xl rounded-[24px] shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden border border-white/20 flex flex-col animate-in zoom-in-95 duration-200' },
                    h(
                        'div',
                        { className: 'flex justify-between items-center p-5 sm:p-6 border-b border-black/5 bg-[#f5f5f7]/60' },
                        h(
                            'div',
                            { className: 'flex items-center gap-3' },
                            h('div', { className: 'bg-[#0071e3]/10 p-2.5 rounded-xl' }, h(History, { className: 'w-5 h-5 text-[#0071e3]' })),
                            h(
                                'div',
                                null,
                                h('h2', { className: 'text-base sm:text-lg font-extrabold text-[#1d1d1f] tracking-tight' }, 'System Update Log'),
                                h('p', { className: 'text-xs text-[#86868b] font-medium' }, 'Release history, new features, and performance upgrades')
                            )
                        ),
                        h('button', { type: 'button', onClick: () => setShowUpdateLog(false), className: 'text-[#86868b] hover:text-[#1d1d1f] bg-[#e8e8ed] hover:bg-[#d1d1d6] p-2 rounded-full transition-colors' }, h(X, { className: 'w-4 h-4' }))
                    ),
                    h(
                        'div',
                        { className: 'p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1 bg-white' },
                        UPDATE_LOGS.map((log, index) => h(
                            'div',
                            { key: log.version, className: 'relative pl-6 sm:pl-8 pb-2' },
                            index !== UPDATE_LOGS.length - 1 && h('div', { className: 'absolute left-[11px] sm:left-[15px] top-7 bottom-[-24px] w-0.5 bg-[#e5e5ea]' }),
                            h(
                                'div',
                                { className: `absolute left-0 sm:left-1 top-1.5 w-6 h-6 rounded-full flex items-center justify-center border-2 ${index === 0 ? 'bg-[#0071e3] border-[#0071e3]/20 text-white shadow-[0_0_12px_rgba(0,113,227,0.4)]' : 'bg-[#f5f5f7] border-[#d1d1d6] text-[#86868b]'}` },
                                h('div', { className: `w-2 h-2 rounded-full ${index === 0 ? 'bg-white' : 'bg-[#86868b]'}` })
                            ),
                            h(
                                'div',
                                { className: `p-4 sm:p-5 rounded-[18px] border transition-all ${index === 0 ? 'bg-[#0071e3]/[0.03] border-[#0071e3]/20 shadow-sm' : 'bg-[#f5f5f7]/60 border-black/5'}` },
                                h(
                                    'div',
                                    { className: 'flex flex-wrap items-center justify-between gap-2 mb-2.5' },
                                    h(
                                        'div',
                                        { className: 'flex items-center gap-2' },
                                        h('span', { className: 'text-sm sm:text-base font-extrabold text-[#1d1d1f]' }, log.version),
                                        h('span', { className: `text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${log.badgeColor}` }, log.badge)
                                    ),
                                    h(
                                        'div',
                                        { className: 'flex items-center gap-1.5 text-xs font-semibold text-[#86868b] bg-white px-2.5 py-1 rounded-lg border border-black/5' },
                                        h(Calendar, { className: 'w-3.5 h-3.5 text-[#0071e3]' }),
                                        h('span', null, log.date)
                                    )
                                ),
                                h('h3', { className: 'text-sm font-bold text-[#1d1d1f] mb-3' }, log.title),
                                h(
                                    'ul',
                                    { className: 'space-y-2' },
                                    log.highlights.map((item, i) => h(
                                        'li',
                                        { key: i, className: 'text-xs text-[#1d1d1f]/90 leading-relaxed flex items-start gap-2' },
                                        h('div', { className: 'w-1.5 h-1.5 rounded-full bg-[#0071e3] mt-1.5 shrink-0' }),
                                        h('span', null, item)
                                    ))
                                )
                            )
                        ))
                    ),
                    h(
                        'div',
                        { className: 'p-4 sm:p-5 bg-[#f5f5f7]/80 border-t border-black/5 flex flex-col sm:flex-row items-center justify-between gap-3' },
                        h('span', { className: 'text-xs text-[#86868b] font-medium' }, 'Current Build: ', h('strong', { className: 'text-[#1d1d1f]' }, `${UPDATE_LOGS[0].version} (${UPDATE_LOGS[0].date})`)),
                        h('button', { type: 'button', onClick: () => setShowUpdateLog(false), className: 'w-full sm:w-auto bg-[#0071e3] hover:bg-[#0077ED] text-white px-6 py-2.5 rounded-[12px] text-xs font-bold shadow-sm active:scale-95 transition-all' }, 'Done')
                    )
                )
            )
        );
    }

    NPD.Dashboard = Dashboard;

    if (typeof document !== 'undefined') {
        const container = document.getElementById('root');
        if (container) {
            const reactRoot = ReactDOM.createRoot(container);
            reactRoot.render(h(SafeWidget, null, h(Dashboard)));
        }
    }
})(typeof globalThis !== 'undefined' ? globalThis : window);
