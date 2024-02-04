import common from '@ohos.app.ability.common';
import { MediaHelper } from '../helper/MediaHelper';
import { UploadHelper } from '../helper/UploadHelper';
import abilityAccessCtrl from '@ohos.abilityAccessCtrl'
import promptAction from '@ohos.promptAction';
import { MediaBean } from '../bean/MediaBean';

@Entry
@Component
struct Index {
  // 选择的媒体文件
  @State media: MediaBean = null;
  // 进度值
  @State progress: number = 0;
  // 进度文字
  @State progressString: string = '-/-';

  build() {
    Row() {
      Row() {
        Column({ space: 20 }) {
          Flex({ justifyContent: FlexAlign.SpaceBetween, alignItems: ItemAlign.Center }) {
            Text('COS直传实践').fontSize(30)
            Button('选择文件').type(ButtonType.Normal).borderRadius(10).onClick(async () => {
              //获取读取媒体文件权限
              let atManager: abilityAccessCtrl.AtManager = abilityAccessCtrl.createAtManager()
              atManager.requestPermissionsFromUser(getContext(), ['ohos.permission.READ_MEDIA']).then(async (data) => {
                let grantStatus: Array<number> = data.authResults;
                if (grantStatus[0] === -1) {
                  // 授权失败
                  promptAction.showToast({ message: "获取读取媒体文件权限失败" });
                } else {
                  // 选择媒体文件
                  let mediaInfo = await MediaHelper.selectMedia(getContext());
                  if (mediaInfo) {
                    this.media = mediaInfo;
                  }
                }
              }).catch((err) => {
                promptAction.showToast({ message: "获取读取媒体文件权限失败: " + JSON.stringify(err) });
              })
            })
          }.margin({ top: 20 })

          Column() {
            Image(this.media?.fileUri)
              .alt($r('app.media.startIcon'))
              .backgroundColor(Color.Grey)
              .width('100%')
              .height(200)
            Text(`文件路径: ${this.media != null ? this.media.fileUri : "请选择文件"}`)
              .textAlign(TextAlign.Center)
              .width('100%')
              .fontSize(16)
              .margin(10)
            Text(`文件名: ${this.media != null ? this.media.fileName : "-"}`)
              .textAlign(TextAlign.Center)
              .width('100%')
              .fontSize(16)
              .margin(10)
            Text(`文件大小: ${this.media != null ? this.readableStorageSize(this.media.fileSize) : "-"}`)
              .textAlign(TextAlign.Center)
              .width('100%')
              .fontSize(16)
              .margin(10)
          }

          Text('上传进度：' + this.progressString)
          Progress({ value: this.progress, total: 100, type: ProgressType.Linear })
          Button('开始').width('100%').onClick(async () => {
            if (this.media == null) {
              promptAction.showToast({ message: '请选择文件' });
              return;
            }
            // 开始上传
            UploadHelper.uploadFileByTask(getContext(), this.media, (uploadedSize: number, totalSize: number) => {
              this.progress = 100 * uploadedSize / totalSize;
              if (totalSize != 0) {
                this.progressString = `${this.readableStorageSize(uploadedSize)}/${this.readableStorageSize(totalSize)}`;
              }
            });
          })
        }
        .width('100%')
      }
      .height('100%').alignItems(VerticalAlign.Top).margin(12)
    }
    .width('100%').height('100%').backgroundColor('#F1F3F5')
  }

  /**
   * 将byte转换为更加友好的单位
   * @param sizeInB byte
   * @return 更加友好的单位（KB、GB等）
   */
  readableStorageSize(sizeInB: number): string {
    let floatSize = sizeInB;
    let index = 0;
    const units = ["B", "KB", "MB", "GB", "TB", "PB"];

    while (floatSize > 1000 && index < 5) {
      index++;
      floatSize /= 1024;
    }

    const capacityText = floatSize.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${capacityText}${units[index]}`;
  }
}