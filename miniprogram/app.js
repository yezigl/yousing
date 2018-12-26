//app.js
App({
    onLaunch: function() {

        if (!wx.cloud) {
            console.error('请使用 2.2.3 或以上的基础库以使用云能力')
        } else {
            wx.cloud.init({
                traceUser: true,
            })
        }

        this.globalData = {}
        
        var that = this;

        wx.getSetting({
            success: res => {
                console.log(res)
                if (res.authSetting['scope.userInfo']) {
                    wx.getUserInfo({
                        success: res => {
                            console.log(res)
                        }
                    })
                } else {
                    wx.authorize({
                        scope: 'scope.userInfo',
                        success(res) {
                            console.log('scope userInfo success', res)
                        },
                        fail(res) {
                            console.log('scope userInfo fail', res)
                        }
                    })
                }
            }
        })
        wx.getStorage({
            key: 'OPENID',
            success(res) {
                console.log(res)
                that.globalData.openid = res.data;
            },
            fail(res) {
                console.log(res)
                wx.cloud.callFunction({
                    name: 'login',
                    data: {},
                    success: res => {
                        console.log(res)
                        that.globalData.openid = res.result.openid
                        wx.setStorage({
                            key: 'OPENID',
                            data: res.result.openid,
                        })
                    },
                    fail: err => {
                        console.error(err)
                    }
                })
            }
        })
    }
})