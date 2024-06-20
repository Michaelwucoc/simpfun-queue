let userQueueNum = null;
let previousNormalWaiting = null;
let previousProWaiting = null;

function bindQueueNum() {
    userQueueNum = document.getElementById('userQueueNum').value;

    if (userQueueNum == 114514) {
        window.location.href = "https://114514.cn";
    } else if (userQueueNum == 5201314) {
        showHearts();
    } else {
        alert('队列编号绑定成功: ' + userQueueNum);
    }
}


function showHearts() {
    const heart = document.createElement('div');
    heart.classList.add('heart');
    heart.innerHTML = '❤️';
    document.body.appendChild(heart);
    setTimeout(() => {
        heart.remove();
    }, 2000);
}

async function fetchLatestQueueStatus() {
    try {
        const response = await fetch('queue_status.php?action=queue_status', {
            method: 'GET'
        });
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch latest queue status:", error);
        throw error;
    }
}

function parseQueueStatus(item) {
    const running = item.running === "队列空" ? 0 : parseInt(item.running, 10);
    const waiting = item.waiting === "队列空" ? 0 : parseInt(item.waiting, 10);
    const num_first_waiting = item.num_first_waiting === "队列空" ? "N/A" : item.num_first_waiting;
    return { running, waiting, num_first_waiting };
}

function calculateEstimatedWaitTime(waiting) {
    let totalSeconds = 0;

    if (waiting <= 100) {
        totalSeconds = waiting * 10;
    } else if (waiting <= 300) {
        totalSeconds = 100 * 10 + (waiting - 100) * 15;
    } else if (waiting <= 500) {
        totalSeconds = 100 * 10 + 200 * 15 + (waiting - 300) * 20;
    } else if (waiting <= 800) {
        totalSeconds = 100 * 10 + 200 * 15 + 200 * 20 + (waiting - 500) * 25;
    } else if (waiting <= 1000) {
        totalSeconds = 100 * 10 + 200 * 15 + 200 * 20 + 300 * 25 + (waiting - 800) * 30;
    } else {
        totalSeconds = 100 * 10 + 200 * 15 + 200 * 20 + 300 * 25 + 200 * 30 + (waiting - 1000) * 35;
    }
    //冷知识，本算法被 H 抄入了他的机器人
    // 好好好，改都没改

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return { hours, minutes };
}

function formatWaitTime({ hours, minutes }) {
    return `${hours}小时${minutes}分钟`;
}

function getWaitTimeColor(hours) {
    if (hours > 3) {
        return 'red';
    } else if (hours > 1) {
        return 'orange';
    } else {
        return 'black';
    }
}

async function updateInnerText() {
    try {
        const data = await fetchLatestQueueStatus();
        if (data.length === 0) return;

        const latestTimestamp = new Date(Math.max(...data.map(item => new Date(item.timestamp))));
        const latestData = data.filter(item => new Date(item.timestamp).getTime() === latestTimestamp.getTime());

        const normalData = latestData.find(item => item.queue_type === 'normal') || {};
        const proData = latestData.find(item => item.queue_type === 'pro') || {};

        const normalParsed = parseQueueStatus(normalData);
        const proParsed = parseQueueStatus(proData);

        let normalStatusText = `普通队列:\n 等待中: ${normalParsed.waiting} \n 运行中: ${normalParsed.running}`;
        let proStatusText = `PRO 队列:\n 等待中: ${proParsed.waiting} \n 运行中: ${proParsed.running}`;

        if (previousNormalWaiting !== null && normalParsed.waiting !== previousNormalWaiting) {
            const diff = normalParsed.waiting - previousNormalWaiting;
            const diffText = diff > 0 ? `[⬆️ ${diff}]` : `[⬇️ ${-diff}]`;
            normalStatusText += ` ${diffText}`;
        }

        if (previousProWaiting !== null && proParsed.waiting !== previousProWaiting) {
            const diff = proParsed.waiting - previousProWaiting;
            const diffText = diff > 0 ? `[⬆️ ${diff}]` : `[⬇️ ${-diff}]`;
            proStatusText += ` ${diffText}`;
        }

        document.getElementById('normalQueueStatus').innerText = normalStatusText;
        document.getElementById('proQueueStatus').innerText = proStatusText;

        const normalFirstWaitingElem = document.getElementById('normalFirstWaiting');
        normalFirstWaitingElem.innerHTML = `普通队列第一个编号<br><br># ${normalParsed.num_first_waiting}`;

        const proFirstWaitingElem = document.getElementById('proFirstWaiting');
        proFirstWaitingElem.innerHTML = `Pro 队列第一个编号<br><br># ${proParsed.num_first_waiting}`;

        previousNormalWaiting = normalParsed.waiting;
        previousProWaiting = proParsed.waiting;

        const updateTime = new Date();
        const updateTimeFormatted = `${updateTime.getHours().toString().padStart(2, '0')}:${updateTime.getMinutes().toString().padStart(2, '0')}:${updateTime.getSeconds().toString().padStart(2, '0')}`;
        document.getElementById('updateTime').innerText = `${updateTimeFormatted} 更新完毕`;

        // 更新预计等待时间
        const normalWaitTime = calculateEstimatedWaitTime(normalParsed.waiting);
        const proWaitTime = calculateEstimatedWaitTime(proParsed.waiting);
        const normalWaitTimeFormatted = formatWaitTime(normalWaitTime);
        const proWaitTimeFormatted = formatWaitTime(proWaitTime);

        const normalWaitTimeColor = getWaitTimeColor(normalWaitTime.hours);
        const proWaitTimeColor = getWaitTimeColor(proWaitTime.hours);

        const estimatedWaitTimesElem = document.getElementById('estimatedWaitTimes');
        estimatedWaitTimesElem.innerHTML = `
                <div style="color: ${normalWaitTimeColor};">普通最后一个任务预计等待时间: ${normalWaitTimeFormatted}</div>
                <div style="color: ${proWaitTimeColor};">Pro最后一个任务预计等待时间: ${proWaitTimeFormatted}</div>
            `;

        // 检测用户队列编号
        if (userQueueNum) {
            const normalFirstQueueNum = normalParsed.num_first_waiting === "N/A" ? findNearestQueueNum(data, 'normal') : normalParsed.num_first_waiting;
            const proFirstQueueNum = proParsed.num_first_waiting === "N/A" ? findNearestQueueNum(data, 'pro') : proParsed.num_first_waiting;

            if (userQueueNum <= proFirstQueueNum || userQueueNum <= normalFirstQueueNum) {
                const alertSound = document.getElementById('alertSound');
                alertSound.play();

                // 开始闪烁
                document.body.classList.add('flash');
                setTimeout(() => {
                    document.body.classList.remove('flash');
                }, 60000);
            }
        }
    } catch (error) {
        console.error("Failed to update Inner Text:", error);
    }
}
function calculateUserWaitTime() {
    const userPositionNum = parseInt(document.getElementById('userPositionNum').value, 10);
    if (isNaN(userPositionNum)) {
        alert('请输入有效的队列编号');
        return;
    }

    const normalFirstWaiting = parseInt(document.getElementById('normalFirstWaiting').innerText.split('#')[1].trim(), 10);
    const proFirstWaiting = parseInt(document.getElementById('proFirstWaiting').innerText.split('#')[1].trim(), 10);

    let userQueueType, position;
    if (userPositionNum >= proFirstWaiting && proFirstWaiting !== "N/A") {
        userQueueType = 'Pro队列';
        position = userPositionNum - proFirstWaiting;
    } else if (userPositionNum >= normalFirstWaiting && normalFirstWaiting !== "N/A") {
        userQueueType = '普通队列';
        position = userPositionNum - normalFirstWaiting;
    } else {
        alert('您的队列编号不在当前队列中');
        return;
    }

    const waitTime = calculateEstimatedWaitTime(position);
    const waitTimeFormatted = formatWaitTime(waitTime);
    const waitTimeColor = getWaitTimeColor(waitTime.hours);

    alert(`您在普通队列中的位置是：${position}\n预计等待时间：${waitTimeFormatted}\n[仅供参考|不包含一个任务卡顿超过1小时的情况]\nPro目前不开放任务预测(因为太快了不需要预测）`);
}


