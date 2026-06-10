/**
 * js/weather.js - 天气模块
 * 包含：天气数据获取、渲染、预警、动态调整（日出/雨天）
 * 行为与 main.js 完全一致
 */
(function() {
    'use strict';

    // ========== 温度可视化 ==========
    function renderTempBar(tmin, tmax) {
        if (tmin == null || tmax == null) return '';
        var clamp = function(v) { return Math.min(40, Math.max(5, v)); };
        var toHue = function(t) { return 240 - ((clamp(t) - 5) / 35) * 240; };
        var hueMin = toHue(tmin);
        var hueMax = toHue(tmax);
        return '<div class="temp-bar">' +
            '<div class="temp-bar-fill" style="background: linear-gradient(90deg, hsl(' + hueMin + ', 70%, 55%), hsl(' + hueMax + ', 70%, 55%));"></div>' +
            '<span class="temp-bar-label">' + Math.round(tmin) + '°</span>' +
            '<span class="temp-bar-label temp-bar-max">' + Math.round(tmax) + '°</span>' +
            '</div>';
    }

    // ========== 天气数据获取 ==========
    async function fetchForecast(lat, lon) {
        var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon +
            '&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_mean,sunrise,sunset' +
            '&timezone=Asia/Shanghai&forecast_days=' + TravelApp.config.FORECAST_DAYS;
        var r = await fetch(url);
        if (!r.ok) throw new Error();
        var d = await r.json();
        var m = {};
        for (var i = 0; i < d.daily.time.length; i++) {
            m[d.daily.time[i]] = {
                code: d.daily.weathercode[i],
                tmax: d.daily.temperature_2m_max[i],
                tmin: d.daily.temperature_2m_min[i],
                precip: d.daily.precipitation_probability_mean[i] || 0,
                src: 'forecast',
                sunrise: d.daily.sunrise ? d.daily.sunrise[i] : null,
                sunset: d.daily.sunset ? d.daily.sunset[i] : null
            };
        }
        return m;
    }

    async function fetchHistorical(lat, lon, s, e) {
        var url = 'https://archive-api.open-meteo.com/v1/archive?latitude=' + lat + '&longitude=' + lon +
            '&start_date=' + s + '&end_date=' + e + '&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Asia/Shanghai';
        var r = await fetch(url);
        if (!r.ok) throw new Error();
        var d = await r.json();
        var m = {};
        if (d.daily) {
            for (var i = 0; i < d.daily.time.length; i++) {
                m[d.daily.time[i]] = {
                    code: d.daily.weathercode[i],
                    tmax: d.daily.temperature_2m_max[i],
                    tmin: d.daily.temperature_2m_min[i],
                    precip: null,
                    src: 'history',
                    sunrise: null,
                    sunset: null
                };
            }
        }
        return m;
    }

    // ========== 天气渲染 ==========
    function renderWeatherCards() {
        var container = document.getElementById('weatherGrid');
        var dates = getDateRange(TravelApp.config.TRIP_START, TravelApp.config.TRIP_END);
        var html = '';

        if (TravelApp.weather.cityFilter === 'all') {
            container.classList.add('all-view');
            for (var i = 0; i < dates.length; i++) {
                var date = dates[i];
                var wy = TravelApp.weather.data.wuyi[date];
                var ls = TravelApp.weather.data.lushan[date];
                var jj = TravelApp.weather.data.jiujiang[date];
                html += '<div class="weather-card all-mode">' +
                    '<div class="weather-date">' + date.slice(5) + '</div>' +
                    '<div class="weather-city-row"><span class="weather-city-name">武夷</span>' +
                    '<div class="weather-city-info"><span>' + (wy ? wmoToEmoji(wy.code) : '-') + '</span>' +
                    '<span class="weather-city-text">' + (wy ? wmoToText(wy.code) : '-') + '</span>' +
                    '<span class="weather-city-temp">' + (wy ? Math.round(wy.tmin) + '~' + Math.round(wy.tmax) + '°' : '-') + '</span></div></div>' +
                    '<div class="weather-city-row"><span class="weather-city-name">庐山</span>' +
                    '<div class="weather-city-info"><span>' + (ls ? wmoToEmoji(ls.code) : '-') + '</span>' +
                    '<span class="weather-city-text">' + (ls ? wmoToText(ls.code) : '-') + '</span>' +
                    '<span class="weather-city-temp">' + (ls ? Math.round(ls.tmin) + '~' + Math.round(ls.tmax) + '°' : '-') + '</span></div></div>' +
                    '<div class="weather-city-row"><span class="weather-city-name">九江</span>' +
                    '<div class="weather-city-info"><span>' + (jj ? wmoToEmoji(jj.code) : '-') + '</span>' +
                    '<span class="weather-city-text">' + (jj ? wmoToText(jj.code) : '-') + '</span>' +
                    '<span class="weather-city-temp">' + (jj ? Math.round(jj.tmin) + '~' + Math.round(jj.tmax) + '°' : '-') + '</span></div></div>' +
                    '</div>';
            }
        } else {
            container.classList.remove('all-view');
            var cityKey = TravelApp.weather.cityFilter === 'wuyi' ? 'wuyi' : TravelApp.weather.cityFilter === 'lushan' ? 'lushan' : 'jiujiang';
            var data = TravelApp.weather.data[cityKey];
            for (var i = 0; i < dates.length; i++) {
                var date = dates[i];
                var d = data[date];
                if (!d) continue;
                html += '<div class="weather-card">' +
                    '<div class="weather-date">' + date.slice(5) + '</div>' +
                    '<div class="weather-icon">' + wmoToEmoji(d.code) + '</div>' +
                    '<div class="weather-city-temp" style="font-size:0.7rem;">' + wmoToText(d.code) + '</div>' +
                    renderTempBar(d.tmin, d.tmax) +
                    (d.precip !== null ? '<div class="weather-note">💧 ' + d.precip + '%</div>' : '') +
                    (d.src !== 'forecast' ? '<div class="weather-src">参考</div>' : '') +
                    '</div>';
            }
        }
        container.innerHTML = html;
        observeCards();
    }

    // ========== 天气数据加载 ==========
    async function renderWeather() {
        var note = document.getElementById('weatherNote');
        try {
            var results = await Promise.all([
                fetchForecast(TravelApp.config.WUYI_LAT, TravelApp.config.WUYI_LON),
                fetchForecast(TravelApp.config.LUSHAN_LAT, TravelApp.config.LUSHAN_LON),
                fetchForecast(TravelApp.config.JIUJIANG_LAT, TravelApp.config.JIUJIANG_LON),
                fetchHistorical(TravelApp.config.WUYI_LAT, TravelApp.config.WUYI_LON, TravelApp.config.HISTORY_YEAR + '-06-12', TravelApp.config.HISTORY_YEAR + '-06-20'),
                fetchHistorical(TravelApp.config.LUSHAN_LAT, TravelApp.config.LUSHAN_LON, TravelApp.config.HISTORY_YEAR + '-06-12', TravelApp.config.HISTORY_YEAR + '-06-20'),
                fetchHistorical(TravelApp.config.JIUJIANG_LAT, TravelApp.config.JIUJIANG_LON, TravelApp.config.HISTORY_YEAR + '-06-12', TravelApp.config.HISTORY_YEAR + '-06-20')
            ]);

            var wyF = results[0], lsF = results[1], jjF = results[2];
            var wyH = results[3], lsH = results[4], jjH = results[5];
            var dates = getDateRange(TravelApp.config.TRIP_START, TravelApp.config.TRIP_END);
            var fc = 0, hc = 0, fb = 0;

            for (var i = 0; i < dates.length; i++) {
                var date = dates[i];

                var wyD = wyF[date];
                if (!wyD && wyH[date]) wyD = wyH[date];
                if (!wyD) { wyD = { code: TravelApp.config.LOCAL_REF['武夷山'].code, tmin: TravelApp.config.LOCAL_REF['武夷山'].tmin, tmax: TravelApp.config.LOCAL_REF['武夷山'].tmax, precip: 0, src: 'fallback', sunrise: null, sunset: null }; fb++; }
                else if (wyD.src === 'forecast') fc++; else hc++;
                TravelApp.weather.data.wuyi[date] = wyD;

                var lsD = lsF[date];
                if (!lsD && lsH[date]) lsD = lsH[date];
                if (!lsD) { lsD = { code: TravelApp.config.LOCAL_REF['庐山'].code, tmin: TravelApp.config.LOCAL_REF['庐山'].tmin, tmax: TravelApp.config.LOCAL_REF['庐山'].tmax, precip: 0, src: 'fallback', sunrise: null, sunset: null }; fb++; }
                else if (lsD.src === 'forecast') fc++; else hc++;
                TravelApp.weather.data.lushan[date] = lsD;

                var jjD = jjF[date];
                if (!jjD && jjH[date]) jjD = jjH[date];
                if (!jjD) { jjD = { code: TravelApp.config.LOCAL_REF['九江'].code, tmin: TravelApp.config.LOCAL_REF['九江'].tmin, tmax: TravelApp.config.LOCAL_REF['九江'].tmax, precip: 0, src: 'fallback', sunrise: null, sunset: null }; fb++; }
                else if (jjD.src === 'forecast') fc++; else hc++;
                TravelApp.weather.data.jiujiang[date] = jjD;
            }

            TravelApp.weather.updateTime = new Date();
            renderWeatherCards();
            var timeStr = TravelApp.weather.updateTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
            note.innerHTML = '📊 实时预报 ' + fc + ' 条 · 历史参考 ' + hc + ' 条 · 气候参考 ' + fb + ' 条<br><span class="weather-update-time">⏱️ 更新于 ' + timeStr + '</span>';
        } catch (e) {
            document.getElementById('weatherGrid').innerHTML = '<div class="weather-error">⚠️ 天气服务暂不可用</div>';
        }
    }

    // ========== 刷新天气 ==========
    async function refreshWeather() {
        var btn = document.querySelector('.weather-refresh-btn');
        if (btn.classList.contains('refreshing')) return;
        btn.classList.add('refreshing');
        var grid = document.getElementById('weatherGrid');
        grid.innerHTML = Array(9).fill('<div class="skeleton skeleton-card"></div>').join('');
        document.getElementById('weatherNote').innerHTML = '<span class="weather-loading-text"><i class="fas fa-spinner fa-spin"></i> 正在获取最新天气数据...</span>';
        document.getElementById('weatherAlerts').innerHTML = '';
        try {
            await renderWeather();
        } finally {
            btn.classList.remove('refreshing');
        }
    }

    // ========== 天气预警 ==========
    function checkWeatherAlerts() {
        var alerts = [];
        var dates = getDateRange(TravelApp.config.TRIP_START, TravelApp.config.TRIP_END);
        dates.forEach(function(date, idx) {
            var cityInfo = getCityForDay(idx);
            if (cityInfo.city === 'move') return;
            var cityKey = cityInfo.city;
            var cityName = cityInfo.cityName;
            var d = TravelApp.weather.data[cityKey] ? TravelApp.weather.data[cityKey][date] : null;
            if (d && d.tmax >= 35) alerts.push({ type: 'hot', text: date.slice(5) + ' ' + cityName + ' 高温 ' + Math.round(d.tmax) + '°C，注意防暑' });
            if (d && (d.code === 65 || d.code === 95 || d.code === 96 || d.code === 99)) alerts.push({ type: 'rain', text: date.slice(5) + ' ' + cityName + ' ' + wmoToText(d.code) + '，户外活动注意安全' });
        });
        var container = document.getElementById('weatherAlerts');
        if (alerts.length === 0) { container.innerHTML = ''; return; }
        var unique = [];
        var seen = {};
        alerts.forEach(function(a) { if (!seen[a.text]) { seen[a.text] = true; unique.push(a.text); } });
        unique = unique.slice(0, 5);
        var alertType = alerts[0].type;
        var updateStr = TravelApp.weather.updateTime ? TravelApp.weather.updateTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '';
        container.innerHTML = '<div class="weather-alert ' + alertType + '"><i class="fas ' + (alertType === 'hot' ? 'fa-exclamation-triangle' : 'fa-cloud-rain') + '"></i><span><strong>天气提醒：</strong>' + unique.join('；') + '</span></div><div class="weather-forecast-note">📅 预报仅供参考，' + (updateStr ? '更新于 ' + updateStr + '，' : '') + '出发前3天再确认</div>';
    }

    // ========== 概览层天气动态更新 ==========
    function updateOverviewWeather() {
        dailyData.forEach(function(day, idx) {
            var info = getCityForDay(idx);
            if (info.city === 'move') return;
            var dateKey = getDayDateKey(idx);
            var wData = TravelApp.weather.data[info.city] && TravelApp.weather.data[info.city][dateKey];
            var container = document.getElementById('overview-weather-' + idx);
            if (!container || !wData) return;

            var emoji = wmoToEmoji(wData.code);
            var text = wmoToText(wData.code);
            var temp = Math.round(wData.tmin) + '~' + Math.round(wData.tmax) + '°';
            var html = '<span class="weather-emoji">' + emoji + '</span><span>' + text + '</span><span class="temp-range">' + temp + '</span>';
            if (wData.precip !== null && wData.precip >= 30) {
                html += ' <span class="overview-rain-badge">💧 ' + wData.precip + '%</span>';
            }
            container.innerHTML = html;

            var suggestion = getClothingSuggestion(wData, day.intensity);
            if (suggestion) {
                var clothingEl = document.getElementById('clothing-' + idx);
                if (clothingEl) clothingEl.innerHTML = '<span title="' + suggestion.reason + '">👕 ' + suggestion.clothing + '</span>';
            }
        });
    }

    // ========== 穿搭建议 ==========
    function getClothingSuggestion(wData, intensity) {
        if (!wData) return null;
        var tmin = wData.tmin;
        var tmax = wData.tmax;
        var precip = wData.precip || 0;
        var code = wData.code;
        var clothing = [];
        var reason = [];

        if (tmin < 15) { clothing.push('厚外套'); reason.push('早晚较冷'); }
        else if (tmin < 20) { clothing.push('薄外套'); reason.push('早晚温差大'); }
        else if (tmax > 30) { clothing.push('透气短袖'); reason.push('高温天气'); }
        else if (tmax > 25) { clothing.push('短袖'); reason.push('温度适宜'); }
        else { clothing.push('薄长袖'); reason.push('温度舒适'); }

        var isRainy = [51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].indexOf(code) !== -1;
        if (precip >= 50 || isRainy) { clothing.push('雨衣/伞'); reason.push('有降雨'); }
        else if (precip >= 30) { clothing.push('折叠伞'); reason.push('可能有雨'); }

        if (intensity >= 3) { clothing.push('防滑运动鞋'); reason.push('行程充实'); }
        else if (intensity >= 2) { clothing.push('运动鞋'); reason.push('适中强度'); }
        else { clothing.push('休闲鞋'); reason.push('轻松行程'); }

        if (tmax - tmin >= 10 && tmin >= 20 && tmax <= 30) {
            if (clothing.indexOf('薄外套') === -1 && clothing.indexOf('厚外套') === -1) {
                clothing.push('薄外套'); reason.push('温差较大');
            }
        }

        return { clothing: clothing.join('、'), reason: reason.join('，') };
    }

    // ========== 天气动态调整（日出/雨天） ==========
    function applyWeatherDynamic() {
        var sunriseBlocks = [];
        var rainBlocks = [];

        dailyData.forEach(function(day, dayIdx) {
            var dateKey = day.dateKey || getDayDateKey(dayIdx);
            var info = getCityForDay(dayIdx);
            if (info.city === 'move') return;

            day.blocks.forEach(function(block, blockIdx) {
                if (block.sunriseFor) {
                    sunriseBlocks.push({ dayIdx: dayIdx, blockIdx: blockIdx, block: block, city: block.sunriseFor, dateKey: dateKey });
                }
                if (block.rainPlan) {
                    rainBlocks.push({ dayIdx: dayIdx, blockIdx: blockIdx, block: block, city: info.city, dateKey: dateKey });
                }
            });
        });

        // a) 更新日出时间
        sunriseBlocks.forEach(function(item) {
            var wData = TravelApp.weather.data[item.city] && TravelApp.weather.data[item.city][item.dateKey];
            if (!wData || !wData.sunrise) return;

            var sunriseTime = new Date(wData.sunrise);
            var sunriseStr = sunriseTime.getHours() + ':' + String(sunriseTime.getMinutes()).padStart(2, '0');
            var departTime = new Date(sunriseTime.getTime() - 53 * 60 * 1000);
            var departStr = departTime.getHours() + ':' + String(departTime.getMinutes()).padStart(2, '0');

            var dayCard = document.getElementById('day-' + item.dayIdx);
            if (!dayCard) return;
            var timeBlocks = dayCard.querySelectorAll('.time-block');
            var targetBlock = timeBlocks[item.blockIdx];
            if (!targetBlock) return;

            var timeTitle = targetBlock.querySelector('.time-title');
            if (timeTitle) {
                var emoji = (timeTitle.textContent.match(/^[^\s]*/) || ['🌅'])[0];
                timeTitle.textContent = emoji + ' 凌晨 ' + departStr;
            }

            var overview = dayCard.querySelector('.day-overview .overview-time');
            if (overview && item.blockIdx === 0) {
                overview.textContent = '⏰ ' + departStr + ' 出发';
            }

            var timeDetail = targetBlock.querySelector('.time-detail');
            if (timeDetail) {
                var sunriseNote = '当日日出时间约' + sunriseStr + '（实时预报）';
                var existingTag = timeDetail.querySelector('.sunrise-time-tag');
                if (existingTag) {
                    existingTag.innerHTML = '☀️ ' + sunriseNote;
                } else {
                    var tag = document.createElement('span');
                    tag.className = 'sunrise-time-tag';
                    tag.innerHTML = '☀️ ' + sunriseNote;
                    timeDetail.appendChild(tag);
                }
            }
        });

        // b) 雨天高亮
        rainBlocks.forEach(function(item) {
            var wData = TravelApp.weather.data[item.city] && TravelApp.weather.data[item.city][item.dateKey];
            if (!wData) return;

            var dayCard = document.getElementById('day-' + item.dayIdx);
            if (!dayCard) return;
            var timeBlocks = dayCard.querySelectorAll('.time-block');
            var targetBlock = timeBlocks[item.blockIdx];
            if (!targetBlock) return;

            var rainDiv = targetBlock.querySelector('.rain-plan');
            if (!rainDiv) return;

            var isRainy = (wData.precip !== null && wData.precip >= 50) ||
                          [51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].indexOf(wData.code) !== -1;

            if (isRainy) {
                rainDiv.classList.add('rain-plan-active');
                rainDiv.classList.remove('rain-plan-muted');
            } else {
                rainDiv.classList.add('rain-plan-muted');
                rainDiv.classList.remove('rain-plan-active');
            }
        });
    }

    // ========== 天气 Tab 切换 ==========
    document.getElementById('weatherTabs').addEventListener('click', function(e) {
        var tab = e.target.closest('.weather-tab');
        if (!tab) return;
        document.querySelectorAll('.weather-tab').forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
        TravelApp.weather.cityFilter = tab.dataset.city;
        renderWeatherCards();
    });

    // ========== 暴露到命名空间 ==========
    window.TravelApp = window.TravelApp || {};
    window.TravelApp.weather = window.TravelApp.weather || {};
    window.TravelApp.weather.render = renderWeatherCards;
    window.TravelApp.weather.refresh = refreshWeather;
    window.TravelApp.weather.checkAlerts = checkWeatherAlerts;
    window.TravelApp.weather.applyDynamic = applyWeatherDynamic;
    window.TravelApp.weather.updateOverview = updateOverviewWeather;
    window.TravelApp.weather.getClothingSuggestion = getClothingSuggestion;

    // ========== 全局转发函数（保持兼容） ==========
    window.renderTempBar = renderTempBar;
    window.fetchForecast = fetchForecast;
    window.fetchHistorical = fetchHistorical;
    window.renderWeatherCards = renderWeatherCards;
    window.renderWeather = renderWeather;
    window.refreshWeather = refreshWeather;
    window.checkWeatherAlerts = checkWeatherAlerts;
    window.updateOverviewWeather = updateOverviewWeather;
    window.getClothingSuggestion = getClothingSuggestion;
    window.applyWeatherDynamic = applyWeatherDynamic;

})();
