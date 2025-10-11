const dohServers = [
    {
        name: '谷歌',
        url: 'https://doh.cmliussss.com/CMLiussss',
        logo: 'ico/google.ico'
    },
    {
        name: 'Cloudflare',
        url: 'https://doh.cmliussss.net/CMLiussss',
        logo: 'ico/cloudflare.ico'
    },
    {
        name: '阿里云',
        url: 'https://doh.090227.xyz/Ali-query',
        logo: 'ico/alibabacloud.png'
    },
/*
    {
        name: '腾讯云',
        url: 'https://doh.090227.xyz/QQ-query',
        logo: 'ico/tencentcloud.ico'
    },
    {
        name: '360',
        url: 'https://doh.090227.xyz/360-query',
        logo: 'ico/360.ico'
    },
*/
    {
        name: 'AdGuard',
        url: 'https://doh.090227.xyz/AdG-query',
        logo: 'ico/AdGuard.ico'
    },
    {
        name: 'DNS.SB',
        url: 'https://doh.090227.xyz/SB-query',
        logo: 'ico/sb.png'
    },
    {
        name: 'NextDNS',
        url: 'https://doh.090227.xyz/Next-query',
        logo: 'ico/nextdns.png'
    },
    {
        name: 'v.recipes',
        url: 'https://doh.090227.xyz/V-query',
        logo: 'ico/v.recipes.png'
    }
];

let testResults = [];
let isTesting = false;
let networkInfo = null;
let isNetworkInfoHidden = true;

function createDohItemSkeleton(server, index) {
    return `
        <div class="doh-item loading-skeleton" id="doh-item-${index}">
            <div class="doh-item-main">
                <div class="doh-provider" data-label="服务商">
                    <img src="${server.logo}" alt="${server.name}" class="provider-logo">
                    <span>${server.name}</span>
                </div>
                <div class="doh-url" data-label="服务地址" title="${server.url}">
                    <span>${server.url}</span>
                </div>
                <div class="status" data-label="状态">
                    <span>检测中...</span>
                </div>
                <div class="response-time" data-label="响应时间">
                    <span>---</span>
                </div>
                <div class="pollution-status" data-label="纯净度">
                    <span>---</span>
                </div>
            </div>
            <div class="doh-item-details">
                <div class="ip-details">
                    <span class="ip-label">解析IP:</span>
                    <span class="ip-value">---</span>
                </div>
                <div class="location-details">
                    <span class="location-label">位置:</span>
                    <span class="location-value">---</span>
                </div>
                <div class="org-details">
                    <span class="org-label">组织:</span>
                    <span class="org-value">---</span>
                </div>
            </div>
        </div>
    `;
}

function renderDohListSkeletons() {
    const dohList = document.getElementById('dohList');
    dohList.innerHTML = dohServers.map(createDohItemSkeleton).join('');
    document.getElementById('totalServers').textContent = dohServers.length;
}

