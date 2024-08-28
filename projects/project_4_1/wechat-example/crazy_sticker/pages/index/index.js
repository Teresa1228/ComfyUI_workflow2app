Page({
  data: {
    baseUrl: "http://192.168.31.101:6020",
    imglist: [
      '',
      '',
      '',
      ''
    ],
    selected_index:''

  },
  onLoad() {
    this.initServer();

  },




  // 初始化服务器
  initServer() {
    wx.request({
      url: `${this.data.baseUrl}/init`,
      method: 'GET',
      header: {
        'content-type': 'application/json'
      },
      success: res => {
        if (res.data.code === 10000) {
          this.setData({
            selected_index: res.data.data.selected_index
          });
          console.log('Selected index:', res.data.data.selected_index);
        } else {
          wx.showToast({
            title: `Error: ${res.data.message}`,
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: res => {
        console.error('Init request failed', res);
      }
    });
  },
  uploadImage() {
    let that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      maxDuration: 30,
      camera: 'back',
      success(res) {
        const tempFilePath = res.tempFiles[0].tempFilePath
        wx.showLoading({
          title: '正在上传...'
        });


        wx.uploadFile({
          url: `${that.data.baseUrl}/upload`,
          filePath: tempFilePath,
          formData: {
            'selected_index': that.data.selected_index
          },
          name: 'image',
          success: function (res) {
            console.log(res)

            const data = JSON.parse(res.data);
            console.log(data)
            if (data.code === 10000) {
              // this.setData({
              //   file_response_data: data.data
              // })
              wx.showToast({
                title: 'Upload successful',
                icon: 'success',
                duration: 2000
              });
              that.queue(data.data)

            } else {
              wx.hideLoading()

              wx.showToast({
                title: `Error: ${data.message}`,
                icon: 'none',
                duration: 2000
              });
            }
          },
          fail: function (error) {
            wx.hideLoading()
            console.error('Upload error:', error);
          }
        })
      }
    })
  },
  queue(file_response_data) {
    wx.showLoading({
      title: '正在生成图片...'
    });
    wx.request({
      url: `${this.data.baseUrl}/queue`,
      method: 'POST',
      data: {
        selected_index: this.data.selected_index,
        file_response_data: file_response_data
      },
      header: {
        'content-type': 'application/json'
      },
      success: res => {
        if (res.data.code === 10000) {
          this.getOutput(res.data.data.prompt_id);
        } else {
          wx.hideLoading();
          wx.showToast({
            title: `Error: ${res.data.message}`,
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: err => {
        wx.hideLoading();

        console.error('Queue prompt failed', err);
        wx.showToast({
          title: 'Queue prompt failed',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },
  // 获取输出
  getOutput(prompt_id) {
    wx.request({
      url: `${this.data.baseUrl}/get_output`,
      method: 'POST',
      data: {
        prompt_id: prompt_id,
        selected_index: this.data.selected_index
      },
      header: {
        'content-type': 'application/json'
      },
      success: res => {
        if (res.data.code === 10000) {
          wx.hideLoading();

          console.log(res.data.data)
          let outputs_imgs = res.data.data.outputs_img.images
          let img_list = this.data.imglist
          for(let i =0;i<outputs_imgs.length;i++){
          
            img_list[i] = `${this.data.baseUrl}/view?filename=${outputs_imgs[i]["filename"]}&selected_index=${this.data.selected_index}`
          }
          
          this.setData({
            imglist:img_list
          })



        } else if (res.data.code === 10002) {
          setTimeout(() => {
            this.getOutput(prompt_id);
          }, 2000);
        } else {
          wx.hideLoading();

          wx.showToast({
            title: `Error: ${res.data.message}`,
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: err => {
        console.error('Get output failed', err);
        wx.showToast({
          title: 'Get output failed',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },
  saveFile(){
    Promise.all(this.data.imglist.map(url => this.downloadImage(url)))
    .then(images => {
      // 所有图片下载成功，images是一个包含所有图片路径的数组
      wx.showToast({
        title: '保存成功',
        icon: 'success',
        duration: 2000

      });
    })
    .catch(error => {
      // 下载过程中至少有一个图片下载失败
      console.error('Error downloading images:', error);
    });
  },
  downloadImage(url) {
    return new Promise((resolve, reject) => {
      wx.downloadFile({
        url: url,
        success: (res) => {
          if (res.statusCode === 200) {
            // 下载成功，可以处理保存图片到本地等操作
            // 假设使用res.tempFilePath获取图片的临时路径
            wx.saveImageToPhotosAlbum({
              filePath: res.tempFilePath,
              success() { 
                resolve();

              },
              fail: function() {
                wx.hideLoading()
                wx.showToast({
                  title: '保存失败',
                  icon: 'none',
                  duration: 2000
                });
        
              }
            })
          } else {
            // 服务器返回的状态码不是200，下载失败
            reject(new Error('Download failed with status code: ' + res.statusCode));
          }
        },
        fail: (err) => {
          // 下载过程中发生错误
          reject(err);
        }
      });
    });
  }



})