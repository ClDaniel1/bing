// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const {ipcRenderer: ipc } = require('electron');
let remote = require('@electron/remote');
const schedule = require('node-schedule');

$("#closeBtn").click(() => {
    if (config.min == 1) {
        ipc.send('min');
    } else {
        ipc.send('close');
    }
})

let config = getConfig();
let idx = 0;
let date = 0;
let timer = '';
let startDate = new Date().getDate();
let isOnline = 1;
let start = 1;
initConfig();

function getConfigPath() {
    return remote.app.getPath('documents') + '/bingWallpaper/'
}

function getConfig() {
    let fs=require("fs");
    let configPath = getConfigPath() + 'config.json';
    let exists = fs.existsSync(configPath)
    if (!exists) {
        let config = {
            'autoOpen' : '0',
            'autoSet' : '0',
            'autoDown' : '0',
            'min' : '0',
            'savePath' : 'c:/bingWallpaper/',
        };
        saveConfig(config);
        return config;
    } else {
        let config = JSON.parse(fs.readFileSync(configPath));
        return config;
    }
}

function saveConfig(config) {
    let fs = require("fs");
    let configPath = getConfigPath();
    let jsonObj = JSON.stringify(config);
    if (!fs.existsSync(configPath)) {  
        fs.mkdirSync(configPath);  
    }
    fs.writeFile(configPath + 'config.json', jsonObj, function (err) {
        if(err){
            remote.dialog.showErrorBox('修改配置失败！', err)
            console.log(err);
        }else{
            console.log("file success！！！")
        }
	})
}

function initConfig() {
    if (config.autoOpen == 1) {
        $(".autoOpen")[0].checked = true;
    }
    if (config.autoSet == 1) {
        $(".autoSet")[0].checked = true;
    }
    if (config.autoDown == 1) {
        $(".autoDown")[0].checked = true;
    }
    if (config.min == 1) {
        $(".min")[0].checked = true;
    }
    if (config.autoDownDay == 1) {
        $(".autoDownDay")[0].checked = true;
    }
    $("#savePath").html(config.savePath)
}

let showImg = 0;

if (!navigator.onLine) {
    $("#body > div").fadeOut(300);
    $(".tips").stop().fadeIn(300);
    isOnline = 0;
} else {
    getBingImg();
}

window.addEventListener('online',  function() {
    isOnline = 1;
    if (showImg == 0) {
        getBingImg();
    }
})

window.addEventListener('offline',  function() {
    isOnline = 0;
    if (showImg == 0) {
        $("#body > div").fadeOut(300);
        $(".tips").stop().fadeIn(300);
    }
})

function getBingImg(type) {
    if (!checkNetWork()) {
        return ;
    }
    if (type == 'pre') {
        idx ++;
        if (idx > 7) {
            idx = 7;
            return alert('已达最后一天')
        }
    } else if (type == 'next') {
        idx --;
        if (idx < 0) {
            idx = 0;
            return alert('已达最新一天')
        }
    }
    $("#body > div").fadeOut(300);
    $(".loading").stop().fadeIn(300);
    $.ajax({
        url:'https://cn.bing.com/HPImageArchive.aspx?format=js&idx=' + idx + '&n=1',
        success: function(ret) {
            // 以 startdate 作为图片日期基准（Bing 每天 16:00 换图，startdate 即该图所属的"天"）
            date = ret.images[0].startdate;
            ret.images[0].url = ret.images[0].url.replace(/1920x1080/g, 'UHD');
            $("#imgMain").html('<img draggable="false" src="https://www.bing.com' + ret.images[0].url + '" />');
            $("#copyright").html(ret.images[0].copyright)
            $("#imgDate").html(date.slice(0, 4) + '-' + date.slice(4, 6) + '-' + date.slice(6, 8));
            $("#body > div").fadeOut(300);
            $("#img").stop().fadeIn(300);
            showImg = 1;
            if (config.autoDown == 1) {
                saveImage();
            }
            if (config.autoSet == 1 && start == 1) {
                saveImage(1)
            }
        }
    })
}

function getBingImgUrl(idx, callBack) {
    $.ajax({
        url:'https://cn.bing.com/HPImageArchive.aspx?format=js&idx=' + idx + '&n=1',
        async: false,
        success: function(ret) {
            date = ret.images[0].startdate;
            ret.images[0].url = ret.images[0].url.replace(/1920x1080/g, 'UHD');
            callBack('https://www.bing.com' + ret.images[0].url, ret.images[0].startdate);
        }
    })
}

