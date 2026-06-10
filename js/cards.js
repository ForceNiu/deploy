/**
 * js/cards.js - 卡片渲染模块
 * 包含：每日卡片、美食、伴手礼、门票、清单
 * 行为与 main.js 完全一致
 */
(function() {
    'use strict';

    // ========== 辅助函数 ==========
    function getFirstActivityTime(blocks) {
        for (var i = 0; i < blocks.length; i++) {
            var block = blocks[i];
            if (block.type !== 'meal' && block.time) {
                var match = block.time.match(/(\d{1,2}:\d{2})/);
                return match ? match[1] : null;
            }
        }
        return null;
    }

    function getBlockSemanticClass(block) {
        if (block.rainPlan) return 'semantic-rain';
        if (block.meal) return 'semantic-food';
        if (block.note && (block.note.indexOf('购票') !== -1 || block.note.indexOf('预约') !== -1 || block.note.indexOf('提前') !== -1)) return 'semantic-ticket';
        if (block.time && (block.time.indexOf('出发') !== -1 || block.time.indexOf('凌晨') !== -1 || block.time.indexOf('日出') !== -1)) return 'semantic-time';
        return '';
    }

    function buildBlockWeatherBadge(wData) {
        if (!wData) return '';
        var emoji = wmoToEmoji(wData.code);
        var temp = Math.round(wData.tmin) + '~' + Math.round(wData.tmax) + '°';
        var badge = '<span class="block-weather-badge">' + emoji + ' ' + temp;
        if (wData.precip !== null && wData.precip >= 30) {
            badge += ' <span class="block-rain-indicator">💧' + wData.precip + '%</span>';
        }
        badge += '</span>';
        return badge;
    }

    function buildIntensityBar(level) {
        var html = '<div class="intensity-bar">';
        for (var i = 1; i <= 3; i++) html += '<div class="intensity-dot ' + (i <= level ? 'active' : '') + '"></div>';
        html += '</div>';
        return html;
    }

    function isRainyDay(dayIdx) {
        var info = getCityForDay(dayIdx);
        if (info.city === 'move') return false;
        var dateKey = getDayDateKey(dayIdx);
        var wData = TravelApp.weather.data[info.city] && TravelApp.weather.data[info.city][dateKey];
        if (!wData) return false;
        return (wData.precip !== null && wData.precip >= 50) ||
               [51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].indexOf(wData.code) !== -1;
    }

    function buildRainAlertHtml(day, dayIdx) {
        if (!isRainyDay(dayIdx)) return '';
        var rainPlans = [];
        day.blocks.forEach(function(block, blockIdx) {
            if (block.rainPlan) {
                rainPlans.push({
                    time: block.time,
                    title: block.desc ? block.desc.split('。')[0].slice(0, 20) : '',
                    plan: block.rainPlan,
                    blockIdx: blockIdx
                });
            }
        });
        if (rainPlans.length === 0) return '';

        var cardsHtml = '';
        rainPlans.forEach(function(item) {
            cardsHtml += '<div class="rain-card-item">' +
                '<div class="rain-card-time">' + item.time + '</div>' +
                '<div class="rain-card-title">' + item.title + '</div>' +
                '<div class="rain-card-plan">' + item.plan + '</div>' +
                '</div>';
        });

        return '<div class="rain-alert-block" id="rain-alert-' + dayIdx + '">' +
            '<div class="rain-alert-bar" onclick="toggleRainAlert(' + dayIdx + ')">' +
            '<div class="rain-alert-left"><i class="fas fa-cloud-rain"></i><span>今日有雨，点击查看备选方案</span></div>' +
            '<i class="fas fa-chevron-down rain-alert-icon"></i>' +
            '</div>' +
            '<div class="rain-alert-content">' + cardsHtml + '</div>' +
            '</div>';
    }

    function toggleRainAlert(dayIdx) {
        var block = document.getElementById('rain-alert-' + dayIdx);
        if (!block) return;
        block.classList.toggle('rain-alert-expanded');
    }

    // ========== Checklist ==========
    function getChecklistState() {
        try { return JSON.parse(localStorage.getItem(TravelApp.config.CHECKLIST_KEY)) || {}; } catch(e) { return {}; }
    }

    function saveChecklistState(name, checked) {
        var state = getChecklistState();
        if (checked) state[name] = true; else delete state[name];
        localStorage.setItem(TravelApp.config.CHECKLIST_KEY, JSON.stringify(state));
    }

    function buildDayChecklist(dayIdx) {
        if (typeof packingItems === 'undefined') return '';
        var essentialItems = packingItems.filter(function(i) { return i.essential; });
        if (essentialItems.length === 0) return '';

        var startIdx = (dayIdx * 3) % essentialItems.length;
        var dayItems = [];
        for (var i = 0; i < Math.min(4, essentialItems.length); i++) {
            dayItems.push(essentialItems[(startIdx + i) % essentialItems.length]);
        }

        var savedState = getChecklistState();
        var itemsHtml = dayItems.map(function(item) {
            var checked = savedState[item.name] ? ' checked' : '';
            var icon = savedState[item.name] ? 'fa-check-square' : 'fa-square';
            var safeName = escapeHtml(item.name);
            return '<span class="check-item' + checked + '" data-name="' + safeName + '" onclick="toggleCheckItem(this)"><i class="far ' + icon + '"></i> ' + safeName + '</span>';
        }).join('');

        return '<div class="day-checklist"><div class="checklist-label"><i class="fas fa-check-square"></i> 今日提醒</div><div class="checklist-items">' + itemsHtml + '</div></div>';
    }

    function toggleCheckItem(el) {
        var name = el.dataset.name;
        var isChecked = el.classList.toggle('checked');
        var icon = el.querySelector('i');
        icon.className = isChecked ? 'far fa-check-square' : 'far fa-square';
        saveChecklistState(name, isChecked);
    }

    function buildDayFoodSection(city) {
        if (!window.foodData || city === 'move') return '';
        var regionMap = { 'wuyi': 'wuyi', 'lushan': 'lushan', 'jiujiang': 'jiujiang' };
        var region = regionMap[city];
        if (!region) return '';

        var cityFoods = window.foodData.filter(function(f) { return f.region === region; }).slice(0, 4);
        if (cityFoods.length === 0) return '';

        var cardsHtml = cityFoods.map(function(food) {
            var descShort = getSummaryText(food.desc);
            var tagsHtml = food.tags ? food.tags.slice(0, 2).map(function(t) { return '<span class="mini-food-tag">' + t + '</span>'; }).join('') : '';
            var navHtml = food.mapUrl ? '<a href="' + food.mapUrl + '" target="_blank" rel="noopener" class="mini-food-nav"><i class="fas fa-location-arrow"></i> 导航</a>' : '';
            var priceHtml = food.priceRange ? '<span class="mini-food-price">' + food.priceRange + '</span>' : '';
            return '<div class="day-food-mini-card">' +
                '<div class="mini-food-name">' + escapeHtml(food.name) + priceHtml + '</div>' +
                '<div class="mini-food-desc">' + escapeHtml(descShort) + '</div>' +
                '<div class="mini-food-bottom">' + tagsHtml + navHtml + '</div>' +
                '</div>';
        }).join('');

        return '<div class="day-food-section"><div class="section-label"><i class="fas fa-utensils"></i> 今日推荐</div><div class="day-food-mini-grid">' + cardsHtml + '</div></div>';
    }

    function buildActionBtns(block) {
        var btns = '';
        if (block.transport && block.transport.indexOf('打车') !== -1) {
            btns += '<span class="action-btn touchable" onclick="copyText(this,\'' + block.transport.replace(/'/g, "\\'") + '\')"><i class="fas fa-copy"></i> 复制交通</span>';
        }
        return btns ? '<div class="action-btns">' + btns + '</div>' : '';
    }

    function buildNextDayPreview(dayIdx) {
        var nextIdx = dayIdx + 1;
        if (nextIdx >= window.dailyData.length) return '';
        var nextDay = window.dailyData[nextIdx];
        var nextInfo = getCityForDay(nextIdx);
        var nextTime = getFirstActivityTime(nextDay.blocks);

        var detail = '';
        if (nextTime) detail += nextTime + ' 出发 · ';
        detail += nextDay.dayTitle;

        var ticketHtml = '';
        nextDay.blocks.forEach(function(block) {
            if (block.desc && (block.desc.indexOf('竹筏') !== -1 || block.desc.indexOf('购票') !== -1 || block.desc.indexOf('提前预约') !== -1)) {
                ticketHtml = '<div class="preview-ticket"><i class="fas fa-ticket-alt"></i> 需提前购票</div>';
            }
        });

        return '<div class="next-day-preview" onclick="document.getElementById(\'day-' + nextIdx + '\').scrollIntoView({behavior:\'smooth\',block:\'start\'})">' +
            '<div class="preview-header"><i class="fas fa-forward"></i> 明天：' + nextDay.date.slice(0, 5) + ' · ' + nextInfo.cityName + '</div>' +
            '<div class="preview-detail">' + detail + '</div>' +
            ticketHtml +
            '</div>';
    }

    // ========== 构建每日卡片（L0/L1/L2 三层） ==========
    function buildDailyCards() {
        var container = document.getElementById('dailyCards');
        var html = '';

        var now = new Date();
        var startDate = new Date(TravelApp.config.TRIP_START + 'T00:00:00');
        var endDate = new Date(TravelApp.config.TRIP_END + 'T23:59:59');
        var todayIdx = -1;
        if (now >= startDate && now <= endDate) {
            todayIdx = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
        }

        window.dailyData.forEach(function(day, idx) {
            var info = getCityForDay(idx);
            var dateKey = getDayDateKey(idx);
            var isToday = idx === todayIdx;
            var isCollapsed = !isToday;

            // === L0 概览层 ===
            var blockCount = day.blocks.filter(function(b) { return b.type !== 'meal'; }).length;
            var overviewHtml = '<div class="day-overview">';
            overviewHtml += '<div class="day-overview-line">';
            overviewHtml += '<span class="overview-weather" id="overview-weather-' + idx + '"></span>';
            overviewHtml += '</div>';
            overviewHtml += '<div class="day-overview-line">';
            overviewHtml += '<span class="clothing-suggestion" id="clothing-' + idx + '"></span>';
            overviewHtml += '</div>';
            overviewHtml += '</div>';

            // === 时间块（L1 摘要 + L2 详情）===
            var wData = (info.city !== 'move' && TravelApp.weather.data[info.city]) ? TravelApp.weather.data[info.city][dateKey] : null;
            var blocksHtml = '';
            day.blocks.forEach(function(block, blockIdx) {
                var semanticClass = getBlockSemanticClass(block);
                var descHtml = linkifyDesc(block.desc, block.spots);
                var foodLinksHtml = buildFoodLinks(block.spots);

                // L2 详情内容
                var detailHtml = '';
                var plainLen = block.desc.replace(/<[^>]+>/g, '').length;
                if (plainLen > 80) {
                    detailHtml += '<div class="text-clamp" id="clamp-' + idx + '-' + blockIdx + '">' + descHtml + '</div><span class="expand-text-btn" onclick="toggleClamp(' + idx + ',' + blockIdx + ')">展开全文</span>';
                } else {
                    detailHtml += descHtml;
                }

                detailHtml += foodLinksHtml;

                if (block.meal) {
                    detailHtml += '<div class="meal-rec"><i class="fas fa-utensils"></i> ' + block.meal + '</div>';
                }

                // 行动按钮
                detailHtml += buildActionBtns(block);

                // 注意事项
                if (block.note) {
                    detailHtml += '<div class="attention-note"><i class="fas fa-exclamation-triangle" style="margin-right:0.3rem;"></i>' + escapeHtml(block.note) + '</div>';
                }

                // Tips分组
                if (block.tips && block.tips.length > 0) {
                    var groups = '';
                    block.tips.forEach(function(g) {
                        var items = g.items.map(function(t) { return '<li>' + t + '</li>'; }).join('');
                        groups += '<div class="tips-group"><div class="tips-group-title"><i class="' + g.icon + '"></i>' + g.category + '</div><ul class="tips-list">' + items + '</ul></div>';
                    });
                    detailHtml += '<div class="tips-container">' + groups + '</div>';
                }

                // 交通
                if (block.transport) {
                    detailHtml += '<div class="transport-info"><i class="fas fa-route" style="margin-right:0.3rem;"></i><strong>交通：</strong>' + block.transport + '</div>';
                }

                // 雨天备选
                if (block.rainPlan) {
                    detailHtml += '<div class="rain-plan"><i class="fas fa-cloud-rain"></i><span><strong>雨天备选：</strong>' + block.rainPlan + '</span></div>';
                }

                // 真实评价
                detailHtml += buildRealReviewHtml(block);

                // 组装时间块
                var weatherBadge = buildBlockWeatherBadge(wData);
                var transportSummary = block.transport ? getTransportSummary(block.transport) : null;
                var transportBadge = transportSummary ?
                    '<div class="transport-badge">' + getTransportEmoji(block.transport) + ' ' + transportSummary + '</div>' : '';
                if (block.type === 'meal') {
                    blocksHtml += '<div class="time-block meal-block ' + semanticClass + '"><div class="time-title">' + block.time + weatherBadge + '</div><div class="time-desc">' + detailHtml + '</div></div>';
                } else {
                    var summary = getSummaryText(block.desc);
                    var durationHtml = block.duration ? '<div class="time-duration"><i class="fas fa-clock"></i> ' + block.duration + '</div>' : '';
                    blocksHtml += '<div class="time-block ' + semanticClass + '" id="block-' + idx + '-' + blockIdx + '">' +
                        '<div class="time-title-row"><div class="time-title">' + block.time + weatherBadge + transportBadge + '</div>' + durationHtml + '</div>' +
                        '<div class="time-summary" onclick="toggleBlock(' + idx + ',' + blockIdx + ')"><i class="fas fa-chevron-right expand-icon"></i><span>' + summary + '</span><span class="expand-hint"><span class="expand-hint-text">展开</span><span class="collapse-hint-text">收起</span></span></div>' +
                        '<div class="time-detail">' + detailHtml + '</div>' +
                        '</div>';
                }
            });

            // === 今日Checklist ===
            var dayChecklistHtml = buildDayChecklist(idx);

            // === 今日美食推荐 ===
            var dayFoodHtml = buildDayFoodSection(info.city);

            // === 次日预告 ===
            var nextDayHtml = buildNextDayPreview(idx);

            // === 住宿信息 ===
            var accommodationHtml = buildAccommodationHtml(day);

            // === 雨天备选提示条 ===
            var rainAlertHtml = buildRainAlertHtml(day, idx);

            // === 高德地图路线按钮 ===
            var routeUrl = buildAmapRouteUrl(day);
            var routeBtnHtml = routeUrl ? '<div class="route-btn-block"><a href="' + routeUrl + '" target="_blank" rel="noopener" class="route-btn"><i class="fas fa-route"></i> 查看当日路线</a></div>' : '';

            // === 组装Day Card ===
            var cardClass = 'day-card touchable fade-in-up' + (isToday ? ' today' : '') + (isCollapsed ? ' collapsed' : '');
            var headerDate = day.date.slice(0, 5);
            var statsHtml = [];
            if (blockCount > 0) statsHtml.push('📍' + blockCount + '景点');
            if (day.walkDistance) statsHtml.push('🚶' + day.walkDistance);
            var statsSpan = statsHtml.length ? '<span class="header-stats">' + statsHtml.join(' · ') + '</span>' : '';
            html += '<div class="' + cardClass + '" id="day-' + idx + '">' +
                '<div class="day-header" onclick="toggleDay(' + idx + ')">' +
                '<div class="day-header-left"><i class="far fa-calendar-alt"></i><span>' + headerDate + ' · ' + day.dayTitle + '</span></div>' +
                '<div style="display:flex; align-items:center; gap:0.5rem;">' + statsSpan + '<i class="fas fa-chevron-down collapse-icon"></i></div>' +
                '</div>' +
                '<div class="day-body">' +
                overviewHtml +
                accommodationHtml +
                rainAlertHtml +
                routeBtnHtml +
                dayChecklistHtml +
                blocksHtml +
                dayFoodHtml +
                nextDayHtml +
                '</div></div>';
        });

        container.innerHTML = html;
        observeCards();
    }

    // ========== 美食独立模块 ==========
    function buildFoodGrid() {
        var container = document.getElementById('foodGrid');
        var html = '';
        window.foodData.forEach(function(food, idx) {
            if (TravelApp.food.filter !== 'all' && food.region !== TravelApp.food.filter) return;
            if (TravelApp.food.typeFilter !== 'all' && food.type !== TravelApp.food.typeFilter) return;
            var tagsHtml = food.tags.map(function(t) { return '<span class="food-tag">' + t + '</span>'; }).join('');
            var mapHtml = food.mapUrl ? '<a href="' + food.mapUrl + '" target="_blank" rel="noopener" class="food-nav-btn"><i class="fas fa-location-arrow"></i> 导航去店铺</a>' : '';
            var ratingHtml = renderStars(food.rating);
            var priceHtml = food.priceRange ? '<span class="food-price">' + food.priceRange + '</span>' : '';
            html += '<div class="food-card touchable fade-in-up" id="food-' + idx + '"><div class="food-info"><div class="food-name-row"><span class="food-name">' + escapeHtml(food.name) + '</span>' + ratingHtml + priceHtml + '</div><div class="food-location"><i class="fas fa-map-marker-alt"></i>' + escapeHtml(food.location) + '</div><div class="food-desc">' + escapeHtml(food.desc) + '</div><div class="food-tags">' + tagsHtml + '</div>' + mapHtml + '</div></div>';
        });
        container.innerHTML = html || '<div class="empty-state-text">暂无该类型美食数据</div>';
        observeCards();
    }

    // ========== 伴手礼独立模块 ==========
    function buildGiftGrid() {
        var container = document.getElementById('giftGrid');
        var html = '';
        window.giftData.forEach(function(gift) {
            if (currentGiftFilter !== 'all' && gift.region !== currentGiftFilter) return;
            var regionClass = 'gift-' + gift.region;
            var icon = gift.region === 'wuyi' ? '🍃' : gift.region === 'lushan' ? '🏔️' : '🏙️';
            var tagsHtml = gift.tags.map(function(t) { return '<span class="gift-tag gift-tag-' + t.type + '">' + t.text + '</span>'; }).join('');
            html += '<div class="gift-card touchable fade-in-up"><div class="gift-header"><div class="gift-icon ' + regionClass + '">' + icon + '</div><div class="gift-name">' + gift.name + '</div><span class="gift-city">' + gift.city + '</span></div><div class="gift-desc">' + gift.desc + '</div><div class="gift-footer"><div>' + tagsHtml + '</div><div class="gift-price">' + gift.price + '</div></div><div class="gift-where"><i class="fas fa-store" style="margin-right:0.3rem;"></i>' + gift.where + '</div></div>';
        });
        container.innerHTML = html || '<div class="empty-state-text">暂无该城市伴手礼数据</div>';
        observeCards();
    }

    // ========== 购票提醒 ==========
    function buildTicketTips() {
        document.getElementById('ticketTips').innerHTML = '' +
            '<div class="ticket-item"><span class="ticket-label">🎟️ 九曲溪竹筏</span><span class="ticket-desc">"武夷山旅游"小程序提前3-7天抢票，130元/人，早场最佳。</span></div>' +
            '<div class="ticket-item"><span class="ticket-label">🎫 庐山大门票</span><span class="ticket-desc">160元，索道65元，"一机游庐山"小程序购，观光车70元/7天。</span></div>' +
            '<div class="ticket-item"><span class="ticket-label">🚞 三叠泉小火车</span><span class="ticket-desc">现场80元往返，建议上午早去。</span></div>';
    }

    // ========== 门票价格汇总 ==========
    function buildPriceSummary() {
        var prices = window._prices || [];
        var el = document.getElementById('priceSummary');

        if (!prices.length) {
            el.innerHTML = '<div class="price-error"><p>⚠️ 门票数据加载失败</p><button onclick="location.reload()" class="retry-btn">🔄 刷新页面</button></div>';
            return;
        }

        var total = prices.reduce(function(s, p) { return s + p.price; }, 0);
        var sceneryTotal = prices.filter(function(p) { return p.type === '景区'; }).reduce(function(s, p) { return s + p.price; }, 0);
        var spotTotal = prices.filter(function(p) { return p.type === '景点'; }).reduce(function(s, p) { return s + p.price; }, 0);
        var html = '<table class="price-table"><thead><tr><th>项目</th><th>价格</th><th>购票渠道</th></tr></thead><tbody>';
        prices.forEach(function(p) {
            var noteHtml = p.note ? '<span class="price-note">' + p.note + '</span>' : '';
            html += '<tr><td>' + p.item + noteHtml + '</td><td><span class="price-tag">¥' + p.price + '</span></td><td><span class="price-channel">' + p.channel + '</span></td></tr>';
        });
        html += '<tr class="price-subtotal"><td>景区门票+交通</td><td><span class="price-tag">¥' + sceneryTotal + '</span></td><td></td></tr>';
        html += '<tr class="price-subtotal"><td>景点门票</td><td><span class="price-tag">¥' + spotTotal + '</span></td><td></td></tr>';
        html += '<tr class="price-total"><td>合计</td><td><span class="price-tag">¥' + total + '</span></td><td>不含餐饮住宿</td></tr></tbody></table>';
        el.innerHTML = html;
    }

    // ========== 清单渲染（主清单页） ==========
    function renderPackingChecklist() {
        var categoryMap = {
            "防雨": { title: "🌂 防雨装备", icon: "fa-umbrella" },
            "登山": { title: "🥾 登山装备", icon: "fa-hiking" },
            "衣物": { title: "👕 衣物", icon: "fa-tshirt" },
            "药品": { title: "💊 健康药品", icon: "fa-capsules" },
            "其他": { title: "🦟 驱蚊防晒 & 其他", icon: "fa-bug" }
        };
        var savedState = getChecklistState();
        var html = '';
        var cats = ["防雨", "登山", "衣物", "药品", "其他"];
        for (var c = 0; c < cats.length; c++) {
            var cat = cats[c];
            var catItems = packingItems.filter(function(i) { return i.category === cat; });
            if (catItems.length === 0) continue;
            html += '<div class="checklist-category"><div class="checklist-title"><i class="fas ' + categoryMap[cat].icon + '"></i> ' + categoryMap[cat].title + '</div><ul class="checklist">';
            catItems.forEach(function(item) {
                var cls = item.essential ? 'essential' : '';
                var checked = savedState[item.name];
                var icon = checked ? 'fa-check-square' : (item.essential ? 'fa-star' : 'fa-check-circle');
                var checkedCls = checked ? ' checked' : '';
                var safeName = escapeHtml(item.name);
                html += '<li class="' + cls + checkedCls + '" data-name="' + safeName + '" onclick="togglePackItem(this)"><i class="fas ' + icon + '"></i> ' + safeName + '</li>';
            });
            html += '</ul></div>';
        }
        document.getElementById('packingListCheck').innerHTML = html;
    }

    function togglePackItem(el) {
        var name = el.dataset.name;
        var isChecked = el.classList.toggle('checked');
        var icon = el.querySelector('i');
        var isEssential = el.classList.contains('essential');
        icon.className = isChecked ? 'fas fa-check-square' : (isEssential ? 'fas fa-star' : 'fas fa-check-circle');
        saveChecklistState(name, isChecked);
    }

    // ========== Tab计数更新 ==========
    function updateTabCounts() {
        var foodCounts = { all: window.foodData.length, wuyi: 0, lushan: 0, jiujiang: 0 };
        window.foodData.forEach(function(f) { if (foodCounts[f.region] !== undefined) foodCounts[f.region]++; });
        document.querySelectorAll('#foodTabs .food-tab').forEach(function(tab) {
            var city = tab.dataset.city;
            var count = foodCounts[city] || 0;
            var countEl = tab.querySelector('.tab-count');
            if (!countEl) { countEl = document.createElement('span'); countEl.className = 'tab-count'; tab.appendChild(countEl); }
            countEl.textContent = count;
        });
        var giftCounts = { all: window.giftData.length, wuyi: 0, lushan: 0, jiujiang: 0 };
        window.giftData.forEach(function(g) { if (giftCounts[g.region] !== undefined) giftCounts[g.region]++; });
        document.querySelectorAll('#giftTabs .gift-tab').forEach(function(tab) {
            var city = tab.dataset.city;
            var count = giftCounts[city] || 0;
            var countEl = tab.querySelector('.tab-count');
            if (!countEl) { countEl = document.createElement('span'); countEl.className = 'tab-count'; tab.appendChild(countEl); }
            countEl.textContent = count;
        });
    }

    // ========== Tab 切换事件 ==========
    document.getElementById('foodTabs').addEventListener('click', function(e) {
        var tab = e.target.closest('.food-tab');
        if (!tab) return;
        document.querySelectorAll('.food-tab').forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
        TravelApp.food.filter = tab.dataset.city;
        buildFoodGrid();
    });

    document.getElementById('foodTypeFilters').addEventListener('click', function(e) {
        var pill = e.target.closest('.food-type-pill');
        if (!pill) return;
        document.querySelectorAll('.food-type-pill').forEach(function(p) { p.classList.remove('active'); });
        pill.classList.add('active');
        TravelApp.food.typeFilter = pill.dataset.type;
        buildFoodGrid();
    });

    document.getElementById('giftTabs').addEventListener('click', function(e) {
        var tab = e.target.closest('.gift-tab');
        if (!tab) return;
        document.querySelectorAll('.gift-tab').forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
        currentGiftFilter = tab.dataset.city;
        buildGiftGrid();
    });

    // ========== 暴露到命名空间 ==========
    window.TravelApp = window.TravelApp || {};
    window.TravelApp.cards = {
        buildDaily: buildDailyCards,
        buildFoodGrid: buildFoodGrid,
        buildGiftGrid: buildGiftGrid,
        buildPriceSummary: buildPriceSummary,
        buildTicketTips: buildTicketTips,
        renderPackingChecklist: renderPackingChecklist,
        updateTabCounts: updateTabCounts
    };

    // ========== 全局转发函数（保持兼容） ==========
    window.buildDailyCards = buildDailyCards;
    window.buildFoodGrid = buildFoodGrid;
    window.buildGiftGrid = buildGiftGrid;
    window.buildPriceSummary = buildPriceSummary;
    window.buildTicketTips = buildTicketTips;
    window.toggleCheckItem = toggleCheckItem;
    window.toggleRainAlert = toggleRainAlert;
    window.buildDayChecklist = buildDayChecklist;
    window.renderPackingChecklist = renderPackingChecklist;
    window.togglePackItem = togglePackItem;
    window.updateTabCounts = updateTabCounts;

})();
