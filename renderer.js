// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const {ipcRenderer: ipc, remote } = require('electron');

$("#closeWin").click(() => {
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
    return remote.app.getAppPath() + '/config.json'
}

function getConfig() {
    let fs=require("fs");
    let configPath = getConfigPath();
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
    fs.writeFile(configPath, jsonObj, function (err) {
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
        url:'http://cn.bing.com/HPImageArchive.aspx?format=js&idx=' + idx + '&n=1',
        success: function(ret) {
            date = ret.images[0].enddate;
            $("#imgMain").html('<img draggable="false" src="http://www.bing.com' + ret.images[0].url + '" />');
            $("#copyright").html(ret.images[0].copyright)
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
        url:'http://cn.bing.com/HPImageArchive.aspx?format=js&idx=' + idx + '&n=1',
        async: false,
        success: function(ret) {
            callBack('http://www.bing.com' + ret.images[0].url);
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

$(".down").click(() => saveImage())
$(".set").click(() => saveImage(1))

function saveImage(setBg, imgUrl) {
    if (!checkNetWork()) {
        return ;
    }
    if (imgUrl == undefined) {
        imgUrl = $("#imgMain img").attr('src');
    }
    let fs = require("fs");
    if (!fs.existsSync(config.savePath)) {  
        fs.mkdirSync(config.savePath);  
    }  

    var xhr = new XMLHttpRequest();    
    xhr.open("get", imgUrl, true);
    xhr.responseType = "blob";
    xhr.onload = function() {
        if (this.status == 200) {
            var blob = this.response;
            let reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onload = function(e) {
                var dataBuffer = new Buffer(e.target.result.replace(/^data:image\/\w+;base64,/,""), 'base64');
                let savePath = config.savePath + '\\' + 'BingWallpaper_' + date + '.jpg';
                fs.writeFile(savePath, dataBuffer, function (err) {
                    if(err){
                        remote.dialog.showErrorBox('保存文件出错了！', err)
                        console.log(err);
                    }else{
                        if (setBg) {
                            const wallpaper = require('wallpaper');
                            wallpaper.set(savePath);
                        }
                    }
                    start = 0;
                })
            }
        }    
    }, xhr.send();
}

$("#settingBtn").click(() => {
    if ($("#setting").hasClass('active')) {
        $("#body").css({filter:"blur(0)", transform: "scale(1)"});
    } else {
        $("#body").css({filter:"blur(20px)", transform: "scale(1.1)"});
    }
    $("#setting").toggleClass('active').fadeToggle(300)
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

$("#savePath").click(function(){
    remote.shell.openExternal($(this).text());
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
                getBingImgUrl(0, function(url) {
                    saveImage(1, url);
                });
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

timer = setInterval(function() {
    let nowDate = new Date().getDate();
    if (nowDate != startDate) {
        startDate = nowDate;
        if (config.autoSet == 1) {
            getBingImgUrl(0, function(url) {
                saveImage(1, url);
            });
        }
        if (config.autoSet == 1) {
            getBingImgUrl(0, function(url) {
                saveImage(0, url);
            });
        }
    }
}, 3600000)

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
    }
})