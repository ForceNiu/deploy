// ========== 常量 ==========
const WUYI_LAT = 27.7518, WUYI_LON = 118.0343;
const LUSHAN_LAT = 29.6619, LUSHAN_LON = 115.9147;
const JIUJIANG_LAT = 29.7050, JIUJIANG_LON = 116.0017;
const TRIP_START = '2026-06-12';
const TRIP_END = '2026-06-20';
const FORECAST_DAYS = 16;
const HISTORY_YEAR = '2025';
const LOCAL_REF = {
    '武夷山': { code: 61, tmin: 22, tmax: 30 },
    '庐山': { code: 61, tmin: 18, tmax: 24 },
    '九江': { code: 61, tmin: 24, tmax: 32 }
};

// ========== 天气工具函数 ==========
function wmoToText(c) {
    const m = {0:'晴',1:'晴间多云',2:'多云',3:'阴',45:'雾',48:'雾',51:'毛毛雨',53:'毛毛雨',55:'毛毛雨',61:'小雨',63:'中雨',65:'大雨',80:'阵雨',81:'阵雨',95:'雷暴',96:'雷暴',99:'雷暴'};
    return m[c] || '多云';
}

function wmoToEmoji(c) {
    const m = {0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',51:'🌧️',53:'🌧️',55:'🌧️',61:'🌦️',63:'🌧️',65:'🌧️',80:'🌦️',81:'🌧️',95:'⛈️',96:'⛈️',99:'⛈️'};
    return m[c] || '🌡️';
}

// ========== 天气数据获取 ==========
async function fetchForecast(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_mean,sunrise,sunset&timezone=Asia/Shanghai&forecast_days=${FORECAST_DAYS}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error();
    const d = await r.json();
    let m = {};
    for (let i = 0; i < d.daily.time.length; i++) {
        m[d.daily.time[i]] = { code: d.daily.weathercode[i], tmax: d.daily.temperature_2m_max[i], tmin: d.daily.temperature_2m_min[i], precip: d.daily.precipitation_probability_mean[i] || 0, src: 'forecast', sunrise: d.daily.sunrise ? d.daily.sunrise[i] : null, sunset: d.daily.sunset ? d.daily.sunset[i] : null };
    }
    return m;
}

async function fetchHistorical(lat, lon, s, e) {
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${s}&end_date=${e}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Asia/Shanghai`;
    const r = await fetch(url);
    if (!r.ok) throw new Error();
    const d = await r.json();
    let m = {};
    if (d.daily) for (let i = 0; i < d.daily.time.length; i++) {
        m[d.daily.time[i]] = { code: d.daily.weathercode[i], tmax: d.daily.temperature_2m_max[i], tmin: d.daily.temperature_2m_min[i], precip: null, src: 'history', sunrise: null, sunset: null };
    }
    return m;
}

function getDateRange(s, e) {
    let a = [], c = new Date(s), ed = new Date(e);
    while (c <= ed) { a.push(c.toISOString().slice(0, 10)); c.setDate(c.getDate() + 1); }
    return a;
}

// ========== 天气渲染 ==========
let weatherData = { wuyi: {}, lushan: {}, jiujiang: {} };
let currentCityFilter = 'all';
let weatherUpdateTime = null;

function renderWeatherCards() {
    const container = document.getElementById('weatherGrid');
    const dates = getDateRange(TRIP_START, TRIP_END);
    let html = '';

    if (currentCityFilter === 'all') {
        container.classList.add('all-view');
        for (let date of dates) {
            const wy = weatherData.wuyi[date];
            const ls = weatherData.lushan[date];
            const jj = weatherData.jiujiang[date];
            html += `<div class="weather-card all-mode">
                <div class="weather-date">${date.slice(5)}</div>
                <div class="weather-city-row">
                    <span class="weather-city-name">武夷</span>
                    <div class="weather-city-info">
                        <span>${wy ? wmoToEmoji(wy.code) : '-'}</span>
                        <span class="weather-city-text">${wy ? wmoToText(wy.code) : '-'}</span>
                        <span class="weather-city-temp">${wy ? Math.round(wy.tmin)+'~'+Math.round(wy.tmax)+'°' : '-'}</span>
                    </div>
                </div>
                <div class="weather-city-row">
                    <span class="weather-city-name">庐山</span>
                    <div class="weather-city-info">
                        <span>${ls ? wmoToEmoji(ls.code) : '-'}</span>
                        <span class="weather-city-text">${ls ? wmoToText(ls.code) : '-'}</span>
                        <span class="weather-city-temp">${ls ? Math.round(ls.tmin)+'~'+Math.round(ls.tmax)+'°' : '-'}</span>
                    </div>
                </div>
                <div class="weather-city-row">
                    <span class="weather-city-name">九江</span>
                    <div class="weather-city-info">
                        <span>${jj ? wmoToEmoji(jj.code) : '-'}</span>
                        <span class="weather-city-text">${jj ? wmoToText(jj.code) : '-'}</span>
                        <span class="weather-city-temp">${jj ? Math.round(jj.tmin)+'~'+Math.round(jj.tmax)+'°' : '-'}</span>
                    </div>
                </div>
            </div>`;
        }
    } else {
        container.classList.remove('all-view');
        const cityKey = currentCityFilter === 'wuyi' ? 'wuyi' : currentCityFilter === 'lushan' ? 'lushan' : 'jiujiang';
        const data = weatherData[cityKey];
        for (let date of dates) {
            const d = data[date];
            if (!d) continue;
            html += `<div class="weather-card">
                <div class="weather-date">${date.slice(5)}</div>
                <div class="weather-icon">${wmoToEmoji(d.code)}</div>
                <div style="font-size:0.7rem; color:#81c784;">${wmoToText(d.code)}</div>
                <div class="temp">${Math.round(d.tmin)}~${Math.round(d.tmax)}°</div>
                ${d.precip !== null ? `<div class="weather-note">💧 ${d.precip}%</div>` : ''}
                ${d.src !== 'forecast' ? `<div class="weather-src">参考</div>` : ''}
            </div>`;
        }
    }
    container.innerHTML = html;
}

async function renderWeather() {
    const note = document.getElementById('weatherNote');
    try {
        const [wyF, lsF, jjF, wyH, lsH, jjH] = await Promise.all([
            fetchForecast(WUYI_LAT, WUYI_LON),
            fetchForecast(LUSHAN_LAT, LUSHAN_LON),
            fetchForecast(JIUJIANG_LAT, JIUJIANG_LON),
            fetchHistorical(WUYI_LAT, WUYI_LON, `${HISTORY_YEAR}-06-12`, `${HISTORY_YEAR}-06-20`),
            fetchHistorical(LUSHAN_LAT, LUSHAN_LON, `${HISTORY_YEAR}-06-12`, `${HISTORY_YEAR}-06-20`),
            fetchHistorical(JIUJIANG_LAT, JIUJIANG_LON, `${HISTORY_YEAR}-06-12`, `${HISTORY_YEAR}-06-20`)
        ]);

        const dates = getDateRange(TRIP_START, TRIP_END);
        let fc = 0, hc = 0, fb = 0;

        for (let date of dates) {
            let wyD = wyF[date]; if (!wyD && wyH[date]) wyD = wyH[date];
            if (!wyD) { wyD = { ...LOCAL_REF['武夷山'], src: 'fallback' }; fb++; } else if (wyD.src === 'forecast') fc++; else hc++;
            weatherData.wuyi[date] = wyD;

            let lsD = lsF[date]; if (!lsD && lsH[date]) lsD = lsH[date];
            if (!lsD) { lsD = { ...LOCAL_REF['庐山'], src: 'fallback' }; fb++; } else if (lsD.src === 'forecast') fc++; else hc++;
            weatherData.lushan[date] = lsD;

            let jjD = jjF[date]; if (!jjD && jjH[date]) jjD = jjH[date];
            if (!jjD) { jjD = { ...LOCAL_REF['九江'], src: 'fallback' }; fb++; } else if (jjD.src === 'forecast') fc++; else hc++;
            weatherData.jiujiang[date] = jjD;
        }

        weatherUpdateTime = new Date();
        renderWeatherCards();
        const timeStr = weatherUpdateTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        note.innerHTML = `📊 实时预报 ${fc} 条 · 历史参考 ${hc} 条 · 气候参考 ${fb} 条<br><span class="weather-update-time">⏱️ 更新于 ${timeStr}</span>`;
    } catch (e) {
        document.getElementById('weatherGrid').innerHTML = '<div style="grid-column:1/-1; text-align:center; color:#aa4a3a;">⚠️ 天气服务暂不可用</div>';
    }
}

// 天气 Tab 切换
document.getElementById('weatherTabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.weather-tab');
    if (!tab) return;
    document.querySelectorAll('.weather-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentCityFilter = tab.dataset.city;
    renderWeatherCards();
});

// ========== 城市映射 ==========
const dayCity = [
    { city: 'wuyi', label: '武夷', cityName: '武夷山' },
    { city: 'wuyi', label: '武夷', cityName: '武夷山' },
    { city: 'wuyi', label: '武夷', cityName: '武夷山' },
    { city: 'wuyi', label: '武夷', cityName: '武夷山' },
    { city: 'move', label: '转场', cityName: '转场' },
    { city: 'lushan', label: '庐山', cityName: '庐山' },
    { city: 'move', label: '转场', cityName: '转场' },
    { city: 'jiujiang', label: '九江', cityName: '九江' },
    { city: 'jiujiang', label: '九江', cityName: '九江' },
];

function getCityForDay(dayIdx) {
    return dayCity[dayIdx] || { city: 'wuyi', label: '', cityName: '武夷山' };
}

function getDayDateKey(dayIdx) {
    const d = new Date(TRIP_START);
    d.setDate(d.getDate() + dayIdx);
    return d.toISOString().slice(0, 10);
}

// ========== 辅助函数 ==========
function getFirstActivityTime(blocks) {
    for (const block of blocks) {
        if (block.type !== 'meal' && block.time) {
            const match = block.time.match(/(\d{1,2}:\d{2})/);
            return match ? match[1] : null;
        }
    }
    return null;
}

function getBlockSemanticClass(block) {
    if (block.rainPlan) return 'semantic-rain';
    if (block.meal) return 'semantic-food';
    if (block.note && (block.note.includes('购票') || block.note.includes('预约') || block.note.includes('提前'))) return 'semantic-ticket';
    if (block.time && (block.time.includes('出发') || block.time.includes('凌晨') || block.time.includes('日出'))) return 'semantic-time';
    return '';
}

// ========== A4 时间块天气聚合 ==========
function buildBlockWeatherBadge(wData) {
    if (!wData) return '';
    const emoji = wmoToEmoji(wData.code);
    const temp = Math.round(wData.tmin) + '~' + Math.round(wData.tmax) + '°';
    let badge = `<span class="block-weather-badge">${emoji} ${temp}`;
    if (wData.precip !== null && wData.precip >= 30) {
        badge += ` <span class="block-rain-indicator">💧${wData.precip}%</span>`;
    }
    badge += '</span>';
    return badge;
}

function getTransportEmoji(transport) {
    if (transport.includes('高铁') || transport.includes('火车')) return '🚄';
    if (transport.includes('打车') || transport.includes('出租')) return '🚗';
    if (transport.includes('公交') || transport.includes('观光车')) return '🚌';
    if (transport.includes('步行')) return '🚶';
    if (transport.includes('索道')) return '🚡';
    return '🚗';
}

function getTransportSummary(transport) {
    const match = transport.match(/约(\d+(?:小时|分钟))/);
    return match ? match[1] : null;
}

function getSummaryText(desc) {
    const plain = desc.replace(/<[^>]+>/g, '').replace(/^[⚠️✈️🍜🍽️🎭🚗]+\s*/, '').trim();
    if (plain.length <= 40) return plain;
    // 取第一个完整句（以。！？结尾），上限60字
    const m = plain.match(/^(.{20,60}[。！？])/);
    if (m) return m[1];
    const end = plain.indexOf('。');
    if (end > 0 && end <= 70) return plain.slice(0, end + 1);
    return plain.slice(0, 40) + '……';
}

function isRainyDay(dayIdx) {
    const info = getCityForDay(dayIdx);
    if (info.city === 'move') return false;
    const dateKey = getDayDateKey(dayIdx);
    const wData = weatherData[info.city] && weatherData[info.city][dateKey];
    if (!wData) return false;
    return (wData.precip !== null && wData.precip >= 50) ||
           [51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(wData.code);
}

// ========== 构建每日卡片（L0/L1/L2 三层） ==========
function buildDailyCards() {
    const container = document.getElementById('dailyCards');
    let html = '';

    dailyData.forEach((day, idx) => {
        const info = getCityForDay(idx);
        const dateKey = getDayDateKey(idx);

        // === L0 概览层 ===
        const firstTime = getFirstActivityTime(day.blocks);
        const blockCount = day.blocks.filter(b => b.type !== 'meal').length;
        // 提取关键时间节点
        const keyNodes = [];
        day.blocks.forEach(block => {
            if (block.sunriseFor) keyNodes.push({ icon: '🌅', label: '日出', time: block.time });
            if (block.desc && block.desc.includes('竹筏')) keyNodes.push({ icon: '🎋', label: '竹筏', time: block.time });
            if (block.note && block.note.includes('日落')) keyNodes.push({ icon: '🌇', label: '日落', time: block.time });
        });
        let overviewHtml = '<div class="day-overview">';
        if (firstTime) {
            overviewHtml += `<span class="overview-time">⏰ ${firstTime} 出发</span>`;
        }
        // 天气占位（动态填充）
        overviewHtml += `<span class="overview-weather" id="overview-weather-${idx}"></span>`;
        // 关键节点
        keyNodes.slice(0, 2).forEach(n => {
            overviewHtml += `<span class="overview-key-node">${n.icon} ${n.time}</span>`;
        });
        if (blockCount > 0) {
            overviewHtml += `<span class="overview-stats">📍 ${blockCount}个景点</span>`;
        }
        overviewHtml += '</div>';

        // === 时间块（L1 摘要 + L2 详情）===
        const wData = (info.city !== 'move' && weatherData[info.city]) ? weatherData[info.city][dateKey] : null;
        let blocksHtml = '';
        day.blocks.forEach((block, blockIdx) => {
            const semanticClass = getBlockSemanticClass(block);
            let descHtml = linkifyDesc(block.desc, block.spots);
            let foodLinksHtml = buildFoodLinks(block.spots);

            // L2 详情内容
            let detailHtml = '';
            const plainLen = block.desc.replace(/<[^>]+>/g, '').length;
            if (plainLen > 80) {
                detailHtml += `<div class="text-clamp" id="clamp-${idx}-${blockIdx}">${descHtml}</div><span class="expand-text-btn" onclick="toggleClamp(${idx},${blockIdx})">展开全文</span>`;
            } else {
                detailHtml += descHtml;
            }

            detailHtml += foodLinksHtml;

            if (block.meal) {
                detailHtml += `<div class="meal-rec"><i class="fas fa-utensils"></i> ${block.meal}</div>`;
            }

            // 行动按钮
            detailHtml += buildActionBtns(block);

            // 注意事项
            if (block.note) {
                detailHtml += `<div class="attention-note"><i class="fas fa-exclamation-triangle" style="margin-right:0.3rem;"></i>${block.note}</div>`;
            }

            // Tips分组
            if (block.tips && block.tips.length > 0) {
                let groups = '';
                block.tips.forEach(g => {
                    let items = g.items.map(t => `<li>${t}</li>`).join('');
                    groups += `<div class="tips-group"><div class="tips-group-title"><i class="${g.icon}"></i>${g.category}</div><ul class="tips-list">${items}</ul></div>`;
                });
                detailHtml += `<div class="tips-container">${groups}</div>`;
            }

            // 交通
            if (block.transport) {
                detailHtml += `<div class="transport-info"><i class="fas fa-route" style="margin-right:0.3rem;"></i><strong>交通：</strong>${block.transport}</div>`;
            }

            // 雨天备选
            if (block.rainPlan) {
                detailHtml += `<div class="rain-plan"><i class="fas fa-cloud-rain"></i><span><strong>雨天备选：</strong>${block.rainPlan}</span></div>`;
            }

            // 组装时间块
            const weatherBadge = buildBlockWeatherBadge(wData);
            const transportSummary = block.transport ? getTransportSummary(block.transport) : null;
            const transportBadge = transportSummary ?
                `<div class="transport-badge">${getTransportEmoji(block.transport)} ${transportSummary}</div>` : '';
            if (block.type === 'meal') {
                blocksHtml += `<div class="time-block meal-block ${semanticClass}"><div class="time-title">${block.time}${weatherBadge}</div><div class="time-desc">${detailHtml}</div></div>`;
            } else {
                const summary = getSummaryText(block.desc);
                const durationHtml = block.duration ? `<div class="time-duration"><i class="fas fa-clock"></i> ${block.duration}</div>` : '';
                blocksHtml += `<div class="time-block ${semanticClass}" id="block-${idx}-${blockIdx}">` +
                    `<div class="time-title-row"><div class="time-title">${block.time}${weatherBadge}${transportBadge}</div>${durationHtml}</div>` +
                    `<div class="time-summary" onclick="toggleBlock(${idx},${blockIdx})"><i class="fas fa-chevron-right expand-icon"></i><span>${summary}</span><span class="expand-hint"><span class="expand-hint-text">展开</span><span class="collapse-hint-text">收起</span></span></div>` +
                    `<div class="time-detail">${detailHtml}</div>` +
                    `</div>`;
            }
        });

        // === 今日Checklist ===
        const dayChecklistHtml = buildDayChecklist(idx);

        // === 今日美食推荐 ===
        const dayFoodHtml = buildDayFoodSection(info.city);

        // === 次日预告 ===
        const nextDayHtml = buildNextDayPreview(idx);

        // === 组装Day Card ===
        const intensityLabels = ['', '轻松', '适中', '充实'];
        const collapseAllBtn = `<span class="collapse-all-btn" onclick="event.stopPropagation();collapseAllBlocks(${idx})" title="收起全部"><i class="fas fa-compress-alt"></i></span>`;
        html += `<div class="day-card" id="day-${idx}">` +
            `<div class="day-header" onclick="toggleDay(${idx})">` +
            `<div class="day-header-left"><i class="far fa-calendar-alt"></i><span>${day.date} · ${day.dayTitle}</span>${collapseAllBtn}</div>` +
            `<div style="display:flex; align-items:center; gap:0.6rem;">${buildIntensityBar(day.intensity)}<span class="intensity-label">${intensityLabels[day.intensity]}</span><i class="fas fa-chevron-down collapse-icon"></i></div>` +
            `</div>` +
            `<div class="day-body">` +
            overviewHtml +
            dayChecklistHtml +
            blocksHtml +
            dayFoodHtml +
            nextDayHtml +
            `</div></div>`;
    });

    container.innerHTML = html;
}

// ========== 强度指示器 ==========
function buildIntensityBar(level) {
    let html = '<div class="intensity-bar">';
    for (let i = 1; i <= 3; i++) html += `<div class="intensity-dot ${i <= level ? 'active' : ''}"></div>`;
    html += '</div>';
    return html;
}

// ========== 次日预告 ==========
function buildNextDayPreview(dayIdx) {
    const nextIdx = dayIdx + 1;
    if (nextIdx >= dailyData.length) return '';
    const nextDay = dailyData[nextIdx];
    const nextInfo = getCityForDay(nextIdx);
    const nextTime = getFirstActivityTime(nextDay.blocks);

    let detail = '';
    if (nextTime) detail += `${nextTime} 出发 · `;
    detail += nextDay.dayTitle;

    let ticketHtml = '';
    nextDay.blocks.forEach(block => {
        if (block.desc && (block.desc.includes('竹筏') || block.desc.includes('购票') || block.desc.includes('提前预约'))) {
            ticketHtml = `<div class="preview-ticket"><i class="fas fa-ticket-alt"></i> 需提前购票</div>`;
        }
    });

    return `<div class="next-day-preview" onclick="document.getElementById('day-${nextIdx}').scrollIntoView({behavior:'smooth',block:'start'})">` +
        `<div class="preview-header"><i class="fas fa-forward"></i> 明天：${nextDay.date.slice(0, 5)} · ${nextInfo.cityName}</div>` +
        `<div class="preview-detail">${detail}</div>` +
        ticketHtml +
        `</div>`;
}

// ========== 今日Checklist（localStorage 持久化） ==========
const CHECKLIST_KEY = 'travel_checklist_state';

function getChecklistState() {
    try { return JSON.parse(localStorage.getItem(CHECKLIST_KEY)) || {}; } catch { return {}; }
}

function saveChecklistState(name, checked) {
    const state = getChecklistState();
    if (checked) state[name] = true; else delete state[name];
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(state));
}

function buildDayChecklist(dayIdx) {
    if (typeof packingItems === 'undefined') return '';
    const essentialItems = packingItems.filter(i => i.essential);
    if (essentialItems.length === 0) return '';

    const startIdx = (dayIdx * 3) % essentialItems.length;
    const dayItems = [];
    for (let i = 0; i < Math.min(4, essentialItems.length); i++) {
        dayItems.push(essentialItems[(startIdx + i) % essentialItems.length]);
    }

    const savedState = getChecklistState();
    let itemsHtml = dayItems.map(item => {
        const checked = savedState[item.name] ? ' checked' : '';
        const icon = savedState[item.name] ? 'fa-check-square' : 'fa-square';
        return `<span class="check-item${checked}" data-name="${item.name}" onclick="toggleCheckItem(this)"><i class="far ${icon}"></i> ${item.name}</span>`;
    }).join('');

    return `<div class="day-checklist"><div class="checklist-label"><i class="fas fa-check-square"></i> 今日提醒</div><div class="checklist-items">${itemsHtml}</div></div>`;
}

function toggleCheckItem(el) {
    const name = el.dataset.name;
    const isChecked = el.classList.toggle('checked');
    const icon = el.querySelector('i');
    icon.className = isChecked ? 'far fa-check-square' : 'far fa-square';
    saveChecklistState(name, isChecked);
}

// ========== 今日美食推荐 ==========
function buildDayFoodSection(city) {
    if (!foodData || city === 'move') return '';
    const regionMap = { 'wuyi': 'wuyi', 'lushan': 'lushan', 'jiujiang': 'jiujiang' };
    const region = regionMap[city];
    if (!region) return '';

    const cityFoods = foodData.filter(f => f.region === region).slice(0, 4);
    if (cityFoods.length === 0) return '';

    let cardsHtml = cityFoods.map(food => {
        const descShort = getSummaryText(food.desc);
        const tagsHtml = food.tags ? food.tags.slice(0, 2).map(t => `<span class="mini-food-tag">${t}</span>`).join('') : '';
        const navHtml = food.mapUrl ? `<a href="${food.mapUrl}" target="_blank" rel="noopener" class="mini-food-nav"><i class="fas fa-location-arrow"></i> 导航</a>` : '';
        return `<div class="day-food-mini-card">` +
            `<div class="mini-food-name">${food.name}</div>` +
            `<div class="mini-food-desc">${descShort}</div>` +
            `<div class="mini-food-bottom">${tagsHtml}${navHtml}</div>` +
            `</div>`;
    }).join('');

    return `<div class="day-food-section"><div class="section-label"><i class="fas fa-utensils"></i> 今日推荐</div><div class="day-food-mini-grid">${cardsHtml}</div></div>`;
}

// ========== 行动按钮 ==========
function buildActionBtns(block) {
    let btns = '';
    if (block.transport && block.transport.includes('打车')) {
        btns += `<span class="action-btn" onclick="copyText(this,'${block.transport.replace(/'/g, "\\'")}')"><i class="fas fa-copy"></i> 复制交通</span>`;
    }
    return btns ? `<div class="action-btns">${btns}</div>` : '';
}