async function updateChart() {
    try {
        const data = await fetchLatestQueueStatus();
        const timeRange = parseInt(document.getElementById('timeRange').value, 10);
        const now = new Date();

        const filteredData = data.filter(item => {
            const timestamp = new Date(item.timestamp);
            return (now - timestamp) / 60000 <= timeRange;
        });

        // 只保留每分钟的最新记录
        const latestDataMap = new Map();
        filteredData.forEach(item => {
            const timestamp = new Date(item.timestamp);
            const minuteKey = timestamp.toISOString().slice(0, 16); // 保留到分钟
            if (!latestDataMap.has(minuteKey)) {
                latestDataMap.set(minuteKey, item);
            } else {
                const existingItem = latestDataMap.get(minuteKey);
                if (new Date(existingItem.timestamp) < timestamp) {
                    latestDataMap.set(minuteKey, item);
                }
            }
        });

        const latestData = Array.from(latestDataMap.values());
        const labels = latestData.map(item => new Date(item.timestamp).toLocaleTimeString());

        const normalRunningData = latestData.filter(item => item.queue_type === 'normal').map(item => parseQueueStatus(item).running);
        const normalWaitingData = latestData.filter(item => item.queue_type === 'normal').map(item => parseQueueStatus(item).waiting);

        const proRunningData = latestData.filter(item => item.queue_type === 'pro').map(item => parseQueueStatus(item).running);
        const proWaitingData = latestData.filter(item => item.queue_type === 'pro').map(item => parseQueueStatus(item).waiting);

        const plotData = [
            {
                x: labels,
                y: normalRunningData,
                type: 'bar',
                name: '普通队列-运行中',
                marker: { color: '#7F7F7F' }
            },
            {
                x: labels,
                y: normalWaitingData,
                type: 'bar',
                name: '普通队列-等待中',
                marker: { color: '#FF7F0E' }
            },
            {
                x: labels,
                y: proRunningData,
                type: 'bar',
                name: 'Pro队列-运行中',
                marker: { color: '#1F77B4' }
            },
            {
                x: labels,
                y: proWaitingData,
                type: 'bar',
                name: 'Pro队列-等待中',
                marker: { color: '#2CA02C' }
            }
        ];

        const layout = {
            title: '队列状态图表',
            barmode: 'stack'
        };

        Plotly.newPlot('queueChart', plotData, layout);
    } catch (error) {
        console.error("Failed to update chart:", error);
    }
}

function findNearestQueueNum(data, queueType) {
    const queueData = data.filter(item => item.queue_type === queueType && item.num_first_waiting !== "队列空");
    if (queueData.length > 0) {
        return queueData[0].num_first_waiting;
    }
    return Infinity; // 表示没有找到合适的队列编号
}
function detectMobile() {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
        alert('本网站是为电脑版设计的，手机版体验会极差。');
    }
}
window.addEventListener('beforeunload', function (e) {
    e.preventDefault();
    e.returnValue = '页面正在更新队列状态，离开会导致数据中断，确定要离开吗？';
});
detectMobile();
updateInnerText();
updateChart();

document.addEventListener('DOMContentLoaded', function () {
    setInterval(updateInnerText, 10000);
    setInterval(updateChart, 30000);
});