$('.leftBtn i').click(() => {
    if (checkNetWork()) {
        getBingImg('pre')
    }
})
$('.rightBtn i').click(() => {
    if (checkNetWork()) {
        getBingImg('next')
    }
})

// 手动下载/设壁纸：强制重新下载，不受去重限制
$(".down").click(() => saveImage(0, undefined, true))
$(".set").click(() => saveImage(1, undefined, true))

function saveImage(setBg, imgUrl, force) {
    if (!checkNetWork()) {
        return ;
    }
    let fs = require("fs");
    if (!fs.existsSync(config.savePath)) {  
        fs.mkdirSync(config.savePath);  
    }
    let savePath = config.savePath + '\\' + 'BingWallpaper_' + date + '.jpg';
    // 该 startdate 的文件已存在即视为已下载过，跳过（force 时强制重新下载）
    if (!force && fs.existsSync(savePath)) {
        if (setBg) {
            setBgWallpaper(savePath);
        }
        start = 0;
        return ;
    }
    if (imgUrl == undefined) {
        imgUrl = $("#imgMain img").attr('src');
    }

    var xhr = new XMLHttpRequest();    
    xhr.open("get", imgUrl, true);
    xhr.responseType = "blob";
    xhr.onload = async function() {
        if (this.status == 200) {
            var blob = this.response;
            let reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onload = function(e) {
                var dataBuffer = Buffer.from(e.target.result.replace(/^data:image\/\w+;base64,/,""), 'base64');
                fs.writeFile(savePath, dataBuffer, async function (err) {
                    if(err){
                        remote.dialog.showErrorBox('保存文件出错了！', err)
                        console.log(err);
                    }else if (setBg) {
                        setBgWallpaper(savePath);
                    }
                    start = 0;
                })
            }
        }    
    }, xhr.send();
}

async function setBgWallpaper(savePath) {
    try {
        // wallpaper v5+ 为 ESM 包，需用动态导入
        const {setWallpaper} = await import('wallpaper');
        await setWallpaper(savePath);
    } catch (e) {
        remote.dialog.showErrorBox('设置壁纸出错了！', String(e))
        console.log(e);
    }
}
$("#settingBtn").hover(() => {
    $("#bodyBlur").html($("#body > div:visible").clone());
})
function toggleSetting() {
    if ($("#settingBtn").hasClass('active')) {
        $("#closeBtn,#infoBtn").animate({opacity :"1"}, 300).css('pointer-events', 'auto');
    } else {
        // 隐藏的同时禁用点击，避免看不见的按钮仍可点击
        $("#closeBtn,#infoBtn").animate({opacity :"0"}, 300).css('pointer-events', 'none');
    }
    $("#settingBtn").toggleClass('active');
    $("#setting,#bodyBlur").fadeToggle(300)
}
$("#settingBtn").click(() => {
    toggleSetting();
})
// 点击卡片外遮罩区域关闭设置，卡片内点击不冒泡
$(".setting-card").click((e) => {
    e.stopPropagation();
})
$("#setting").click(() => {
    if ($("#settingBtn").hasClass('active')) {
        toggleSetting();
    }
})

$(".choseFilePath").click(() => {
    let filePath = ipc.sendSync('choseFilePath');
    if (filePath != undefined) {
        filePath = filePath[0];
        config.savePath = filePath;
        saveConfig(config);
        initConfig()
    }
})

$("#savePath,.openFolder").click(function(){
    remote.shell.openExternal(config.savePath);
})

$("#infoBtn").click(() => {
    remote.shell.openExternal('https://www.ihawo.com/archives/106.html')
})

$("#setting input[type=checkBox]").change(function() {
    var name = $(this).attr('name');
    var checked = $(this).is(':checked')
    switch(name) {
        case 'autoOpen':
            if (checked) {
                ipc.send('openAutoOpen')
            } else {
                ipc.send('closeAutoOpen')
            }
            config.autoOpen = checked ? 1 : 0;
            break;
        case 'autoSet':
            if (checked) {
                checkDailyDownload();
            }
            config.autoSet = checked ? 1 : 0;
            break;
        case 'autoDown':
            config.autoDown = checked ? 1 : 0;
            break;
        case 'min':
            config.min = checked ? 1 : 0;
            break;
        case 'autoDownDay':
            config.autoDownDay = checked ? 1 : 0;
            break;
    }
    saveConfig(config)
})