function copyText(el, text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            const orig = el.innerHTML;
            el.innerHTML = '<i class="fas fa-check"></i> 已复制';
            el.style.color = '#5a8a52';
            setTimeout(() => { el.innerHTML = orig; el.style.color = ''; }, 1500);
        });
    }
}

// ========== 交互函数 ==========
function toggleDay(idx) {
    document.getElementById(`day-${idx}`).classList.toggle('collapsed');
}

function toggleBlock(dayIdx, blockIdx) {
    const block = document.getElementById(`block-${dayIdx}-${blockIdx}`);
    if (block) block.classList.toggle('expanded');
}

function collapseAllBlocks(dayIdx) {
    const dayCard = document.getElementById(`day-${dayIdx}`);
    if (!dayCard) return;
    dayCard.querySelectorAll('.time-block.expanded').forEach(b => b.classList.remove('expanded'));
}

function toggleClamp(dayIdx, blockIdx) {
    const clamp = document.getElementById(`clamp-${dayIdx}-${blockIdx}`);
    if (!clamp) return;
    clamp.classList.toggle('expanded');
    const btn = clamp.nextElementSibling;
    if (btn) btn.textContent = clamp.classList.contains('expanded') ? '收起' : '展开全文';
}

function toggleSection(titleEl) {
    titleEl.classList.toggle('collapsed');
    const content = titleEl.nextElementSibling;
    if (content && content.classList.contains('section-content')) {
        content.classList.toggle('collapsed');
    }
}

