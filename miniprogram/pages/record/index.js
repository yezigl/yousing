//index.js
const app = getApp()

const recordManager = wx.getRecorderManager();
const innerAudioContext = wx.createInnerAudioContext();

Page({
    data: {
        avatarUrl: './user-unlogin.png',
        userInfo: {},

        logged: false,
        takeSession: false,
        requestResult: '',

        recording: false,
        audioFile: '',
        audioDuration: 0,

        interval: '',
        recordStart: 0,
        recordTime: '00:00',

        recordList: [],
    },

    onLoad: function() {
        var that = this;
        if (!wx.cloud) {
            wx.redirectTo({
                url: '../chooseLib/chooseLib',
            })
            return
        }
        wx.getUserInfo({
            success: res => {
                console.log(res)
            }
        })

        // 获取用户信息
        wx.getSetting({
            success: res => {
                if (res.authSetting['scope.userInfo']) {
                    // 已经授权，可以直接调用 getUserInfo 获取头像昵称，不会弹框
                    wx.getUserInfo({
                        success: res => {
                            this.setData({
                                avatarUrl: res.userInfo.avatarUrl,
                                userInfo: res.userInfo
                            })
                        }
                    })
                }
            }
        })
        recordManager.onStop(function(res) {
            return;
            console.log(res);
            that.setData({
                audioFile: res.tempFilePath,
                audioDuration: res.duration,
            });
            var duration = res.duration;
            wx.cloud.uploadFile({
                cloudPath: 'audio/' + new Date().getTime() + '.aac',
                filePath: res.tempFilePath, // 文件路径
                success: res => {
                    // get resource ID
                    console.log(res)
                    that.setData({
                        audioFile: res.fileID
                    });
                    that.addUserRecord(res.fileID, duration);
                },
                fail: err => {
                    // handle error
                    console.log(err)
                }
            })
        });
        innerAudioContext.onPlay(() => {
            console.log('play start')
        });
        innerAudioContext.onError((res) => {
            console.log('play error')
            console.log(res)
        });
        console.log('page load')

        this.listRecord();
    },
    onUnload: function() {},

    formatTime: function(time) {
        if (!time && !this.data.recordStart) {
            return;
        }
        var tt = time || ((new Date().getTime() - this.data.recordStart) / 1000);
        console.log(tt);
        var min = Math.floor(tt / 60);
        var sec = Math.floor(tt % 60);
        console.log(min, sec)
        var ft = (min > 10 ? min : '0' + min) + ':' + (sec > 10 ? sec : '0' + sec);
        return ft;
    },


    getUserInfo: function(e) {
        console.log(e);
        if (e.detail.userInfo) {
            app.globalData.userInfo = e.detail.userInfo;
            this.setData({
                avatarUrl: e.detail.userInfo.avatarUrl,
                userInfo: e.detail.userInfo
            })
        }
    },

    listRecord: function() {
        var that = this;
        const db = wx.cloud.database();
        db.collection('user_record').limit(10).orderBy('create_time', 'desc')
            .where({
                '_openid': app.globalData.openid
            })
            .get({
                success(res) {
                    console.log(res)
                    res.data.forEach(e => e.time = that.formatTime(e.duration / 1000))
                    that.setData({
                        recordList: res.data
                    });
                },
                fail(res) {
                    console.error(res)
                }
            });
    },

    checkRecord: function(callback) {
        wx.getSetting({
            success(res) {
                console.log(res)
                if (res.authSetting['scope.record']) {
                    if (callback) {
                        callback();
                    }
                } else {
                    wx.authorize({
                        scope: 'scope.record',
                        success() {
                            console.log('auth success, start')
                            if (callback) {
                                callback();
                            }
                        },
                        fail() {
                            console.log('auth fail')
                        }
                    })
                }
            }
        })
    },
    doRecord: function() {
        var that = this;
        this.checkRecord(function() {
            if (that.data.recording) {
                that.stopRecord();
            } else {
                that.startRecord();
            }
        });
    },
    startRecord: function() {
        var that = this;
        recordManager.start({
            duration: 300000
        });
        var interval = setInterval(function() {
            that.setData({
                recordTime: that.formatTime()
            });
        }, 1000);
        this.setData({
            recording: true,
            interval: interval,
            recordStart: new Date().getTime(),
        })
    },
    stopRecord: function() {
        recordManager.stop();
        clearInterval(this.data.interval);
        this.setData({
            recording: false,
            interval: '',
            recordStart: 0,
            recordTime: '00:00',
        });
    },
    playRecord: function(e) {
        console.log(e);
        var item = e.currentTarget.dataset.item;
        console.log(item.file_id)
        innerAudioContext.src = item.file_id;
        console.log(innerAudioContext.duration)
        innerAudioContext.play();
    },

    addUserRecord: function(fileID, duration) {
        const db = wx.cloud.database();
        db.collection('user_record').add({
            data: {
                'file_id': fileID,
                'duration': duration,
                'create_time': db.serverDate()
            },
            success(res) {
                console.log('add db success', res)
            },
            fail(res) {
                console.log('add db fail', res)
            }
        })
    }
})