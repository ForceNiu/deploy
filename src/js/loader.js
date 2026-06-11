/**
 * js/loader.js - 数据异步加载模块
 * 使用 fetch 并行加载数据文件，失败时有 fallback
 */
(function() {
    'use strict';

    // 数据文件列表
    var DATA_FILES = [
        { path: 'data/day12.js', key: '_day12', fallback: {} },
        { path: 'data/day13.js', key: '_day13', fallback: {} },
        { path: 'data/day14.js', key: '_day14', fallback: {} },
        { path: 'data/day15.js', key: '_day15', fallback: {} },
        { path: 'data/day16.js', key: '_day16', fallback: {} },
        { path: 'data/day17.js', key: '_day17', fallback: {} },
        { path: 'data/day18.js', key: '_day18', fallback: {} },
        { path: 'data/day19.js', key: '_day19', fallback: {} },
        { path: 'data/day20.js', key: '_day20', fallback: {} },
        { path: 'data/food.js', key: 'foodData', fallback: [] },
        { path: 'data/gifts.js', key: 'giftData', fallback: [] },
        { path: 'data/prices.js', key: '_prices', fallback: [] },
        { path: 'data/checklist.js', key: 'checklistData', fallback: [] }
    ];

    // 加载状态
    var loadStatus = {
        total: DATA_FILES.length,
        loaded: 0,
        failed: [],
        startTime: null
    };

    /**
     * 加载单个数据文件
     * @param {Object} file - { path, key, fallback }
     * @returns {Promise<Object>} - { key, data, success, error }
     */
    function loadFile(file) {
        return new Promise(function(resolve) {
            var timeout = setTimeout(function() {
                resolve({ key: file.key, data: file.fallback, success: false, error: 'timeout' });
            }, 10000); // 10秒超时

            fetch(file.path + '?t=' + Date.now())
                .then(function(response) {
                    clearTimeout(timeout);
                    if (!response.ok) {
                        throw new Error('HTTP ' + response.status);
                    }
                    return response.text();
                })
                .then(function(text) {
                    // 执行脚本，提取 window[key] 的值
                    var script = document.createElement('script');
                    script.textContent = text;
                    document.head.appendChild(script);
                    document.head.removeChild(script);

                    var data = window[file.key];
                    if (data !== undefined) {
                        resolve({ key: file.key, data: data, success: true });
                    } else {
                        resolve({ key: file.key, data: file.fallback, success: false, error: 'not exported' });
                    }
                })
                .catch(function(err) {
                    clearTimeout(timeout);
                    resolve({ key: file.key, data: file.fallback, success: false, error: err.message });
                });
        });
    }

    /**
     * 加载所有数据文件
     * @returns {Promise<Object>} - 加载结果
     */
    function loadAll() {
        loadStatus.startTime = Date.now();

        var promises = DATA_FILES.map(function(file) {
            return loadFile(file);
        });

        return Promise.all(promises).then(function(results) {
            // 组装 dailyData
            window.dailyData = [
                window._day12 || {}, window._day13 || {}, window._day14 || {},
                window._day15 || {}, window._day16 || {}, window._day17 || {},
                window._day18 || {}, window._day19 || {}, window._day20 || {}
            ];

            // 统计结果
            var failed = results.filter(function(r) { return !r.success; });
            loadStatus.loaded = results.length - failed.length;
            loadStatus.failed = failed.map(function(r) { return r.key; });

            return {
                success: failed.length === 0,
                loaded: loadStatus.loaded,
                failed: loadStatus.failed,
                duration: Date.now() - loadStatus.startTime
            };
        });
    }

    /**
     * 显示加载错误提示
     * @param {Array} failedKeys - 失败的数据键名
     */
    function showLoadError(failedKeys) {
        var container = document.querySelector('.container');
        if (!container) return;

        var errorHtml = '<div class="data-load-error" style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 12px; margin-bottom: 16px; color: #856404;">';
        errorHtml += '<i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>';
        errorHtml += '<strong>部分数据加载失败</strong>';
        errorHtml += '<p style="margin: 8px 0 0 0; font-size: 14px;">失败项: ' + failedKeys.join(', ') + '</p>';
        errorHtml += '<p style="margin: 4px 0 0 0; font-size: 14px;">页面使用默认数据，部分功能可能受限。</p>';
        errorHtml += '</div>';

        container.insertAdjacentHTML('afterbegin', errorHtml);
    }

    // 暴露到命名空间
    window.TravelApp = window.TravelApp || {};
    window.TravelApp.loader = {
        loadAll: loadAll,
        showLoadError: showLoadError,
        getStatus: function() { return loadStatus; }
    };

    // 全局转发
    window.loadData = loadAll;

})();