// ========== 链接处理 ==========
let spotMap = {};
let spotFoodMap = {};

function linkifyDesc(desc, spots) {
    if (!spots || spots.length === 0 || !spotMap) return desc;
    let result = desc;
    spots.forEach(spot => {
        for (const [key, url] of Object.entries(spotMap)) {
            if (spot.includes(key) && result.includes(key)) {
                result = result.replace(key, `<a href="${url}" target="_blank" rel="noopener" class="desc-link">${key}</a>`);
                break;
            }
        }
    });
    return result;
}

function buildFoodLinks(spots) {
    if (!spots || spots.length === 0 || !spotFoodMap) return '';
    let foods = new Set();
    spots.forEach(spot => {
        for (const [key, items] of Object.entries(spotFoodMap)) {
            if (spot.includes(key)) items.forEach(f => foods.add(f));
        }
    });
    if (foods.size === 0) return '';
    let links = '';
    foods.forEach(f => {
        const foodIdx = foodData.findIndex(fd => fd.name === f);
        if (foodIdx !== -1) links += `<a href="#food-${foodIdx}" class="spot-link spot-link-food"><i class="fas fa-utensils"></i> ${f}</a>`;
    });
    return links ? `<div class="spot-links">${links}</div>` : '';
}

// ========== 美食独立模块 ==========
let currentFoodFilter = 'all';