async function testDohServer(server, index) {
    const itemEl = document.getElementById(`doh-item-${index}`);
    itemEl.classList.remove('loading-skeleton');
    itemEl.onclick = () => copyToClipboard(server.url);

    const statusEl = itemEl.querySelector('.status');
    const responseTimeEl = itemEl.querySelector('.response-time');
    const pollutionStatusEl = itemEl.querySelector('.pollution-status');
    const dohUrlEl = itemEl.querySelector('.doh-url');
    const dohProviderEl = itemEl.querySelector('.doh-provider');
    
    // 获取详细信息元素
    const ipValueEl = itemEl.querySelector('.ip-value');
    const locationValueEl = itemEl.querySelector('.location-value');
    const orgValueEl = itemEl.querySelector('.org-value');

    // Reset states
    statusEl.innerHTML = `<div class="status-dot testing"></div><span>检测中...</span>`;
    responseTimeEl.textContent = '---';
    pollutionStatusEl.innerHTML = '<span>---</span>';
    responseTimeEl.className = 'response-time';
    pollutionStatusEl.className = 'pollution-status';
    
    // 重置污染状态样式
    dohUrlEl.classList.remove('polluted');
    dohProviderEl.classList.remove('polluted');
    const statusDotEl = itemEl.querySelector('.status-dot');
    if (statusDotEl) {
        statusDotEl.classList.remove('polluted');
    }
    
    // 重置详细信息
    ipValueEl.textContent = '---';
    locationValueEl.textContent = '---';
    orgValueEl.textContent = '---';

    try {
        const startTime = performance.now();
        const testUrl = `${server.url}?name=www.google.com&type=A`;
        
        const response = await fetch(testUrl, { cache: 'no-store' });
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        statusEl.innerHTML = `<div class="status-dot success"></div><span>在线</span>`;
        responseTimeEl.textContent = `${responseTime}ms`;
        responseTimeEl.className = getResponseTimeClass(responseTime);

        let ip = 'N/A';
        let isClean = false;
        let ipDetails = null;
        
        if (data.Answer && data.Answer.length > 0) {
            ip = data.Answer[0].data;
            ipValueEl.textContent = ip;
            ipDetails = await getIpInfo(ip, pollutionStatusEl, locationValueEl, orgValueEl);
            isClean = ipDetails.isClean;
        } else {
            pollutionStatusEl.innerHTML = '<span>无响应</span>';
            ipValueEl.textContent = '无响应';
        }

        return { success: true, responseTime, isClean, ip };

    } catch (error) {
        statusEl.innerHTML = `<div class="status-dot error"></div><span>离线</span>`;
        responseTimeEl.textContent = '---';
        pollutionStatusEl.innerHTML = '<span>' + error.message + '</span>';
        ipValueEl.textContent = '错误';
        locationValueEl.textContent = '---';
        orgValueEl.textContent = '---';
        return { success: false, responseTime: null, isClean: false, ip: null };
    }
}

async function getIpInfo(ip, pollutionStatusEl, locationValueEl, orgValueEl) {
    try {
        const ipInfoUrl = `https://cm-doh.pages.dev/ip-info?ip=${ip}&token=CMLiussss`;
        const response = await fetch(ipInfoUrl, { cache: 'no-store' });
        
        if (!response.ok) {
            pollutionStatusEl.innerHTML = '<span>❓ 未知</span>';
            locationValueEl.textContent = '未知';
            orgValueEl.textContent = '未知';
            return { isClean: false, ipData: null };
        }

        const ipData = await response.json();
        const isClean = checkPollutionStatus(ipData);
        
        // 更新污染状态显示
        const statusText = isClean ? '✅ 纯净' : '🚫 污染';
        const statusClass = isClean ? 'clean' : 'suspicious';
        pollutionStatusEl.innerHTML = `<span>${statusText}</span>`;
        pollutionStatusEl.className = `pollution-status ${statusClass}`;
        
        // 根据纯净度状态更新相关元素的样式
        const dohItem = pollutionStatusEl.closest('.doh-item');
        const dohUrlEl = dohItem.querySelector('.doh-url');
        const dohProviderEl = dohItem.querySelector('.doh-provider');
        const statusDotEl = dohItem.querySelector('.status-dot');
        
        if (!isClean) {
            // 添加污染样式
            dohUrlEl.classList.add('polluted');
            dohProviderEl.classList.add('polluted');
            if (statusDotEl) {
                statusDotEl.classList.add('polluted');
                statusDotEl.classList.remove('success'); // 移除成功状态样式
            }
        } else {
            // 移除污染样式
            dohUrlEl.classList.remove('polluted');
            dohProviderEl.classList.remove('polluted');
            if (statusDotEl) {
                statusDotEl.classList.remove('polluted');
            }
        }
        
        // 更新详细信息行
        const location = `${ipData.country || '未知'} ${ipData.regionName || ''}`.trim();
        const organization = ipData.org || ipData.as || ipData.isp || '未知';
        
        locationValueEl.textContent = location;
        orgValueEl.textContent = organization;
        
        return { isClean, ipData };
        
    } catch (error) {
        console.warn('获取IP信息失败:', error);
        pollutionStatusEl.innerHTML = '<span>❓ 未知</span>';
        locationValueEl.textContent = '未知';
        orgValueEl.textContent = '未知';
        return { isClean: false, ipData: null };
    }
}

function checkPollutionStatus(ipData) {
    const { as, isp, org } = ipData;
    const fields = [as, isp, org].map(field => (field || '').toLowerCase());
    return fields.some(field => field.includes('google'));
}

function getResponseTimeClass(responseTime) {
    if (responseTime < 500) return 'response-time fast';
    if (responseTime < 1000) return 'response-time medium';
    return 'response-time slow';
}

