/**
 * js/nav.js - 导航交互模块
 * 包含：导航栏、滚动、折叠、动画、触控反馈、底部浮窗
 * 行为与 main.js 完全一致
 */
(function() {
    'use strict';

    // ========== 交互函数 ==========
    function toggleDay(idx) {
        var card = document.getElementById('day-' + idx);
        if (!card) return;
        card.classList.toggle('collapsed');
        var isCollapsed = card.classList.contains('collapsed');
        var header = card.querySelector('.day-header');
        var body = card.querySelector('.day-body');
        if (header) header.setAttribute('aria-expanded', !isCollapsed);
        if (body) body.setAttribute('aria-hidden', isCollapsed);
    }

    function toggleBlock(dayIdx, blockIdx) {
        var block = document.getElementById('block-' + dayIdx + '-' + blockIdx);
        if (!block) return;
        var detail = block.querySelector('.time-detail');
        if (!detail) { block.classList.toggle('expanded'); return; }
        if (block.classList.contains('expanded')) {
            detail.style.maxHeight = detail.scrollHeight + 'px';
            requestAnimationFrame(function() { detail.style.maxHeight = '0px'; });
            block.classList.remove('expanded');
        } else {
            block.classList.add('expanded');
            detail.style.maxHeight = detail.scrollHeight + 'px';
        }
    }

    function collapseAllBlocks(dayIdx) {
        var dayCard = document.getElementById('day-' + dayIdx);
        if (!dayCard) return;
        dayCard.querySelectorAll('.time-block.expanded').forEach(function(b) { b.classList.remove('expanded'); });
    }

    function toggleClamp(dayIdx, blockIdx) {
        var clamp = document.getElementById('clamp-' + dayIdx + '-' + blockIdx);
        if (!clamp) return;
        clamp.classList.toggle('expanded');
        var btn = clamp.nextElementSibling;
        if (btn) btn.textContent = clamp.classList.contains('expanded') ? '收起' : '展开全文';
    }

    // ========== 折叠无障碍 ==========
    function setupSectionAccessibility() {
        document.querySelectorAll('.section-title').forEach(function(title) {
            var content = title.nextElementSibling;
            if (content && content.classList.contains('section-content')) {
                var isCollapsed = content.classList.contains('collapsed');
                title.setAttribute('role', 'button');
                title.setAttribute('tabindex', '0');
                title.setAttribute('aria-expanded', !isCollapsed);
                content.setAttribute('aria-hidden', isCollapsed);
                title.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleSection(title);
                    }
                });
            }
        });
        document.querySelectorAll('.day-card').forEach(function(card) {
            var isCollapsed = card.classList.contains('collapsed');
            var header = card.querySelector('.day-header');
            var body = card.querySelector('.day-body');
            if (header) {
                header.setAttribute('role', 'button');
                header.setAttribute('tabindex', '0');
                header.setAttribute('aria-expanded', !isCollapsed);
                header.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        var idx = card.id.replace('day-', '');
                        toggleDay(idx);
                    }
                });
            }
            if (body) body.setAttribute('aria-hidden', isCollapsed);
        });
    }

    function toggleSection(titleEl) {
        titleEl.classList.toggle('collapsed');
        var content = titleEl.nextElementSibling;
        if (content && content.classList.contains('section-content')) {
            content.classList.toggle('collapsed');
            var isCollapsed = content.classList.contains('collapsed');
            titleEl.setAttribute('aria-expanded', !isCollapsed);
            content.setAttribute('aria-hidden', isCollapsed);
        }
    }

    // ========== 智能定位 ==========
    function scrollToToday() {
        var now = new Date();
        var startDate = new Date(TravelApp.config.TRIP_START + 'T00:00:00');
        var endDate = new Date(TravelApp.config.TRIP_END + 'T23:59:59');
        if (now >= startDate && now <= endDate) {
            var dayIdx = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
            var targetCard = document.getElementById('day-' + dayIdx);
            if (targetCard) {
                setTimeout(function() {
                    targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 500);
            }
        }
    }

    // ========== 快捷导航跳转（联动展开） ==========
    function scrollToSection(section) {
        var sectionMap = { 'weather': '行程天气', 'daily': '每日行程', 'food': '必吃美食', 'gift': '伴手礼', 'ticket': '门票价格', 'checklist': '雨季行装' };
        var title = sectionMap[section];
        if (!title) return;
        var titles = document.querySelectorAll('.section-title');
        for (var i = 0; i < titles.length; i++) {
            var el = titles[i];
            if (el.textContent.indexOf(title) !== -1) {
                if (el.classList.contains('collapsed')) {
                    el.classList.remove('collapsed');
                    var content = el.nextElementSibling;
                    if (content && content.classList.contains('section-content')) {
                        content.classList.remove('collapsed');
                    }
                }
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                break;
            }
        }
    }

    // ========== 出发倒计时 ==========
    function updateCountdown() {
        var container = document.getElementById('countdown');
        if (!container) return;

        var now = new Date();
        var startDate = new Date(TravelApp.config.TRIP_START + 'T00:00:00');
        var endDate = new Date(TravelApp.config.TRIP_END + 'T23:59:59');
        var diffStart = startDate - now;
        var diffEnd = now - endDate;

        var html = '';
        var phase = '';

        if (diffStart > 0) {
            var days = Math.ceil(diffStart / (1000 * 60 * 60 * 24));
            var hours = Math.floor((diffStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            phase = 'before';
            if (days <= 1) {
                html = '<span class="countdown-text">距出发还有</span><span class="countdown-number" data-phase="' + phase + '">' + hours + '</span><span class="countdown-unit">小时</span>';
            } else {
                html = '<span class="countdown-text">距出发还有</span><span class="countdown-number" data-phase="' + phase + '">' + days + '</span><span class="countdown-unit">天</span>';
            }
        } else if (diffEnd <= 0) {
            var dayIdx = Math.floor((now - startDate) / (1000 * 60 * 60 * 24)) + 1;
            var totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
            var daysLeft = totalDays - dayIdx;
            var hoursLeft = Math.floor((endDate - now) / (1000 * 60 * 60));

            if (daysLeft <= 0) {
                phase = 'last-hours';
                html = '<span class="countdown-text">旅途最后一天</span><span class="countdown-number" data-phase="' + phase + '">' + hoursLeft + '</span><span class="countdown-unit">小时</span>';
            } else if (daysLeft <= 2) {
                phase = 'last-days';
                html = '<span class="countdown-text">旅途第</span><span class="countdown-number" data-phase="' + phase + '">' + dayIdx + '</span><span class="countdown-unit">天</span><span class="countdown-text">· 剩余</span><span class="countdown-number" data-phase="' + phase + '">' + daysLeft + '</span><span class="countdown-unit">天</span>';
            } else {
                phase = 'traveling';
                html = '<span class="countdown-text">旅途第</span><span class="countdown-number" data-phase="' + phase + '" data-day="' + dayIdx + '">' + dayIdx + '</span><span class="countdown-unit">天</span>';
            }
        } else {
            var daysAfter = Math.floor(diffEnd / (1000 * 60 * 60 * 24));
            if (daysAfter <= 10) {
                phase = 'after';
                html = '<span class="countdown-text">旅程结束</span><span class="countdown-number" data-phase="' + phase + '">' + daysAfter + '</span><span class="countdown-unit">天</span>';
            }
        }

        container.innerHTML = html;
        container.className = 'countdown' + (phase ? ' countdown-' + phase : '');
    }

    // ========== 导航（顶部） ==========
    function buildNav() {
        var nav = document.getElementById('navLinks');
        var links = '';
        window.window.dailyData.forEach(function(day, idx) {
            var info = getCityForDay(idx);
            links += '<a href="#day-' + idx + '" class="nav-link" data-idx="' + idx + '" aria-label="第' + (idx + 1) + '天 ' + info.cityName + ' ' + day.date.slice(0, 5) + '"><span class="city-dot city-' + info.city + '"></span><span>' + day.date.slice(0, 5) + '</span></a>';
        });
        nav.innerHTML = links;
    }

    function updateNavHighlight() {
        var cards = document.querySelectorAll('.day-card');
        var navLinks = document.querySelectorAll('.nav-link');
        var scrollTop = window.scrollY;
        var offset = 150;
        var lastCard = cards[cards.length - 1];
        var lastCardBottom = lastCard ? lastCard.getBoundingClientRect().bottom + window.scrollY : 0;
        var currentIdx = -1;
        cards.forEach(function(card, idx) {
            var rect = card.getBoundingClientRect();
            if (rect.top <= offset + 20) currentIdx = idx;
        });
        if (currentIdx === -1 || scrollTop < 200 || scrollTop + window.innerHeight > lastCardBottom + 100) {
            navLinks.forEach(function(link) { link.classList.remove('active'); });
            return;
        }
        navLinks.forEach(function(link, idx) { link.classList.toggle('active', idx === currentIdx); });
        var activeLink = navLinks[currentIdx];
        if (activeLink) activeLink.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        updateBottomNav(currentIdx);
    }

    // ========== 底部日期浮窗 ==========
    var currentVisibleDay = 0;

    function updateBottomNav(dayIdx) {
        if (dayIdx < 0 || dayIdx >= window.dailyData.length) return;
        currentVisibleDay = dayIdx;
        var day = window.dailyData[dayIdx];
        document.getElementById('navDayInfo').textContent = 'Day ' + (dayIdx + 1) + ' · ' + day.date;
        document.getElementById('navCity').textContent = '';
        document.getElementById('navPrev').disabled = dayIdx === 0;
        document.getElementById('navNext').disabled = dayIdx === window.dailyData.length - 1;
    }

    function setupBottomNav() {
        var prevBtn = document.getElementById('navPrev');
        var nextBtn = document.getElementById('navNext');
        var topBtn = document.getElementById('navTopBtn');
        var bottomNav = document.getElementById('bottomDateNav');

        prevBtn.addEventListener('click', function() {
            if (currentVisibleDay > 0) {
                document.getElementById('day-' + (currentVisibleDay - 1)).scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });

        nextBtn.addEventListener('click', function() {
            if (currentVisibleDay < window.dailyData.length - 1) {
                document.getElementById('day-' + (currentVisibleDay + 1)).scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });

        topBtn.addEventListener('click', function() { window.scrollTo({ top: 0, behavior: 'smooth' }); });
        window.addEventListener('scroll', function() {
            if (window.scrollY > 300) topBtn.classList.add('visible');
            else topBtn.classList.remove('visible');
        });

        var footerEl = document.querySelector('footer');
        if (footerEl && bottomNav) {
            window.addEventListener('scroll', function() {
                var footerRect = footerEl.getBoundingClientRect();
                var windowHeight = window.innerHeight;
                if (footerRect.top < windowHeight + 50) {
                    bottomNav.style.transform = 'translateY(100%)';
                } else {
                    bottomNav.style.transform = 'translateY(0)';
                }
            });
        }

        updateBottomNav(0);
    }

    // ========== 移动端滑动切换日期 ==========
    function setupSwipeGesture() {
        var container = document.getElementById('dailyCards');
        if (!container) return;

        var startX = 0, startY = 0, startTime = 0;
        var swiping = false;

        container.addEventListener('touchstart', function(e) {
            var touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            startTime = Date.now();
            swiping = false;
        }, { passive: true });

        container.addEventListener('touchmove', function(e) {
            if (swiping) return;
            var touch = e.touches[0];
            var dx = touch.clientX - startX;
            var dy = touch.clientY - startY;
            if (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 20) {
                swiping = true;
            }
        }, { passive: true });

        container.addEventListener('touchend', function(e) {
            if (!swiping) return;
            var dx = e.changedTouches[0].clientX - startX;
            var elapsed = Date.now() - startTime;
            if (Math.abs(dx) > 50 && elapsed < 500) {
                if (dx < 0 && currentVisibleDay < window.dailyData.length - 1) {
                    document.getElementById('day-' + (currentVisibleDay + 1)).scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else if (dx > 0 && currentVisibleDay > 0) {
                    document.getElementById('day-' + (currentVisibleDay - 1)).scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
            swiping = false;
        }, { passive: true });
    }

    // ========== 滚动进度条 ==========
    function setupScrollProgress() {
        var progressBar = document.getElementById('scrollProgress');
        window.addEventListener('scroll', function() {
            var scrollTop = window.scrollY;
            var docHeight = document.documentElement.scrollHeight - window.innerHeight;
            var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            progressBar.style.width = progress + '%';
        });
    }

    // ========== 入场动画 ==========
    var cardObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                cardObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    function observeCards() {
        document.querySelectorAll('.fade-in-up:not(.visible)').forEach(function(card) {
            cardObserver.observe(card);
        });
    }

    // ========== 今日高亮 ==========
    function highlightToday() {
        var today = new Date();
        var month = today.getMonth() + 1;
        var day = today.getDate();
        var todayStr = month + '/' + day;
        var tripDates = [
            { date: '6/12', idx: 0 }, { date: '6/13', idx: 1 }, { date: '6/14', idx: 2 },
            { date: '6/15', idx: 3 }, { date: '6/16', idx: 4 }, { date: '6/17', idx: 5 },
            { date: '6/18', idx: 6 }, { date: '6/19', idx: 7 }, { date: '6/20', idx: 8 }
        ];
        var match = null;
        for (var i = 0; i < tripDates.length; i++) {
            if (tripDates[i].date === todayStr) { match = tripDates[i]; break; }
        }
        if (match) {
            var card = document.getElementById('day-' + match.idx);
            if (card) {
                card.classList.add('today');
                setTimeout(function() { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 500);
            }
        }
    }

    // ========== 触控反馈（移动端） ==========
    document.addEventListener('DOMContentLoaded', function() {
        document.addEventListener('touchstart', function(e) {
            var el = e.target.closest('.touchable');
            if (el) el.classList.add('touching');
        }, { passive: true });
        document.addEventListener('touchend', function() {
            document.querySelectorAll('.touchable.touching').forEach(function(el) { el.classList.remove('touching'); });
        }, { passive: true });
        document.addEventListener('touchcancel', function() {
            document.querySelectorAll('.touchable.touching').forEach(function(el) { el.classList.remove('touching'); });
        }, { passive: true });

        setTimeout(observeCards, 100);
    });

    // ========== 暴露到命名空间 ==========
    window.TravelApp = window.TravelApp || {};
    window.TravelApp.nav = {
        toggleDay: toggleDay,
        toggleBlock: toggleBlock,
        collapseAllBlocks: collapseAllBlocks,
        toggleClamp: toggleClamp,
        toggleSection: toggleSection,
        scrollToToday: scrollToToday,
        scrollToSection: scrollToSection,
        updateCountdown: updateCountdown,
        buildNav: buildNav,
        updateNavHighlight: updateNavHighlight,
        setupBottomNav: setupBottomNav,
        setupSwipeGesture: setupSwipeGesture,
        setupScrollProgress: setupScrollProgress,
        observeCards: observeCards,
        highlightToday: highlightToday,
        setupSectionAccessibility: setupSectionAccessibility
    };

    // ========== 全局转发函数（保持兼容） ==========
    window.toggleDay = toggleDay;
    window.toggleBlock = toggleBlock;
    window.collapseAllBlocks = collapseAllBlocks;
    window.toggleClamp = toggleClamp;
    window.toggleSection = toggleSection;
    window.scrollToToday = scrollToToday;
    window.scrollToSection = scrollToSection;
    window.updateCountdown = updateCountdown;
    window.buildNav = buildNav;
    window.observeCards = observeCards;
    window.highlightToday = highlightToday;
    window.setupSectionAccessibility = setupSectionAccessibility;
    window.setupScrollProgress = setupScrollProgress;
    window.setupBottomNav = setupBottomNav;
    window.setupSwipeGesture = setupSwipeGesture;
    window.updateNavHighlight = updateNavHighlight;

})();
