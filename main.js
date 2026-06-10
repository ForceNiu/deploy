/**
 * main.js - 入口文件
 * 职责：命名空间初始化、配置、DOMContentLoaded 调度
 * 所有函数已拆分到 js/*.js 模块文件
 */

// ========== 命名空间 ==========
window.TravelApp = window.TravelApp || {};

// ========== 常量配置 ==========
window.TravelApp.config = {
    WUYI_LAT: 27.7518,
    WUYI_LON: 118.0343,
    LUSHAN_LAT: 29.6619,
    LUSHAN_LON: 115.9147,
    JIUJIANG_LAT: 29.7050,
    JIUJIANG_LON: 116.0017,
    TRIP_START: '2026-06-12',
    TRIP_END: '2026-06-20',
    FORECAST_DAYS: 16,
    HISTORY_YEAR: '2025',
    LOCAL_REF: {
        '武夷山': { code: 61, tmin: 22, tmax: 30 },
        '庐山': { code: 61, tmin: 18, tmax: 24 },
        '九江': { code: 61, tmin: 24, tmax: 32 }
    },
    SPOT_COORDS: {
        // 武夷山景点
        '武夷山': { lon: 117.9733, lat: 27.7189 },
        '天游峰': { lon: 117.9830, lat: 27.7280 },
        '九曲溪竹筏': { lon: 117.9780, lat: 27.7200 },
        '武夷宫': { lon: 117.9750, lat: 27.7150 },
        '一线天': { lon: 117.9700, lat: 27.7200 },
        '虎啸岩': { lon: 117.9680, lat: 27.7220 },
        '大红袍景区': { lon: 117.9600, lat: 27.7250 },
        '水帘洞': { lon: 117.9550, lat: 27.7280 },
        '岩骨花香': { lon: 117.9650, lat: 27.7230 },
        '白云禅寺': { lon: 117.9800, lat: 27.7300 },
        // 庐山景点
        '庐山': { lon: 115.9830, lat: 29.5510 },
        '含鄱口': { lon: 115.9900, lat: 29.5480 },
        '五老峰': { lon: 115.9950, lat: 29.5450 },
        '三叠泉': { lon: 116.0000, lat: 29.5420 },
        '花径': { lon: 115.9750, lat: 29.5550 },
        '如琴湖': { lon: 115.9730, lat: 29.5560 },
        '锦绣谷': { lon: 115.9720, lat: 29.5570 },
        '仙人洞': { lon: 115.9710, lat: 29.5580 },
        '芦林湖': { lon: 115.9800, lat: 29.5520 },
        '三宝树': { lon: 115.9780, lat: 29.5530 },
        '黄龙潭': { lon: 115.9770, lat: 29.5540 },
        '乌龙潭': { lon: 115.9760, lat: 29.5550 },
        '白鹿洞书院': { lon: 116.0200, lat: 29.5300 },
        // 九江景点
        '四码头美食街': { lon: 116.0017, lat: 29.7050 },
        '能仁禅寺': { lon: 115.9980, lat: 29.7080 },
        '庾亮南路': { lon: 116.0000, lat: 29.7060 },
        '李公堤': { lon: 116.0020, lat: 29.7070 },
        '甘棠公园': { lon: 116.0030, lat: 29.7080 },
        '烟水亭': { lon: 116.0010, lat: 29.7090 },
        '浔阳楼': { lon: 115.9980, lat: 29.7100 },
        '锁江楼': { lon: 115.9960, lat: 29.7110 },
        '琵琶亭': { lon: 115.9940, lat: 29.7120 },
        '长江国家文化公园': { lon: 115.9950, lat: 29.7115 },
        '浪井广场': { lon: 116.0000, lat: 29.7055 },
        '九派青年夜市': { lon: 116.0010, lat: 29.7045 },
        '九江洋街': { lon: 115.9990, lat: 29.7075 },
        '九江租界旧址': { lon: 115.9985, lat: 29.7080 },
        '大中路步行街': { lon: 116.0005, lat: 29.7065 },
        '梁义隆茶饼': { lon: 116.0015, lat: 29.7055 },
        // 交通
        '庐山机场': { lon: 115.9800, lat: 29.6800 }
    },
    dayCity: [
        { city: 'wuyi', label: '武夷', cityName: '武夷山' },
        { city: 'wuyi', label: '武夷', cityName: '武夷山' },
        { city: 'wuyi', label: '武夷', cityName: '武夷山' },
        { city: 'wuyi', label: '武夷', cityName: '武夷山' },
        { city: 'move', label: '转场', cityName: '转场' },
        { city: 'lushan', label: '庐山', cityName: '庐山' },
        { city: 'move', label: '转场', cityName: '转场' },
        { city: 'jiujiang', label: '九江', cityName: '九江' },
        { city: 'jiujiang', label: '九江', cityName: '九江' }
    ],
    CHECKLIST_KEY: 'travel_checklist_state'
};

// ========== 天气状态 ==========
window.TravelApp.weather = {
    data: { wuyi: {}, lushan: {}, jiujiang: {} },
    cityFilter: 'all',
    updateTime: null
};

// ========== 美食状态 ==========
window.TravelApp.food = window.TravelApp.food || {};
window.TravelApp.food.spotMap = {};
window.TravelApp.food.spotFoodMap = {};
window.TravelApp.food.filter = 'all';
window.TravelApp.food.typeFilter = 'all';
window.TravelApp.food.giftFilter = 'all';

// ========== 伴手礼过滤器 ==========
var currentGiftFilter = 'all';

// ========== 初始化（DOMContentLoaded） ==========
window.addEventListener('DOMContentLoaded', function() {
    // 先加载数据
    loadData().then(function(result) {
        // 显示加载失败提示
        if (!result.success) {
            TravelApp.loader.showLoadError(result.failed);
        }

        // 初始化各模块
        buildNav();
        buildDailyCards();
        buildFoodGrid();
        buildGiftGrid();
        buildTicketTips();
        buildPriceSummary();
        renderPackingChecklist();
        updateTabCounts();
        highlightToday();
        setupSectionAccessibility();
        document.getElementById('weatherNote').innerHTML = '<span class="weather-loading-text"><i class="fas fa-spinner fa-spin"></i> 正在获取天气数据，预计 3-5 秒...</span>';
        renderWeather().then(function() { checkWeatherAlerts(); applyWeatherDynamic(); updateOverviewWeather(); updateHeroWeatherSummary(); });
        setupScrollProgress();
        setupBottomNav();
        setupSwipeGesture();
        applyTheme(getTheme());
        updateCountdown();
        setInterval(updateCountdown, 60000);
        scrollToToday();
        var ticking = false;
        window.addEventListener('scroll', function() {
            if (!ticking) {
                window.requestAnimationFrame(function() { updateNavHighlight(); ticking = false; });
                ticking = true;
            }
        });
    }).catch(function(err) {
        console.error('数据加载失败:', err);
        document.querySelector('.container').innerHTML = '<div style="text-align:center;padding:40px;color:#dc3545;"><h2>⚠️ 页面加载失败</h2><p>请刷新页面重试</p></div>';
    });
});