async function testAllServers() {
    if (isTesting) return;
    isTesting = true;
    
    const refreshBtn = document.getElementById('refreshBtn');
    const btnIcon = refreshBtn.querySelector('.icon');
    refreshBtn.disabled = true;
    btnIcon.classList.add('spinning');

    renderDohListSkeletons();
    
    // 并行执行 DoH 服务测试和网络信息获取,互不影响
    const dohTestPromises = dohServers.map((server, index) => testDohServer(server, index));
    const networkInfoPromise = loadNetworkInfo();
    
    // 等待 DoH 测试完成
    testResults = await Promise.all(dohTestPromises);
    
    updateStats();
    
    // 网络信息在后台继续加载,不阻塞 DoH 测试结果的显示
    // networkInfoPromise 会自行完成,无需等待

    isTesting = false;
    refreshBtn.disabled = false;
    btnIcon.classList.remove('spinning');
}

function updateStats() {
    const totalCount = dohServers.length;
    const onlineCount = testResults.filter(r => r.success).length;
    const cleanCount = testResults.filter(r => r.isClean).length;
    
    const responseTimes = testResults
        .filter(r => r.success && r.responseTime !== null)
        .map(r => r.responseTime);
    
    const avgResponseTime = responseTimes.length > 0 
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0;

    document.getElementById('totalServers').textContent = totalCount;
    document.getElementById('onlineServers').textContent = onlineCount;
    document.getElementById('cleanServers').textContent = cleanCount;
    document.getElementById('averageResponseTime').textContent = avgResponseTime > 0 ? `${avgResponseTime}ms` : '-';
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        const toast = document.getElementById('copyToast');
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }).catch(err => {
        console.warn('复制失败:', err);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    testAllServers();
    loadNetworkInfo();
});

// 网络出口信息功能
// 设置状态指示器
function setStatus(id, status) {
    const indicator = document.getElementById(id);
    if (indicator) {
        indicator.className = 'status-indicator status-' + status;
    }
}

// 获取国内测试数据 (遍历多个 API: speedtest.cn > ipipv.com > ipip.net)
async function fetchIpipData() {
    setStatus('status-ipip', 'loading');
    
    // 获取标题元素,用于动态更新 API 来源
    const titleElement = document.querySelector('#status-ipip').parentElement;
    
    // 定义 API 配置列表,按优先级排序
    const apiConfigs = [
        {
            name: 'speedtest.cn',
            url: 'https://api-v3.speedtest.cn/ip',
            parser: (data) => {
                if (data.code === 0 && data.data) {
                    return {
                        ip: data.data.ip || '未知',
                        country: data.data.country || '未知',
                        city: data.data.city || '未知'
                    };
                }
                throw new Error('数据格式错误');
            }
        },
        {
            name: 'ipipv.com',
            url: 'https://myip.ipipv.com/',
            parser: (data) => {
                return {
                    ip: data.Ip || '未知',
                    country: data.Country || '未知',
                    city: data.City || '未知'
                };
            }
        },
        {
            name: 'ipip.net',
            url: 'https://myip.ipip.net/json',
            parser: (data) => {
                if (data.ret === 'ok' && data.data) {
                    return {
                        ip: data.data.ip || '未知',
                        country: data.data.location[0] || '未知',
                        city: data.data.location[2] || '未知'
                    };
                }
                throw new Error('数据格式错误');
            }
        }
    ];
    
    // 遍历 API 配置列表
    for (const config of apiConfigs) {
        try {
            const response = await fetch(config.url);
            const data = await response.json();
            
            // 使用对应的解析器解析数据
            const result = config.parser(data);
            
            // 更新页面显示
            document.getElementById('ipip-ip').textContent = result.ip;
            document.getElementById('ipip-country').textContent = result.country;
            document.getElementById('ipip-city').textContent = result.city;
            setStatus('status-ipip', 'success');
            
            // 更新标题显示当前使用的 API
            if (titleElement) {
                titleElement.innerHTML = `<span class="status-indicator" id="status-ipip"></span>国内测试（${config.name}）`;
                setStatus('status-ipip', 'success'); // 重新设置状态,因为 innerHTML 会清除
            }
            
            console.log(`使用 ${config.name} API 成功`);
            return; // 成功则返回,不再尝试其他 API
            
        } catch (error) {
            console.warn(`${config.name} 接口失败:`, error);
            // 继续尝试下一个 API
        }
    }
    
    // 所有 API 都失败
    document.getElementById('ipip-ip').innerHTML = '<span class="error">加载失败</span>';
    document.getElementById('ipip-country').textContent = '';
    document.getElementById('ipip-city').textContent = '';
    setStatus('status-ipip', 'error');
    console.error('所有国内测试 API 都失败');
}

