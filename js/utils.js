/**
 * js/utils.js - 工具函数模块
 * 包含：日期处理、城市映射、文本解析、链接生成等
 * 行为与 main.js 完全一致
 */
(function() {
    'use strict';

    // ========== XSS 转义 ==========
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ========== 高德地图路线生成 ==========
    function buildAmapRouteUrl(day) {
        var spots = [];
        var spotNames = [];

        if (day.blocks) {
            day.blocks.forEach(function(block) {
                if (block.spots && block.spots.length > 0) {
                    block.spots.forEach(function(spot) {
                        var coords = TravelApp.config.SPOT_COORDS[spot];
                        if (coords && spotNames.indexOf(spot) === -1) {
                            spots.push(coords);
                            spotNames.push(spot);
                        }
                    });
                }
            });
        }

        if (spots.length === 0) return null;

        var accInfo = day.accommodation ? parseAccommodation(day.accommodation) : null;
        var hotelName = accInfo ? accInfo.name : null;
        var enc = encodeURIComponent;

        if (spots.length === 1) {
            var from = spots[0].lon + ',' + spots[0].lat + ',' + enc(spotNames[0]);
            if (hotelName) {
                return 'https://uri.amap.com/navigation?from=' + from + '&to=' + enc(hotelName) + '&coordinate=gaode';
            }
            return 'https://uri.amap.com/navigation?to=' + from + '&coordinate=gaode';
        }

        var from = spots[0].lon + ',' + spots[0].lat + ',' + enc(spotNames[0]);
        var viaParts = spots.slice(1).map(function(s, i) {
            return s.lon + ',' + s.lat + ',' + enc(spotNames[i + 1]);
        });
        var via = viaParts.join(';');

        if (hotelName) {
            return 'https://uri.amap.com/navigation?from=' + from + '&via=' + via + '&to=' + enc(hotelName) + '&coordinate=gaode';
        }
        var last = viaParts.pop();
        var remainingVia = viaParts.length > 0 ? '&via=' + viaParts.join(';') : '';
        return 'https://uri.amap.com/navigation?from=' + from + remainingVia + '&to=' + last + '&coordinate=gaode';
    }

    // ========== 天气工具函数 ==========
    function wmoToText(c) {
        var m = {0:'晴',1:'晴间多云',2:'多云',3:'阴',45:'雾',48:'雾',51:'毛毛雨',53:'毛毛雨',55:'毛毛雨',61:'小雨',63:'中雨',65:'大雨',80:'阵雨',81:'阵雨',95:'雷暴',96:'雷暴',99:'雷暴'};
        return m[c] || '多云';
    }

    function wmoToEmoji(c) {
        var m = {0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',51:'🌧️',53:'🌧️',55:'🌧️',61:'🌦️',63:'🌧️',65:'🌧️',80:'🌦️',81:'🌧️',95:'⛈️',96:'⛈️',99:'⛈️'};
        return m[c] || '🌡️';
    }

    // ========== 日期工具函数 ==========
    function getDateRange(s, e) {
        var a = [], c = new Date(s), ed = new Date(e);
        while (c <= ed) { a.push(c.toISOString().slice(0, 10)); c.setDate(c.getDate() + 1); }
        return a;
    }

    // ========== 城市映射 ==========
    function getCityForDay(dayIdx) {
        return TravelApp.config.dayCity[dayIdx] || { city: 'wuyi', label: '', cityName: '武夷山' };
    }

    function getDayDateKey(dayIdx) {
        var d = new Date(TravelApp.config.TRIP_START);
        d.setDate(d.getDate() + dayIdx);
        return d.toISOString().slice(0, 10);
    }

    // ========== 文本解析函数 ==========
    function getSummaryText(desc) {
        var plain = desc.replace(/<[^>]+>/g, '').replace(/^[⚠️✈️🍜🍽️🎭🚗]+\s*/, '').trim();
        var cleaned = plain.replace(/^\d{1,2}:\d{2}\s*/, '').replace(/^✅\s*已预约\d{1,2}:\d{2}\S*\s*/, '✅ ').trim();
        if (cleaned.length <= 40) return cleaned;
        var m = cleaned.match(/^(.{20,60}[。！？])/);
        if (m) return m[1];
        var end = cleaned.indexOf('。');
        if (end > 0 && end <= 70) return cleaned.slice(0, end + 1);
        return cleaned.slice(0, 40) + '……';
    }

    // ========== 真实评价解析 ==========
    function parseRealReview(str) {
        if (!str) return [];
        var sentences = str.split(/。/).filter(function(s) { return s.trim(); });
        var reviews = [];
        for (var i = 0; i < sentences.length; i++) {
            var s = sentences[i];
            var match = s.match(/[「""]([^」""]+)[」""]/);
            if (match) {
                reviews.push(match[1].trim());
            }
        }
        return reviews.slice(0, 3);
    }

    function buildRealReviewHtml(block) {
        if (!block.realReview) return '';
        var reviews = parseRealReview(block.realReview);
        if (reviews.length === 0) return '';
        var html = '<div class="real-review-block">';
        html += '<div class="real-review-title"><i class="fas fa-comment-dots"></i> 真实评价</div>';
        html += '<div class="real-review-list">';
        reviews.forEach(function(r) {
            html += '<div class="real-review-item">"' + escapeHtml(r) + '"</div>';
        });
        html += '</div></div>';
        return html;
    }

    // ========== 住宿信息解析 ==========
    function parseAccommodation(str) {
        if (!str) return null;
        var openIdx = str.indexOf('（');
        if (openIdx === -1) return { name: str, detail: '' };
        var name = str.slice(0, openIdx).trim();
        var detail = str.slice(openIdx + 1).replace(/）$/, '').trim();
        return { name: name, detail: detail };
    }

    function buildAccommodationHtml(day) {
        if (!day.accommodation) return '';
        var info = parseAccommodation(day.accommodation);
        var mapUrl = 'https://www.amap.com/search?query=' + encodeURIComponent(info.name);
        var html = '<div class="accommodation-block">';
        html += '<div class="accommodation-main">';
        html += '<span class="accommodation-icon">🏨</span>';
        html += '<span class="accommodation-name">' + escapeHtml(info.name) + '</span>';
        html += '<a href="' + mapUrl + '" target="_blank" rel="noopener" class="accommodation-nav" title="在地图中查看"><i class="fas fa-map-marker-alt"></i> 导航</a>';
        html += '</div>';
        if (info.detail) {
            html += '<div class="accommodation-detail">' + escapeHtml(info.detail) + '</div>';
        }
        html += '</div>';
        return html;
    }

    // ========== 链接处理 ==========
    function linkifyDesc(desc, spots) {
        if (!spots || spots.length === 0 || !TravelApp.food.spotMap) return desc;
        var result = desc;
        spots.forEach(function(spot) {
            for (var key in TravelApp.food.spotMap) {
                if (TravelApp.food.spotMap.hasOwnProperty(key)) {
                    var url = TravelApp.food.spotMap[key];
                    if (spot.indexOf(key) !== -1 && result.indexOf(key) !== -1) {
                        result = result.replace(key, '<a href="' + url + '" target="_blank" rel="noopener" class="desc-link">' + key + '</a>');
                        break;
                    }
                }
            }
        });
        return result;
    }

    function buildFoodLinks(spots) {
        if (!spots || spots.length === 0 || !TravelApp.food.spotFoodMap) return '';
        var foods = {};
        spots.forEach(function(spot) {
            for (var key in TravelApp.food.spotFoodMap) {
                if (TravelApp.food.spotFoodMap.hasOwnProperty(key)) {
                    if (spot.indexOf(key) !== -1) {
                        TravelApp.food.spotFoodMap[key].forEach(function(f) { foods[f] = true; });
                    }
                }
            }
        });
        var foodNames = Object.keys(foods);
        if (foodNames.length === 0) return '';
        var links = '';
        foodNames.forEach(function(f) {
            var foodIdx = -1;
            if (typeof foodData !== 'undefined') {
                for (var i = 0; i < foodData.length; i++) {
                    if (foodData[i].name === f) { foodIdx = i; break; }
                }
            }
            if (foodIdx !== -1) links += '<a href="#food-' + foodIdx + '" class="spot-link spot-link-food"><i class="fas fa-utensils"></i> ' + f + '</a>';
        });
        return links ? '<div class="spot-links">' + links + '</div>' : '';
    }

    function renderStars(rating) {
        if (!rating) return '';
        var full = Math.floor(rating);
        var half = rating % 1 >= 0.5 ? 1 : 0;
        var empty = 5 - full - half;
        var stars = '<span class="food-rating">';
        for (var i = 0; i < full; i++) stars += '★';
        if (half) stars += '☆';
        for (var j = 0; j < empty; j++) stars += '☆';
        stars += '<span class="rating-num">' + rating + '</span></span>';
        return stars;
    }

    function getTransportEmoji(transport) {
        if (transport.indexOf('高铁') !== -1 || transport.indexOf('火车') !== -1) return '🚄';
        if (transport.indexOf('打车') !== -1 || transport.indexOf('出租') !== -1) return '🚗';
        if (transport.indexOf('公交') !== -1 || transport.indexOf('观光车') !== -1) return '🚌';
        if (transport.indexOf('步行') !== -1) return '🚶';
        if (transport.indexOf('索道') !== -1) return '🚡';
        return '🚗';
    }

    function getTransportSummary(transport) {
        var match = transport.match(/约(\d+(?:小时|分钟))/);
        return match ? match[1] : null;
    }

    function copyText(el, text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(function() {
                var orig = el.innerHTML;
                el.innerHTML = '<i class="fas fa-check"></i> 已复制';
                el.classList.add('copy-success');
                setTimeout(function() { el.innerHTML = orig; el.classList.remove('copy-success'); }, 1500);
            });
        }
    }

    // ========== 暴露到命名空间 ==========
    window.TravelApp = window.TravelApp || {};
    window.TravelApp.utils = {
        escapeHtml: escapeHtml,
        buildAmapRouteUrl: buildAmapRouteUrl,
        wmoToText: wmoToText,
        wmoToEmoji: wmoToEmoji,
        getDateRange: getDateRange,
        getCityForDay: getCityForDay,
        getDayDateKey: getDayDateKey,
        getSummaryText: getSummaryText,
        parseRealReview: parseRealReview,
        buildRealReviewHtml: buildRealReviewHtml,
        parseAccommodation: parseAccommodation,
        buildAccommodationHtml: buildAccommodationHtml,
        linkifyDesc: linkifyDesc,
        buildFoodLinks: buildFoodLinks,
        renderStars: renderStars,
        getTransportEmoji: getTransportEmoji,
        getTransportSummary: getTransportSummary,
        copyText: copyText
    };

    // ========== 全局转发函数（保持兼容） ==========
    window.escapeHtml = escapeHtml;
    window.buildAmapRouteUrl = buildAmapRouteUrl;
    window.wmoToText = wmoToText;
    window.wmoToEmoji = wmoToEmoji;
    window.getDateRange = getDateRange;
    window.getCityForDay = getCityForDay;
    window.getDayDateKey = getDayDateKey;
    window.getSummaryText = getSummaryText;
    window.parseRealReview = parseRealReview;
    window.buildRealReviewHtml = buildRealReviewHtml;
    window.parseAccommodation = parseAccommodation;
    window.buildAccommodationHtml = buildAccommodationHtml;
    window.linkifyDesc = linkifyDesc;
    window.buildFoodLinks = buildFoodLinks;
    window.renderStars = renderStars;
    window.getTransportEmoji = getTransportEmoji;
    window.getTransportSummary = getTransportSummary;
    window.copyText = copyText;

})();