function buildFoodGrid() {
    const container = document.getElementById('foodGrid');
    let html = '';
    foodData.forEach((food, idx) => {
        if (currentFoodFilter !== 'all' && food.region !== currentFoodFilter) return;
        const tagsHtml = food.tags.map(t => `<span class="food-tag">${t}</span>`).join('');
        const mapHtml = food.mapUrl ? `<a href="${food.mapUrl}" target="_blank" rel="noopener" class="food-nav-btn"><i class="fas fa-location-arrow"></i> 导航去店铺</a>` : '';
        html += `<div class="food-card" id="food-${idx}"><div class="food-info"><div class="food-name">${food.name}</div><div class="food-location"><i class="fas fa-map-marker-alt"></i>${food.location}</div><div class="food-desc">${food.desc}</div><div class="food-tags">${tagsHtml}</div>${mapHtml}</div></div>`;
    });
    container.innerHTML = html || '<div style="text-align:center; color:#5a6b5a; padding:2rem;">暂无该城市美食数据</div>';
}

document.getElementById('foodTabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.food-tab');
    if (!tab) return;
    document.querySelectorAll('.food-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFoodFilter = tab.dataset.city;
    buildFoodGrid();
});

// ========== 伴手礼独立模块 ==========
let currentGiftFilter = 'all';

