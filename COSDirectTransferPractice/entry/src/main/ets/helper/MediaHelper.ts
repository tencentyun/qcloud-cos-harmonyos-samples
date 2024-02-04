import common from '@ohos.app.ability.common';
import picker from '@ohos.file.picker';
import fs from '@ohos.file.fs';
import mediaLibrary from '@ohos.multimedia.mediaLibrary';
import { MediaBean } from '../bean/MediaBean';

/**
 * 多媒体辅助类
 */
export class MediaHelper {
  /**
   * 获取文件后缀
   */
  public static getFileExtension(filename: string): string {
    return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
  }

  /**
   * 选择媒体
   */
  public static async selectMedia(context: common.Context): Promise<MediaBean> {
    let photoSelectOptions = new picker.PhotoSelectOptions();
    photoSelectOptions.MIMEType = picker.PhotoViewMIMETypes.IMAGE_VIDEO_TYPE;
    photoSelectOptions.maxSelectNumber = 1;
    let photoPicker = new picker.PhotoViewPicker();
    try {
      let photoSelectResult = await photoPicker.select(photoSelectOptions);
      console.info('PhotoViewPicker.select successfully, PhotoSelectResult uri: ' + JSON.stringify(photoSelectResult));

      if (photoSelectResult && photoSelectResult.photoUris && photoSelectResult.photoUris.length > 0) {
        let fileUri = photoSelectResult.photoUris[0];
        console.info('PhotoViewPicker.select successfully, PhotoSelectResult uri: ' + fileUri);
        return MediaHelper.getMediaInfo(context, fileUri);
      }
    } catch (err) {
      console.error('PhotoViewPicker.select failed with err: ' + err);
      return err;
    }
  }

  /**
   * 根据uri获取媒体文件信息
   * "uri"、"displayName"、"size"
   */
  private static async getMediaInfo(context: common.Context, uri: string): Promise<MediaBean> {
    let fileList: Array<mediaLibrary.FileAsset> = [];
    const parts: string[] = uri.split('/');
    const id: string = parts.length > 0 ? parts[parts.length - 1] : '-1';

    try {
      let media = mediaLibrary.getMediaLibrary(context);
      let mediaFetchOptions: mediaLibrary.MediaFetchOptions = {
        selections: mediaLibrary.FileKey.ID + '= ?',
        selectionArgs: [id],
        uri: uri
      };

      let fetchFileResult = await media.getFileAssets(mediaFetchOptions);
      fileList = await fetchFileResult.getAllObject();
      fetchFileResult.close();
      await media.release();
    } catch (err) {
      console.error('getMediaInfo failed with err: ' + err);
      return null;
    }

    if (fileList && fileList.length > 0) {
      let fileInfoObj = fileList[0];
      return {
        "fileUri": uri,
        "fileName": fileInfoObj.displayName,
        "fileSize": fileInfoObj.size
      };
    }
  }
}