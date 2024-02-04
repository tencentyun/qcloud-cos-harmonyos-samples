import http from '@ohos.net.http';
import promptAction from '@ohos.promptAction'
import fs from '@ohos.file.fs';
import request from '@ohos.request';
import common from '@ohos.app.ability.common';
import { MediaBean } from '../bean/MediaBean';
import { MediaHelper } from './MediaHelper';


/**
 * 上传辅助类
 */
export class UploadHelper {
  /**
   * 上传文件(通过uploadTask实现)
   * @param context context
   * @param media 媒体文件
   */
  public static async uploadFileByTask(context: common.Context, media: MediaBean, progressCallback: (uploadedSize: number, totalSize: number) => void) {
    // 获取直传签名等数据
    let directTransferData: any = await UploadHelper.getStsDirectSign(MediaHelper.getFileExtension(media.fileName));
    if (directTransferData == null) {
      promptAction.showToast({ message: 'getStsDirectSign fail' });
      return;
    }

    // 业务服务端返回的上传信息
    let cosHost: String = directTransferData.cosHost;
    let cosKey: String = directTransferData.cosKey;
    let authorization: String = directTransferData.authorization;
    let securityToken: String = directTransferData.securityToken;

    // 生成上传的url
    let url = `https://${cosHost}/${cosKey}`;
    try {
      // 复制uri文件到cacheDir（因为request.uploadFile只接受internal:类型的路径）
      let file = await fs.open(media.fileUri, fs.OpenMode.READ_ONLY);
      let destPath = context.cacheDir + "/" + media.fileName;
      await fs.copyFile(file.fd, destPath);
      let realuri = "internal://cache/" + destPath.split("cache/")[1];

      let uploadConfig = {
        url: url,
        header: {
          "Content-Type": "application/octet-stream",
          "Authorization": authorization,
          "x-cos-security-token": securityToken,
          "Host": cosHost
        },
        method: "PUT",
        files: [{ filename: "test", name: "test", uri: realuri, type: "jpg" }],
        data: []
      };
      // 开始上传
      let uploadTask = await request.uploadFile(context, uploadConfig)

      uploadTask.on('progress', progressCallback);
      let upCompleteCallback = (taskStates) => {
        for (let i = 0; i < taskStates.length; i++) {
          promptAction.showToast({ message: '上传成功' });
          console.info("upOnComplete taskState:" + JSON.stringify(taskStates[i]));
        }
      };
      uploadTask.on('complete', upCompleteCallback);

      let upFailCallback = (taskStates) => {
        for (let i = 0; i < taskStates.length; i++) {
          promptAction.showToast({ message: '上传失败' });
          console.info("upOnFail taskState:" + JSON.stringify(taskStates[i]));
        }
      };
      uploadTask.on('fail', upFailCallback);
    } catch (err) {
      console.info("uploadFile Error sending PUT request: " + JSON.stringify(err));
      promptAction.showToast({ message: "uploadFile Error sending PUT request: " + JSON.stringify(err) });
    }
  }

  /**
   * 获取直传的url和签名等
   *
   * @param ext 文件后缀 直传后端会根据后缀生成cos key
   * @returns 直传url和签名等
   */
  public static async getStsDirectSign(ext: string): Promise<Object> {
    // 每一个httpRequest对应一个HTTP请求任务，不可复用
    let httpRequest = http.createHttp();
    //直传签名业务服务端url（正式环境 请替换成正式的直传签名业务url）
    //直传签名业务服务端代码示例可以参考：https://github.com/tencentyun/cos-demo/blob/main/server/direct-sign/nodejs/app.js
    let url = "http://127.0.0.1:3000/sts-direct-sign?ext=" + ext;
    try {
      let httpResponse = await httpRequest.request(url, { method: http.RequestMethod.GET });
      if (httpResponse.responseCode == 200) {
        let result = JSON.parse(httpResponse.result.toString())
        if (result.code == 0) {
          return result.data;
        } else {
          console.info(`getStsDirectSign error code: ${result.code}, error message: ${result.message}`);
        }
      } else {
        console.info("getStsDirectSign HTTP error code: " + httpResponse.responseCode);
      }
    } catch (err) {
      console.info("getStsDirectSign Error sending GET request: " + JSON.stringify(err));
    } finally {
      // 当该请求使用完毕时，调用destroy方法主动销毁。
      httpRequest.destroy();
    }
    return null;
  }

  /**
   * 上传文件
   * @param media 媒体文件
   */
  public static async uploadFile(media: MediaBean) {
    // 获取直传签名等数据
    let directTransferData: any = await UploadHelper.getStsDirectSign(MediaHelper.getFileExtension(media.fileName));
    if (directTransferData == null) {
      promptAction.showToast({ message: 'getStsDirectSign fail' });
      return;
    }

    // 业务服务端返回的上传信息
    let cosHost: String = directTransferData.cosHost;
    let cosKey: String = directTransferData.cosKey;
    let authorization: String = directTransferData.authorization;
    let securityToken: String = directTransferData.securityToken;

    let httpRequest = http.createHttp();
    // 生成上传的url
    let url = `https://${cosHost}/${cosKey}`;
    try {
      // 读取文件uri 得到要上传的ArrayBuffer
      let destFile = await fs.open(media.fileUri, fs.OpenMode.READ_ONLY);
      let fileStat = await fs.stat(destFile.fd);
      let fileSize = fileStat.size;
      let arrayBuffer: ArrayBuffer = new ArrayBuffer(fileSize);
      await fs.read(destFile.fd, arrayBuffer);
      await fs.close(destFile.fd)

      // 开始上传
      let httpResponse = await httpRequest.request(url, {
        method: http.RequestMethod.PUT,
        header: {
          "Content-Type": "application/octet-stream",
          "Content-Length": fileSize,
          "Authorization": authorization,
          "x-cos-security-token": securityToken,
          "Host": cosHost
        },
        extraData: arrayBuffer,
        expectDataType: 2 //HttpDataType.ARRAY_BUFFER
      });
      if (httpResponse.responseCode == 200) {
        promptAction.showToast({ message: '上传成功' });
      } else {
        console.info("uploadFile HTTP error code: " + httpResponse.responseCode);
        promptAction.showToast({ message: "uploadFile HTTP error code: " + httpResponse.responseCode });
      }
    } catch (err) {
      console.info("uploadFile Error sending PUT request: " + JSON.stringify(err));
      promptAction.showToast({ message: "uploadFile Error sending PUT request: " + JSON.stringify(err) });
    } finally {
      // 当该请求使用完毕时，调用destroy方法主动销毁。
      httpRequest.destroy();
    }
  }
}