function buildGiftGrid() {
    const container = document.getElementById('giftGrid');
    let html = '';
    giftData.forEach(gift => {
        if (currentGiftFilter !== 'all' && gift.region !== currentGiftFilter) return;
        const regionClass = `gift-${gift.region}`;
        const icon = gift.region === 'wuyi' ? '🍃' : gift.region === 'lushan' ? '🏔️' : '🏙️';
        const tagsHtml = gift.tags.map(t => `<span class="gift-tag gift-tag-${t.type}">${t.text}</span>`).join('');
        html += `<div class="gift-card"><div class="gift-header"><div class="gift-icon ${regionClass}">${icon}</div><div class="gift-name">${gift.name}</div><span class="gift-city">${gift.city}</span></div><div class="gift-desc">${gift.desc}</div><div class="gift-footer"><div>${tagsHtml}</div><div class="gift-price">${gift.price}</div></div><div class="gift-where"><i class="fas fa-store" style="margin-right:0.3rem;"></i>${gift.where}</div></div>`;
    });
    container.innerHTML = html || '<div style="text-align:center; color:#5a6b5a; padding:2rem;">暂无该城市伴手礼数据</div>';
}

document.getElementById('giftTabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.gift-tab');
    if (!tab) return;
    document.querySelectorAll('.gift-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentGiftFilter = tab.dataset.city;
    buildGiftGrid();
});

