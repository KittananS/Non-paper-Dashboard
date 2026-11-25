(function (root) {
    'use strict';

    const NPD = root.NPD = root.NPD || {};

    const createSheetSource = (pubKey, gids) => {
        const base = `https://docs.google.com/spreadsheets/d/e/${pubKey}/pub`;
        return {
            s25: `${base}?gid=${gids.s25}&single=true&output=csv`,
            s26: `${base}?gid=${gids.s26}&single=true&output=csv`,
            bCh: `${base}?gid=${gids.bCh}&single=true&output=csv`,
            bPr: `${base}?gid=${gids.bPr}&single=true&output=csv`
        };
    };

    // Shared workbook for DASP, DANB, and QUALITY (DRY configuration)
    const DASP_AND_QUALITY_SOURCE = createSheetSource(
        '2PACX-1vSc4GaqFG4Fn7_bkeKyEbmBRPW810BBiWz9AaBu5ufMRBigl9_EP0yrD6hRdtD80KO0dii9pEMPAUEa',
        { s25: '1670436585', s26: '632732784', bCh: '2001882698', bPr: '503774950' }
    );

    const DATA_SOURCES = {
        DACARE: createSheetSource(
            '2PACX-1vTkxkoPt95gqqDZMeYvcSTFY5xSTLNUtoMqpUbMNLo92Ui447TqEPoXiUNs5XPIHvsR2n-L6CAtB3QF',
            { s25: '0', s26: '840326660', bCh: '676992950', bPr: '1671676832' }
        ),
        DATISSUE: createSheetSource(
            '2PACX-1vQfrmCo5_WZAKiozHewHJ9tgiWKI8PxxPIOz26HfRswQucsrWdCN97iWzcXVZGqsG1KR_oP5l9xsHmk',
            { s25: '0', s26: '840326660', bCh: '676992950', bPr: '1671676832' }
        ),
        DAOS: createSheetSource(
            '2PACX-1vTqXyVL3DuTVqQnP8o7oZ-fQIU7wIeeRtRkcSbUkRHn4XTKHM-0-Xf43YqSsSUMX-7l3UHTro3XxRgu',
            { s25: '0', s26: '1788634359', bCh: '1758041911', bPr: '323060654' }
        ),
        DABATTERY: createSheetSource(
            '2PACX-1vS29e0vG5YtTyMMPjUDyn23E6RtjI2c5dHJ4o_bfRu0qQutiuIZ_ifgh6gwnRVb2_sxImgOCsgyRLRg',
            { s25: '0', s26: '1788634359', bCh: '1758041911', bPr: '323060654' }
        ),
        DASP: DASP_AND_QUALITY_SOURCE,
        DANB: DASP_AND_QUALITY_SOURCE,
        QUALITY: DASP_AND_QUALITY_SOURCE,
        DALIFESTYLE: createSheetSource(
            '2PACX-1vQWNuYqkCH8Z7pIvXMwJOnK0iwEb3kyTrJj_nF2A2WwluWOtrvFKRxiiSCLX81AgB4PJf3sZYD7lkwO',
            { s25: '1241849681', s26: '1151038683', bCh: '228153519', bPr: '1341247115' }
        )
    };

    const GROUP_ORDER = ['DACARE', 'DATISSUE', 'DAOS', 'DABATTERY', 'DASP', 'DANB', 'QUALITY', 'DALIFESTYLE'];

    const GROUP_COLORS = {
        DACARE: 'text-[#0071e3] bg-[#0071e3]/10',
        DATISSUE: 'text-[#32ade6] bg-[#32ade6]/10',
        DAOS: 'text-[#ff9500] bg-[#ff9500]/10',
        DABATTERY: 'text-[#d49b00] bg-[#ffcc00]/20',
        DASP: 'text-[#30b0c7] bg-[#30b0c7]/10',
        DANB: 'text-[#5e5ce6] bg-[#5e5ce6]/10',
        QUALITY: 'text-[#34c759] bg-[#34c759]/10',
        DALIFESTYLE: 'text-[#af52de] bg-[#af52de]/10'
    };

    const GROUP_HEX = {
        DACARE: '#0071e3',
        DATISSUE: '#32ade6',
        DAOS: '#ff9500',
        DABATTERY: '#ffcc00',
        DASP: '#30b0c7',
        DANB: '#5e5ce6',
        QUALITY: '#34c759',
        DALIFESTYLE: '#af52de'
    };

    const APPLE_PALETTE = ['#0071e3', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#32ade6', '#ff2d55', '#5856d6'];

    const MONTHS_LIST = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const MONTH_MAP = {
        Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
        Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12
    };

    const BRAND_OVERRIDES = {
        'ofm': 'OFM', 'b2s': 'B2S', 'cj': 'CJ', 'cp': 'CP', 'cp all': 'CP ALL', 'diy': 'DIY',
        'mr.diy': 'MR.DIY', 'mr. diy': 'MR.DIY', 'mr.d.i.y.': 'MR.D.I.Y.', 'se-ed': 'SE-ED',
        'ctr': 'CTR', 'ptt': 'PTT', 'pt': 'PT', 'fn': 'FN', 'aeon': 'AEON', 'ikea': 'IKEA',
        'spar': 'SPAR', 'jc': 'JC', 'gms': 'GMS', 'homepro': 'HomePro', 'familymart': 'FamilyMart',
        'maxvalu': 'MaxValu', 'watson': 'Watsons', 'watsons': 'Watsons', 'kingpower': 'King Power',
        'tiktok': 'TikTok', 'shopee': 'Shopee', 'lazada': 'Lazada'
    };

    const PRECOMPILED_BRAND_REGEXES = Object.keys(BRAND_OVERRIDES).map((key) => {
        const safeKey = key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        return { regex: new RegExp(`\\b${safeKey}(?!\\w)`, 'gi'), replacement: BRAND_OVERRIDES[key] };
    });

    // Note: Client-side SHA-256 hash acts only as an accidental-access UI gate for WIP tabs,
    // not as cryptographic access control for public spreadsheet URLs.
    const VOLUME_PIN_SHA256 = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';

    const UPDATE_LOGS = [
        {
            version: 'v2.3.0',
            date: '25 Nov 2026',
            badge: 'Commercial Suite',
            badgeColor: 'bg-[#0071e3] text-white',
            title: 'Commercial Intelligence Suite: Churn Radar, Instant Cache, Sub-Channel & Export',
            highlights: [
                '📉 Churn & Drop-off Radar: เพิ่มระบบตรวจจับลูกค้าเสี่ยง/หยุดซื้อในแท็บ Distribution แยกสถานะ Lost in 2026, Dormant (ห่างหาย ≥ 3 เดือน) และ Sharp Drop (ยอดหดตัว > 30% YoY) พร้อมส่งออกรายชื่อให้ทีมขายติดตามทันที',
                '🎯 YTD Target Pacing & Gross/Net Return Toggle: เพิ่มตัวชี้วัด Ahead/Behind YTD Pace (ถ่วงน้ำหนักตามฤดูกาล) บนการ์ด Target 2026 พร้อมสวิตช์ Exclude Returns เพื่อเทียบยอดขาย Gross Demand แยกจากยอดรับคืนสินค้าฝากขาย',
                '🎛️ Global Sub-Channel Filter & Shareable URL: เพิ่มตัวกรองระดับ Sub-Channel (เช่น B2S, OFM, Lotus\'s, Shopee, Lazada) และซิงก์สถานะตัวกรองไว้ในลิงก์ URL พร้อมปุ่ม Share View ส่งต่อให้ทีมเปิดดูหน้าเดียวกันได้ทันที',
                '⚡ Instant IndexedDB Cache, CSV Export & PDF Print: แสดงผลทันทีจากแคชในเครื่องพร้อมอัปเดตเบื้องหลัง (Stale-While-Revalidate), เพิ่มปุ่ม Export CSV (รองรับภาษาไทย Excel) ทุกตารางหลัก และโหมดพิมพ์รายงาน A4 แนวนอน (Print / PDF)'
            ]
        },
        {
            version: 'v2.2.0',
            date: '24 Nov 2026',
            badge: 'Reliability & Speed',
            badgeColor: 'bg-[#34c759]/15 text-[#34c759]',
            title: 'Zero-Babel Modular Engine, Authentic GP Accounting & Defensive Resilience',
            highlights: [
                '⚡ Zero Runtime Compilation & WebP Assets: ถอด @babel/standalone, Tailwind Play CDN และ Lucide UMD ออกทั้งหมด แยกสถาปัตยกรรมเป็นโมดูล พร้อมบีบอัดรูปภาพเป็น WebP ลดขนาดโหลดเริ่มต้นลงกว่า 95%',
                '💰 Authentic Cost & Margin Accounting: ยกเลิกการสุ่มต้นทุนจำลอง (mockMargin) คำนวณ Gross Profit และ Margin % จากรายการที่มีต้นทุนจริงเท่านั้น พร้อมแสดง % Cost Coverage อย่างโปร่งใส',
                '📐 Accurate YTD, Forecast & NPD Rolling Window: ปรับการเทียบเดือน YTD ตามตัวกรองจริง คำนวณเส้น 2026 Projection โดยอิงฐานฤดูกาลเต็มปีแม้กรองบางเดือน ปรับสูตร Return Rate ให้ตรงกันทุกแท็บ และคำนวณเดือนล่าสุดของ NPD Vitality Index แบบไดนามิก',
                '🛡️ Defensive Sync & Stack-Safe Analytics: เพิ่มระบบ Timeout (AbortController), แจ้งเตือนเมื่อชีตโหลดไม่ครบ, ล้าง Cache หลัง Sync เพื่อคืน RAM และเปลี่ยนการคำนวณเดือนลูกค้าเป็น O(1) ป้องกัน Call Stack Overflow'
            ]
        },
        {
            version: 'v2.1.1',
            date: '16 Oct 2026',
            badge: 'Patch',
            badgeColor: 'bg-[#32ade6]/15 text-[#0071e3]',
            title: 'Tap for Insights: Sub-Channel Apple-to-Apple Comparison',
            highlights: [
                '🎯 Sub-Channel Apple-to-Apple Matching: ปรับปรุงระบบคำนวณ Top 3 Channels ในหน้าต่าง TAP FOR INSIGHTS ของกราฟ Sales Trend 2025 vs 2026 ให้ดึงข้อมูลจากคอลัมน์ Sub-channel โดยตรงทั้งปี 2025 และ 2026 เพื่อเทียบยอดขายและ % YoY Growth แบบ Apple-to-Apple อย่างแม่นยำ',
                '🏷️ Main Channel Context Badge: แสดงป้ายกำกับ Channel หลักคู่กับชื่อ Sub-channel ในการ์ด Top 3 Sub-Channels เพื่อความชัดเจนในการวิเคราะห์'
            ]
        },
        {
            version: 'v2.1.0',
            date: '15 Oct 2026',
            badge: 'Major Feature',
            badgeColor: 'bg-[#af52de]/15 text-[#af52de]',
            title: 'Thai Deep-Dive Executive Synthesis (6-Pillar Intelligence)',
            highlights: [
                '🧠 6-Pillar Executive Synthesis (ภาษาไทย): ยกระดับบทวิเคราะห์ผู้บริหารเป็นภาษาไทย ครอบคลุม 6 มิติเชิงลึก (Run-Rate & Pacing, YoY Momentum & 2027 Readiness, Margin & Cost Structure, Pareto SKU & Sub-Product Health, Channel Concentration & Customer Base, และ Actionable Strategic Playbook)',
                '📊 Real-Time Deep-Dive Diagnostics: คำนวณอัตโนมัติจากข้อมูลจริงตามตัวกรอง ทั้ง Weighted GP Margin %, สัดส่วน Pareto Top 5 SKUs, อัตราการพึ่งพิงช่องทางหลัก, จำนวนสินค้ากลุ่มเสี่ยง (Risk/Watch) และยอดขายจากฐานลูกค้าใหม่ (Pure New & Reactivated)'
            ]
        },
        {
            version: 'v2.0.0',
            date: '15 Oct 2026',
            badge: 'Major Release',
            badgeColor: 'bg-[#34c759]/15 text-[#34c759]',
            title: 'Executive Mobile & Speed Edition',
            highlights: [
                '📱 Mobile-First Responsive Architecture: ปรับ Sidebar เป็น Slide-over Drawer อัตโนมัติบนมือถือและแท็บเล็ต พร้อมปุ่ม Filters แบบ Bottom-Sheet Drawer เพื่อเพิ่มพื้นที่แสดงผลสูงสุด',
                '⚡ Single-Pass Data Engine: ยุบรวมการคำนวณข้อมูล (KPIs, Channel Mix, YTD) ให้ทำงานในรอบเดียว ลดเวลาประมวลผลลงกว่า 75% และโหลดเฉพาะแท็บที่เปิดใช้งาน (Lazy Tab Evaluation)',
                '🚀 Progressive Table Rendering & Sticky Columns: ตารางขนาดใหญ่แสดงผลลื่นไหลด้วยระบบแบ่งโหลดทีละ 50 แถว พร้อมตรึงคอลัมน์ชื่อสินค้า/ลูกค้าเวลาเลื่อนซ้าย-ขวาบนมือถือ',
                '✨ Executive Skeleton & Touch-Safe Popovers: เพิ่ม Skeleton Shimmer ขณะโหลดข้อมูล และอัปเกรดปุ่ม Info (i) ให้รองรับการแตะบนหน้าจอสัมผัสโดยไม่ล้นขอบจอ',
                '🛠️ System Changelog: เพิ่มหน้าต่าง Update Log พร้อมบันทึกประวัติการอัปเดตและวันที่อย่างละเอียด'
            ]
        },
        {
            version: 'v1.5.0',
            date: '02 Oct 2026',
            badge: 'Major Update',
            badgeColor: 'bg-[#af52de]/15 text-[#af52de]',
            title: 'Sidebar Navigation & Volume Economics Suite',
            highlights: [
                '🧭 Sidebar Layout Redesign: เปลี่ยนโครงสร้างเมนูหลักเป็น Left Sidebar พร้อมปุ่มซ่อน/แสดงเมนู และจัดหมวดหมู่เป็น 5 แท็บหลัก',
                '📦 Volume & Pricing (WIP) Module: เพิ่มระบบวิเคราะห์ Unit Economics (Value vs. Volume, ASP Tracker, Top Volume Movers, GP per Unit) พร้อมระบบล็อกรหัสผ่าน 4 หลัก (PIN)',
                '🎯 New Acquisition Tracker (2026): เพิ่มการติดตามลูกค้าใหม่แยกประเภท Pure New และ Reactivated (กลับมาซื้อหลังห่างหาย ≥ 6 เดือน) พร้อมปุ่ม Copy รายชื่อ',
                '💡 Trend Insights & Projection Line: เพิ่มป้ายแจ้งเตือน TAP FOR INSIGHTS บนจุดข้อมูลเดือนล่าสุด และเส้นคาดการณ์ 2026 Projection'
            ]
        },
        {
            version: 'v1.2.0',
            date: '18 Aug 2026',
            badge: 'Feature Update',
            badgeColor: 'bg-[#34c759]/15 text-[#34c759]',
            title: 'Profitability, NPD Trajectory & White Space Matrix',
            highlights: [
                '💰 Product Profitability Report: รายงานวิเคราะห์กำไรขั้นต้น (Gross Profit & Weighted Margin %) เจาะลึกได้ 4 ระดับ (Group -> Sub-Product -> Group SKU -> Product)',
                '🚀 NPD Launch Trajectory (M1-M12): ปรับฐานเวลาสินค้าใหม่ทุกตัวเริ่มที่ M1 พร้อมกัน เพื่อวัดความแรงช่วงเปิดตัวและอัตราการรักษายอดขาย (M3/M6 Retention)',
                '🎯 White Space & Distribution Gap: ตารางวิเคราะห์ช่องว่างการกระจายสินค้าของ Hero SKU ในแต่ละ Sub-channel พร้อมดึงรายชื่อลูกค้าที่ยังไม่ได้ซื้อ (Missed Customers)',
                '🩺 Executive Health Check: จัดกลุ่มสถานะสุขภาพสินค้า (Healthy / Watch / Risk) ตามอัตราการเติบโต YoY'
            ]
        },
        {
            version: 'v1.0.0',
            date: '15 Jan 2026',
            badge: 'Initial Launch',
            badgeColor: 'bg-[#86868b]/15 text-[#86868b]',
            title: 'Non-paper Performance Dashboard 2026 Core',
            highlights: [
                '☁️ Multi-Source Live Sync: เชื่อมต่อข้อมูลแบบเรียลไทม์จาก Google Sheets ครบทั้ง 8 Product Groups (DACARE, DATISSUE, DAOS, DABATTERY, DASP, DANB, QUALITY, DALIFESTYLE)',
                '📊 Executive KPIs & Dynamic Forecast: คำนวณ YTD Actual, Target 2026, Plan 2027 และระบบคาดการณ์ยอดขายอัตโนมัติตามฤดูกาล (Seasonality-Weighted Projection)',
                '🔍 Multi-Dimensional Filtering: รองรับการกรองข้อมูลแบบผสมผสานทั้ง Product Group, Sub-Product, Channel และเลือกหลายเดือน (Multi-Select Month)'
            ]
        }
    ];

    NPD.config = {
        UPDATE_LOGS,
        GROUP_ORDER,
        GROUP_COLORS,
        GROUP_HEX,
        APPLE_PALETTE,
        MONTHS_LIST,
        MONTH_MAP,
        DATA_SOURCES,
        BRAND_OVERRIDES,
        PRECOMPILED_BRAND_REGEXES,
        VOLUME_PIN_SHA256,
        FETCH_TIMEOUT_MS: 20000,
        FETCH_CONCURRENCY: 6,
        MAX_TEXT_CACHE_SIZE: 25000,
        CACHE_DB_NAME: 'npd_dashboard_cache_v2',
        CACHE_STORE_NAME: 'snapshots',
        CACHE_KEY: 'dataset_v2_3'
    };
})(typeof globalThis !== 'undefined' ? globalThis : window);
