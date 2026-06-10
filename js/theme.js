/**
 * js/theme.js - 主题切换模块
 * 包含：深色模式、主题切换、系统主题监听
 */
(function() {
    'use strict';

    // ========== 深色模式 ==========
    function getTheme() {
        var saved = localStorage.getItem('theme');
        if (saved) return saved;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function applyTheme(theme) {
        var html = document.documentElement;
        html.classList.add('transitioning');
        requestAnimationFrame(function() {
            html.setAttribute('data-theme', theme);
            document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
            setTimeout(function() { html.classList.remove('transitioning'); }, 280);
        });
    }

    function toggleTheme() {
        var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', next);
        applyTheme(next);
    }

    // ========== 系统主题监听 ==========
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
        if (!localStorage.getItem('theme')) applyTheme(e.matches ? 'dark' : 'light');
    });

    // ========== 暴露到命名空间 ==========
    window.TravelApp = window.TravelApp || {};
    window.TravelApp.theme = {
        get: getTheme,
        apply: applyTheme,
        toggle: toggleTheme
    };

    // ========== 全局转发函数（保持兼容） ==========
    window.getTheme = getTheme;
    window.applyTheme = applyTheme;
    window.toggleTheme = toggleTheme;

})();