// ========== 购票提醒 ==========
function buildTicketTips() {
    document.getElementById('ticketTips').innerHTML = `
        <div class="ticket-item"><span class="ticket-label">🎟️ 九曲溪竹筏</span><span class="ticket-desc">"武夷山旅游"小程序提前3-7天抢票，130元/人，早场最佳。</span></div>
        <div class="ticket-item"><span class="ticket-label">🎫 庐山大门票</span><span class="ticket-desc">160元，索道65元，"一机游庐山"小程序购，观光车70元/7天。</span></div>
        <div class="ticket-item"><span class="ticket-label">🚞 三叠泉小火车</span><span class="ticket-desc">现场80元往返，建议上午早去。</span></div>
    `;
}

// ========== 门票价格汇总 ==========
function buildPriceSummary() {
    const prices = [
        { item: "九曲溪竹筏", price: 130, note: "小程序提前3-7天", channel: "武夷山旅游小程序", type: "景区" },
        { item: "武夷山景区观光车", price: 95, note: "2026年主景区免大门票，三日票95元", channel: "武夷山旅游小程序", type: "景区" },
        { item: "庐山大门票", price: 160, note: "", channel: "一机游庐山小程序", type: "景区" },
        { item: "庐山索道（往返）", price: 120, note: "单程65元", channel: "一机游庐山小程序", type: "景区" },
        { item: "庐山观光车", price: 70, note: "7天有效", channel: "一机游庐山小程序", type: "景区" },
        { item: "三叠泉小火车", price: 80, note: "", channel: "现场购买", type: "景区" },
        { item: "浔阳楼", price: 30, note: "", channel: "现场购票", type: "景点" },
        { item: "锁江楼", price: 20, note: "", channel: "现场购票", type: "景点" },
        { item: "烟水亭", price: 20, note: "或免费", channel: "现场购票", type: "景点" },
    ];
    const total = prices.reduce((s, p) => s + p.price, 0);
    const sceneryTotal = prices.filter(p => p.type === '景区').reduce((s, p) => s + p.price, 0);
    const spotTotal = prices.filter(p => p.type === '景点').reduce((s, p) => s + p.price, 0);
    let html = '<table class="price-table"><thead><tr><th>项目</th><th>价格</th><th>购票渠道</th></tr></thead><tbody>';
    prices.forEach(p => {
        const noteHtml = p.note ? `<span class="price-note">${p.note}</span>` : '';
        html += `<tr><td>${p.item}${noteHtml}</td><td><span class="price-tag">¥${p.price}</span></td><td><span class="price-channel">${p.channel}</span></td></tr>`;
    });
    html += `<tr class="price-subtotal"><td>景区门票+交通</td><td><span class="price-tag">¥${sceneryTotal}</span></td><td></td></tr>`;
    html += `<tr class="price-subtotal"><td>景点门票</td><td><span class="price-tag">¥${spotTotal}</span></td><td></td></tr>`;
    html += `<tr class="price-total"><td>合计</td><td><span class="price-tag">¥${total}</span></td><td>不含餐饮住宿</td></tr></tbody></table>`;
    document.getElementById('priceSummary').innerHTML = html;
}

// ========== 天气预警 ==========
function checkWeatherAlerts() {
    const alerts = [];
    const dates = getDateRange(TRIP_START, TRIP_END);
    dates.forEach((date, idx) => {
        const cityInfo = getCityForDay(idx);
        if (cityInfo.city === 'move') return; // 转场日不检查天气预警

        const cityKey = cityInfo.city;
        const cityName = cityInfo.cityName;
        const d = weatherData[cityKey] ? weatherData[cityKey][date] : null;

        if (d && d.tmax >= 35) alerts.push({ type: 'hot', text: `${date.slice(5)} ${cityName} 高温 ${Math.round(d.tmax)}°C，注意防暑` });
        if (d && (d.code === 65 || d.code === 95 || d.code === 96 || d.code === 99)) alerts.push({ type: 'rain', text: `${date.slice(5)} ${cityName} ${wmoToText(d.code)}，户外活动注意安全` });
    });
    const container = document.getElementById('weatherAlerts');
    if (alerts.length === 0) { container.innerHTML = ''; return; }
    const unique = [...new Set(alerts.map(a => a.text))].slice(0, 5);
    const alertType = alerts[0].type;
    const updateStr = weatherUpdateTime ? weatherUpdateTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '';
    container.innerHTML = `<div class="weather-alert ${alertType}"><i class="fas ${alertType === 'hot' ? 'fa-exclamation-triangle' : 'fa-cloud-rain'}"></i><span><strong>天气提醒：</strong>${unique.join('；')}</span></div><div class="weather-forecast-note">📅 预报仅供参考，${updateStr ? '更新于 ' + updateStr + '，' : ''}出发前3天再确认</div>`;
}

// ========== 概览层天气动态更新 ==========
function updateOverviewWeather() {
    dailyData.forEach((day, idx) => {
        const info = getCityForDay(idx);
        if (info.city === 'move') return;
        const dateKey = getDayDateKey(idx);
        const wData = weatherData[info.city] && weatherData[info.city][dateKey];
        const container = document.getElementById(`overview-weather-${idx}`);
        if (!container || !wData) return;

        const emoji = wmoToEmoji(wData.code);
        const text = wmoToText(wData.code);
        const temp = Math.round(wData.tmin) + '~' + Math.round(wData.tmax) + '°';
        let html = `<span class="weather-emoji">${emoji}</span><span>${text}</span><span class="temp-range">${temp}</span>`;
        if (wData.precip !== null && wData.precip >= 30) {
            html += ` <span class="overview-rain-badge">💧 ${wData.precip}%</span>`;
        }
        container.innerHTML = html;
    });
}