// 每日定时下载：Bing 每天 16:00 换图，00:30 时 idx=0 即当天首页图，无需人为延迟
const DAILY_SCHEDULE = '30 0 * * *';
schedule.scheduleJob('dailyDownload', DAILY_SCHEDULE, function() {
    checkDailyDownload();
});

// 每日任务统一入口：按开关下载/设置壁纸，是否真下载由文件是否已存在决定
function checkDailyDownload() {
    if (!isOnline) {
        // 离线时稍后重试
        scheduleRetry();
        return ;
    }
    if (config.autoSet != 1 && config.autoDown != 1) {
        return ;
    }
    getBingImgUrl(0, function(url) {
        saveImage(config.autoSet == 1 ? 1 : 0, url);
    });
}

// 重试：1 小时后再检查一次，当天最晚重试到 23 点，次日交给定时任务/启动补偿
function scheduleRetry() {
    let next = new Date(Date.now() + 3600000);
    if (next.getHours() >= 23) {
        return ;
    }
    // 避免重复的重试任务堆积
    let exist = schedule.scheduledJobs['dailyRetry'];
    if (exist) {
        exist.cancel();
    }
    schedule.scheduleJob('dailyRetry', next, function() {
        checkDailyDownload();
    });
}

// 一次性迁移：历史文件按 enddate（= startdate + 1 天）命名，统一改为 startdate，与新的去重规则一致
function migrateFileNames() {
    if (config.startdateNaming == 1) {
        return ;
    }
    let fs = require("fs");
    if (fs.existsSync(config.savePath)) {
        // 升序处理：先把旧文件改名腾出目标名，避免相邻日期连锁冲突
        let files = fs.readdirSync(config.savePath)
            .filter(function(f) { return /^BingWallpaper_\d{8}\.jpg$/.test(f) })
            .sort();
        files.forEach(function(f) {
            let d = f.match(/^(BingWallpaper_)(\d{4})(\d{2})(\d{2})(\.jpg)$/);
            // enddate 减一天即该图的 startdate
            let prev = new Date(Number(d[2]), Number(d[3]) - 1, Number(d[4]) - 1);
            let target = d[1] + prev.getFullYear() + String(prev.getMonth() + 1).padStart(2, '0') + String(prev.getDate()).padStart(2, '0') + d[5];
            if (target == f) {
                return ;
            }
            // 目标名已存在（日期不连续或已有新命名文件）则跳过，不覆盖任何文件
            if (fs.existsSync(config.savePath + '\\' + target)) {
                return ;
            }
            try {
                fs.renameSync(config.savePath + '\\' + f, config.savePath + '\\' + target);
            } catch (e) {
                console.log('rename failed: ' + f, e);
            }
        })
    }
    config.startdateNaming = 1;
    saveConfig(config);
}
migrateFileNames();

// 启动补偿：应用启动时若今天的壁纸还未下载，立即补一次（防止定时时间点应用未运行漏掉任务）
checkDailyDownload();

function checkUpdate() {
    if (isOnline == 0) {
        return ;
    }
    let version = ipc.sendSync('getVersion');
    let versionArr = version.split('\.');
    $.ajax({
        url: 'https://www.ihawo.com/checkBingWallpaoerUpdate.php',
        dataType: 'json',
        success: function(ret) {
            let newVersion = ret.version;
            let newVersionArr = newVersion.split('\.');
            let needUpdate = false;
            if (newVersionArr[0] == versionArr[0]) {
                if (newVersionArr[1] == versionArr[1]) {
                    if (newVersionArr[2] > versionArr[2]) {
                        needUpdate = true;
                    }
                } else if (newVersionArr[1] > versionArr[1]) {
                    needUpdate = true;
                }
            } else if (newVersionArr[0] > versionArr[0]) {
                needUpdate = true;
            }
            if (needUpdate) {
                ipc.send('needUpdate', ret)
            }
        }
    })
}
checkUpdate();

function checkNetWork() {
    if(!isOnline) {
        remote.dialog.showErrorBox('啊哦,当前无网络！', '');
        return false;
    }
    return true;
}

let reloadDate = startDate;
ipc.on('reload', () => {
    let nowDate = new Date().getDate();
    if (nowDate != reloadDate) {
        reloadDate = nowDate;
        idx = 0;
        getBingImg();
        checkUpdate();
        checkDailyDownload();
    }
})