// 获取 EdgeOne 数据
async function fetchEdgeOneData() {
    setStatus('status-edgeone', 'loading');
    try {
        const response = await fetch('https://ip-api.090227.xyz/ip.json');
        const data = await response.json();
        
        document.getElementById('edgeone-ip').textContent = data.query || '未知';
        document.getElementById('edgeone-country').textContent = data.countryCode || '未知';
        document.getElementById('edgeone-city').textContent = data.city || '未知';
        setStatus('status-edgeone', 'success');
    } catch (error) {
        document.getElementById('edgeone-ip').innerHTML = '<span class="error">加载失败</span>';
        document.getElementById('edgeone-country').textContent = '';
        document.getElementById('edgeone-city').textContent = '';
        setStatus('status-edgeone', 'error');
        console.error('EdgeOne 接口错误:', error);
    }
}

// 获取 CloudFlare 数据
async function fetchCloudFlareData() {
    setStatus('status-cf', 'loading');
    try {
        const response = await fetch('https://cf.090227.xyz/ip.json');
        const data = await response.json();
        
        document.getElementById('cf-ip').textContent = data.ip || '未知';
        document.getElementById('cf-country').textContent = data.country || '未知';
        document.getElementById('cf-city').textContent = data.city || '未知';
        setStatus('status-cf', 'success');
    } catch (error) {
        document.getElementById('cf-ip').innerHTML = '<span class="error">加载失败</span>';
        document.getElementById('cf-country').textContent = '';
        document.getElementById('cf-city').textContent = '';
        setStatus('status-cf', 'error');
        console.error('CloudFlare 接口错误:', error);
    }
}

// 获取推特入口数据
async function fetchTwitterData() {
    setStatus('status-twitter', 'loading');
    try {
        const response = await fetch('https://x.com/cdn-cgi/trace');
        const text = await response.text();
        
        // 解析文本格式的响应 (key=value 格式,每行一个)
        const data = {};
        text.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                data[key.trim()] = value.trim();
            }
        });
        
        document.getElementById('twitter-ip').textContent = data.ip || '未知';
        document.getElementById('twitter-country').textContent = data.loc || '未知';
        document.getElementById('twitter-city').textContent = data.colo || '';
        setStatus('status-twitter', 'success');
    } catch (error) {
        document.getElementById('twitter-ip').innerHTML = '<span class="error">加载失败</span>';
        document.getElementById('twitter-country').textContent = '';
        document.getElementById('twitter-city').textContent = '';
        setStatus('status-twitter', 'error');
        console.error('推特入口接口错误:', error);
    }
}

// 重置网络信息显示为加载中状态
function resetNetworkInfo() {
    // 重置所有 IP 和位置信息为"加载中..."
    const ipElements = ['ipip-ip', 'edgeone-ip', 'cf-ip', 'twitter-ip'];
    const countryElements = ['ipip-country', 'edgeone-country', 'cf-country', 'twitter-country'];
    const cityElements = ['ipip-city', 'edgeone-city', 'cf-city', 'twitter-city'];
    const statusElements = ['status-ipip', 'status-edgeone', 'status-cf', 'status-twitter'];
    
    ipElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '加载中...';
    });
    
    countryElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '-';
    });
    
    cityElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '-';
    });
    
    statusElements.forEach(id => {
        setStatus(id, 'loading');
    });
}

// 页面加载时自动获取网络信息
async function loadNetworkInfo() {
    // 检查网络卡片容器是否存在
    const networkCardsContainer = document.querySelector('.network-cards-container');
    if (networkCardsContainer) {
        // 先重置显示状态
        resetNetworkInfo();
        
        // 并行加载所有网络信息
        return Promise.all([
            fetchIpipData(),
            fetchEdgeOneData(),
            fetchCloudFlareData(),
            fetchTwitterData()
        ]).catch(error => {
            console.error('加载网络信息时出错:', error);
        });
    }
    return Promise.resolve();
}