// ========== 天气动态调整（日出/雨天） ==========
function applyWeatherDynamic() {
    const sunriseBlocks = [];
    const rainBlocks = [];

    dailyData.forEach((day, dayIdx) => {
        const dateKey = day.dateKey || getDayDateKey(dayIdx);
        const info = getCityForDay(dayIdx);
        if (info.city === 'move') return;

        day.blocks.forEach((block, blockIdx) => {
            if (block.sunriseFor) {
                sunriseBlocks.push({ dayIdx, blockIdx, block, city: block.sunriseFor, dateKey });
            }
            if (block.rainPlan) {
                rainBlocks.push({ dayIdx, blockIdx, block, city: info.city, dateKey });
            }
        });
    });

    // a) 更新日出时间
    sunriseBlocks.forEach(({ dayIdx, blockIdx, block, city, dateKey }) => {
        const wData = weatherData[city] && weatherData[city][dateKey];
        if (!wData || !wData.sunrise) return;

        const sunriseTime = new Date(wData.sunrise);
        const sunriseStr = `${sunriseTime.getHours()}:${String(sunriseTime.getMinutes()).padStart(2, '0')}`;
        const departTime = new Date(sunriseTime.getTime() - 53 * 60 * 1000);
        const departStr = `${departTime.getHours()}:${String(departTime.getMinutes()).padStart(2, '0')}`;

        const dayCard = document.getElementById(`day-${dayIdx}`);
        if (!dayCard) return;
        const timeBlocks = dayCard.querySelectorAll('.time-block');
        const targetBlock = timeBlocks[blockIdx];
        if (!targetBlock) return;

        const timeTitle = targetBlock.querySelector('.time-title');
        if (timeTitle) {
            const emoji = timeTitle.textContent.match(/^[^\s]*/)?.[0] || '🌅';
            timeTitle.textContent = `${emoji} 凌晨 ${departStr}`;
        }

        // 更新概览层时间
        const overview = dayCard.querySelector('.day-overview .overview-time');
        if (overview && blockIdx === 0) {
            overview.textContent = `⏰ ${departStr} 出发`;
        }

        // 更新详情中的日出时间
        const timeDetail = targetBlock.querySelector('.time-detail');
        if (timeDetail) {
            const sunriseNote = `当日日出时间约${sunriseStr}（实时预报）`;
            const existingTag = timeDetail.querySelector('.sunrise-time-tag');
            if (existingTag) {
                existingTag.innerHTML = `☀️ ${sunriseNote}`;
            } else {
                const tag = document.createElement('span');
                tag.className = 'sunrise-time-tag';
                tag.innerHTML = `☀️ ${sunriseNote}`;
                timeDetail.appendChild(tag);
            }
        }
    });

    // b) 雨天高亮
    rainBlocks.forEach(({ dayIdx, blockIdx, city, dateKey }) => {
        const wData = weatherData[city] && weatherData[city][dateKey];
        if (!wData) return;

        const dayCard = document.getElementById(`day-${dayIdx}`);
        if (!dayCard) return;
        const timeBlocks = dayCard.querySelectorAll('.time-block');
        const targetBlock = timeBlocks[blockIdx];
        if (!targetBlock) return;

        const rainDiv = targetBlock.querySelector('.rain-plan');
        if (!rainDiv) return;

        const isRainy = (wData.precip !== null && wData.precip >= 50) ||
                        [51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(wData.code);

        if (isRainy) {
            rainDiv.classList.add('rain-plan-active');
            rainDiv.classList.remove('rain-plan-muted');
        } else {
            rainDiv.classList.add('rain-plan-muted');
            rainDiv.classList.remove('rain-plan-active');
        }
    });
}

// ========== 清单（localStorage 持久化） ==========
function renderPackingChecklist() {
    const categoryMap = { "防雨": { title: "🌂 防雨装备", icon: "fa-umbrella" }, "药品": { title: "💊 健康药品", icon: "fa-capsules" }, "其他": { title: "🦟 驱蚊防晒 & 其他", icon: "fa-bug" } };
    const savedState = getChecklistState();
    let html = '';
    for (let cat of ["防雨", "药品", "其他"]) {
        const catItems = packingItems.filter(i => i.category === cat);
        if (catItems.length === 0) continue;
        html += `<div class="checklist-category"><div class="checklist-title"><i class="fas ${categoryMap[cat].icon}"></i> ${categoryMap[cat].title}</div><ul class="checklist">`;
        catItems.forEach(item => {
            const cls = item.essential ? 'essential' : '';
            const checked = savedState[item.name];
            const icon = checked ? 'fa-check-square' : (item.essential ? 'fa-star' : 'fa-check-circle');
            const checkedCls = checked ? ' checked' : '';
            html += `<li class="${cls}${checkedCls}" data-name="${item.name}" onclick="togglePackItem(this)"><i class="fas ${icon}"></i> ${item.name}</li>`;
        });
        html += `</ul></div>`;
    }
    document.getElementById('packingListCheck').innerHTML = html;
}

function togglePackItem(el) {
    const name = el.dataset.name;
    const isChecked = el.classList.toggle('checked');
    const icon = el.querySelector('i');
    const isEssential = el.classList.contains('essential');
    icon.className = isChecked ? 'fas fa-check-square' : (isEssential ? 'fas fa-star' : 'fas fa-check-circle');
    saveChecklistState(name, isChecked);
}

// ========== Tab计数更新 ==========
function updateTabCounts() {
    const foodCounts = { all: foodData.length, wuyi: 0, lushan: 0, jiujiang: 0 };
    foodData.forEach(f => { if (foodCounts[f.region] !== undefined) foodCounts[f.region]++; });
    document.querySelectorAll('#foodTabs .food-tab').forEach(tab => {
        const city = tab.dataset.city;
        const count = foodCounts[city] || 0;
        let countEl = tab.querySelector('.tab-count');
        if (!countEl) { countEl = document.createElement('span'); countEl.className = 'tab-count'; tab.appendChild(countEl); }
        countEl.textContent = count;
    });
    const giftCounts = { all: giftData.length, wuyi: 0, lushan: 0, jiujiang: 0 };
    giftData.forEach(g => { if (giftCounts[g.region] !== undefined) giftCounts[g.region]++; });
    document.querySelectorAll('#giftTabs .gift-tab').forEach(tab => {
        const city = tab.dataset.city;
        const count = giftCounts[city] || 0;
        let countEl = tab.querySelector('.tab-count');
        if (!countEl) { countEl = document.createElement('span'); countEl.className = 'tab-count'; tab.appendChild(countEl); }
        countEl.textContent = count;
    });
}

// ========== 导航（顶部） ==========
function buildNav() {
    const nav = document.getElementById('navLinks');
    let links = '';
    dailyData.forEach((day, idx) => {
        const info = getCityForDay(idx);
        links += `<a href="#day-${idx}" class="nav-link" data-idx="${idx}"><span class="city-dot city-${info.city}"></span><span>${day.date.slice(0, 5)}</span></a>`;
    });
    nav.innerHTML = links;
}

function updateNavHighlight() {
    const cards = document.querySelectorAll('.day-card');
    const navLinks = document.querySelectorAll('.nav-link');
    const scrollTop = window.scrollY;
    const offset = 150;
    const lastCard = cards[cards.length - 1];
    const lastCardBottom = lastCard ? lastCard.getBoundingClientRect().bottom + window.scrollY : 0;
    let currentIdx = -1;
    cards.forEach((card, idx) => {
        const rect = card.getBoundingClientRect();
        if (rect.top <= offset + 20) currentIdx = idx;
    });
    if (currentIdx === -1 || scrollTop < 200 || scrollTop + window.innerHeight > lastCardBottom + 100) {
        navLinks.forEach(link => link.classList.remove('active'));
        return;
    }
    navLinks.forEach((link, idx) => { link.classList.toggle('active', idx === currentIdx); });
    const activeLink = navLinks[currentIdx];
    if (activeLink) activeLink.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

    // 同步底部浮窗
    updateBottomNav(currentIdx);
}

// ========== 底部日期浮窗 ==========
let currentVisibleDay = 0;

function updateBottomNav(dayIdx) {
    if (dayIdx < 0 || dayIdx >= dailyData.length) return;
    currentVisibleDay = dayIdx;
    const info = getCityForDay(dayIdx);
    const day = dailyData[dayIdx];

    document.getElementById('navDayInfo').textContent = `Day ${dayIdx + 1}/${dailyData.length} · ${day.date}`;
    document.getElementById('navCity').textContent = info.cityName !== '转场' ? `${info.cityName} · ${day.dayTitle}` : day.dayTitle;

    document.getElementById('navPrev').disabled = dayIdx === 0;
    document.getElementById('navNext').disabled = dayIdx === dailyData.length - 1;
}

function setupBottomNav() {
    const prevBtn = document.getElementById('navPrev');
    const nextBtn = document.getElementById('navNext');
    const todayBtn = document.getElementById('navTodayBtn');
    const bottomNav = document.getElementById('bottomDateNav');

    prevBtn.addEventListener('click', () => {
        if (currentVisibleDay > 0) {
            document.getElementById(`day-${currentVisibleDay - 1}`).scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentVisibleDay < dailyData.length - 1) {
            document.getElementById(`day-${currentVisibleDay + 1}`).scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    todayBtn.addEventListener('click', () => {
        const todayCard = document.querySelector('.day-card.today');
        if (todayCard) todayCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // 滚动到 footer 区域时隐藏底部浮窗
    const footerEl = document.querySelector('footer');
    if (footerEl && bottomNav) {
        window.addEventListener('scroll', () => {
            const footerRect = footerEl.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            if (footerRect.top < windowHeight + 50) {
                bottomNav.style.transform = 'translateY(100%)';
            } else {
                bottomNav.style.transform = 'translateY(0)';
            }
        });
    }

    updateBottomNav(0);
}

// ========== 回到顶部 ==========
function setupBackToTop() {
    const btn = document.getElementById('backToTop');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) btn.classList.add('visible');
        else btn.classList.remove('visible');
    });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ========== 滚动进度条 ==========
function setupScrollProgress() {
    const progressBar = document.getElementById('scrollProgress');
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        progressBar.style.width = progress + '%';
    });
}

// ========== 快捷导航跳转（联动展开） ==========
function scrollToSection(section) {
    const sectionMap = { 'weather': '行程天气', 'daily': '每日行程', 'food': '必吃美食', 'gift': '伴手礼', 'ticket': '门票价格', 'checklist': '雨季行装' };
    const title = sectionMap[section];
    if (!title) return;
    const titles = document.querySelectorAll('.section-title');
    for (const el of titles) {
        if (el.textContent.includes(title)) {
            // 自动展开收起的模块
            if (el.classList.contains('collapsed')) {
                el.classList.remove('collapsed');
                const content = el.nextElementSibling;
                if (content && content.classList.contains('section-content')) {
                    content.classList.remove('collapsed');
                }
            }
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            break;
        }
    }
}

// ========== 今日高亮 ==========
function highlightToday() {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const todayStr = `${month}/${day}`;
    const tripDates = [
        { date: '6/12', idx: 0 }, { date: '6/13', idx: 1 }, { date: '6/14', idx: 2 },
        { date: '6/15', idx: 3 }, { date: '6/16', idx: 4 }, { date: '6/17', idx: 5 },
        { date: '6/18', idx: 6 }, { date: '6/19', idx: 7 }, { date: '6/20', idx: 8 }
    ];
    const match = tripDates.find(d => d.date === todayStr);
    if (match) {
        const card = document.getElementById(`day-${match.idx}`);
        if (card) {
            card.classList.add('today');
            setTimeout(() => { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 500);
        }
    }
}

// ========== 初始化 ==========
window.addEventListener('DOMContentLoaded', () => {
    buildNav();
    buildDailyCards();
    buildFoodGrid();
    buildGiftGrid();
    buildTicketTips();
    buildPriceSummary();
    renderPackingChecklist();
    updateTabCounts();
    highlightToday();
    renderWeather().then(() => { checkWeatherAlerts(); applyWeatherDynamic(); updateOverviewWeather(); });
    setupBackToTop();
    setupScrollProgress();
    setupBottomNav();
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => { updateNavHighlight(); ticking = false; });
            ticking = true;
        }
    });
});
